// =============================================================================
// GMA DYNAMICS LEGALTECH — Edge Function: process-payment
// Runtime: Deno (Supabase Edge Functions) — usa Deno.serve(), NO serve() de std
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

interface PaymentRequest {
  token: string;
  amount: number;
  description: string;
  user_id: string;
  payment_type: "extra" | "upgrade";
  qty?: number;
  plan_id?: string;
}

interface MercadoPagoResponse {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  error?: string;
  message?: string;
}

const PLAN_DEFINITIONS: Record<string, { name: string; limit: number }> = {
  medio: { name: "Plan Medio Judicial", limit: 20 },
  pro:   { name: "Plan Pro Judicial",   limit: 100 },
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Deno.serve es la API correcta para Supabase Edge Functions (serve() de std está deprecado)
Deno.serve(async (req: Request) => {
  // Pre-flight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    // ── 1. Leer y validar body ─────────────────────────────────────────────
    let body: PaymentRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Body JSON inválido." }, 400);
    }

    const { token, amount, description, user_id, payment_type, qty, plan_id } = body;

    if (!token || !amount || !description || !user_id || !payment_type) {
      return jsonResponse({ success: false, error: "Parámetros incompletos: token, amount, description, user_id y payment_type son obligatorios." }, 400);
    }
    if (payment_type === "extra" && (!qty || qty < 1)) {
      return jsonResponse({ success: false, error: "qty debe ser >= 1 para pagos de tipo 'extra'." }, 400);
    }
    if (payment_type === "upgrade" && !plan_id) {
      return jsonResponse({ success: false, error: "plan_id es obligatorio para pagos de tipo 'upgrade'." }, 400);
    }
    if (payment_type === "upgrade" && plan_id && !PLAN_DEFINITIONS[plan_id]) {
      return jsonResponse({ success: false, error: `plan_id '${plan_id}' no reconocido. Valores válidos: medio, pro.` }, 400);
    }

    // ── 2. Leer variables de entorno ───────────────────────────────────────
    const SUPABASE_URL      = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY          = Deno.env.get("SUPABASE_ANON_KEY");
    const MP_ACCESS_TOKEN   = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY || !MP_ACCESS_TOKEN) {
      console.error("[process-payment] Variables de entorno incompletas");
      return jsonResponse({ success: false, error: "Configuración de servidor incompleta." }, 500);
    }

    // ── 3. Verificar JWT — el user_id del body debe coincidir con el token ─
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Authorization header requerido." }, 401);
    }

    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user: jwtUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !jwtUser) {
      return jsonResponse({ success: false, error: "Token JWT inválido o expirado." }, 401);
    }
    if (jwtUser.id !== user_id) {
      console.error(`[SECURITY] user_id mismatch: JWT=${jwtUser.id} body=${user_id}`);
      return jsonResponse({ success: false, error: "user_id no coincide con el JWT autenticado." }, 403);
    }

    // ── 4. Cobrar con MercadoPago REST API v1 ─────────────────────────────
    // notification_url es la URL del webhook mp-webhook para confirmaciones asíncronas
    const projectUrl = SUPABASE_URL.replace(".supabase.co", "").replace("https://", "");
    const webhookUrl = `https://${projectUrl}.supabase.co/functions/v1/mp-webhook`;

    const mpPayload = {
      transaction_amount: amount,
      token,
      description,
      installments: 1,
      payer: { email: jwtUser.email ?? "no-email@gma.co" },
      notification_url: webhookUrl,
      metadata: {
        gma_user_id:      user_id,
        gma_payment_type: payment_type,
        gma_plan_id:      plan_id ?? null,
        gma_qty:          qty ?? null,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "Authorization":     `Bearer ${MP_ACCESS_TOKEN}`,
        // Idempotency-Key previene cobros duplicados si el cliente reintenta
        "X-Idempotency-Key": `gma-${user_id}-${payment_type}-${Date.now()}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData: MercadoPagoResponse = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error(`[MP] Error HTTP ${mpResponse.status}:`, mpData);
      return jsonResponse({
        success: false,
        error:   `MercadoPago rechazó la solicitud: ${mpData.message ?? mpData.error ?? "error desconocido"}`,
      }, 402);
    }

    console.log(`[MP] payment_id=${mpData.id} status=${mpData.status} detail=${mpData.status_detail}`);

    // ── 5. Solo actualizar profiles si el pago está APROBADO ──────────────
    // Para pagos 'pending' o 'in_process', el webhook mp-webhook completará la actualización
    if (mpData.status !== "approved") {
      return jsonResponse({
        success:    false,
        payment_id: String(mpData.id),
        status:     mpData.status,
        detail:     mpData.status_detail,
        error:      `Pago no aprobado: ${mpData.status_detail}. Estado: ${mpData.status}`,
      }, 402);
    }

    // Cliente admin con service_role para bypass de RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Verificar idempotencia: si este payment_id ya fue procesado, no duplicar
    const { data: existingPayment } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("payment_id", String(mpData.id))
      .maybeSingle();

    if (existingPayment) {
      console.warn(`[process-payment] payment_id=${mpData.id} ya procesado — ignorando duplicado`);
      return jsonResponse({ success: true, payment_id: String(mpData.id), status: mpData.status }, 200);
    }

    // Construir el UPDATE según el tipo de pago
    let profileUpdate: Record<string, unknown>;

    if (payment_type === "extra") {
      const { data: currentProfile, error: fetchError } = await supabaseAdmin
        .from("profiles").select("limit_msgs").eq("id", user_id).single();

      if (fetchError || !currentProfile) {
        console.error("[DB] No se pudo leer el perfil:", fetchError);
        return jsonResponse({ success: false, error: "Perfil no encontrado tras pago aprobado." }, 500);
      }
      profileUpdate = {
        limit_msgs: (currentProfile.limit_msgs as number) + (qty as number),
        updated_at: new Date().toISOString(),
        payment_id: String(mpData.id),
      };
    } else {
      const plan = PLAN_DEFINITIONS[plan_id as string];
      const planStart = new Date().toISOString();
      profileUpdate = {
        plan:            plan.name,
        limit_msgs:      plan.limit,
        sent_msgs:       0,
        status:          "Activo",
        plan_start_date: planStart,
        updated_at:      planStart,
        payment_id:      String(mpData.id),
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles").update(profileUpdate).eq("id", user_id);

    if (updateError) {
      console.error(`[DB CRITICAL] Pago aprobado mp_id=${mpData.id} pero UPDATE falló:`, updateError);
      return jsonResponse({
        success:    false,
        payment_id: String(mpData.id),
        status:     mpData.status,
        error:      "Pago procesado pero error al actualizar el perfil. Guarde su payment_id y contacte soporte.",
      }, 500);
    }

    return jsonResponse({ success: true, payment_id: String(mpData.id), status: mpData.status }, 200);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno desconocido";
    console.error("[UNHANDLED]", message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});

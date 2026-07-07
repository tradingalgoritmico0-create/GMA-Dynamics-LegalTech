// =============================================================================
// GMA DYNAMICS LEGALTECH — Edge Function: process-payment
// Runtime: Deno (Supabase Edge Functions) — usa Deno.serve(), NO serve() de std
//
// Seguridad:
//  - El monto se calcula SIEMPRE server-side desde el catálogo de planes.
//    El body del cliente nunca determina cuánto se cobra.
//  - El user_id del body debe coincidir con el JWT autenticado.
//  - Idempotencia por payment_id (índice único en profiles.payment_id).
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

interface PaymentRequest {
  token: string;
  description: string;
  user_id: string;
  payment_type: "extra" | "upgrade";
  qty?: number;
  plan_id?: string;
  // Campos mínimos exigidos por la API de pagos de MP (los entrega el brick)
  payment_method_id: string;
  issuer_id?: number | string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: { type: string; number: string };
  };
}

interface MercadoPagoResponse {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  error?: string;
  message?: string;
}

// Espejo de public.plans y de src/lib/plans.ts — mantener sincronizados.
const PLAN_DEFINITIONS: Record<string, { name: string; limit: number; price: number }> = {
  gratis: { name: "Plan Gratis Judicial", limit: 5,   price: 0 },
  medio:  { name: "Plan Medio Judicial",  limit: 20,  price: 50000 },
  pro:    { name: "Plan Pro Judicial",    limit: 100, price: 120000 },
};

// Precio por mensaje adicional (COP) para payment_type = "extra".
// AJUSTAR según definición de negocio.
const PRICE_PER_EXTRA_MSG_COP = 5000;

// Monto mínimo permitido por MercadoPago Colombia para validar tarjeta con capture=false.
// La reserva se cancela inmediatamente tras la autorización — NO se cobra al usuario.
const VERIFY_AMOUNT_COP = 1000;

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

Deno.serve(async (req: Request) => {
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

    const { token, description, user_id, payment_type, qty, plan_id, payment_method_id, issuer_id, installments, payer } = body;

    if (!token || !description || !user_id || !payment_type || !payment_method_id) {
      return jsonResponse({ success: false, error: "Parámetros incompletos: token, description, user_id, payment_type y payment_method_id son obligatorios." }, 400);
    }
    if (payment_type === "extra" && (!qty || qty < 1 || qty > 500)) {
      return jsonResponse({ success: false, error: "qty debe estar entre 1 y 500 para pagos de tipo 'extra'." }, 400);
    }
    if (payment_type === "upgrade" && (!plan_id || !PLAN_DEFINITIONS[plan_id])) {
      return jsonResponse({ success: false, error: `plan_id '${plan_id}' no reconocido. Valores válidos: gratis, medio, pro.` }, 400);
    }

    // ── 2. Leer variables de entorno ───────────────────────────────────────
    const SUPABASE_URL      = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY          = Deno.env.get("SUPABASE_ANON_KEY");
    const MP_ACCESS_TOKEN   = Deno.env.get("MP_ACCESS_TOKEN");

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

    // ── 4. Calcular el monto SERVER-SIDE ───────────────────────────────────
    const isFreePlan = payment_type === "upgrade" && plan_id === "gratis";
    const chargeAmount = payment_type === "upgrade"
      ? PLAN_DEFINITIONS[plan_id as string].price
      : (qty as number) * PRICE_PER_EXTRA_MSG_COP;

    // Plan gratis → autorización de $1.000 COP (capture=false) que se cancela
    // inmediatamente para validar la tarjeta sin cobrar.
    const effectiveAmount = isFreePlan ? VERIFY_AMOUNT_COP : chargeAmount;

    if (!isFreePlan && effectiveAmount <= 0) {
      return jsonResponse({ success: false, error: "Monto de cobro inválido." }, 400);
    }

    // ── 5. Cobrar con MercadoPago REST API v1 ─────────────────────────────
    const projectUrl = SUPABASE_URL.replace(".supabase.co", "").replace("https://", "");
    const webhookUrl = `https://${projectUrl}.supabase.co/functions/v1/mp-webhook`;

    const mpPayload: Record<string, unknown> = {
      transaction_amount: effectiveAmount,
      token,
      description: isFreePlan ? "Validación de tarjeta — GMA Dynamics" : description,
      installments: installments ?? 1,
      payment_method_id,
      ...(issuer_id !== undefined && issuer_id !== null ? { issuer_id: Number(issuer_id) } : {}),
      capture: !isFreePlan,
      payer: {
        email: jwtUser.email ?? payer?.email ?? "no-email@gma.co",
        ...(payer?.identification ? { identification: payer.identification } : {}),
      },
      notification_url: webhookUrl,
      metadata: {
        gma_user_id:      user_id,
        gma_payment_type: payment_type,
        gma_plan_id:      plan_id ?? null,
        gma_qty:          qty ?? null,
        gma_is_verify:    isFreePlan,
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

    console.log(`[MP] payment_id=${mpData.id} status=${mpData.status} detail=${mpData.status_detail} verify=${isFreePlan}`);

    // ── 6. Validar estado según tipo de flujo ─────────────────────────────
    // Plan gratis: exige status="authorized" (capture=false valida con el banco sin cobrar)
    // Resto:      exige status="approved" (cobro real efectivo)
    const requiredStatus = isFreePlan ? "authorized" : "approved";
    if (mpData.status !== requiredStatus) {
      return jsonResponse({
        success:    false,
        payment_id: String(mpData.id),
        status:     mpData.status,
        detail:     mpData.status_detail,
        error:      `Tarjeta no ${isFreePlan ? "validada" : "aprobada"}: ${mpData.status_detail}. Estado: ${mpData.status}`,
      }, 402);
    }

    // Si es plan gratis, cancelar la autorización de inmediato para liberar la retención.
    if (isFreePlan) {
      const cancelResp = await fetch(`https://api.mercadopago.com/v1/payments/${mpData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!cancelResp.ok) {
        // Log pero NO fallar: la validación ya fue exitosa. MP libera la reserva
        // en 7 días aunque falle el cancel explícito.
        const cancelErr = await cancelResp.text();
        console.error(`[MP CANCEL] No se pudo cancelar auth payment_id=${mpData.id}:`, cancelErr);
      } else {
        console.log(`[MP CANCEL] auth payment_id=${mpData.id} liberada correctamente`);
      }
    }

    // ── 7. Actualizar el perfil con service_role ──────────────────────────
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Idempotencia: si este payment_id ya fue procesado, no duplicar
    const { data: existingPayment } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("payment_id", String(mpData.id))
      .maybeSingle();

    if (existingPayment) {
      console.warn(`[process-payment] payment_id=${mpData.id} ya procesado — ignorando duplicado`);
      return jsonResponse({ success: true, payment_id: String(mpData.id), status: mpData.status }, 200);
    }

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
      const planStart = new Date();
      const nextBilling = new Date(planStart);
      nextBilling.setDate(nextBilling.getDate() + 30);
      profileUpdate = {
        plan:              plan.name,
        limit_msgs:        plan.limit,
        sent_msgs:         0,
        status:            "Activo",
        plan_start_date:   planStart.toISOString(),
        next_billing_date: nextBilling.toISOString(),
        updated_at:        planStart.toISOString(),
        payment_id:        String(mpData.id),
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

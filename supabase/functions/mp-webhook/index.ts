// =============================================================================
// GMA DYNAMICS LEGALTECH — Edge Function: mp-webhook
// Runtime: Deno (Supabase Edge Functions)
// Desplegada con: supabase functions deploy mp-webhook --no-verify-jwt
// NUNCA confía en el status del body — siempre re-consulta la API de MP.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

interface WebhookBody {
  action: string;
  api_version: string;
  data: { id: string };
  type: string;
  live_mode: boolean;
}

interface MPPayment {
  id: number;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded";
  status_detail: string;
  transaction_amount: number;
  metadata: {
    gma_user_id:      string;
    gma_payment_type: "upgrade" | "extra";
    gma_plan_id:      string | null;
    gma_qty:          number | null;
  };
}

const PLAN_DEFINITIONS: Record<string, { name: string; limit: number }> = {
  medio: { name: "Plan Medio Judicial", limit: 20 },
  pro:   { name: "Plan Pro Judicial",   limit: 100 },
};

// ── Validación de firma HMAC-SHA256 (spec oficial MP 2025) ─────────────────
// Template firmado: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
async function validateMPSignature(
  xSignatureHeader: string,
  xRequestId: string,
  dataId: string,
  secret: string
): Promise<boolean> {
  try {
    if (!xSignatureHeader) {
      console.warn("[mp-webhook] Header x-signature ausente");
      return false;
    }

    const parts = Object.fromEntries(
      xSignatureHeader.split(",").map((part) => {
        const eqIdx = part.indexOf("=");
        return [part.slice(0, eqIdx).trim(), part.slice(eqIdx + 1).trim()];
      })
    );

    const ts = parts["ts"];
    const v1 = parts["v1"];

    if (!ts || !v1) {
      console.error("[mp-webhook] Firma malformada: falta ts o v1");
      return false;
    }

    const signedTemplate = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw", encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signedTemplate));
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const isValid = signatureHex === v1;
    if (!isValid) console.error("[mp-webhook] Firma HMAC inválida — posible webhook falso.");
    return isValid;
  } catch (err) {
    console.error("[mp-webhook] Error validando firma:", (err as Error).message);
    return false;
  }
}

// ── Re-consulta del pago real en MP ───────────────────────────────────────
async function fetchPaymentFromMP(paymentId: string, accessToken: string): Promise<MPPayment> {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type":  "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`MP API error ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<MPPayment>;
}

// ── Actualización idempotente de profiles ─────────────────────────────────
async function updateProfile(
  supabase: ReturnType<typeof createClient>,
  payment: MPPayment
): Promise<void> {
  const { metadata, id: mpPaymentId } = payment;
  const { gma_user_id, gma_payment_type, gma_plan_id, gma_qty } = metadata;

  if (!gma_user_id) throw new Error("metadata.gma_user_id ausente — no se puede actualizar profiles");

  // IDEMPOTENCIA: verificar si este payment_id ya fue procesado
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("payment_id", String(mpPaymentId))
    .maybeSingle();

  if (existing) {
    console.warn(`[mp-webhook] payment_id=${mpPaymentId} ya procesado — ignorando duplicado`);
    return;
  }

  if (gma_payment_type === "upgrade") {
    if (!gma_plan_id || !PLAN_DEFINITIONS[gma_plan_id]) {
      throw new Error(`gma_plan_id inválido: ${gma_plan_id}`);
    }
    const plan = PLAN_DEFINITIONS[gma_plan_id];
    const now  = new Date().toISOString();

    const { error } = await supabase.from("profiles").update({
      plan:            plan.name,
      limit_msgs:      plan.limit,
      sent_msgs:       0,
      status:          "Activo",
      payment_id:      String(mpPaymentId),
      plan_start_date: now,
      updated_at:      now,
    }).eq("id", gma_user_id);

    if (error) throw new Error(`Supabase update (upgrade) falló: ${error.message}`);
    console.log(`[mp-webhook] Upgrade completado: user=${gma_user_id} plan=${plan.name}`);

  } else if (gma_payment_type === "extra") {
    if (!gma_qty || gma_qty <= 0) throw new Error("gma_qty inválido para extra");

    const { data: profile, error: fetchError } = await supabase
      .from("profiles").select("limit_msgs").eq("id", gma_user_id).single();

    if (fetchError || !profile) throw new Error(`Perfil no encontrado: ${fetchError?.message}`);

    const { error } = await supabase.from("profiles").update({
      limit_msgs: profile.limit_msgs + gma_qty,
      payment_id: String(mpPaymentId),
      updated_at: new Date().toISOString(),
    }).eq("id", gma_user_id);

    if (error) throw new Error(`Supabase update (extra) falló: ${error.message}`);
    console.log(`[mp-webhook] +${gma_qty} msgs: user=${gma_user_id} total=${profile.limit_msgs + gma_qty}`);

  } else {
    throw new Error(`gma_payment_type desconocido: ${gma_payment_type}`);
  }
}

// ── Handler principal ──────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // MP envía tanto POST como GET en algunas verificaciones
  if (req.method === "GET") return new Response("OK", { status: 200 });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const MP_ACCESS_TOKEN      = Deno.env.get("MP_ACCESS_TOKEN");
  const MP_WEBHOOK_SECRET    = Deno.env.get("MP_WEBHOOK_SECRET");
  const SUPABASE_URL         = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!MP_ACCESS_TOKEN || !MP_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[mp-webhook] Variables de entorno incompletas");
    // Retornar 200 para que MP no marque el endpoint como caído
    return new Response("OK", { status: 200 });
  }

  // Leer body como texto ANTES de parsear (necesario para validar firma sobre raw body)
  const rawBody    = await req.text();
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  // Extraer data.id del body para construir el template de firma
  let dataId = "";
  let parsedBody: WebhookBody | null = null;

  try {
    parsedBody = JSON.parse(rawBody);
    dataId = parsedBody?.data?.id ?? "";
  } catch {
    console.error("[mp-webhook] Body JSON inválido");
    return new Response("OK", { status: 200 });
  }

  // ── Validar firma ────────────────────────────────────────────────────────
  const isValid = await validateMPSignature(xSignature, xRequestId, dataId, MP_WEBHOOK_SECRET);
  if (!isValid) {
    // Retornar 200 para no dar información al atacante (MP no reintenta en 2xx)
    console.warn("[mp-webhook] Webhook rechazado por firma inválida");
    return new Response("OK", { status: 200 });
  }

  // ── Filtrar solo eventos de pago ─────────────────────────────────────────
  if (parsedBody!.type !== "payment") {
    console.log(`[mp-webhook] Evento ignorado: type=${parsedBody!.type}`);
    return new Response("OK", { status: 200 });
  }

  const paymentId = dataId;
  if (!paymentId) {
    console.error("[mp-webhook] data.id ausente en el webhook");
    return new Response("OK", { status: 200 });
  }

  // ── Re-consultar el pago real en MP (NUNCA confiar en el body) ───────────
  let payment: MPPayment;
  try {
    payment = await fetchPaymentFromMP(paymentId, MP_ACCESS_TOKEN);
  } catch (err) {
    console.error("[mp-webhook] Error al consultar MP API:", (err as Error).message);
    return new Response("Internal Server Error", { status: 500 }); // MP reintentará
  }

  console.log(`[mp-webhook] payment_id=${payment.id} status=${payment.status} detail=${payment.status_detail}`);

  // ── Solo procesar pagos aprobados ────────────────────────────────────────
  if (payment.status !== "approved") {
    console.log(`[mp-webhook] Pago ${payment.status} — sin acción en DB`);
    return new Response("OK", { status: 200 });
  }

  // ── Actualizar Supabase con service_role (bypass RLS necesario aquí) ─────
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    await updateProfile(supabase, payment);
  } catch (err) {
    console.error("[mp-webhook] Error al actualizar Supabase:", (err as Error).message);
    return new Response("Internal Server Error", { status: 500 }); // MP reintentará
  }

  return new Response("OK", { status: 200 });
});

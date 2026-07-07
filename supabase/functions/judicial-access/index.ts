// =============================================================================
// GMA DYNAMICS LEGALTECH — Edge Function: judicial-access
// Runtime: Deno (Supabase Edge Functions)
//
// Corazón legal del sistema: valida la identidad del demandado, captura la
// evidencia forense SERVER-SIDE (IP real de los headers, no manipulable desde
// el navegador) y entrega una signed URL temporal del documento.
//
// Reemplaza al RPC validate_and_log_access + createSignedUrl anónimo:
//  - La IP se toma de x-forwarded-for (el cliente no puede falsearla).
//  - Se registran TAMBIÉN los intentos fallidos (valor probatorio).
//  - Rate-limit: bloquea fuerza bruta de cédulas por hash+IP.
//
// Desplegar con: supabase functions deploy judicial-access
// (la anon key del cliente pasa verify_jwt; no requiere sesión de usuario)
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";

interface AccessRequest {
  hash: string;
  id_number: string;
}

// Máximo de intentos fallidos por notificación+IP en la ventana, antes de bloquear
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 15;
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hora

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

// Geolocalización por IP consultada desde el servidor (best-effort: si el
// servicio falla, la evidencia se guarda igual sin geo).
async function geoLookup(ip: string): Promise<Record<string, unknown>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL     = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[judicial-access] Variables de entorno incompletas");
    return jsonResponse({ success: false, error: "Configuración de servidor incompleta." }, 500);
  }

  let body: AccessRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Body JSON inválido." }, 400);
  }

  const hash = (body.hash ?? "").trim();
  const idNumber = (body.id_number ?? "").trim();
  if (!hash || !idNumber) {
    return jsonResponse({ success: false, error: "hash e id_number son obligatorios." }, 400);
  }

  // IP real: primer valor de x-forwarded-for (lo añade el proxy de Supabase)
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0.0.0.0";
  const userAgent = req.headers.get("user-agent") ?? "desconocido";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ── 1. Buscar la notificación por hash ────────────────────────────────────
  const { data: notif, error: notifError } = await supabase
    .from("notifications")
    .select("id, defendant_id, storage_path, file_path, case_name")
    .eq("file_hash", hash)
    .maybeSingle();

  if (notifError) {
    console.error("[judicial-access] Error consultando notificación:", notifError.message);
    return jsonResponse({ success: false, error: "Error interno." }, 500);
  }
  if (!notif) {
    return jsonResponse({ success: false, error: "NOT_FOUND" }, 404);
  }

  // ── 2. Rate-limit por notificación + IP ───────────────────────────────────
  const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString();
  const { count: failedCount } = await supabase
    .from("notification_evidence")
    .select("id", { count: "exact", head: true })
    .eq("notification_id", notif.id)
    .eq("ip_address", ip)
    .eq("action_type", "validation_failed")
    .gte("access_date", windowStart);

  if ((failedCount ?? 0) >= MAX_FAILED_ATTEMPTS) {
    console.warn(`[judicial-access] Rate-limit: notif=${notif.id} ip=${ip}`);
    return jsonResponse({
      success: false,
      error: "TOO_MANY_ATTEMPTS: Demasiados intentos fallidos. Intente de nuevo en 15 minutos.",
    }, 429);
  }

  // ── 3. Validar identidad ──────────────────────────────────────────────────
  const geo = await geoLookup(ip);
  const evidenceBase = {
    notification_id: notif.id,
    ip_address: ip,
    user_agent: userAgent,
    location_data: geo,
    city:    (geo["city"] as string) ?? null,
    region:  (geo["region"] as string) ?? null,
    country: (geo["country_name"] as string) ?? (geo["country"] as string) ?? null,
  };

  if (notif.defendant_id !== idNumber) {
    // Registrar el intento fallido: probatorio y base del rate-limit
    await supabase.from("notification_evidence").insert([{
      ...evidenceBase,
      action_type: "validation_failed",
    }]);
    return jsonResponse({ success: false, error: "INVALID_ID" }, 403);
  }

  // ── 4. Registrar la evidencia de notificación efectiva ───────────────────
  const { error: evidenceError } = await supabase.from("notification_evidence").insert([{
    ...evidenceBase,
    action_type: "legal_notification_accepted",
  }]);
  if (evidenceError) {
    // Sin evidencia no hay acta: NO entregar el documento
    console.error("[judicial-access] CRITICAL: no se pudo registrar evidencia:", evidenceError.message);
    return jsonResponse({ success: false, error: "Error registrando la evidencia. Intente de nuevo." }, 500);
  }

  await supabase
    .from("notifications")
    .update({ status: "Leído", viewed_at: new Date().toISOString() })
    .eq("id", notif.id);

  // ── 5. Generar signed URL temporal del documento ─────────────────────────
  const storagePath = notif.storage_path ?? notif.file_path;
  if (!storagePath) {
    console.error(`[judicial-access] Notificación ${notif.id} sin storage_path`);
    return jsonResponse({ success: false, error: "Documento no disponible. Contacte al emisor." }, 500);
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("lawsuits")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    console.error("[judicial-access] Error firmando URL:", signError?.message);
    return jsonResponse({ success: false, error: "Error generando el acceso al documento." }, 500);
  }

  return jsonResponse({
    success: true,
    case_name: notif.case_name,
    signed_url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  }, 200);
});

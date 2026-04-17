# WEBHOOK_SETUP.md — Configuración del Webhook MercadoPago
## GMA Dynamics LegalTech — AbogadosPaginaWeb

---

## 1. URL del endpoint

```
https://<TU_PROJECT_REF>.supabase.co/functions/v1/mp-webhook
```

Reemplaza `<TU_PROJECT_REF>` con el ID de tu proyecto Supabase
(Settings → General → Reference ID).

---

## 2. Configuración en el Panel de MercadoPago

### 2.1 Acceder a Webhooks

1. Ir a: https://www.mercadopago.com.co/developers/panel
2. En el menú lateral: **Tu negocio → Configuración → Webhooks**
3. Click en **"Agregar webhook"**

### 2.2 Datos a completar

| Campo   | Valor                                                                    |
|---------|--------------------------------------------------------------------------|
| URL     | `https://<PROJECT_REF>.supabase.co/functions/v1/mp-webhook`             |
| Eventos | Marcar únicamente: **Payments** (`payment`)                              |
| Modo    | **Producción** (usar Sandbox solo para pruebas iniciales)                |

### 2.3 Obtener el Webhook Secret

1. Luego de guardar el webhook, MP muestra la **"Clave de firma secreta"**.
2. Copiarla INMEDIATAMENTE — solo se muestra una vez.
3. Esta clave es el valor de `MP_WEBHOOK_SECRET` en Supabase.

---

## 3. Variables de entorno en Supabase

Ir a: **Supabase Dashboard → Settings → Edge Functions → Secrets**

| Nombre                      | Descripción                              | Dónde obtenerlo                             |
|-----------------------------|------------------------------------------|---------------------------------------------|
| `MP_ACCESS_TOKEN`           | Access Token de producción de MP         | Panel MP → Credenciales → Producción        |
| `MP_WEBHOOK_SECRET`         | Clave secreta del webhook (paso 2.3)     | Panel MP → Webhooks → tu endpoint           |
| `MERCADOPAGO_ACCESS_TOKEN`  | Mismo token (usado en process-payment)   | Panel MP → Credenciales → Producción        |
| `SUPABASE_URL`              | URL del proyecto Supabase                | Supabase → Settings → API → Project URL     |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (NUNCA en frontend)   | Supabase → Settings → API → service_role    |
| `SUPABASE_ANON_KEY`         | Clave anon (para verificar JWT usuario)  | Supabase → Settings → API → anon key        |

### Via CLI de Supabase

```bash
supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxx
supabase secrets set MP_WEBHOOK_SECRET=tu_clave_secreta_de_mp
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Deploy de las Edge Functions

```bash
# Desde la raíz del proyecto
supabase functions deploy process-payment
supabase functions deploy mp-webhook --no-verify-jwt
```

`--no-verify-jwt` es necesario para `mp-webhook` porque MercadoPago llama
al endpoint sin un JWT de usuario de Supabase. La autenticación se realiza
mediante la firma HMAC del header `x-signature`.

---

## 5. Prueba del webhook en modo Sandbox

### Via curl (debugging local)

```bash
SECRET="tu_webhook_secret"
BODY='{"action":"payment.updated","api_version":"v1","data":{"id":"123456789"},"type":"payment","live_mode":false}'
TS=$(date +%s)
DATA_ID="123456789"
REQUEST_ID="test-request-001"

# Firma según spec oficial MP 2025
TEMPLATE="id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};"
SIG=$(echo -n "${TEMPLATE}" | openssl dgst -sha256 -hmac "${SECRET}" | awk '{print $2}')

curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/mp-webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=${TS},v1=${SIG}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -d "${BODY}"
```

Respuesta esperada: `OK` con HTTP 200.

---

## 6. Monitoreo y logs

```bash
supabase functions logs mp-webhook --tail
supabase functions logs process-payment --tail
```

O en el Dashboard: **Supabase → Edge Functions → [nombre] → Logs**

---

## 7. Checklist de seguridad antes de producción

- [ ] `MP_ACCESS_TOKEN` es el token de **producción** (no sandbox)
- [ ] `MP_WEBHOOK_SECRET` fue copiado del panel MP al crear el endpoint
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NO está en ningún archivo del frontend ni en git
- [ ] El archivo `.env` está en `.gitignore`
- [ ] `mp-webhook` fue desplegado con `--no-verify-jwt`
- [ ] `process-payment` fue desplegado sin `--no-verify-jwt` (requiere JWT de usuario)
- [ ] Los logs no muestran errores de firma en el primer webhook de prueba

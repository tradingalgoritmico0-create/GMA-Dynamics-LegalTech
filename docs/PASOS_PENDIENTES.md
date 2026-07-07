# PASOS PENDIENTES — Puesta en marcha GMA Dynamics LegalTech

> Estado al 2026-07-07: el plan de corrección (`PLAN_CORRECCION.md`) está
> **implementado y pusheado completo** (7 commits, `docs:` → `chore(security):`).
> El código está terminado y el build pasa. Lo que falta es SOLO configuración
> de servicios externos, en este orden.

## 1. Conectar el proyecto Supabase (~15 min)

1. `npm install -g supabase` (si no está instalado)
2. `supabase login`
3. `supabase link --project-ref TU_PROJECT_REF` (Settings → General → Reference ID)
4. `supabase db push` — aplica `supabase/migrations/20260707120000_esquema_consolidado.sql`
   (alternativa: pegar el SQL en el editor del dashboard)
5. Registrarse en la app y nombrarse admin:
   ```sql
   UPDATE public.profiles SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'tu-email@...');
   ```

## 2. Credenciales de MercadoPago (~20 min)

1. https://www.mercadopago.com.co/developers/panel → crear/usar aplicación
2. Copiar **credenciales de prueba**: Public Key y Access Token
   (producción solo al final, paso 7)
3. Webhook: Tu negocio → Configuración → Webhooks → Agregar
   - URL: `https://TU_PROJECT_REF.supabase.co/functions/v1/mp-webhook`
   - Evento: **Payments**
   - Copiar la **clave de firma secreta** de inmediato (se muestra una sola vez)

## 3. Secretos y deploy de Edge Functions (~10 min)

```bash
supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxx MP_WEBHOOK_SECRET=clave_del_paso_2.3
supabase functions deploy process-payment
supabase functions deploy judicial-access
supabase functions deploy mp-webhook --no-verify-jwt
```

(SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY los inyecta Supabase solo.)

## 4. Completar `.env` local (~5 min)

```
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=        ← Settings → API → anon key
VITE_MERCADOPAGO_PUBLIC_KEY=   ← Public Key del paso 2
VITE_N8N_WEBHOOK_URL=          ← URL del workflow n8n
```

El workflow n8n recibe POST con: `caseName, phone, email, defendantId, hash,
judicial_link, notification_id` y envía el WhatsApp con `judicial_link`.

## 5. Prueba local de flujos (~30-45 min) — `npm run dev`

1. **Registro** con email nuevo → dashboard con Plan Gratis (5 msgs)
   [valida el trigger `on_auth_user_created`]
2. **Emisión**: subir PDF → `Enviado`, contador 1/5. Segunda emisión
   inmediata → rechazo por cooldown SIN llegar nada a n8n.
3. **Demandado**: abrir `judicial_link` en incógnito → cédula incorrecta
   falla (6º intento bloquea 15 min) → cédula correcta muestra PDF y
   estado pasa a `Leído`.
4. **Pago sandbox**: Settings → Mejorar Plan → tarjeta de prueba MP
   (Mastercard aprobada 5254 1336 7440 3564, nombre APRO) → Plan Medio
   con 20 msgs. Con nombre OTHE (rechazada) → nada cambia.
   Tarjetas: https://www.mercadopago.com.co/developers/es/docs/checkout-bricks/additional-content/your-integrations/test/cards
5. **Webhook**: `supabase functions logs mp-webhook` sin errores de firma.

## 6. Desplegar frontend (~15 min)

Vercel/Netlify → importar repo (framework Vite) → configurar las 4 variables
`VITE_*`. La URL pública del sitio queda embebida en los `judicial_link`:
desplegar ANTES de emitir notificaciones reales.

## 7. Paso a producción

1. Credenciales MP de producción (Public Key en hosting, `MP_ACCESS_TOKEN`
   en secrets) y recrear el webhook en modo producción (nueva clave de firma).
2. Checklist sección 7 de `WEBHOOK_SETUP.md`.

## Decisiones de negocio pendientes

- **Precio mensaje extra**: $5.000 COP provisional
  (`PRICE_PER_EXTRA_MSG_COP` en `supabase/functions/process-payment/index.ts`).
- **Precios de planes**: quedaron $50.000 / $120.000. Si eran los de la página
  vieja ($60.000/$196.000): cambiar en `src/lib/plans.ts` + tabla `plans`
  (migración) + `PLAN_DEFINITIONS` de las dos Edge Functions.
- **Historial git**: commits viejos aún contienen `.env` (placeholders).
  Si alguna vez tuvo claves reales, rotarlas.

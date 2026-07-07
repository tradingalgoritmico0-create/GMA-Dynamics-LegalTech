# PLAN DE CORRECCIÓN — GMA Dynamics LegalTech

> Fecha: 2026-07-07 · Basado en el análisis completo del repo (código frontend, Edge Functions, scripts SQL y QA_AUDIT_REPORT.md).
> Orden de ejecución: las fases están ordenadas por dependencia. La Fase 1 (base de datos) es prerrequisito de todas las demás.

---

## Decisión previa: pasarela de pago única — MercadoPago

Hoy coexisten dos flujos de pago incompatibles:

- **Wompi** (`Pricing.tsx` → `WompiCheckout.tsx`): es el que usa la UI, pero confía en el resultado del widget en el cliente y llama a un RPC `upgrade_plan` que **no existe** en ningún SQL. Roto e inseguro (cualquiera podría invocar el RPC sin pagar).
- **MercadoPago** (`supabase/functions/process-payment` y `mp-webhook`): backend bien construido (verificación JWT, firma HMAC, idempotencia, re-consulta a la API) pero **ningún componente del frontend lo invoca**.

**Recomendación: consolidar en MercadoPago** — el backend ya existe y es sólido; Wompi no tiene nada detrás. Se elimina `WompiCheckout.tsx` y `Paywall.tsx` (código muerto). Si el negocio prefiriera Wompi, habría que construir su webhook + verificación de eventos desde cero (~3-4 días extra) y este plan cambiaría en la Fase 2.

> ⚠️ Regla del proyecto: antes de implementar la Fase 2, consultar la documentación oficial vigente de MercadoPago (SDK JS v2 / Checkout Bricks para Colombia) y confirmar versión exacta. No implementar con ambigüedad.

---

## FASE 1 — Base de datos: migración única consolidada 🔴 CRÍTICA

**Problema raíz:** hay 3 scripts SQL sueltos (`SUPABASE_FINAL_MASTER_2026.sql`, `SUPABASE_JUDICIAL_LOGS.sql`, `FIX_SQL_ERROR_COOLDOWN.txt`) que se pisan entre sí, y el esquema divergió del código.

**Acción:** crear `supabase/migrations/` con el CLI de Supabase y consolidar TODO en una migración inicial versionada. Los scripts sueltos se archivan en `docs/sql-legacy/` (no se borran: son historia).

### 1.1 Columnas faltantes en `profiles` (bloquean los pagos)

Las Edge Functions escriben `payment_id` y `plan_start_date` (`process-payment/index.ts:232-244`, `mp-webhook/index.ts:136-137`) pero el esquema no las define. Todo pago aprobado falla el UPDATE con "column does not exist": **se cobra sin acreditar**.

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMPTZ;

-- Índice único: soporta el chequeo de idempotencia por payment_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_payment_id
  ON public.profiles(payment_id) WHERE payment_id IS NOT NULL;
```

### 1.2 Creación de perfil vía trigger de DB (registro roto hoy)

`App.tsx:36` inserta el perfil desde el cliente, pero `profiles` no tiene política INSERT → RLS rechaza, el error se silencia y el usuario nuevo queda sin dashboard. Además `Login.tsx:33` guarda el plan elegido en localStorage y nadie lo lee.

**Solución:** trigger sobre `auth.users` que crea el perfil leyendo el plan desde `user_metadata` (el frontend lo pasará en `signUp options.data`, ver Fase 5.1). Elimina la necesidad de política INSERT y el reload del cliente.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan TEXT := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'Plan Gratis Judicial');
BEGIN
  INSERT INTO public.profiles (id, full_name, plan, limit_msgs, sent_msgs, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_plan,
    5,          -- los límites de pago los asigna SOLO la Edge Function tras cobro real
    0,
    'Activo'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

> Nota: aunque el usuario "elija" Plan Medio/Pro al registrarse, el perfil nace con límite 5. El plan de pago solo se activa cuando `process-payment`/`mp-webhook` confirman el cobro. Evita escalada de plan sin pago.

### 1.3 Lectura pública de la notificación por hash (flujo del demandado roto hoy)

`PublicView.tsx:29-42` consulta `notifications` como anónimo, pero la única política SELECT exige `auth.uid() = owner_id` → todo enlace muestra "no encontrado".

**No** añadir política SELECT anónima sobre la tabla (expondría columnas sensibles). En su lugar, RPC de superficie mínima:

```sql
CREATE OR REPLACE FUNCTION public.get_public_notification(p_hash TEXT)
RETURNS TABLE (case_name TEXT, status TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT case_name, status FROM public.notifications WHERE file_hash = p_hash;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_notification(TEXT) TO anon;
```

### 1.4 Integridad y rendimiento

```sql
-- El hash es la clave de búsqueda pública: debe ser único
ALTER TABLE public.notifications ADD CONSTRAINT uq_notifications_file_hash UNIQUE (file_hash);

-- Índices pendientes del QA report (BUG-012)
CREATE INDEX IF NOT EXISTS idx_notifications_owner_id   ON public.notifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_notification_id ON public.notification_evidence(notification_id);
```

### 1.5 Corregir `is_admin()` (la rama por email nunca matchea)

Supabase normaliza emails a minúsculas en el JWT; `'Admin2577@gma.co'` no matchea nunca. Además el email hardcodeado en SQL es frágil. **Dejar solo el chequeo por rol:**

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Seed del admin (una sola vez, con el UUID real del usuario admin):
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid-admin>';
```

Eliminar `VITE_SUPER_ADMIN_EMAIL` del `.env` (la detección de admin ya no depende de email).

### 1.6 Enforcement del límite de mensajes en DB

Hoy NADA impide superar `limit_msgs` (solo existe el cooldown de 30 min del plan gratis). Extender el trigger existente:

```sql
CREATE OR REPLACE FUNCTION public.check_send_allowed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- FOR UPDATE: serializa envíos concurrentes del mismo usuario (TC-04 del QA report)
  SELECT last_msg_at, plan, sent_msgs, limit_msgs, status INTO v_profile
  FROM public.profiles WHERE id = auth.uid() FOR UPDATE;

  IF v_profile.status IS DISTINCT FROM 'Activo' THEN
    RAISE EXCEPTION 'ACCOUNT_INACTIVE';
  END IF;
  IF v_profile.sent_msgs >= v_profile.limit_msgs THEN
    RAISE EXCEPTION 'LIMIT_REACHED: Ha alcanzado el límite de su plan.';
  END IF;
  IF v_profile.plan = 'Plan Gratis Judicial'
     AND v_profile.last_msg_at IS NOT NULL
     AND v_profile.last_msg_at > now() - interval '30 minutes' THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE: Espere 30 minutos entre envíos en el Plan Gratis.';
  END IF;

  UPDATE public.profiles
     SET last_msg_at = now(), sent_msgs = sent_msgs + 1
   WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_cooldown ON public.notifications;
CREATE TRIGGER tr_send_guard BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.check_send_allowed();
```

> Decisión implícita: `sent_msgs` se incrementa al INSERTAR la notificación (no al confirmar entrega). El RPC `confirm_delivery` deja de incrementar `sent_msgs` (hoy lo hace, y duplicaría el conteo) — se ajusta en la misma migración.

### 1.7 Políticas RLS finales de `profiles`

```sql
-- SELECT propio (ya existe) + admin total (ya existe). Añadir:
-- UPDATE propio SOLO de campos no sensibles → mediante trigger de guardia,
-- porque RLS no restringe columnas:
CREATE POLICY "Profiles: Update Propio" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Campos que solo backend (service_role salta triggers RLS pero no este trigger:
    -- por eso se permite cuando el rol de sesión es service_role) o admin pueden tocar
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
      NEW.plan        := OLD.plan;
      NEW.limit_msgs  := OLD.limit_msgs;
      NEW.sent_msgs   := OLD.sent_msgs;
      NEW.role        := OLD.role;
      NEW.status      := OLD.status;
      NEW.payment_id  := OLD.payment_id;
      NEW.plan_start_date := OLD.plan_start_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tr_protect_profile BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();
```

### 1.8 Catálogo canónico de planes (fuente única de verdad)

Hoy los nombres de plan divergen: `process-payment` crea `"Plan Inicial (5 Msgs)"`, pero la política de retención RLS y el frontend comparan contra `"Plan Gratis Judicial"` → un usuario con ese nombre caería en la rama ELSE (5 años de retención, trato de Pro).

```sql
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,              -- 'gratis' | 'medio' | 'pro'
  name TEXT NOT NULL UNIQUE,        -- 'Plan Gratis Judicial' | 'Plan Medio Judicial' | 'Plan Pro Judicial'
  limit_msgs INTEGER NOT NULL,
  retention_months INTEGER NOT NULL, -- 2 | 12 | 60
  price_cop INTEGER NOT NULL         -- 0 | 50000 | 120000
);
INSERT INTO public.plans VALUES
  ('gratis', 'Plan Gratis Judicial', 5,   2,  0),
  ('medio',  'Plan Medio Judicial',  20,  12, 50000),
  ('pro',    'Plan Pro Judicial',    100, 60, 120000)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, limit_msgs = EXCLUDED.limit_msgs,
  retention_months = EXCLUDED.retention_months, price_cop = EXCLUDED.price_cop;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans: lectura pública" ON public.plans FOR SELECT USING (true);
```

La política de retención de `notifications` pasa a leer `plans.retention_months` en lugar del CASE hardcodeado. Las Edge Functions y el frontend leen de aquí (o de constantes generadas de aquí).

**Criterio de cierre Fase 1:** `supabase db reset` levanta el esquema completo desde migraciones sin errores; los tests SQL de la Fase 6 pasan.

---

## FASE 2 — Pagos: un solo flujo MercadoPago 🔴 CRÍTICA

### 2.1 Frontend → `process-payment`

- Integrar el SDK oficial de MercadoPago (Checkout Bricks / CardPayment Brick) en un nuevo componente `src/components/MpCheckout.tsx`. **Verificar docs oficiales y versión del SDK antes de codificar.**
- El Brick tokeniza la tarjeta → se invoca la Edge Function:

```ts
const { data, error } = await supabase.functions.invoke('process-payment', {
  body: { token, amount, description, user_id, payment_type: 'upgrade', plan_id: 'medio' },
});
```

- `Pricing.tsx`: reemplazar `<WompiCheckout>` por el nuevo componente; los precios/planes se leen de la tabla `plans`.
- La cédula real del pagador (BUG-006 del QA report) se toma del formulario del Brick, no hardcodeada.

### 2.2 Eliminar el flujo Wompi y código muerto

- Borrar `src/components/WompiCheckout.tsx` y `src/components/Paywall.tsx`.
- No crear jamás el RPC `upgrade_plan`: los cambios de plan solo ocurren vía Edge Functions con service_role tras cobro verificado.

### 2.3 Alinear las Edge Functions

- **Unificar el nombre del secreto**: `process-payment` usa `MERCADOPAGO_ACCESS_TOKEN` y `mp-webhook` usa `MP_ACCESS_TOKEN` para el mismo token. Unificar en `MP_ACCESS_TOKEN` (y actualizar `WEBHOOK_SETUP.md`).
- **Nombres de plan**: ambas funciones leen el catálogo canónico (o constantes idénticas a la tabla `plans`); eliminar `"Plan Inicial (5 Msgs)"`.
- `process-payment`: al hacer upgrade, calcular y persistir `next_billing_date = plan_start_date + 30 días` (hoy el vencimiento se calcula en el cliente — BUG-013).

### 2.4 Despliegue

```bash
supabase secrets set MP_ACCESS_TOKEN=... MP_WEBHOOK_SECRET=...
supabase functions deploy process-payment
supabase functions deploy mp-webhook --no-verify-jwt
```

Configurar el webhook en el panel MP según `WEBHOOK_SETUP.md` (ya documentado y correcto).

**Criterio de cierre Fase 2:** pago sandbox aprobado actualiza `profiles` (plan, límite, `payment_id`, `plan_start_date`, `next_billing_date`); webhook duplicado no duplica (TC-03); tarjeta rechazada no modifica nada (TC-02).

---

## FASE 3 — Flujo de emisión de notificaciones (Dashboard) 🟠 ALTA

### 3.1 Reordenar `handleSend` (`Dashboard.tsx:97-160`)

Hoy: cifra → sube a Storage → **dispara n8n (sale el WhatsApp)** → INSERT (donde recién se valida cooldown/límite). Si el trigger rechaza, el mensaje ya salió sin registro.

Orden correcto (saga con compensación):

1. `INSERT` en `notifications` con `status = 'pendiente'` → aquí el trigger valida cooldown + límite + cuenta activa. Si falla, no se ha enviado nada.
2. Subir PDF cifrado a Storage (`lawsuits/<uid>/<notif_id>.pdf` — usar el id de la notificación, no `Date.now()`).
3. Llamar webhook n8n con hash + enlace.
4. `UPDATE status = 'enviado'`.
5. Si 2 o 3 fallan → `UPDATE status = 'error'` y mostrar reintento al usuario (la fila queda como evidencia del intento).

### 3.2 Limpiar la lógica de retención duplicada

`Dashboard.tsx:69-78` re-filtra por plan lo que la política RLS ya filtra. Eliminar el filtro del cliente (una sola fuente de verdad: la política que ahora lee `plans.retention_months`).

### 3.3 UX de errores

Reemplazar los `alert()` por estado de UI (banner de error/éxito en el formulario). Mapear `LIMIT_REACHED`, `COOLDOWN_ACTIVE` y `ACCOUNT_INACTIVE` a mensajes claros con CTA a "Mejorar Plan".

**Criterio de cierre Fase 3:** con límite agotado o cooldown activo, NO se llama a n8n ni se sube archivo; el envío feliz termina en `status='enviado'` y descuenta 1 del cupo exactamente una vez.

---

## FASE 4 — Vista pública del demandado 🟠 ALTA

### 4.1 Nueva Edge Function `judicial-access`

Reemplaza la combinación insegura/rota de RPC + `createSignedUrl` anónimo (`PublicView.tsx:54-89`). Recibe `{ hash, id_number }` y con service_role:

1. Busca la notificación por hash; valida la cédula.
2. **Registra la evidencia forense server-side**: IP real desde los headers (`x-forwarded-for`), user-agent del request, geo por IP consultada desde el servidor (no confiar en `ipapi.co` desde el navegador, que un demandado hostil puede falsear o bloquear).
3. Registra TAMBIÉN los intentos fallidos (`action_type = 'validation_failed'`) — valor forense y base para rate-limiting.
4. Rate-limit: máximo N intentos fallidos por hash+IP en ventana de tiempo (mitiga fuerza bruta de cédulas, que son enumerables).
5. Si valida: marca `status='Leído'`, `viewed_at=now()` y devuelve una signed URL del bucket generada con service_role (TTL 1 hora).

### 4.2 Simplificar `PublicView.tsx`

- Info inicial del caso: RPC `get_public_notification` (Fase 1.3).
- Botón "Firmar y Ver Documento": llama a `judicial-access`; eliminar `captureEvidence()` del cliente.

### 4.3 Consolidar validadores

`PublicValidator.tsx` (flujo viejo por query-params `?hash=&case=`) duplica a `PublicView`. Decidir: si ya no se emiten enlaces con ese formato, eliminarlo junto con su rama en `App.tsx:93-99`; si hay enlaces vivos, redirigir internamente al flujo `/view/:hash`.

**Criterio de cierre Fase 4:** un anónimo con el enlace ve el caso, valida cédula correcta → PDF; cédula incorrecta → error + evidencia de intento fallido; N fallos → bloqueo temporal; nada de esto requiere políticas anónimas sobre tablas.

---

## FASE 5 — Frontend: registro, secretos e higiene 🟡 MEDIA

### 5.1 Registro (`Login.tsx`, `App.tsx`)

- `Login.tsx`: pasar el plan en el signUp y eliminar el localStorage muerto:

```ts
await supabase.auth.signUp({
  email, password,
  options: { data: { full_name: fullName, selected_plan: selectedPlan } }
});
```

- `App.tsx`: eliminar `createDefaultProfile` (líneas 35-48) y el `window.location.reload()` — el trigger de DB (Fase 1.2) crea el perfil. Si el perfil aún no existe al consultar (latencia del trigger), reintentar 1-2 veces con backoff corto.

### 5.2 Saneamiento de secretos y del repo

- `git rm --cached .env`, añadir `.env` a `.gitignore` (hoy está versionado) y crear `.env.example` con placeholders.
- Eliminar del `.env`: `VITE_SUPER_ADMIN_EMAIL` (obsoleto tras Fase 1.5) y `VITE_PDF_OWNER_PASSWORD` (ya no se usa: `Dashboard.tsx:106` usa `crypto.randomUUID()`).
- Si el `.env` llegó a contener claves reales en algún commit: **rotarlas** (anon key de Supabase, llaves MP/Wompi, URL n8n).

### 5.3 Constantes compartidas de planes

Crear `src/lib/plans.ts` (o cargar la tabla `plans` al inicio) y reemplazar todas las comparaciones por string dispersas (`Dashboard.tsx:75-77,376`, `Settings.tsx:36,99,129,133,140`, `Login.tsx:19-22`).

### 5.4 Varios

- `Dashboard.tsx:54-55`: leer `next_billing_date` de DB en lugar de calcular +30 días en el cliente.
- Quitar el buscador decorativo de la tabla (input sin handler, `Dashboard.tsx:257`) o implementarlo.
- `README.md` sigue siendo la plantilla de Vite: documentar setup real (env vars, migraciones, deploy de functions).

---

## FASE 6 — Verificación integral 🟢 CIERRE

1. **Build**: `npm run build` sin errores (regla de GEMINI.md).
2. **Tests SQL de RLS** (en el SQL editor o pgTAP), simulando `request.jwt.claims`:
   - Usuario A no lee/edita perfil ni notificaciones de B.
   - Anónimo no lee `notifications` ni `profiles` directamente.
   - No-admin no puede tocar `plan`, `limit_msgs`, `role` (trigger de guardia).
   - Retención: notificación de hace 3 meses invisible para plan Gratis, visible para Medio/Pro.
3. **Matriz E2E manual** (mapea los TC del QA report):
   - Registro email + Google → perfil creado con plan correcto (TC nuevo).
   - Envío feliz → `pendiente → enviado`, cupo descuenta 1.
   - Cooldown y límite: rechazo ANTES de tocar Storage/n8n (TC-04).
   - Pago sandbox aprobado/rechazado (TC-01, TC-02); webhook duplicado (TC-03, con el curl de `WEBHOOK_SETUP.md`).
   - Flujo demandado completo + intento con cédula errónea + rate-limit.
4. **Checklist de secretos** (sección 7 de `WEBHOOK_SETUP.md`) completo antes de producción.

---

## Resumen de esfuerzo y orden

| Fase | Alcance | Esfuerzo estimado | Bloquea a |
|------|---------|-------------------|-----------|
| 1 | Migración DB consolidada | 1 día | 2, 3, 4, 5 |
| 2 | Pagos MercadoPago end-to-end | 1-2 días (incluye leer docs MP) | — |
| 3 | Flujo de emisión | 0.5-1 día | — |
| 4 | Vista pública + Edge Function | 1 día | — |
| 5 | Registro, secretos, limpieza | 0.5 día | — |
| 6 | Verificación | 0.5-1 día | producción |

Las fases 2, 3 y 4 son independientes entre sí una vez cerrada la Fase 1.

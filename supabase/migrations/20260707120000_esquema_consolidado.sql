-- ============================================================================
-- GMA DYNAMICS LEGALTECH — MIGRACIÓN CONSOLIDADA v5.0
-- Reemplaza a: SUPABASE_FINAL_MASTER_2026.sql, SUPABASE_JUDICIAL_LOGS.sql,
--              FIX_SQL_ERROR_COOLDOWN.txt (archivados en docs/sql-legacy/)
-- Idempotente: puede ejecutarse sobre una base existente o vacía.
-- ============================================================================

-- ============================================================================
-- 1. TABLAS
-- ============================================================================

-- Catálogo canónico de planes: fuente única de verdad para nombres, límites,
-- retención y precios. Frontend y Edge Functions leen de aquí.
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,                -- 'gratis' | 'medio' | 'pro'
  name TEXT NOT NULL UNIQUE,
  limit_msgs INTEGER NOT NULL,
  retention_months INTEGER NOT NULL,
  price_cop INTEGER NOT NULL
);

INSERT INTO public.plans (id, name, limit_msgs, retention_months, price_cop) VALUES
  ('gratis', 'Plan Gratis Judicial', 5,   2,  0),
  ('medio',  'Plan Medio Judicial',  20,  12, 50000),
  ('pro',    'Plan Pro Judicial',    100, 60, 120000)
ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  limit_msgs       = EXCLUDED.limit_msgs,
  retention_months = EXCLUDED.retention_months,
  price_cop        = EXCLUDED.price_cop;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  tarjeta_profesional TEXT,
  plan TEXT DEFAULT 'Plan Gratis Judicial',
  limit_msgs INTEGER DEFAULT 5,
  sent_msgs INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Activo',
  role TEXT DEFAULT 'user',
  retention_days INTEGER DEFAULT 60,
  last_msg_at TIMESTAMPTZ,
  subscription_start TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Columnas que las Edge Functions escriben y faltaban en el esquema original
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_msg_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.defendants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cedula TEXT NOT NULL,
  nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cedula, owner_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  case_name TEXT NOT NULL,
  defendant_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  file_path TEXT,
  storage_path TEXT,
  file_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS storage_path TEXT;

CREATE TABLE IF NOT EXISTS public.notification_evidence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  access_date TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  location_data JSONB,
  city TEXT,
  region TEXT,
  country TEXT,
  device_info TEXT,
  browser_info TEXT,
  action_type TEXT DEFAULT 'pdf_open'
);

CREATE TABLE IF NOT EXISTS public.usage_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  notification_id uuid REFERENCES public.notifications(id),
  action TEXT,
  amount INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. INTEGRIDAD E ÍNDICES
-- ============================================================================

-- El hash es la clave de acceso público del demandado: debe ser único
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_notifications_file_hash'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT uq_notifications_file_hash UNIQUE (file_hash);
  END IF;
END $$;

-- Índice único para el chequeo de idempotencia de pagos por payment_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_payment_id
  ON public.profiles(payment_id) WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_owner_id   ON public.notifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_notification_id ON public.notification_evidence(notification_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id        ON public.usage_log(user_id);

-- ============================================================================
-- 3. LIMPIEZA DE POLÍTICAS Y ARTEFACTOS OBSOLETOS
-- ============================================================================

DO $$
DECLARE
  tables TEXT[] := ARRAY['plans', 'profiles', 'notifications', 'defendants', 'notification_evidence', 'usage_log'];
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Artefactos reemplazados por esta migración
DROP TRIGGER  IF EXISTS tr_cooldown ON public.notifications;
DROP FUNCTION IF EXISTS public.check_cooldown_trigger();
-- validate_and_log_access se reemplaza por la Edge Function judicial-access
-- (la evidencia se captura server-side con IP real de los headers)
DROP FUNCTION IF EXISTS public.validate_and_log_access(TEXT, TEXT, TEXT, TEXT, JSONB);
-- upgrade_plan nunca debe existir: los cambios de plan solo vía Edge Functions
DROP FUNCTION IF EXISTS public.upgrade_plan(TEXT, INTEGER);

-- ============================================================================
-- 4. FUNCIONES DE SEGURIDAD
-- ============================================================================

-- Detección de admin SOLO por rol en profiles.
-- (El chequeo anterior por email nunca matcheaba: Supabase normaliza los
-- emails del JWT a minúsculas y el literal tenía mayúsculas.)
-- Para nombrar un admin: UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================================
-- 5. CREACIÓN AUTOMÁTICA DE PERFIL (reemplaza el INSERT desde el cliente)
-- ============================================================================

-- El perfil SIEMPRE nace en Plan Gratis: los planes de pago los activa
-- exclusivamente process-payment/mp-webhook tras un cobro verificado.
-- El plan que el usuario eligió al registrarse viaja en user_metadata
-- (selected_plan) y el frontend lo usa solo para dirigirlo al checkout.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_free public.plans%ROWTYPE;
BEGIN
  SELECT * INTO v_free FROM public.plans WHERE id = 'gratis';
  INSERT INTO public.profiles (id, full_name, plan, limit_msgs, sent_msgs, status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    v_free.name,
    v_free.limit_msgs,
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

-- ============================================================================
-- 6. GUARDIA DE ENVÍO: LÍMITE + COOLDOWN, ATÓMICO
-- ============================================================================

-- FOR UPDATE serializa envíos concurrentes del mismo usuario (evita superar
-- el límite con doble click / dos pestañas). sent_msgs se descuenta AQUÍ,
-- al emitir; confirm_delivery ya no incrementa (evita doble conteo).
CREATE OR REPLACE FUNCTION public.check_send_allowed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT last_msg_at, plan, sent_msgs, limit_msgs, status
    INTO v_profile
    FROM public.profiles WHERE id = auth.uid()
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  IF v_profile.status IS DISTINCT FROM 'Activo' THEN
    RAISE EXCEPTION 'ACCOUNT_INACTIVE: Su cuenta no está activa.';
  END IF;
  IF v_profile.sent_msgs >= v_profile.limit_msgs THEN
    RAISE EXCEPTION 'LIMIT_REACHED: Ha alcanzado el límite de notificaciones de su plan.';
  END IF;
  IF v_profile.plan = (SELECT name FROM public.plans WHERE id = 'gratis')
     AND v_profile.last_msg_at IS NOT NULL
     AND v_profile.last_msg_at > now() - interval '30 minutes' THEN
    RAISE EXCEPTION 'COOLDOWN_ACTIVE: Espere 30 minutos entre envíos en el Plan Gratis.';
  END IF;

  -- Flag transaccional que autoriza a tocar campos protegidos de profiles
  PERFORM set_config('gma.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
     SET last_msg_at = now(), sent_msgs = sent_msgs + 1
   WHERE id = auth.uid();
  PERFORM set_config('gma.bypass_profile_guard', '', true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_send_guard ON public.notifications;
CREATE TRIGGER tr_send_guard
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.check_send_allowed();

-- ============================================================================
-- 7. GUARDIA DE CAMPOS SENSIBLES EN PROFILES
-- ============================================================================

-- RLS no restringe columnas: este trigger impide que un usuario no-admin
-- modifique su propio plan, límites, rol o estado. service_role (Edge
-- Functions) y las funciones internas (flag gma.bypass_profile_guard) pasan.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.jwt()->>'role', '') = 'service_role'
     OR public.is_admin()
     OR COALESCE(current_setting('gma.bypass_profile_guard', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  NEW.plan            := OLD.plan;
  NEW.limit_msgs      := OLD.limit_msgs;
  NEW.sent_msgs       := OLD.sent_msgs;
  NEW.role            := OLD.role;
  NEW.status          := OLD.status;
  NEW.payment_id      := OLD.payment_id;
  NEW.plan_start_date := OLD.plan_start_date;
  NEW.next_billing_date := OLD.next_billing_date;
  NEW.last_msg_at     := OLD.last_msg_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile ON public.profiles;
CREATE TRIGGER tr_protect_profile
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ============================================================================
-- 8. RLS
-- ============================================================================

ALTER TABLE public.plans                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defendants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log             ENABLE ROW LEVEL SECURITY;

-- Planes: catálogo público (los precios se muestran en la landing)
CREATE POLICY "Plans: Lectura pública" ON public.plans
  FOR SELECT USING (true);

-- Profiles
CREATE POLICY "Profiles: Select Propio" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles: Update Propio" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: Admin Total" ON public.profiles
  FOR ALL USING (public.is_admin());
-- Sin política INSERT: los perfiles solo los crea el trigger on_auth_user_created

-- Defendants
CREATE POLICY "Defendants: Gestión Propia" ON public.defendants
  FOR ALL USING (auth.uid() = owner_id OR public.is_admin());

-- Notifications: visibilidad con retención según catálogo de planes.
-- Si el plan del perfil no existe en el catálogo, la subconsulta es NULL y la
-- fila queda oculta (default seguro).
CREATE POLICY "Notifications: Select Owner con Retención" ON public.notifications
  FOR SELECT USING (
    (
      auth.uid() = owner_id
      AND created_at > now() - make_interval(months => (
        SELECT pl.retention_months
          FROM public.plans pl
          JOIN public.profiles pr ON pr.plan = pl.name
         WHERE pr.id = auth.uid()
      ))
    )
    OR public.is_admin()
  );
CREATE POLICY "Notifications: Insert Owner" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
-- El owner actualiza el estado operativo de sus envíos (pendiente→enviado/error).
-- Los estados con valor probatorio (Leído, entregado) los fijan la Edge Function
-- judicial-access y el RPC confirm_delivery; la evidencia legal vive en
-- notification_evidence, que el owner no puede escribir.
CREATE POLICY "Notifications: Update Owner" ON public.notifications
  FOR UPDATE USING (auth.uid() = owner_id OR public.is_admin())
  WITH CHECK (auth.uid() = owner_id OR public.is_admin());

-- Evidencia forense: el abogado la LEE para sus notificaciones; solo el
-- backend (service_role, que salta RLS) la escribe.
CREATE POLICY "Evidence: Select Owner" ON public.notification_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
       WHERE n.id = notification_id AND n.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Usage log
CREATE POLICY "UsageLog: Select Propio" ON public.usage_log
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================================
-- 9. RPCs
-- ============================================================================

-- Superficie mínima pública para la pantalla del demandado (/view/:hash).
-- NO se abre la tabla notifications a anónimos.
CREATE OR REPLACE FUNCTION public.get_public_notification(p_hash TEXT)
RETURNS TABLE (case_name TEXT, status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.case_name, n.status FROM public.notifications n WHERE n.file_hash = p_hash;
$$;

-- Listado completo de perfiles, solo admin (lo usa AdminDashboard)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN QUERY SELECT * FROM public.profiles;
  ELSE
    RAISE EXCEPTION 'Acceso denegado';
  END IF;
END;
$$;

-- Confirmación de entrega (webhook n8n / backoffice).
-- Ya NO incrementa sent_msgs: el consumo se descuenta al emitir (tr_send_guard).
CREATE OR REPLACE FUNCTION public.confirm_delivery(notif_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.notifications
     SET status = 'entregado', delivered_at = now()
   WHERE id = notif_id;
  INSERT INTO public.usage_log (user_id, notification_id, action)
  SELECT owner_id, id, 'delivered' FROM public.notifications WHERE id = notif_id;
END;
$$;

-- Permisos de ejecución explícitos
REVOKE ALL ON FUNCTION public.get_public_notification(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_notification(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_all_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_delivery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(uuid) TO service_role;

-- ============================================================================
-- 10. STORAGE — bucket 'lawsuits'
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lawsuits', 'lawsuits', false)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname LIKE 'Lawsuits:%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- El abogado sube y lee SOLO dentro de su carpeta (<uid>/...).
-- El demandado nunca toca Storage directamente: recibe una signed URL
-- generada por la Edge Function judicial-access con service_role.
CREATE POLICY "Lawsuits: Upload Propio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lawsuits' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Lawsuits: Select Propio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lawsuits' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========================================================================
-- GMA DYNAMICS LEGALTECH: INFRAESTRUCTURA INTEGRAL DEFINITIVA (2026)
-- Versión: 4.2 - IDEMPOTENTE (SIN ERRORES DE DUPLICIDAD)
-- ========================================================================

-- 1. LIMPIEZA INICIAL DE RLS PARA EVITAR RECURSIÓN Y DUPLICIDAD
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.defendants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_evidence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    tables TEXT[] := ARRAY['profiles', 'notifications', 'defendants', 'notification_evidence', 'usage_log'];
    t TEXT;
    pol RECORD;
BEGIN 
    FOREACH t IN ARRAY tables LOOP
        FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = t) LOOP 
            EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.' || t; 
        END LOOP; 
    END LOOP;
END $$;

-- 2. DEFINICIÓN DE TABLAS (PRESERVANDO 100% DE FUNCIONALIDADES)
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

-- 3. SEGURIDAD Y RLS (ZERO-TRUST)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defendants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

-- Función de Administrador Maestra
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email' = 'Admin2577@gma.co') OR 
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$;

-- Políticas de Perfiles
CREATE POLICY "Profiles: Acceso Propio" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles: Admin Total" ON public.profiles FOR ALL USING (public.is_admin());

-- Políticas de Demandados
CREATE POLICY "Defendants: Gestión Propia" ON public.defendants FOR ALL USING (auth.uid() = owner_id OR public.is_admin());

-- Políticas de Notificaciones con Retención Legal
CREATE POLICY "Notifications: Abogados con Retención" ON public.notifications
FOR SELECT USING (
  auth.uid() = owner_id AND (
    CASE 
      WHEN (SELECT plan FROM public.profiles WHERE id = auth.uid()) = 'Plan Gratis Judicial' THEN created_at > now() - interval '2 months'
      WHEN (SELECT plan FROM public.profiles WHERE id = auth.uid()) = 'Plan Medio Judicial' THEN created_at > now() - interval '1 year'
      ELSE created_at > now() - interval '5 years'
    END
  ) OR public.is_admin()
);
CREATE POLICY "Notifications: Abogados Insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 4. LÓGICA DE COOLDOWN (30 MINUTOS)
CREATE OR REPLACE FUNCTION public.check_cooldown_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_last_msg TIMESTAMPTZ;
    v_plan TEXT;
BEGIN
    SELECT last_msg_at, plan INTO v_last_msg, v_plan FROM public.profiles WHERE id = auth.uid();
    IF v_plan = 'Plan Gratis Judicial' AND v_last_msg IS NOT NULL THEN
        IF v_last_msg > now() - interval '30 minutes' THEN
            RAISE EXCEPTION 'COOLDOWN_ACTIVE: Espere 30 minutos entre envíos en el Plan Gratis.';
        END IF;
    END IF;
    UPDATE public.profiles SET last_msg_at = now() WHERE id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_cooldown ON public.notifications;
CREATE TRIGGER tr_cooldown BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.check_cooldown_trigger();

-- 5. FUNCIONES RPC (PRESERVANDO ORIGINALES)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.is_admin() THEN RETURN QUERY SELECT * FROM public.profiles;
  ELSE RAISE EXCEPTION 'Acceso denegado'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_delivery(notif_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.notifications SET status = 'entregado', delivered_at = now() WHERE id = notif_id;
  UPDATE public.profiles p SET sent_msgs = sent_msgs + 1 FROM public.notifications n WHERE n.id = notif_id AND p.id = n.owner_id;
  INSERT INTO public.usage_log (user_id, notification_id, action) SELECT owner_id, id, 'charge' FROM public.notifications WHERE id = notif_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_and_log_access(p_hash TEXT, p_id_number TEXT, p_ip TEXT, p_ua TEXT, p_geo JSONB)
RETURNS TABLE (file_path_out TEXT, status_code TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_notif_id UUID; v_defendant_id TEXT; v_storage_path TEXT;
BEGIN
    SELECT id, defendant_id, COALESCE(storage_path, file_path) INTO v_notif_id, v_defendant_id, v_storage_path FROM public.notifications WHERE file_hash = p_hash;
    IF v_notif_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    IF v_defendant_id != p_id_number THEN RAISE EXCEPTION 'INVALID_ID'; END IF;
    INSERT INTO public.notification_evidence (notification_id, ip_address, user_agent, location_data, city, region, country, action_type)
    VALUES (v_notif_id, p_ip, p_ua, p_geo, p_geo->>'city', p_geo->>'region', p_geo->>'country', 'legal_notification_accepted');
    UPDATE public.notifications SET status = 'Leído', viewed_at = now() WHERE id = v_notif_id;
    RETURN QUERY SELECT v_storage_path, 'SUCCESS'::TEXT;
END;
$$;

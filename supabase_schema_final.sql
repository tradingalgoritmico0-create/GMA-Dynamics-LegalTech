-- ========================================================================
-- GMA DYNAMICS: SCHEMA MAESTRO DE SEGURIDAD (VERSIÓN FINAL COMPATIBLE)
-- EJECUTAR ESTO PARA SOLUCIONAR EL ERROR DE "POLICY ALREADY EXISTS"
-- ========================================================================

-- 1. TABLA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  plan TEXT DEFAULT 'Plan Gratis Judicial',
  limit_msgs INTEGER DEFAULT 5,
  sent_msgs INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Inactivo',
  payment_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  defendant_id TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  status TEXT DEFAULT 'Enviado',
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  read_at TIMESTAMP WITH TIME ZONE
);

-- 3. HABILITAR SEGURIDAD (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR POLÍTICAS EXISTENTES PARA EVITAR ERRORES
DROP POLICY IF EXISTS "Profiles: Insertar propio" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Ver propio" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Actualizar propio" ON public.profiles;
DROP POLICY IF EXISTS "Admin: Control Total Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Notifs: Ver propias" ON public.notifications;
DROP POLICY IF EXISTS "Notifs: Insertar propias" ON public.notifications;
DROP POLICY IF EXISTS "Admin: Ver todas las Notifs" ON public.notifications;

-- 5. RE-CREAR POLÍTICAS DE SEGURIDAD
-- Usuarios
CREATE POLICY "Profiles: Insertar propio" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: Ver propio" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles: Actualizar propio" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Notifs: Ver propias" ON public.notifications FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Notifs: Insertar propias" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Admin Bypass (Acceso total para gestionar usuarios)
CREATE POLICY "Admin: Control Total Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin: Ver todas las Notifs" ON public.notifications FOR SELECT USING (true);

-- 6. FUNCIÓN RPC: OBTENER TODOS LOS USUARIOS (Admin Dashboard)
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    plan text,
    limit_msgs integer,
    sent_msgs integer,
    status text,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        COALESCE(p.full_name, 'Usuario sin nombre'),
        COALESCE(p.plan, 'Sin Plan'),
        COALESCE(p.limit_msgs, 0),
        COALESCE(p.sent_msgs, 0),
        COALESCE(p.status, 'Inactivo'),
        p.updated_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    ORDER BY p.updated_at DESC NULLS LAST;
END;
$$;

-- 7. PERMISOS DE EJECUCIÓN
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO service_role;

-- ========================================================================
-- FIN DEL SCHEMA CORREGIDO
-- ========================================================================

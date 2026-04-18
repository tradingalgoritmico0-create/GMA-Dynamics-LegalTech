-- ========================================================================
-- GMA DYNAMICS: SECURITY FIX V2 (PRODUCCIÓN - ZERO TRUST)
-- ========================================================================

-- 1. FUNCIÓN HELPER: VERIFICAR SI EL USUARIO ES ADMIN
-- Solo el correo Admin2577@gma.co tiene privilegios administrativos reales.
-- Se usa SECURITY DEFINER para poder leer de auth.users sin que el usuario tenga permisos directos.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() 
    AND email = 'Admin2577@gma.co'
  );
END;
$$;

-- 2. CORRECCIÓN DE POLÍTICAS RLS EN PROFILES
-- Eliminamos el bypass inseguro
DROP POLICY IF EXISTS "Admin: Control Total Profiles" ON public.profiles;

-- Nueva política: Solo admins reales pueden ver y editar perfiles ajenos.
-- Los usuarios normales ya tienen sus propias políticas "Profiles: Ver propio" etc.
CREATE POLICY "Admin: Gestión Total Profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 3. CORRECCIÓN DE POLÍTICAS RLS EN NOTIFICATIONS
DROP POLICY IF EXISTS "Admin: Ver todas las Notifs" ON public.notifications;

-- Nueva política: Solo admins pueden ver notificaciones de otros.
CREATE POLICY "Admin: Ver todas las Notifs" 
ON public.notifications 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

-- 4. SEGURIDAD EN FUNCIONES RPC (SECURITY DEFINER)
-- Revocamos permisos a anon para que visitantes no autorizados no vean datos.
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO service_role; -- Para Edge Functions si fuera necesario
-- Permitimos a authenticated pero con guardia interna:
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;

-- Modificamos la función para incluir guardia interna explicita
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    plan text,
    limit_msgs integer,
    sent_msgs integer,
    status text,
    updated_at timestamptz,
    plan_start_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- GUARDIA DE SEGURIDAD INTERNA
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren privilegios de administrador.';
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        COALESCE(p.full_name, 'Usuario sin nombre'),
        COALESCE(p.plan, 'Sin Plan'),
        COALESCE(p.limit_msgs, 0),
        COALESCE(p.sent_msgs, 0),
        COALESCE(p.status, 'Inactivo'),
        p.updated_at,
        p.plan_start_date
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    ORDER BY p.updated_at DESC NULLS LAST;
END;
$$;

-- 5. SEGURIDAD EN FUNCIÓN admin_update_user_plan
REVOKE EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text, integer, text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text, integer, text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text, integer, text, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(
    p_user_id uuid,
    p_plan_type text,
    p_limit_msgs integer,
    p_status text,
    p_start_date timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- GUARDIA DE SEGURIDAD INTERNA
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren privilegios de administrador.';
    END IF;

    UPDATE public.profiles
    SET plan = p_plan_type,
        limit_msgs = p_limit_msgs,
        status = p_status,
        plan_start_date = p_start_date,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
END;
$$;

-- ========================================================================
-- FIN DE CORRECCIONES DE SEGURIDAD V2
-- ========================================================================

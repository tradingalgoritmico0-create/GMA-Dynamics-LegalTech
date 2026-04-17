-- ============================================================================
-- GMA DYNAMICS LEGALTECH — CORRECCIÓN CRÍTICA DE SEGURIDAD RLS
-- Archivo: supabase_rls_security_fix.sql
-- Resuelve: BUG-001 (admin bypass abierto) y BUG-002 (funciones sin guardia)
-- EJECUTAR ANTES DE CUALQUIER DEPLOY A PRODUCCIÓN
-- ============================================================================

-- ============================================================================
-- PASO 1: Función helper is_admin() — verifica el email real del administrador
-- Usar SECURITY INVOKER para que se evalúe con el contexto del llamante (auth.uid())
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = 'Admin2577@gma.co'
  );
$$;

-- ============================================================================
-- PASO 2: Corregir políticas de profiles — admin restringido al email real
-- ============================================================================
DROP POLICY IF EXISTS "Admin: Control Total Profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Admin Full Access"               ON public.profiles;

CREATE POLICY "Admin: Control Total Profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- PASO 3: Corregir políticas de notifications — admin restringido al email real
-- ============================================================================
DROP POLICY IF EXISTS "Admin: Ver todas las Notifs"      ON public.notifications;
DROP POLICY IF EXISTS "Admin: Gestionar todas las Notifs" ON public.notifications;

CREATE POLICY "Admin: Ver todas las Notifs"
    ON public.notifications FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admin: Gestionar todas las Notifs"
    ON public.notifications FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- PASO 4: Revocar GRANT a anon en funciones admin
-- Un visitante anónimo NUNCA debe poder listar usuarios ni modificar planes
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin()
    FROM anon;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text, integer, text, timestamptz)
    FROM anon;

GRANT EXECUTE ON FUNCTION public.get_all_users_admin()
    TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text, integer, text, timestamptz)
    TO authenticated, service_role;

-- ============================================================================
-- PASO 5: Reescribir funciones SECURITY DEFINER con guardia de email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
    id             uuid,
    email          text,
    full_name      text,
    plan           text,
    limit_msgs     integer,
    sent_msgs      integer,
    status         text,
    updated_at     timestamptz,
    plan_start_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Guardia: solo Admin2577@gma.co puede ejecutar esta función
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND email = 'Admin2577@gma.co'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: solo el administrador puede consultar este recurso.';
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

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(
    p_user_id    uuid,
    p_plan_type  text,
    p_limit_msgs integer,
    p_status     text,
    p_start_date timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Guardia: solo Admin2577@gma.co puede modificar planes de otros usuarios
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND email = 'Admin2577@gma.co'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: operación restringida al administrador.';
    END IF;

    UPDATE public.profiles
    SET
        plan            = p_plan_type,
        limit_msgs      = p_limit_msgs,
        status          = p_status,
        plan_start_date = p_start_date,
        updated_at      = timezone('utc', now())
    WHERE id = p_user_id;
END;
$$;

-- ============================================================================
-- PASO 6: Índices faltantes en notifications (BUG-012)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_owner_id
    ON public.notifications(owner_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON public.notifications(created_at DESC);

-- ============================================================================
-- VERIFICACIÓN (ejecutar después del script para confirmar):
--
-- SELECT polname, polcmd, polqual
-- FROM pg_policies
-- WHERE tablename = 'profiles'
-- ORDER BY polname;
--
-- Esperado: "Admin: Control Total Profiles" con polqual que referencia is_admin()
-- NO debe aparecer ninguna política con USING (true) sin condición.
-- ============================================================================

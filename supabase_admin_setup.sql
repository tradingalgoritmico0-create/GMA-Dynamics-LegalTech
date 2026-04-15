-- ==========================================
-- GMA DYNAMICS - SUPABASE ADMIN SETUP
-- EJECUTAR ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE
-- ==========================================

-- 1. Función para que el Admin obtenga todos los usuarios con sus perfiles reales
-- Esta función une la tabla 'auth.users' (correos) con 'profiles' (datos de abogados)
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    plan TEXT,
    limit_msgs INTEGER,
    sent_msgs INTEGER,
    status TEXT,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que el Admin vea los datos saltándose las RLS básicas
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        u.email::TEXT,
        p.full_name,
        p.plan,
        p.limit_msgs,
        p.sent_msgs,
        p.status,
        p.updated_at
    FROM profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    ORDER BY p.updated_at DESC;
END;
$$;

-- 2. Otorgar permisos de ejecución para que el frontend pueda llamar a la función
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO anon;
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO service_role;

-- 3. Asegurar que las políticas RLS permitan lectura/escritura al admin
-- (Añade esta política si no existe para que el admin pueda actualizar planes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Admin Full Access'
    ) THEN
        CREATE POLICY "Admin Full Access" ON profiles 
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================

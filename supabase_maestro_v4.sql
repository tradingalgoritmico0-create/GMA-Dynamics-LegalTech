-- ============================================================================
-- GMA DYNAMICS: SQL MAESTRO v4.0 — INTEGRACIÓN COMPLETA Y SEGURA
-- Combina: SQL v3.0 del usuario + notificaciones_judiciales + correcciones
-- EJECUTAR EN ORDEN COMPLETO en el SQL Editor de Supabase
-- ============================================================================

-- ============================================================================
-- BLOQUE 1: LIMPIEZA PREVIA (idempotente)
-- ============================================================================
DROP FUNCTION IF EXISTS public.increment_message_count(uuid);
DROP FUNCTION IF EXISTS public.get_all_users_admin();
DROP FUNCTION IF EXISTS public.is_admin();

DROP POLICY IF EXISTS "Profiles: Ver propio"             ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Insertar propio"        ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Actualizar propio"      ON public.profiles;
DROP POLICY IF EXISTS "Admin: Control Total Profiles"    ON public.profiles;
DROP POLICY IF EXISTS "Admin Full Access"                ON public.profiles;
DROP POLICY IF EXISTS "Notifs: Ver propias"              ON public.notifications;
DROP POLICY IF EXISTS "Notifs: Insertar propias"         ON public.notifications;
DROP POLICY IF EXISTS "Admin: Ver todas las Notifs"      ON public.notifications;
DROP POLICY IF EXISTS "Admin: Gestionar todas las Notifs" ON public.notifications;
DROP POLICY IF EXISTS "NotifJud: Ver propias"            ON public.notificaciones_judiciales;
DROP POLICY IF EXISTS "NotifJud: Insertar propia"        ON public.notificaciones_judiciales;
DROP POLICY IF EXISTS "Admin: Control Total NotifJud"    ON public.notificaciones_judiciales;

-- ============================================================================
-- BLOQUE 2: TABLA notificaciones_judiciales (integrada con RLS)
-- Si la tabla ya existe (versión original sin owner_id), se migra con ALTER TABLE.
-- Si no existe, se crea completa.
-- ============================================================================

-- Caso A: la tabla YA EXISTE sin owner_id — agregar columnas faltantes
ALTER TABLE public.notificaciones_judiciales
    ADD COLUMN IF NOT EXISTS owner_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS fecha_acceso_boton   timestamptz,
    ADD COLUMN IF NOT EXISTS notification_ref_id  uuid REFERENCES public.notifications(id) ON DELETE SET NULL;

-- Agregar constraint CHECK en estado_actual si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'notificaciones_judiciales_estado_actual_check'
    ) THEN
        ALTER TABLE public.notificaciones_judiciales
            ADD CONSTRAINT notificaciones_judiciales_estado_actual_check
            CHECK (estado_actual IN ('ENVIADO','ENTREGADO','LEIDO','FALLIDO'));
    END IF;
END$$;

-- Caso B: la tabla NO EXISTE — crearla completa
CREATE TABLE IF NOT EXISTS public.notificaciones_judiciales (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id              uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  radicado_caso         text        NOT NULL,
  telefono_destino      text        NOT NULL,
  wamid                 text        UNIQUE,
  estado_actual         text        DEFAULT 'ENVIADO'
                                    CHECK (estado_actual IN ('ENVIADO','ENTREGADO','LEIDO','FALLIDO')),
  fecha_envio           timestamptz DEFAULT timezone('utc', now()),
  fecha_entrega         timestamptz,
  fecha_lectura         timestamptz,
  fecha_acceso_boton    timestamptz,
  notification_ref_id   uuid        REFERENCES public.notifications(id) ON DELETE SET NULL
);

-- Índices para queries del dashboard y del webhook de estado n8n
CREATE INDEX IF NOT EXISTS idx_notif_jud_owner_id    ON public.notificaciones_judiciales(owner_id);
CREATE INDEX IF NOT EXISTS idx_notif_jud_wamid        ON public.notificaciones_judiciales(wamid);
CREATE INDEX IF NOT EXISTS idx_notif_jud_fecha_envio  ON public.notificaciones_judiciales(fecha_envio DESC);

-- ============================================================================
-- BLOQUE 3: HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================================
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones_judiciales ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BLOQUE 4: FUNCIÓN HELPER is_admin()
-- Centraliza la verificación del administrador real — usada en todas las políticas
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
-- BLOQUE 5: POLÍTICAS RLS — profiles
-- ============================================================================
CREATE POLICY "Profiles: Ver propio"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Profiles: Insertar propio"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: Actualizar propio"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin: acceso total SOLO para Admin2577@gma.co (NO para todos los autenticados)
CREATE POLICY "Admin: Control Total Profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- BLOQUE 6: POLÍTICAS RLS — notifications
-- ============================================================================
CREATE POLICY "Notifs: Ver propias"
    ON public.notifications FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Notifs: Insertar propias"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admin: Ver todas las Notifs"
    ON public.notifications FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admin: Gestionar todas las Notifs"
    ON public.notifications FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- BLOQUE 7: POLÍTICAS RLS — notificaciones_judiciales
-- NOTA: owner_id puede ser NULL en filas anteriores a esta migración.
-- Las filas viejas solo son visibles para el admin hasta que se les asigne owner_id.
-- ============================================================================
CREATE POLICY "NotifJud: Ver propias"
    ON public.notificaciones_judiciales FOR SELECT
    USING (owner_id IS NOT NULL AND auth.uid() = owner_id);

CREATE POLICY "NotifJud: Insertar propia"
    ON public.notificaciones_judiciales FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Admin: acceso total para gestión desde panel y Edge Functions con service_role
CREATE POLICY "Admin: Control Total NotifJud"
    ON public.notificaciones_judiciales FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- BLOQUE 8: FUNCIÓN RPC increment_message_count — VERSION CORREGIDA
--
-- PROBLEMA del v3.0: usaba PERFORM...FOR UPDATE + UPDATE separado.
-- Eso genera un row-lock que PostgREST (en modo transaction pooling con PgBouncer)
-- no libera entre requests, causando el bug de F5.
--
-- SOLUCIÓN: UPDATE...RETURNING en una sola instrucción — 100% atómico en PostgreSQL,
-- adquiere y libera el lock en la misma operación, sin ventana de bloqueo para la
-- siguiente transacción.
--
-- La función también valida que sent_msgs < limit_msgs antes de incrementar,
-- actuando como guardia server-side contra race conditions del cliente.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_message_count(user_id uuid)
RETURNS TABLE (
    new_sent_msgs  integer,
    new_limit_msgs integer,
    can_send       boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sent  integer;
    v_limit integer;
BEGIN
    -- Verificar estado actual antes de incrementar
    SELECT sent_msgs, limit_msgs
      INTO v_sent, v_limit
      FROM public.profiles
     WHERE id = user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil no encontrado para user_id: %', user_id;
    END IF;

    -- Guardia server-side: no permitir superar el límite
    IF v_sent >= v_limit THEN
        RETURN QUERY SELECT v_sent, v_limit, false;
        RETURN;
    END IF;

    -- UPDATE atómico: incrementa y devuelve el estado final en una sola instrucción
    -- Sin FOR UPDATE previo — no deja row-locks persistentes
    RETURN QUERY
    UPDATE public.profiles
       SET sent_msgs  = sent_msgs + 1,
           updated_at = timezone('utc', now())
     WHERE id = user_id
    RETURNING
        profiles.sent_msgs  AS new_sent_msgs,
        profiles.limit_msgs AS new_limit_msgs,
        (profiles.sent_msgs < profiles.limit_msgs) AS can_send;
END;
$$;

-- ============================================================================
-- BLOQUE 9: FUNCIÓN RPC get_all_users_admin — CON GUARDIA DE EMAIL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
    id              uuid,
    email           text,
    full_name       text,
    plan            text,
    sent_msgs       integer,
    limit_msgs      integer,
    status          text,
    updated_at      timestamptz,
    plan_start_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Guardia: solo Admin2577@gma.co puede listar usuarios
    IF NOT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND email = 'Admin2577@gma.co'
    ) THEN
        RAISE EXCEPTION 'Acceso denegado: operación restringida al administrador.';
    END IF;

    RETURN QUERY
    SELECT
        au.id,
        au.email::TEXT,
        COALESCE(p.full_name, 'Usuario sin nombre'),
        COALESCE(p.plan, 'Sin Plan'),
        COALESCE(p.sent_msgs, 0),
        COALESCE(p.limit_msgs, 0),
        COALESCE(p.status, 'Inactivo'),
        p.updated_at,
        p.plan_start_date
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    ORDER BY p.updated_at DESC NULLS LAST;
END;
$$;

-- ============================================================================
-- BLOQUE 10: PERMISOS DE EJECUCIÓN
-- anon NUNCA debe ejecutar funciones admin
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin() FROM anon;

GRANT EXECUTE ON FUNCTION public.increment_message_count(uuid)
    TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_all_users_admin()
    TO authenticated, service_role;

-- ============================================================================
-- BLOQUE 11: ÍNDICES FALTANTES EN notifications (performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_owner_id
    ON public.notifications(owner_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON public.notifications(created_at DESC);

-- ============================================================================
-- BLOQUE 12: PERMISOS DE TABLA para service_role (Edge Functions)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.notificaciones_judiciales
    TO authenticated;

GRANT ALL
    ON public.notificaciones_judiciales
    TO service_role;

-- ============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- Ejecutar estas queries para confirmar que todo quedó correcto:
--
-- 1. Verificar que admin bypass NO usa USING (true):
--    SELECT polname, polcmd, polqual FROM pg_policies
--    WHERE tablename = 'profiles' ORDER BY polname;
--    → "Admin: Control Total Profiles" debe contener is_admin(), NO (true)
--
-- 2. Verificar estructura de notificaciones_judiciales:
--    SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'notificaciones_judiciales';
--
-- 3. Probar increment_message_count:
--    SELECT * FROM public.increment_message_count('<uuid-real>');
--    → Debe retornar new_sent_msgs, new_limit_msgs, can_send
--
-- 4. CRÍTICO: ir a Supabase → API → pulsar "Refresh Schema" después de ejecutar
-- ============================================================================

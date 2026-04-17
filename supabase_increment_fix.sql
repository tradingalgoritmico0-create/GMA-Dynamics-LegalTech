-- ============================================================================
-- GMA DYNAMICS LEGALTECH — CORRECCIÓN ATÓMICA DE increment_message_count
-- Archivo: supabase_increment_fix.sql
-- Versión: 3.0 (Sin bloqueos FOR UPDATE, concurrencia real)
-- Compatible con: supabase.rpc('increment_message_count', { user_id: uuid })
-- ============================================================================

-- Limpiar versión anterior (idempotente)
DROP FUNCTION IF EXISTS public.increment_message_count(uuid);

-- ============================================================================
-- PROBLEMA ORIGINAL: El SELECT ... FOR UPDATE dejaba un row-lock activo que
-- bloqueaba la siguiente transacción hasta que PostgREST reciclaba la conexión.
-- Resultado visible: el usuario tenía que hacer F5 para desbloquear el contador.
--
-- SOLUCIÓN: Un único UPDATE ... RETURNING es 100% atómico en PostgreSQL.
-- No requiere SELECT previo, no deja row-locks pendientes y devuelve el estado
-- final de la fila en la misma instrucción bajo el mismo MVCC snapshot.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_message_count(user_id uuid)
RETURNS TABLE (
    new_sent_msgs  integer,
    new_limit_msgs integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.profiles
       SET sent_msgs = sent_msgs + 1
     WHERE id = user_id
    RETURNING
        profiles.sent_msgs  AS new_sent_msgs,
        profiles.limit_msgs AS new_limit_msgs;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_message_count(uuid)
    TO anon, authenticated, service_role;

-- VERIFICACIÓN (ejecutar en SQL Editor para probar):
-- SELECT * FROM public.increment_message_count('<uuid-real-del-usuario>');

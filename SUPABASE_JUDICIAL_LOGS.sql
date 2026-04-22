-- ========================================================================
-- GMA DYNAMICS: ACTUALIZACIÓN PARA TRAZABILIDAD JUDICIAL (LEY 2213)
-- ========================================================================

-- 1. Asegurar que la tabla de notificaciones tenga el storage_path
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Mejorar la tabla de evidencias para captura forense
ALTER TABLE public.notification_evidence 
ADD COLUMN IF NOT EXISTS device_info TEXT,
ADD COLUMN IF NOT EXISTS browser_info TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- 3. Función Segura para Validar Identidad y Registrar Acceso
-- Esta función es el corazón legal del sistema.
CREATE OR REPLACE FUNCTION public.validate_and_log_access(
  p_hash TEXT,
  p_id_number TEXT,
  p_ip TEXT,
  p_ua TEXT,
  p_geo JSONB
)
RETURNS TABLE (file_path TEXT, status_code TEXT) 
LANGUAGE plpgsql 
SECURITY DEFINER AS $$
DECLARE
    v_notif_id UUID;
    v_defendant_id TEXT;
    v_file_path TEXT;
BEGIN
    -- 1. Buscar la notificación por hash y validar que la cédula coincida
    SELECT id, defendant_id, file_path INTO v_notif_id, v_defendant_id, v_file_path
    FROM public.notifications 
    WHERE file_hash = p_hash;

    IF v_notif_id IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND';
    END IF;

    IF v_defendant_id != p_id_number THEN
        RAISE EXCEPTION 'INVALID_ID';
    END IF;

    -- 2. Registrar la evidencia forense
    INSERT INTO public.notification_evidence (
        notification_id, 
        ip_address, 
        user_agent, 
        location_data,
        city,
        region,
        country,
        action_type
    ) VALUES (
        v_notif_id,
        p_ip,
        p_ua,
        p_geo,
        p_geo->>'city',
        p_geo->>'region',
        p_geo->>'country',
        'legal_notification_accepted'
    );

    -- 3. Actualizar estado de la notificación a 'Leído'
    UPDATE public.notifications 
    SET status = 'Leído', 
        viewed_at = now() 
    WHERE id = v_notif_id;

    RETURN QUERY SELECT v_file_path, 'SUCCESS'::TEXT;
END;
$$;

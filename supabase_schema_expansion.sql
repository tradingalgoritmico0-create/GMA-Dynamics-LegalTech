-- ============================================================================
-- GMA DYNAMICS LEGALTECH — EXPANSIÓN DE SCHEMA: Tablas LegalTech con RLS
-- Archivo: supabase_schema_expansion.sql
-- Versión: 1.0 (Idempotente — DROP IF EXISTS + CREATE TABLE IF NOT EXISTS)
-- Tablas: casos_legales | documentos_encriptados | bitacora_mensajes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLA 1: casos_legales
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.casos_legales (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    radicado      TEXT        NOT NULL,
    juzgado       TEXT,
    demandante    TEXT,
    demandado     TEXT,
    etapa         TEXT        DEFAULT 'Admisión',
    estado        TEXT        DEFAULT 'Activo',
    observaciones TEXT,
    created_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_casos_legales_owner ON public.casos_legales(owner_id);

ALTER TABLE public.casos_legales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Casos: Ver propios"         ON public.casos_legales;
DROP POLICY IF EXISTS "Casos: Insertar propio"     ON public.casos_legales;
DROP POLICY IF EXISTS "Casos: Actualizar propio"   ON public.casos_legales;
DROP POLICY IF EXISTS "Casos: Eliminar propio"     ON public.casos_legales;
DROP POLICY IF EXISTS "Admin: Control Total Casos" ON public.casos_legales;

CREATE POLICY "Casos: Ver propios"
    ON public.casos_legales FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Casos: Insertar propio"
    ON public.casos_legales FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Casos: Actualizar propio"
    ON public.casos_legales FOR UPDATE
    USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Casos: Eliminar propio"
    ON public.casos_legales FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Admin: Control Total Casos"
    ON public.casos_legales FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLA 2: documentos_encriptados
-- El contenido binario real se guarda en Supabase Storage; aquí solo metadatos.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.documentos_encriptados (
    id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    caso_id          uuid        REFERENCES public.casos_legales(id) ON DELETE SET NULL,
    nombre_original  TEXT        NOT NULL,
    nombre_cifrado   TEXT        NOT NULL,
    storage_path     TEXT        NOT NULL,
    sha256_hash      TEXT        NOT NULL,
    algoritmo        TEXT        DEFAULT 'AES-256-PDF' NOT NULL,
    tamaño_bytes     BIGINT,
    created_at       TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_enc_owner ON public.documentos_encriptados(owner_id);
CREATE INDEX IF NOT EXISTS idx_docs_enc_caso  ON public.documentos_encriptados(caso_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_docs_enc_hash ON public.documentos_encriptados(sha256_hash);

ALTER TABLE public.documentos_encriptados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Docs: Ver propios"         ON public.documentos_encriptados;
DROP POLICY IF EXISTS "Docs: Insertar propio"     ON public.documentos_encriptados;
DROP POLICY IF EXISTS "Docs: Actualizar propio"   ON public.documentos_encriptados;
DROP POLICY IF EXISTS "Docs: Eliminar propio"     ON public.documentos_encriptados;
DROP POLICY IF EXISTS "Admin: Control Total Docs" ON public.documentos_encriptados;

CREATE POLICY "Docs: Ver propios"
    ON public.documentos_encriptados FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Docs: Insertar propio"
    ON public.documentos_encriptados FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Docs: Actualizar propio"
    ON public.documentos_encriptados FOR UPDATE
    USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Docs: Eliminar propio"
    ON public.documentos_encriptados FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Admin: Control Total Docs"
    ON public.documentos_encriptados FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLA 3: bitacora_mensajes
-- Registro INMUTABLE de cada notificación judicial (Ley 2213/2022).
-- Usuarios normales: solo SELECT e INSERT. Sin UPDATE ni DELETE.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bitacora_mensajes (
    id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    caso_id            uuid        REFERENCES public.casos_legales(id) ON DELETE SET NULL,
    documento_id       uuid        REFERENCES public.documentos_encriptados(id) ON DELETE SET NULL,
    canal              TEXT        DEFAULT 'WhatsApp' NOT NULL,
    destinatario_tel   TEXT,
    destinatario_email TEXT,
    sha256_hash        TEXT        NOT NULL,
    estado_envio       TEXT        DEFAULT 'Enviado',
    estado_email       TEXT        DEFAULT 'Enviado',
    webhook_id         TEXT,
    mercadopago_id     TEXT,
    created_at         TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    leido_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bitacora_owner ON public.bitacora_mensajes(owner_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_caso  ON public.bitacora_mensajes(caso_id);

ALTER TABLE public.bitacora_mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bitacora: Ver propias"         ON public.bitacora_mensajes;
DROP POLICY IF EXISTS "Bitacora: Insertar propia"     ON public.bitacora_mensajes;
DROP POLICY IF EXISTS "Admin: Control Total Bitacora" ON public.bitacora_mensajes;

-- Solo ver e insertar para usuarios normales (inmutabilidad legal)
CREATE POLICY "Bitacora: Ver propias"
    ON public.bitacora_mensajes FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Bitacora: Insertar propia"
    ON public.bitacora_mensajes FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Admin: acceso total para auditoría y actualización de estado_envio desde Edge Functions
CREATE POLICY "Admin: Control Total Bitacora"
    ON public.bitacora_mensajes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- PERMISOS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.casos_legales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_encriptados TO authenticated;
GRANT SELECT, INSERT                 ON public.bitacora_mensajes TO authenticated;
GRANT ALL ON public.casos_legales, public.documentos_encriptados, public.bitacora_mensajes TO service_role;

-- ============================================================================
-- TRIGGER: auto-actualización de updated_at en casos_legales
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_casos_legales_updated_at ON public.casos_legales;
CREATE TRIGGER trg_casos_legales_updated_at
    BEFORE UPDATE ON public.casos_legales
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- FIN DEL SCRIPT — Ejecutar completo en el SQL Editor de Supabase
-- ============================================================================

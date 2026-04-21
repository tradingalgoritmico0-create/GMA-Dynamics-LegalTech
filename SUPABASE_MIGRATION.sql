--- GMA DYNAMICS: MIGRACIÓN DE SEGURIDAD Y AISLAMIENTO ---
--- EJECUTAR EN EL SQL EDITOR DE SUPABASE ---

-- 1. SEGURIDAD: Políticas para permitir que los abogados gestionen su propio perfil
-- Esto soluciona el problema de que los usuarios nuevos no pueden registrarse ni elegir plan.

DROP POLICY IF EXISTS "Abogados: Crear perfil propio" ON public.profiles;
CREATE POLICY "Abogados: Crear perfil propio" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Abogados: Ver perfil propio" ON public.profiles;
CREATE POLICY "Abogados: Ver perfil propio" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Abogados: Editar perfil propio" ON public.profiles;
CREATE POLICY "Abogados: Editar perfil propio" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

-- 2. AISLAMIENTO: Tabla de Demandados
-- Esto asegura que cada abogado tenga su propia lista privada de demandados.

CREATE TABLE IF NOT EXISTS public.defendants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cedula TEXT NOT NULL,
  nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cedula, owner_id) -- Permite que el mismo demandado sea demandado por distintos abogados, pero cada relación es única.
);

-- Habilitar RLS en la tabla nueva
ALTER TABLE public.defendants ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento para demandados
DROP POLICY IF EXISTS "Abogados: Gestionar demandados propios" ON public.defendants;
CREATE POLICY "Abogados: Gestionar demandados propios" ON public.defendants 
FOR ALL USING (auth.uid() = owner_id);

--- FIN DE LA MIGRACIÓN ---

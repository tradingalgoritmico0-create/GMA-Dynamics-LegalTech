import { createClient } from '@supabase/supabase-js';

// GMA DYNAMICS - SUPABASE SECURITY LAYER v1.0
// Estas credenciales se deben configurar en el archivo .env del proyecto.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Advertencia: Credenciales de Supabase no detectadas en .env. El sistema funcionará en modo degradado.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

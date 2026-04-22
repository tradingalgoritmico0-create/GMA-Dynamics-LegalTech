import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { DottedBackground } from './ui/Backgrounds';
import TermsOfService from './TermsOfService';
import { Shield } from 'lucide-react';

// Estilos Elegantes Centralizados
const theme = {
  colors: {
    primary: '#0A192F', // Azul Marino Profundo
    accent: '#C5A059',   // Bronce
    surface: '#FFFFFF',
    textDark: '#1A1A1A',
    textLight: '#757575',
    border: '#E0E0E0'
  },
  fonts: {
    serif: "'Playfair Display', 'Times New Roman', serif",
    sans: "'Inter', sans-serif"
  }
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessing(true);
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: fullName } } 
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.reload();
    } catch (err: unknown) { 
      if (err instanceof Error) alert(err.message);
      else alert(String(err));
    } finally { setIsProcessing(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Por favor, ingrese su correo electrónico primero.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert(error.message);
    else alert("Se ha enviado un enlace de recuperación a su correo.");
  };

  return (
    <DottedBackground className="min-h-screen w-full flex items-center justify-center p-4" style={{ fontFamily: theme.fonts.sans }}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass-card" 
        style={{ 
          width: '100%',
          maxWidth: '1000px', 
          display: 'grid', 
          gridTemplateColumns: '45% 55%', 
          overflow: 'hidden', 
          backgroundColor: theme.colors.surface,
          borderRadius: '4px', // Minimalismo radical
          border: `1px solid ${theme.colors.border}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          alignItems: 'stretch'
        }}
      >
        {/* Branding Section */}
        <div style={{ 
          padding: '4rem', 
          color: theme.colors.surface, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4rem' }}>
            <Shield size={24} color={theme.colors.accent} />
            <span style={{ fontSize: '1.2rem', fontWeight: 300, letterSpacing: '0.2rem', textTransform: 'uppercase' }}>GMA Dynamics</span>
          </div>

          <h1 style={{ fontSize: '2.8rem', fontFamily: theme.fonts.serif, marginBottom: '2rem', lineHeight: 1, fontWeight: 400 }}>
            Seguridad <br/><span style={{ color: theme.colors.accent }}>Jurídica Elite</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.8, marginBottom: '3rem', fontWeight: 300 }}>
            Infraestructura técnica para el ejercicio del derecho con precisión e inmutabilidad.
          </p>
        </div>

        {/* Auth Form Section */}
        <div style={{ padding: '4rem', backgroundColor: theme.colors.surface, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 400, fontFamily: theme.fonts.serif, color: theme.colors.textDark, marginBottom: '0.5rem' }}>
              {isRegistering ? 'Registro Profesional' : 'Acceso al Despacho'}
            </h2>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isRegistering && (
              <input type="text" placeholder="Nombre completo" value={fullName} onChange={e => setFullName(e.target.value)} style={{ padding: '0.8rem', border: `1px solid ${theme.colors.border}`, borderRadius: '0', fontSize: '0.9rem', outline: 'none' }} required />
            )}
            <input type="email" placeholder="Correo profesional" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '0.8rem', border: `1px solid ${theme.colors.border}`, borderRadius: '0', fontSize: '0.9rem', outline: 'none' }} required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '0.8rem', border: `1px solid ${theme.colors.border}`, borderRadius: '0', fontSize: '0.9rem', outline: 'none' }} required />

            {!isRegistering && (
                <button type="button" onClick={handleForgotPassword} style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: theme.colors.textLight, background: 'none', border: 'none', cursor: 'pointer' }}>
                    ¿Olvidó su contraseña?
                </button>
            )}
            
            <button type="submit" disabled={isProcessing} style={{ padding: '1rem', backgroundColor: theme.colors.primary, color: 'white', borderRadius: '0', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05rem' }}>
              {isProcessing ? 'Procesando...' : (isRegistering ? 'REGISTRAR' : 'INGRESAR')}
            </button>
          </form>

          <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: theme.colors.accent, cursor: 'pointer', fontSize: '0.85rem', marginTop: '2rem', textDecoration: 'underline' }}>
              {isRegistering ? '¿Ya tiene cuenta? Inicie sesión' : 'Solicitar acceso profesional'}
          </button>
        </div>
      </motion.div>
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </DottedBackground>
  );
};

export default Login;

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { DottedBackground } from './ui/Backgrounds';
import TermsOfService from './TermsOfService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering && !acceptTerms) return alert('Debe aceptar los términos legales.');
    setIsProcessing(true);
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        await supabase.from('profiles').insert([{ id: data.user?.id, full_name: fullName, status: 'Activo', plan: 'Plan Gratis Judicial' }]);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: window.location.origin } 
    });
  };

  return (
    <DottedBackground className="min-h-screen w-full flex items-center justify-center p-0 m-0" style={{ backgroundColor: '#0f172a' }}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '24px' }}>
        <div style={{ padding: '4rem', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', marginBottom: '1.5rem' }}>GMA Dynamics</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>Infraestructura certificada para notificaciones judiciales con trazabilidad inmutable.</p>
        </div>
        <div style={{ padding: '4rem', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 900 }}>{isRegistering ? 'Crear Cuenta' : 'Acceder'}</h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isRegistering && <input type="text" placeholder="Nombre completo" value={fullName} onChange={e => setFullName(e.target.value)} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} required />}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} required />
            {isRegistering && <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} /> Acepto <button type="button" onClick={() => setShowTerms(true)} style={{ background:'none', border:'none', color:'blue', cursor:'pointer' }}>términos</button></label>}
            <button type="submit" style={{ padding: '1rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>{isProcessing ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}</button>
            <button type="button" onClick={handleGoogleLogin} style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: '20px' }} />
              Continuar con Google
            </button>
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>
              {isRegistering ? '¿Ya tiene cuenta? Inicie sesión' : '¿No tiene cuenta? Regístrese'}
            </button>
          </form>
        </div>
      </motion.div>
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </DottedBackground>
  );
};

export default Login;

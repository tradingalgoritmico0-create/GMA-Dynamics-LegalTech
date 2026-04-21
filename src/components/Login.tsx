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

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("Sesión activa detectada, redirigiendo...");
        // En lugar de reload, simplemente permitimos que el App.tsx detecte el cambio de estado
      }
    };
    checkSession();
  }, []);

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
      // No recargamos, dejamos que App.tsx gestione el estado
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <DottedBackground className="min-h-screen w-full flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '3rem', width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 900 }}>GMA Dynamics</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegistering && <input type="text" placeholder="Nombre completo" value={fullName} onChange={e => setFullName(e.target.value)} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} required />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} required />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} required />
          {isRegistering && <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} /> Acepto <button type="button" onClick={() => setShowTerms(true)} style={{ background:'none', border:'none', color:'blue', cursor:'pointer' }}>términos</button></label>}
          <button type="submit" style={{ padding: '1rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>{isProcessing ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}</button>
          <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>
            {isRegistering ? '¿Ya tiene cuenta? Inicie sesión' : '¿No tiene cuenta? Regístrese'}
          </button>
        </form>
      </motion.div>
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </DottedBackground>
  );
};

export default Login;

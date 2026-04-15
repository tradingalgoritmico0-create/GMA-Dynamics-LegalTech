import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { DottedBackground } from './ui/Backgrounds';
import TermsOfService from './TermsOfService';

interface LoginProps {
  onLogin: (username: string, role: 'admin' | 'user') => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [mustPay, setMustPay] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<'gratis' | 'medio' | 'pro'>('gratis');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [showTerms, setShowTerms] = useState(false);

  const plans: { id: string, name: string, price: number, limit: number, description: string, savings?: string }[] = [
    { id: 'gratis', name: 'Plan Inicial (5 Msgs)', price: 0, limit: 5, description: '5 mensajes únicos (No recurrentes)', savings: '100% GRATIS' },
    { id: 'medio', name: 'Plan Medio Judicial', price: 60000, limit: 20, description: '20 notificaciones / mes', savings: 'AHORRA 70%' },
    { id: 'pro', name: 'Plan Pro Judicial', price: 196000, limit: 100, description: '100 notificaciones / mes', savings: 'AHORRA 80%' }
  ];

  const currentPlan = plans.find(p => p.id === selectedPlanId)!;

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (localStorage.getItem('gma_role') === 'admin' && localStorage.getItem('gma_user') === 'admin') return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsProcessing(true);
        try {
          const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          
          if (error || !profile || profile.status !== 'Activo') {
            // Si el perfil no existe o no es Activo, forzamos Muro de Pago
            console.warn("Sesión detectada pero cuenta Inactiva. Requiere activación.");
            setPendingUser(session.user);
            setMustPay(true);
          } else {
            // Solo si el perfil es explícitamente Activo en DB permitimos onLogin
            onLogin(session.user.email || '', 'user');
          }
        } catch (err) { 
          console.error("Error validando estatus:", err);
          setMustPay(true); 
        } finally { setIsProcessing(false); }
      }
    };
    checkPaymentStatus();
  }, [onLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegistering && !acceptTerms) return alert('Debe aceptar los términos legales.');
    setIsProcessing(true);
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        // Creamos perfil inactivo inmediatamente
        await supabase.from('profiles').insert([{ id: data.user?.id, full_name: fullName, status: 'Inactivo' }]);
        setPendingUser(data.user); setMustPay(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { 
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' }
      } 
    });
  };

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    setMustPay(false);
    setPendingUser(null);
    setIsRegistering(false);
  };

  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '' });

  const onPaymentCompleted = async () => {
    if (!acceptTerms) return alert('Debe aceptar los términos legales.');
    if (!cardData.number || !cardData.expiry || !cardData.cvc) return alert('Complete los datos de la tarjeta.');

    setIsProcessing(true);
    try {
      const mp = new (window as any).MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
      const [month, year] = cardData.expiry.split('/');
      
      const cardToken = await mp.createCardToken({
        cardNumber: cardData.number.replace(/\s/g, ''),
        cardholderName: fullName || 'Abogado GMA',
        cardExpirationMonth: month,
        cardExpirationYear: '20' + year,
        securityCode: cardData.cvc,
        identificationType: 'CC',
        identificationNumber: '12345678'
      });

      if (!cardToken?.id) throw new Error("Tarjeta rechazada por Mercado Pago.");

      const { data: { session } } = await supabase.auth.getSession();
      const user = pendingUser || session?.user;
      if (!user) throw new Error("No hay sesión activa.");

      // ACTUALIZACIÓN CRÍTICA EN DB
      const { error: upErr } = await supabase.from('profiles').upsert({ 
        id: user.id,
        status: 'Activo', 
        payment_id: `MP-${cardToken.id}`, 
        plan: currentPlan.name, 
        limit_msgs: currentPlan.limit, 
        updated_at: new Date().toISOString()
      });
      
      if (upErr) throw upErr;
      
      // RECARGA ABSOLUTA: Fuerza al Guardián de App.tsx a re-validar todo
      window.location.reload();
    } catch (err: any) { 
      alert("ERROR DE ACTIVACIÓN: " + (err.message || "Error en la pasarela.")); 
    } finally { setIsProcessing(false); }
  };

  if (mustPay) {
    return (
      <DottedBackground className="min-h-screen w-full flex items-center justify-center p-0 m-0" style={{ position: 'fixed', inset: 0, overflowY: 'auto', backgroundColor: '#0f172a', zIndex: 9999 }}>
        <motion.div className="login-container glass-card" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ borderRadius: '0', width: '100%', maxWidth: '1200px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: 'none', minHeight: '100vh', boxShadow: 'none' }}>
          <div className="side-panel" style={{ backgroundColor: '#0f172a', padding: '6rem 4rem', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '3rem' }}>
              <img src="https://img.icons8.com/color/48/000000/mercado-pago.png" alt="MP" style={{ marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>Elegir Plan</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Suscripción Judicial vía Mercado Pago.</p>
              {pendingUser && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#60a5fa' }}>Identificado como:</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{pendingUser.email}</p>
                  <button onClick={handleBackToLogin} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Usar otra cuenta</button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {plans.map(p => (
                <div key={p.id} onClick={() => setSelectedPlanId(p.id as any)} style={{ padding: '1.5rem', borderRadius: '16px', border: `2px solid ${selectedPlanId === p.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`, backgroundColor: selectedPlanId === p.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative' }}>
                  {p.savings && (
                    <div style={{ position: 'absolute', top: '-10px', right: '10px', backgroundColor: '#10b981', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '100px', fontWeight: '900' }}>{p.savings}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{p.name}</span>
                    <span style={{ fontWeight: '800', color: 'var(--accent)' }}>{p.price === 0 ? 'Gratis' : `$${p.price.toLocaleString()}`}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: selectedPlanId === p.id ? '#60a5fa' : '#64748b', margin: 0 }}>{p.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '5rem', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>Activación Profesional</h2>
            <p style={{ color: '#64748b', marginBottom: '3rem' }}>Ingrese los datos de su tarjeta para habilitar la infraestructura judicial.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <input type="text" placeholder="Nombre del Titular" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} required />
                <input type="text" placeholder="0000 0000 0000 0000" value={cardData.number} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 16);
                  const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                  setCardData({...cardData, number: formatted});
                }} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1rem' }} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input type="text" placeholder="MM/YY" value={cardData.expiry} onChange={e => {
                    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                    if (val.length >= 3) val = val.substring(0, 2) + '/' + val.substring(2);
                    setCardData({...cardData, expiry: val});
                  }} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required />
                  <input type="text" placeholder="CVC" value={cardData.cvc} onChange={e => setCardData({...cardData, cvc: e.target.value.replace(/\D/g, '').substring(0, 4)})} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required />
                </div>
              </div>
              <label style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} style={{ width: '22px', height: '22px' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Acepto los <button onClick={(e) => { e.preventDefault(); setShowTerms(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}>Términos de Servicio</button></span>
              </label>
              <button onClick={onPaymentCompleted} disabled={!acceptTerms || isProcessing} style={{ width: '100%', padding: '1.3rem', borderRadius: '14px', border: 'none', backgroundColor: acceptTerms ? 'var(--primary)' : '#cbd5e1', color: 'white', fontWeight: '700', fontSize: '1.1rem', cursor: acceptTerms ? 'pointer' : 'not-allowed' }}>
                {isProcessing ? 'Procesando...' : `Pagar y Activar ${currentPlan.name}`}
              </button>
            </div>
          </div>
        </motion.div>
        {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
      </DottedBackground>
    );
  }

  return (
    <DottedBackground className="min-h-screen w-full flex items-center justify-center p-0 m-0" style={{ position: 'fixed', inset: 0, overflowY: 'auto', backgroundColor: '#0f172a', zIndex: 9999 }}>
      <motion.div className="login-container glass-card" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} style={{ borderRadius: '0', width: '100%', maxWidth: '1100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: 'none', minHeight: '100vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ backgroundColor: '#0f172a', padding: '4rem 3.5rem', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '3.5rem' }}>
            <h1 style={{ color: 'var(--accent)', fontSize: '3.5rem', marginBottom: '1.2rem', fontFamily: 'var(--font-serif)' }}>GMA Dynamics</h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: '1.6' }}>Infraestructura certificada para notificaciones judiciales con trazabilidad inmutable.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
            {['Certificados con validez de ley', 'Cifrado de documentos local', 'Trazabilidad SHA-256'].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '1.2rem' }}>✓</div>
                <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '4rem 4rem', backgroundColor: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>{isRegistering ? 'Crear Cuenta' : 'Acceso Profesional'}</h2>
          <p style={{ color: '#64748b', marginBottom: '3.5rem', fontSize: '1.1rem' }}>{isRegistering ? 'Únase a la élite del litigio digital.' : 'Ingrese al portal de evidencia judicial.'}</p>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} type="text" placeholder="Nombre Completo o Firma" value={fullName} onChange={e => setFullName(e.target.value)} style={{ padding: '1.2rem', borderRadius: '14px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1.1rem' }} required />
              )}
            </AnimatePresence>
            <input type="text" placeholder="Email Profesional" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '1.2rem', borderRadius: '14px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1.1rem' }} required={email !== 'admin'} />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '1.2rem', borderRadius: '14px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1.1rem' }} required />
            
            {isRegistering && (
              <label style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', fontSize: '1rem', color: '#475569', margin: '0.5rem 0' }}>
                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} style={{ width: '22px', height: '22px' }} />
                <span>Acepto los <button onClick={(e) => { e.preventDefault(); setShowTerms(true); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}>Términos de Servicio</button></span>
              </label>
            )}

            <button type="submit" disabled={isProcessing} style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '14px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)' }}>
              {isProcessing ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Entrar al Portal')}
            </button>
          </form>

          <div style={{ margin: '2.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', letterSpacing: '1px' }}>O</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          </div>

          <button onClick={handleGoogleLogin} style={{ width: '100%', padding: '1.1rem', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '1.05rem', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}>
            <img src="https://www.google.com/favicon.ico" width="20" alt="Google" />
            <span>Continuar con Google Workspace</span>
          </button>

          <p style={{ marginTop: '3.5rem', textAlign: 'center', fontSize: '1.1rem', color: '#64748b' }}>
            {isRegistering ? '¿Ya tiene cuenta?' : '¿No tiene cuenta?'} 
            <button onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: '0 0.5rem', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}>
              {isRegistering ? 'Inicie sesión' : 'Regístrese aquí'}
            </button>
          </p>
        </div>
      </motion.div>
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </DottedBackground>
  );
};

export default Login;

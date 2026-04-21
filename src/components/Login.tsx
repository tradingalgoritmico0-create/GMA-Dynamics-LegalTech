import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { DottedBackground } from './ui/Backgrounds';
import TermsOfService from './TermsOfService';
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Plan Gratis Judicial');
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const plans = [
    { id: 'Plan Gratis Judicial', name: 'Gratis Judicial', description: '5 Notificaciones', price: 'Gratis' },
    { id: 'Plan Medio Judicial', name: 'Medio Judicial', description: '20 Notificaciones', price: '$50.000 / mes' },
    { id: 'Plan Pro Judicial', name: 'Pro Judicial', description: '100 Notificaciones', price: '$120.000 / mes' }
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegistering && !acceptedTerms) {
      alert("Debe aceptar los términos y condiciones.");
      return;
    }

    // Persistir plan antes de cualquier acción
    localStorage.setItem('gma_selected_plan', selectedPlan);

    setIsProcessing(true);
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: fullName } } 
        });
        if (error) throw error;
        // El App.tsx se encarga de crear el perfil con el plan de localStorage
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.reload();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
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
    <DottedBackground className="min-h-screen w-full flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="glass-card" 
        style={{ 
          width: '100%',
          maxWidth: '1100px', 
          margin: '0 auto',
          display: 'grid', 
          gridTemplateColumns: 'minmax(400px, 1fr) minmax(400px, 1.2fr)', 
          overflow: 'hidden', 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '48px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
          alignItems: 'stretch'
        }}
      >
        {/* Branding Section */}
        <div style={{ 
          padding: '5rem 4rem', 
          color: 'white', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          position: 'relative'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '4rem' }}>
              <div style={{ backgroundColor: '#3b82f6', padding: '0.75rem', borderRadius: '16px', boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>
                <Shield size={32} />
              </div>
              <span style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-1.5px' }}>GMA Dynamics</span>
            </div>

            <h1 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', lineHeight: 1.1, fontWeight: 800 }}>
              Seguridad <br/><span style={{ color: '#3b82f6' }}>Jurídica Digital</span>
            </h1>

            <p style={{ color: '#94a3b8', fontSize: '1.2rem', lineHeight: 1.6, maxWidth: '400px', marginBottom: '4rem' }}>
              Plataforma de élite para la gestión de evidencias e inmutabilidad procesal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                { t: "Notificaciones Certificadas", d: "Validez legal total Ley 2213" },
                { t: "Blindaje SHA-256", d: "Integridad de documentos garantizada" }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ marginTop: '0.2rem' }}><CheckCircle2 size={18} color="#3b82f6" /></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{item.t}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Auth Form Section */}
        <div style={{ 
          padding: '5rem 4.5rem', 
          backgroundColor: 'white', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center' 
        }}>
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', backgroundColor: '#f1f5f9', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Portal de Acceso
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>
              {isRegistering ? 'Crear Cuenta' : 'Bienvenido'}
            </h2>
            <p style={{ color: '#64748b' }}>{isRegistering ? 'Únase a la infraestructura legal del futuro.' : 'Gestione su despacho con precisión técnica.'}</p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isRegistering && (
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Nombre completo" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  style={{ width: '100%', padding: '1.1rem 1.1rem 1.1rem 3.5rem', borderRadius: '18px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'all 0.2s' }} 
                  required 
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="email" 
                placeholder="Correo profesional" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={{ width: '100%', padding: '1.1rem 1.1rem 1.1rem 3.5rem', borderRadius: '18px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} 
                required 
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '1.1rem 1.1rem 1.1rem 3.5rem', borderRadius: '18px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} 
                required 
              />
            </div>

            {!isRegistering && (
                <button type="button" onClick={handleForgotPassword} style={{ alignSelf: 'flex-end', fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    ¿Olvidó su contraseña?
                </button>
            )}
            
            {isRegistering && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                        type="checkbox" 
                        id="terms" 
                        checked={acceptedTerms} 
                        onChange={e => setAcceptedTerms(e.target.checked)} 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Acepto los <button type="button" onClick={() => setShowTerms(true)} style={{ color: '#3b82f6', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Términos y Condiciones</button>
                    </label>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  {plans.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      style={{ 
                        padding: '1rem 1.25rem', 
                        borderRadius: '18px', 
                        border: selectedPlan === p.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        backgroundColor: selectedPlan === p.id ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: selectedPlan === p.id ? '#1e40af' : '#0f172a' }}>{p.name} - {p.price}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.description}</div>
                      </div>
                      {selectedPlan === p.id && <CheckCircle2 size={18} color="#3b82f6" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isProcessing}
              style={{ 
                marginTop: '1rem',
                padding: '1.25rem', 
                backgroundColor: '#0f172a', 
                color: 'white', 
                borderRadius: '18px', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.2)'
              }}
            >
              {isProcessing ? 'Verificando...' : (isRegistering ? 'Crear mi Despacho' : 'Entrar al Sistema')}
              {!isProcessing && <ArrowRight size={20} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }}></div>
              <span style={{ padding: '0 1rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>O ACCEDER CON</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#f1f5f9' }}></div>
            </div>

            <button 
              type="button" 
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} 
              style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: 800, color: '#475569' }}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: '20px' }} />
              Identidad Google
            </button>

            <button 
              type="button" 
              onClick={() => setIsRegistering(!isRegistering)} 
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, marginTop: '1.5rem' }}
            >
              {isRegistering ? '¿Ya tiene cuenta? Inicie sesión' : '¿No tiene cuenta? Solicite acceso'}
            </button>
          </form>
        </div>
      </motion.div>
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </DottedBackground>
  );
};

export default Login;

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

  const plans = [
    { id: 'Plan Gratis Judicial', name: 'Gratis Judicial', description: '5 Notificaciones' },
    { id: 'Plan Medio Judicial', name: 'Medio Judicial', description: '20 Notificaciones' },
    { id: 'Plan Pro Judicial', name: 'Pro Judicial', description: '100 Notificaciones' }
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { data: { full_name: fullName } } 
        });
        if (error) throw error;
        // La creación del perfil ahora se maneja en App.tsx vía auto-provisión para asegurar consistencia
        // pero mantenemos esta llamada por redundancia si no es OAuth
        if (data.user) {
          const limits: Record<string, number> = {
            'Plan Gratis Judicial': 5,
            'Plan Medio Judicial': 20,
            'Plan Pro Judicial': 100
          };
          await supabase.from('profiles').upsert([{ 
            id: data.user.id, 
            full_name: fullName, 
            status: 'Activo', 
            plan: selectedPlan,
            limit_msgs: limits[selectedPlan] || 5
          }]);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.reload();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <DottedBackground className="min-h-screen w-full flex items-center justify-center p-4 m-0">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="glass-card" 
        style={{ 
          width: '100%',
          maxWidth: '1100px', 
          display: 'grid', 
          gridTemplateColumns: 'minmax(400px, 1fr) minmax(400px, 1.2fr)', 
          overflow: 'hidden', 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)'
        }}
      >
        {/* Lado Izquierdo - Branding */}
        <div style={{ 
          padding: '5rem 4rem', 
          color: 'white', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}
            >
              <div style={{ backgroundColor: '#3b82f6', padding: '0.6rem', borderRadius: '12px' }}>
                <Shield size={28} />
              </div>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-1px' }}>GMA Dynamics</span>
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', lineHeight: 1.1 }}
            >
              Infraestructura <br/><span style={{ color: '#3b82f6' }}>Judicial Certificada</span>
            </motion.h1>

            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ color: '#94a3b8', fontSize: '1.25rem', lineHeight: 1.6, maxWidth: '400px' }}
            >
              Blindaje probatorio para litigantes de élite con trazabilidad inmutable SHA-256.
            </motion.p>

            <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                "Validez legal según Ley 2213",
                "Certificados inmutables",
                "Trazabilidad completa"
              ].map((text, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1', fontSize: '1rem' }}
                >
                  <CheckCircle2 size={18} color="#3b82f6" />
                  {text}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Lado Derecho - Formulario */}
        <div style={{ 
          padding: '5rem 4.5rem', 
          backgroundColor: 'white', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center' 
        }}>
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 900, color: '#0f172a' }}>
              {isRegistering ? 'Crear Cuenta' : 'Acceso Profesional'}
            </h2>
            <p style={{ color: '#64748b' }}>
              {isRegistering ? 'Inicie su transformación digital hoy mismo.' : 'Bienvenido de nuevo a su despacho digital.'}
            </p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isRegistering && (
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Nombre completo" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} 
                  required 
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="email" 
                placeholder="Correo corporativo" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} 
                required 
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} 
                required 
              />
            </div>
            
            {isRegistering && (
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', display: 'block' }}>Seleccione su Plan</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  {plans.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      style={{ 
                        padding: '1rem', 
                        borderRadius: '16px', 
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
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedPlan === p.id ? '#1e40af' : '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.description}</div>
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
                borderRadius: '16px', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}
            >
              {isProcessing ? 'Verificando...' : (isRegistering ? 'Crear mi Despacho' : 'Entrar al Sistema')}
              {!isProcessing && <ArrowRight size={20} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ padding: '0 1rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>O CONTINUAR CON</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            <button 
              type="button" 
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} 
              style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: 700, color: '#475569' }}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: '20px' }} />
              Identidad Google
            </button>

            <button 
              type="button" 
              onClick={() => setIsRegistering(!isRegistering)} 
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, marginTop: '1rem' }}
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


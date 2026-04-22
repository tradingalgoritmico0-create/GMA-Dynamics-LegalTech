import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ArrowLeft, 
  Shield, 
  Zap, 
  Crown, 
  Lock, 
  Database
} from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
  user: string;
  onLogout: () => void;
  onNavigate: (v: string) => void;
}

interface Profile {
  full_name: string | null;
  plan: string;
  limit_msgs: number;
}

const SettingsView = ({ onBack, user, onLogout, onNavigate }: SettingsProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [retentionYears, setRetentionYears] = useState(1);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(data);
        if (data?.plan === 'Plan Pro Judicial') setRetentionYears(5);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user, {
      redirectTo: window.location.origin + '/login',
    });
    if (error) alert(error.message);
    else alert("Se ha enviado un correo para restablecer su contraseña.");
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Cargando configuración...</div>;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <nav style={{ backgroundColor: '#0f172a', color: 'white', padding: '1.25rem 2rem' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button onClick={onBack} style={{ backgroundColor: 'transparent', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <ArrowLeft size={18} /> Volver
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Configuración de Despacho</h1>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '1000px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '3rem' }}>
          
          {/* Sidebar de Configuración */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem', fontWeight: 800, color: '#334155' }}>
                    {user[0].toUpperCase()}
                </div>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>{profile?.full_name || 'Abogado'}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user}</div>
            </div>
            
            <button style={{ textAlign: 'left', padding: '1rem', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={18} /> Suscripción
            </button>
            <button style={{ textAlign: 'left', padding: '1rem', borderRadius: '12px', backgroundColor: 'transparent', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Lock size={18} /> Seguridad
            </button>
            <button onClick={onLogout} style={{ textAlign: 'left', padding: '1rem', borderRadius: '12px', backgroundColor: 'transparent', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '2rem' }}>
                Salida Segura
            </button>
          </aside>

          {/* Panel de Contenido */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Sección: Plan Actual */}
            <section style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Plan de Servicio</h3>
                  <p style={{ color: '#64748b' }}>Gestione su nivel de suscripción y límites.</p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '100px', backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 800 }}>
                  {profile?.plan === 'Plan Pro Judicial' ? <Crown size={14} /> : <Zap size={14} />}
                  ACTIVO
                </div>
              </div>

              <div style={{ padding: '2rem', borderRadius: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{profile?.plan}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{profile?.limit_msgs} notificaciones certificadas cada mes</div>
                </div>
                <button onClick={() => onNavigate('pricing')} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '12px', fontWeight: 700 }}>Mejorar Plan</button>
              </div>
            </section>

            {/* Sección: Retención de Datos */}
            <section style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Database size={20} color="#3b82f6" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Infraestructura de Almacenamiento</h3>
              </div>
              
              <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                GMA Dynamics garantiza el respaldo judicial de sus documentos. La visibilidad de las evidencias en el panel depende de su plan contratado.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Tiempo de visibilidad activa</span>
                    <span style={{ fontWeight: 800, color: '#3b82f6' }}>
                      {profile?.plan === 'Plan Gratis Judicial' ? '2 Meses' : (profile?.plan === 'Plan Medio Judicial' ? '1 Año' : `${retentionYears} Años`)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ width: profile?.plan === 'Plan Pro Judicial' ? '100%' : '20%', height: '100%', backgroundColor: '#3b82f6' }}></div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
                    * Los documentos legales no son eliminados por motivos de sensibilidad judicial, solo se restringe el acceso visual.
                  </p>
                </div>

                {profile?.plan === 'Plan Pro Judicial' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ajustar retención:</label>
                    <select 
                        value={retentionYears} 
                        onChange={(e) => setRetentionYears(Number(e.target.value))}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    >
                        {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y} {y === 1 ? 'Año' : 'Años'}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </section>

            {/* Sección: Seguridad */}
            <section style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Lock size={20} color="#3b82f6" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Seguridad de la Cuenta</h3>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Contraseña</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Actualice su clave de acceso periódicamente.</div>
                </div>
                <button 
                  onClick={handleResetPassword}
                  style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f1f5f9', color: '#0f172a', borderRadius: '12px', fontWeight: 700, border: '1px solid #e2e8f0' }}
                >
                  Restablecer vía Email
                </button>
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import CertificateViewer from './CertificateViewer';
import { motion } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Send, 
  Search, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  BarChart3, 
  Upload, 
  Clock, 
  Hash
} from 'lucide-react';

interface Notification {
  id: string;
  caseName: string;
  date: string;
  recipient: string;
  email: string;
  status: 'Procesando' | 'Enviado' | 'Entregado' | 'Leído';
  emailStatus: 'Enviado' | 'Recibido' | 'Abierto';
  hash: string;
  owner: string;
}

interface UserAccount {
  username: string;
  plan: string;
  limit: number;
  sent: number;
  status: 'Activo' | 'Suspendido' | 'Inactivo';
  expiresAt: string | null;
}

const Dashboard = ({ onLogout, user }: { onLogout: () => void, user: string }) => {
  const [formData, setFormData] = useState({ caseName: '', phone: '', email: user || '', defendantId: '', file: null as File | null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Notification | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');

  const loadDashboardData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) {
      const expires = new Date(profile.plan_start_date || profile.updated_at);
      expires.setDate(expires.getDate() + 30);
      setAccount({ 
        username: user, 
        plan: profile.plan, 
        limit: profile.limit_msgs, 
        sent: profile.sent_msgs, 
        status: profile.status, 
        expiresAt: expires.toISOString() 
      });
    }
    const { data: notifs } = await supabase.from('notifications').select('*').eq('owner_id', authUser.id).order('created_at', { ascending: false });
    if (notifs) setNotifications(notifs.map(n => ({ 
      id: n.id, 
      caseName: n.case_name, 
      date: new Date(n.created_at).toLocaleString(), 
      recipient: n.phone, 
      email: n.email, 
      status: n.status, 
      emailStatus: 'Enviado', 
      hash: n.file_hash, 
      owner: user 
    })));
  }, [user]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !account) return;
    setIsProcessing(true);
    try {
      const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
      const pdfBytes = new Uint8Array(await formData.file.arrayBuffer());
      const encryptedBytes = await encryptPDF(pdfBytes, formData.defendantId, { ownerPassword: 'GMA_DEFAULT_2026', allowModifying: false, allowCopying: false });
      const encryptedFile = new File([encryptedBytes], `Protegido_${formData.file.name}`, { type: 'application/pdf' });
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', await encryptedFile.arrayBuffer());
      const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      
      const n8nData = new FormData();
      Object.entries(formData).forEach(([k, v]) => v && n8nData.append(k, v));
      n8nData.set('file', encryptedFile); n8nData.append('hash', fileHash);
      
      const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, { method: 'POST', body: n8nData });
      if (!response.ok) throw new Error("Error en el envío. Contacte a soporte.");
      
      await supabase.from('notifications').insert([{ 
        case_name: formData.caseName, 
        phone: formData.phone, 
        email: formData.email, 
        defendant_id: formData.defendantId, 
        file_hash: fileHash, 
        owner_id: (await supabase.auth.getUser()).data.user?.id 
      }]);
      
      await loadDashboardData();
      alert("✅ Notificación emitida correctamente.");
      setFormData({ caseName: '', phone: '', email: user || '', defendantId: '', file: null });
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Leído': return '#10b981';
      case 'Entregado': return '#3b82f6';
      case 'Enviado': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', display: 'flex' }}>
      <CertificateViewer data={selectedCert} onClose={() => setSelectedCert(null)} />
      
      {/* Sidebar - Navegación */}
      <aside style={{ width: '280px', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', position: 'fixed', height: '100vh', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem', padding: '0 0.5rem' }}>
          <div style={{ backgroundColor: '#3b82f6', padding: '0.4rem', borderRadius: '8px' }}>
            <ShieldCheck size={24} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>GMA Dynamics</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('notifications')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px',
              backgroundColor: activeTab === 'notifications' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === 'notifications' ? '#60a5fa' : '#94a3b8',
              textAlign: 'left', fontWeight: 600
            }}
          >
            <Send size={20} /> Notificaciones
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px',
              backgroundColor: activeTab === 'settings' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === 'settings' ? '#60a5fa' : '#94a3b8',
              textAlign: 'left', fontWeight: 600
            }}
          >
            <Settings size={20} /> Configuración
          </button>
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{user?.[0]?.toUpperCase()}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{account?.plan || 'Cargando...'}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '12px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', fontWeight: 700 }}>
            <LogOut size={20} /> Salir del Sistema
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main style={{ flex: 1, marginLeft: '280px', padding: '2.5rem 3.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '0.25rem' }}>Panel Judicial</h1>
            <p style={{ color: '#64748b' }}>Gestión de trazabilidad e integridad probatoria.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ backgroundColor: 'white', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={18} color="#3b82f6" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Consumo Mensual</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{account?.sent} / {account?.limit} msgs</div>
              </div>
            </div>
          </div>
        </header>

        {/* Bento Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Tabla de Evidencias */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ backgroundColor: 'white', borderRadius: '24px', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BarChart3 size={22} color="#3b82f6" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Historial de Evidencias</h3>
                </div>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" placeholder="Buscar radicado..." style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '100px', border: '1px solid #e2e8f0', fontSize: '0.85rem', width: '220px' }} />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <th style={{ padding: '0 1rem' }}>Caso / Radicado</th>
                      <th style={{ padding: '0 1rem' }}>Fecha de Emisión</th>
                      <th style={{ padding: '0 1rem' }}>Estado Judicial</th>
                      <th style={{ padding: '0 1rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <motion.tr 
                        key={n.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ backgroundColor: '#f8fafc', borderRadius: '16px' }}
                      >
                        <td style={{ padding: '1.25rem 1rem', borderRadius: '16px 0 0 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{n.caseName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Hash size={10} /> {n.hash.substring(0, 12)}...
                          </div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: '#475569' }}>{n.date}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '100px', backgroundColor: `${getStatusColor(n.status)}15`, color: getStatusColor(n.status), fontSize: '0.8rem', fontWeight: 700 }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getStatusColor(n.status) }}></div>
                            {n.status}
                          </div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', borderRadius: '0 16px 16px 0' }}>
                          <button 
                            onClick={() => setSelectedCert(n)}
                            style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                          >
                            Ver Certificado
                          </button>
                        </td>
                      </motion.tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                          <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                          <p>No se encontraron notificaciones emitidas.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Formulario de Emisión */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ backgroundColor: 'white', borderRadius: '24px', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Plus size={22} color="#3b82f6" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nueva Emisión</h3>
              </div>
              
              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Radicado del Proceso</label>
                  <input type="text" value={formData.caseName} onChange={e => setFormData({...formData, caseName: e.target.value})} placeholder="Ej: 2026-00123" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Cédula del Demandado</label>
                  <input type="text" value={formData.defendantId} onChange={e => setFormData({...formData, defendantId: e.target.value})} placeholder="Sin puntos ni comas" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Canal de Trazabilidad (WhatsApp)</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="3001234567" required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Documento Judicial (PDF)</label>
                  <div style={{ position: 'relative', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <input type="file" onChange={e => setFormData({...formData, file: e.target.files?.[0] || null})} accept=".pdf" required style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    <Upload size={24} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '0.85rem', color: formData.file ? '#0f172a' : '#64748b', fontWeight: formData.file ? 700 : 400 }}>{formData.file ? formData.file.name : 'Click para subir archivo'}</div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isProcessing}
                  style={{ marginTop: '1rem', width: '100%', padding: '1.1rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                >
                  {isProcessing ? 'Encriptando...' : 'EMITIR NOTIFICACIÓN'}
                  {!isProcessing && <Send size={18} />}
                </button>
              </form>
            </motion.div>

            {/* Banner de Capacidad */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '24px', padding: '2rem', color: 'white', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <ShieldCheck size={22} color="#60a5fa" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Infraestructura Elite</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Su cuenta cuenta con respaldo judicial completo y almacenamiento de evidencias por 5 años.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => alert("Redireccionando a PSE...")} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>Mejorar Plan</button>
                <button onClick={() => alert("Redireccionando a PSE...")} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>Recargar</button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;


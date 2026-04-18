import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { supabase } from '../lib/supabaseClient';
import CertificateViewer from './CertificateViewer';
import Paywall from './Paywall';

/**
 * GMA DYNAMICS - USER DASHBOARD v2.9 (Restauración de UX y Funciones)
 */

interface Notification {
  id: string;
  caseName: string;
  date: string;
  recipient: string;
  email: string;
  status: 'Procesando' | 'Enviado' | 'Entregado' | 'Leído';
  emailStatus: 'Enviado' | 'Recibido' | 'Abierto';
  hash: string;
  readAt?: string;
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
  const [formData, setFormData] = useState({ 
    caseName: '', 
    phone: '', 
    email: user || '', 
    defendantId: '', 
    file: null as File | null 
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Notification | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'extra' | 'upgrade'>('extra');
  const [extraQty, setExtraQty] = useState(1);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<any>(null);
  
  // ESTADOS DE PAGO (CORRECCIÓN DE FALLO DE REFERENCIA)
  const [extraCard, setExtraCard] = useState({ number: '', expiry: '', cvc: '' });
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentErrorMsg, setPaymentErrorMsg] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const upgradePlans = [
    { id: 'medio', name: 'Plan Medio Judicial', price: 60000, limit: 20, originalPrice: 160000, unitPrice: 3000, saving: 100000, badge: 'MÁS POPULAR' },
    { id: 'pro', name: 'Plan Pro Judicial', price: 196000, limit: 100, originalPrice: 800000, unitPrice: 1960, saving: 604000, badge: 'MAYOR AHORRO (75%)' }
  ];

  const loadDashboardData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) {
      const expires = new Date(profile.plan_start_date || profile.updated_at);
      expires.setDate(expires.getDate() + 30);
      setAccount({ username: user, plan: profile.plan, limit: profile.limit_msgs, sent: profile.sent_msgs, status: profile.status, expiresAt: expires.toISOString() });
    }
    const { data: notifs } = await supabase.from('notifications').select('*').eq('owner_id', authUser.id).order('created_at', { ascending: false });
    if (notifs) {
      setNotifications(notifs.map(n => ({ id: n.id, caseName: n.case_name, date: new Date(n.created_at).toLocaleString(), recipient: n.phone, email: n.email, status: n.status, emailStatus: 'Enviado', hash: n.file_hash, readAt: n.read_at, owner: user })));
    }
  }, [user]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !account) return;
    
    setIsProcessing(true); setLogs([]);
    addLog("🛡️ Protocolo LegalTech v2.9...");
    try {
      addLog("🔐 Cifrando documento...");
      const pdfBytes = new Uint8Array(await formData.file.arrayBuffer());
      const ownerPassword = import.meta.env.VITE_PDF_OWNER_PASSWORD || 'GMA_DEFAULT_OWNER_2026';
      
      const encryptedBytes = await encryptPDF(pdfBytes, formData.defendantId, { ownerPassword, allowModifying: false, allowCopying: false });
      const encryptedFile = new File([encryptedBytes], `Protegido_${formData.file.name}`, { type: 'application/pdf' });
      addLog("🧬 Generando Hash SHA-256...");
      const hashBuffer = await crypto.subtle.digest('SHA-256', await encryptedFile.arrayBuffer());
      const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      
      addLog("🚀 Enviando evidencia...");
      const n8nData = new FormData();
      Object.entries(formData).forEach(([k, v]) => v && n8nData.append(k, v));
      n8nData.set('file', encryptedFile); n8nData.append('hash', fileHash);
      await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, { method: 'POST', body: n8nData });
      
      await supabase.from('notifications').insert([{ case_name: formData.caseName, phone: formData.phone, email: formData.email, defendant_id: formData.defendantId, file_hash: fileHash, owner_id: (await supabase.auth.getUser()).data.user?.id }]);
      
      await loadDashboardData();
      addLog("✅ Certificado judicial emitido.");
      setFormData({ caseName: '', phone: '', email: '', defendantId: '', file: null });
    } catch (error: any) { 
      addLog("❌ FALLO: " + error.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const addLog = (msg: string) => { setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 8)); };

  useGSAP(() => { gsap.from(".dash-card", { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }); }, { scope: containerRef });

  if (showPaywall) return <Paywall />;

  return (
    <div ref={containerRef} style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <CertificateViewer data={selectedCert} onClose={() => setSelectedCert(null)} />
      
      <nav style={{ backgroundColor: '#0f172a', color: 'white', padding: '1.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h1 style={{ color: 'white', fontSize: '1.4rem', margin: 0, fontWeight: 900 }}>GMA <span style={{ color: '#3b82f6' }}>DYNAMICS</span></h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold' }}>TRAZABILIDAD JUDICIAL</span>
          </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {account && (
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '900', textTransform: 'uppercase' }}>Plan</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{account.plan}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '900', textTransform: 'uppercase' }}>Consumo</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#3b82f6' }}>{account.sent} / {account.limit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '900', textTransform: 'uppercase' }}>Vencimiento</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b' }}>
                    {account.expiresAt ? new Date(account.expiresAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            )}
            <button onClick={onLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}>SALIR</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '3rem', alignItems: 'start' }}>
          
          <div className="dash-card" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            {/* SECCIÓN DE GESTIÓN DE CAPACIDAD (Siempre visible) */}
            <div className="dash-card" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0', marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1.5rem' }}>🚀 Gestionar Capacidad</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button onClick={() => { setPaymentType('extra'); setShowPaymentModal(true); }} style={{ padding: '1rem', borderRadius: '16px', border: '1px solid #3b82f6', backgroundColor: '#eff6ff', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 900, color: '#1e3a8a' }}>Comprar Mensajes</div>
                  </button>
                  <button onClick={() => { setPaymentType('upgrade'); setShowPaymentModal(true); }} style={{ padding: '1rem', borderRadius: '16px', border: '1px solid #10b981', backgroundColor: '#f0fdf4', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 900, color: '#065f46' }}>Mejorar Plan</div>
                  </button>
                </div>
            </div>
              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 900 }}>📩 Nueva Notificación</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>RADICADO</label>
                  <input type="text" value={formData.caseName} onChange={e => setFormData({...formData, caseName: e.target.value})} placeholder="Ej: 2026-00045" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>ID DEMANDADO (CÉDULA)</label>
                  <input type="text" value={formData.defendantId} onChange={e => setFormData({...formData, defendantId: e.target.value})} placeholder="Solo números (Clave de cifrado)" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>WHATSAPP DESTINO</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+57 3XX XXX XXXX" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </div>

                {/* EMAIL OCULTO PARA MVP - CENTRADO EN WHATSAPP */}
                <div style={{ display: 'none' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>EMAIL DE NOTIFICACIÓN</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>ARCHIVO PDF JUDICIAL</label>
                  <input type="file" onChange={e => setFormData({...formData, file: e.target.files?.[0] || null})} accept=".pdf" required style={{ padding: '0.85rem', border: '2px dashed #cbd5e1', borderRadius: '12px' }} />
                </div>

                <button type="submit" disabled={isProcessing} style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '14px', backgroundColor: '#3b82f6', color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer' }}>EMITIR NOTIFICACIÓN</button>
              </form>
            </div>
            <div style={{ marginTop: '2.5rem', backgroundColor: '#0f172a', color: '#60a5fa', padding: '1.2rem', borderRadius: '16px', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              <div style={{ color: '#475569', marginBottom: '0.5rem', fontWeight: 900 }}>ENGINE_LOG_V2.9</div>
              {logs.map((log, i) => <div key={i} style={{ marginBottom: '0.2rem' }}>{log}</div>)}
            </div>
          </div>

          <div className="dash-card" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '2.5rem' }}>Evidencia Judicial</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.7rem', borderBottom: '1px solid #f1f5f9' }}><th style={{ padding: '1rem' }}>CASO</th><th>ESTADO</th><th>REGISTRO</th><th style={{ textAlign: 'right' }}>ACTA</th></tr></thead>
                <tbody>{notifications.map(n => (<tr key={n.id} style={{ borderBottom: '1px solid #f8fafc' }}><td style={{ padding: '1.2rem 1rem', fontWeight: 800 }}>{n.caseName}</td><td><span style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, backgroundColor: n.status === 'Leído' ? '#d1fae5' : '#fef3c7', color: n.status === 'Leído' ? '#065f46' : '#92400e' }}>{n.status}</span></td><td style={{ fontSize: '0.8rem', color: '#64748b' }}>{n.date}</td><td style={{ textAlign: 'right' }}><button onClick={() => setSelectedCert(n)} style={{ backgroundColor: '#0f172a', color: 'white', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>VER</button></td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPaymentModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '32px', maxWidth: '480px', width: '90%' }}>
              <AnimatePresence mode="wait">
                {paymentStatus === 'processing' && (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: 56, height: 56, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
                    <p style={{ fontWeight: 700, color: '#0f172a' }}>Procesando pago...</p>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No cierre esta ventana.</p>
                  </motion.div>
                )}

                {paymentStatus === 'success' && (
                  <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ width: 56, height: 56, backgroundColor: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem' }}>✓</div>
                    <h3 style={{ fontWeight: 900, color: '#065f46', marginBottom: '0.5rem' }}>¡Pago exitoso!</h3>
                    <p style={{ color: '#64748b' }}>Tu plan ha sido actualizado correctamente.</p>
                    <button onClick={() => { setShowPaymentModal(false); setPaymentStatus('idle'); }} style={{ marginTop: '1.5rem', padding: '0.8rem 2rem', borderRadius: '12px', backgroundColor: '#0f172a', color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer' }}>CONTINUAR</button>
                  </motion.div>
                )}

                {paymentStatus === 'error' && (
                  <motion.div key="error" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ width: 56, height: 56, backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem' }}>✕</div>
                    <h3 style={{ fontWeight: 900, color: '#991b1b', marginBottom: '0.5rem' }}>Pago rechazado</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{paymentErrorMsg}</p>
                    <button onClick={() => setPaymentStatus('idle')} style={{ padding: '0.8rem 2rem', borderRadius: '12px', backgroundColor: '#3b82f6', color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer' }}>INTENTAR DE NUEVO</button>
                  </motion.div>
                )}

                {paymentStatus === 'idle' && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Confirmar Pago</h2>
                      <p style={{ color: '#64748b' }}>{paymentType === 'extra' ? `Paquete de ${extraQty} mensajes` : `Upgrade a ${selectedUpgradePlan?.name}`}</p>
                    </div>
                    
                    <form onSubmit={processPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#475569' }}>Total a pagar</span>
                          <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#0f172a' }}>
                            ${(paymentType === 'extra' ? getExtraPrice(extraQty) : selectedUpgradePlan?.price).toLocaleString()}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <input 
                            type="text" placeholder="0000 0000 0000 0000" 
                            value={extraCard.number} 
                            onChange={e => setExtraCard({...extraCard, number: e.target.value})}
                            style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required 
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <input 
                              type="text" placeholder="MM/YY" 
                              value={extraCard.expiry} 
                              onChange={e => setExtraCard({...extraCard, expiry: e.target.value})}
                              style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required 
                            />
                            <input 
                              type="text" placeholder="CVC" 
                              value={extraCard.cvc} 
                              onChange={e => setExtraCard({...extraCard, cvc: e.target.value})}
                              style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={isProcessing}
                        style={{ width: '100%', padding: '1.2rem', borderRadius: '14px', backgroundColor: '#0f172a', color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)' }}
                      >
                        {isProcessing ? 'PROCESANDO...' : 'PAGAR AHORA CON MERCADO PAGO'}
                      </button>
                    </form>
                    
                    <button onClick={() => setShowPaymentModal(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', marginTop: '1.5rem' }}>CANCELAR</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

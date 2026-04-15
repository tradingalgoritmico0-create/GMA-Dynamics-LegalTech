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
  const [formData, setFormData] = useState({ caseName: '', phone: '', email: 'no-email@gma.com', defendantId: '', file: null as File | null });
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
  const [extraCard, setExtraCard] = useState({ number: '', expiry: '', cvc: '' });

  const containerRef = useRef<HTMLDivElement>(null);

  const isPlanActive = () => {
    if (!account?.expiresAt || account.plan.includes("Gratis")) return false;
    return new Date(account.expiresAt) > new Date();
  };

  const getExtraPrice = (qty: number) => {
    if (!account) return qty * 8000;
    if (!isPlanActive()) return qty * 8000;
    if (account.plan.includes('Medio')) return qty * 6000;
    if (account.plan.includes('Pro')) return qty * 4000;
    return qty * 8000;
  };

  const upgradePlans = [
    { id: 'medio', name: 'Plan Medio Judicial', price: 60000, limit: 20, originalPrice: 160000, unitPrice: 3000, saving: 100000, badge: 'MÁS POPULAR' },
    { id: 'pro', name: 'Plan Pro Judicial', price: 196000, limit: 100, originalPrice: 800000, unitPrice: 1960, saving: 604000, badge: 'MAYOR AHORRO (75%)' }
  ];

  const loadDashboardData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) {
      if (profile.status === "Suspendido") setShowPaywall(true);
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

  const isPlanExpired = () => {
    if (!account?.expiresAt) return false;
    return new Date() > new Date(account.expiresAt);
  };
const processPayment = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!extraCard.number || !extraCard.expiry || !extraCard.cvc) return alert("Complete los datos de la tarjeta.");

  setIsProcessing(true);
  try {
    // 1. VALIDACIÓN REAL CON MERCADO PAGO
    const mp = new (window as any).MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);
    const [month, year] = extraCard.expiry.split('/');

    const cardToken = await mp.createCardToken({
      cardNumber: extraCard.number.replace(/\s/g, ''),
      cardholderName: user,
      cardExpirationMonth: month,
      cardExpirationYear: '20' + year,
      securityCode: extraCard.cvc,
      identificationType: 'CC',
      identificationNumber: '12345678'
    });

    if (!cardToken.id) throw new Error("Tarjeta rechazada por Mercado Pago.");
    console.log("Validación Exitosa - Token:", cardToken.id);

    const { data: { user: authUser } } = await supabase.auth.getUser();
...
      if (!authUser || !account) throw new Error("Error de sesión");
      if (paymentType === 'extra') {
        const newLimit = account.limit + extraQty;
        await supabase.from('profiles').update({ limit_msgs: newLimit }).eq('id', authUser.id);
        setAccount({ ...account, limit: newLimit });
      } else {
        const newExpires = new Date(); newExpires.setDate(newExpires.getDate() + 30);
        await supabase.from('profiles').update({ plan: selectedUpgradePlan.name, limit_msgs: selectedUpgradePlan.limit, sent_msgs: 0, status: 'Activo', updated_at: new Date().toISOString() }).eq('id', authUser.id);
        setAccount({ ...account, plan: selectedUpgradePlan.name, limit: selectedUpgradePlan.limit, sent: 0, expiresAt: newExpires.toISOString() });
      }
      setShowPaymentModal(false);
      alert("Transacción exitosa.");
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !account || account.sent >= account.limit) return;
    setIsProcessing(true); setLogs([]);
    addLog("🛡️ Protocolo LegalTech v2.9...");
    try {
      addLog("🔐 Cifrando documento...");
      const pdfBytes = new Uint8Array(await formData.file.arrayBuffer());
      const encryptedBytes = await encryptPDF(pdfBytes, formData.defendantId, { ownerPassword: 'GMA_ADMIN_MASTER_2026', allowModifying: false, allowCopying: false });
      const encryptedFile = new File([encryptedBytes], `Protegido_${formData.file.name}`, { type: 'application/pdf' });
      addLog("🧬 Generando Hash SHA-256...");
      const arrayBuffer = await encryptedFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      addLog("🚀 Enviando evidencia...");
      const n8nData = new FormData();
      Object.entries(formData).forEach(([k, v]) => v && n8nData.append(k, v));
      n8nData.set('file', encryptedFile); n8nData.append('hash', fileHash);
      await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, { method: 'POST', body: n8nData });
      const { data: newNotif } = await supabase.from('notifications').insert([{ case_name: formData.caseName, phone: formData.phone, email: formData.email, defendant_id: formData.defendantId, file_hash: fileHash, owner_id: (await supabase.auth.getUser()).data.user?.id }]).select().single();
      await supabase.from('profiles').update({ sent_msgs: account.sent + 1 }).eq('id', (await supabase.auth.getUser()).data.user?.id);
      setAccount(prev => prev ? { ...prev, sent: prev.sent + 1 } : null);
      setNotifications(prev => [{ id: newNotif.id, caseName: formData.caseName, date: new Date().toLocaleString(), recipient: formData.phone, email: formData.email, status: 'Enviado', emailStatus: 'Enviado', hash: fileHash, owner: user }, ...prev]);
      addLog("✅ Certificado judicial emitido.");
      setFormData({ caseName: '', phone: '', email: '', defendantId: '', file: null });
    } catch (error: any) { addLog("❌ FALLO: " + error.message); } finally { setIsProcessing(false); }
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
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '900', textTransform: 'uppercase' }}>Vencimiento</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b' }}>
                    {account.expiresAt ? new Date(account.expiresAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.5rem', color: '#94a3b8', fontWeight: 'bold' }}>*Mensajes no acumulables</div>
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
            {account && (account.sent >= account.limit || isPlanExpired()) ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <div style={{ width: '50px', height: '50px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.2rem' }}>⚠️</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{isPlanExpired() ? 'Plan Expirado' : 'Límite Alcanzado'}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{isPlanExpired() ? 'Su periodo de servicio ha finalizado.' : 'Optimice su inversión con nuestros planes mensuales y ahorre hasta un 75%.'}</p>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 900, display: 'block', marginBottom: '1rem', textTransform: 'uppercase' }}>Recarga Inmediata (Extra)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    {[1, 5, 10, 20].map(q => (
                      <button key={q} onClick={() => { setExtraQty(q); setPaymentType('extra'); setShowPaymentModal(true); }} style={{ padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ fontWeight: 900 }}>{q} Mensaje{q > 1 ? 's' : ''}</div>
                        <div style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.8rem' }}>${getExtraPrice(q).toLocaleString()} COP</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 900, display: 'block', marginBottom: '1.2rem', textTransform: 'uppercase' }}>Actualizar a Plan Profesional</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {upgradePlans.map(p => (
                      <button key={p.id} onClick={() => { setSelectedUpgradePlan(p); setPaymentType('upgrade'); setShowPaymentModal(true); }} style={{ padding: '1.8rem', borderRadius: '24px', border: '2px solid #3b82f6', backgroundColor: '#eff6ff', textAlign: 'left', cursor: 'pointer', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-12px', left: '20px', backgroundColor: '#3b82f6', color: 'white', fontSize: '0.65rem', padding: '0.3rem 0.8rem', borderRadius: '100px', fontWeight: 900 }}>{p.badge}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1e3a8a' }}>{p.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 700 }}>{p.limit} Mensajes Certificados</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textDecoration: 'line-through' }}>Precio regular: ${p.originalPrice.toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 900, color: '#1e3a8a', fontSize: '1.4rem' }}>${p.price.toLocaleString()}</div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 900 }}>AHORRO: ${p.saving.toLocaleString()}</div>
                          </div>
                        </div>
                        <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: '#1e3a8a', fontWeight: 600 }}>Costo por notificación:</span>
                          <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 900 }}>${p.unitPrice.toLocaleString()} COP</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
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
            )}
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
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}><h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>Confirmar Pago</h2><p style={{ color: '#64748b' }}>{paymentType === 'extra' ? `Paquete de ${extraQty} mensajes` : `Upgrade a ${selectedUpgradePlan?.name}`}</p></div>
              <div style={{ backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontWeight: 900, fontSize: '1.3rem' }}>${(paymentType === 'extra' ? getExtraPrice(extraQty) : selectedUpgradePlan?.price).toLocaleString()}</span></div>
                <form onSubmit={processPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                  <input type="text" placeholder="Tarjeta" value={extraCard.number} onChange={e => setExtraCard({...extraCard, number: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}><input type="text" placeholder="MM/YY" style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required /><input type="text" placeholder="CVC" style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required /></div>
                  <button type="submit" disabled={isProcessing} style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '14px', backgroundColor: '#0f172a', color: 'white', fontWeight: 900 }}>PAGAR AHORA</button>
                </form>
              </div>
              <button onClick={() => setShowPaymentModal(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>CANCELAR</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

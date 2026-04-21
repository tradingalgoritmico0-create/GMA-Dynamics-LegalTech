import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { supabase } from '../lib/supabaseClient';
import CertificateViewer from './CertificateViewer';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'extra' | 'upgrade'>('extra');
  const [extraQty, setExtraQty] = useState(1);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<any>(null);
  const [extraCard, setExtraCard] = useState({ number: '', expiry: '', cvc: '' });
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentErrorMsg, setPaymentErrorMsg] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <CertificateViewer data={selectedCert} onClose={() => setSelectedCert(null)} />
      
      <nav style={{ backgroundColor: '#0f172a', color: 'white', padding: '1.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h1 style={{ color: 'white', fontSize: '1.4rem', margin: 0, fontWeight: 900 }}>GMA <span style={{ color: '#3b82f6' }}>DYNAMICS</span></h1>
          </div>
          <button onClick={onLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}>SALIR</button>
        </div>
      </nav>

      <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '3rem', alignItems: 'start' }}>
          
          <div className="dash-card" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>📩 Nueva Notificación</h3>
              <input type="text" value={formData.caseName} onChange={e => setFormData({...formData, caseName: e.target.value})} placeholder="Radicado" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <input type="text" value={formData.defendantId} onChange={e => setFormData({...formData, defendantId: e.target.value})} placeholder="Cédula Demandado" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+57 WhatsApp" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <input type="file" onChange={e => setFormData({...formData, file: e.target.files?.[0] || null})} accept=".pdf" required style={{ padding: '0.85rem', border: '2px dashed #cbd5e1', borderRadius: '12px' }} />
              <button type="submit" disabled={isProcessing} style={{ padding: '1.2rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '14px', border: 'none', cursor: 'pointer' }}>EMITIR NOTIFICACIÓN</button>
            </form>

            <div className="dash-card" style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid #3b82f6', marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1rem' }}>🚀 Gestionar Capacidad</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => setShowPaymentModal(true)} style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #3b82f6', backgroundColor: '#eff6ff', cursor: 'pointer' }}>Gestionar Planes</button>
                </div>
            </div>
          </div>

          <div className="dash-card" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '2.5rem' }}>Evidencia Judicial</h3>
            <table style={{ width: '100%' }}>
              <thead><tr><th>Caso</th><th>Estado</th></tr></thead>
              <tbody>{notifications.map(n => (<tr key={n.id}><td>{n.caseName}</td><td>{n.status}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

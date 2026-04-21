import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [account, setAccount] = useState<UserAccount | null>(null);

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
    
    setIsProcessing(true);
    try {
      const pdfBytes = new Uint8Array(await formData.file.arrayBuffer());
      const ownerPassword = import.meta.env.VITE_PDF_OWNER_PASSWORD || 'GMA_DEFAULT_OWNER_2026';
      
      const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
      const encryptedBytes = await encryptPDF(pdfBytes, formData.defendantId, { ownerPassword, allowModifying: false, allowCopying: false });
      const encryptedFile = new File([encryptedBytes], `Protegido_${formData.file.name}`, { type: 'application/pdf' });
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', await encryptedFile.arrayBuffer());
      const fileHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      
      const n8nData = new FormData();
      Object.entries(formData).forEach(([k, v]) => v && n8nData.append(k, v));
      n8nData.set('file', encryptedFile); n8nData.append('hash', fileHash);
      await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, { method: 'POST', body: n8nData });
      
      await supabase.from('notifications').insert([{ case_name: formData.caseName, phone: formData.phone, email: formData.email, defendant_id: formData.defendantId, file_hash: fileHash, owner_id: (await supabase.auth.getUser()).data.user?.id }]);
      
      await loadDashboardData();
      alert("✅ Certificado judicial emitido.");
      setFormData({ caseName: '', phone: '', email: '', defendantId: '', file: null });
    } catch (error: any) { 
      alert("❌ FALLO: " + error.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <div ref={containerRef} style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <CertificateViewer data={selectedCert} onClose={() => setSelectedCert(null)} />
      
      <nav style={{ backgroundColor: '#0f172a', color: 'white', padding: '1.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>GMA DYNAMICS</h1>
          <button onClick={onLogout} style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '10px', cursor: 'pointer' }}>SALIR</button>
        </div>
      </nav>

      <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '3rem', alignItems: 'start' }}>
          
          <div className="dash-card" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <h3>📩 Nueva Notificación</h3>
              <input type="text" value={formData.caseName} onChange={e => setFormData({...formData, caseName: e.target.value})} placeholder="Radicado" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <input type="text" value={formData.defendantId} onChange={e => setFormData({...formData, defendantId: e.target.value})} placeholder="Cédula Demandado" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+57 WhatsApp" required style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <input type="file" onChange={e => setFormData({...formData, file: e.target.files?.[0] || null})} accept=".pdf" required style={{ padding: '0.85rem', border: '2px dashed #cbd5e1', borderRadius: '12px' }} />
              <button type="submit" disabled={isProcessing} style={{ padding: '1.2rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '14px', border: 'none', cursor: 'pointer' }}>EMITIR NOTIFICACIÓN</button>
            </form>
          </div>

          <div className="dash-card" style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', border: '1px solid #e2e8f0' }}>
            <h3>Evidencia Judicial</h3>
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

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ShieldAlert, FileCheck, MapPin, Eye, Lock } from 'lucide-react';

interface NotificationData {
  case_name: string;
  defendant_id: string;
  status: string;
}

const PublicView = () => {
  const [hash, setHash] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [notif, setNotif] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const hashFromPath = path.split('/view/')[1];
    if (hashFromPath) {
      setHash(hashFromPath);
      fetchBasicInfo(hashFromPath);
    }
  }, []);

  const fetchBasicInfo = async (h: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('case_name, status')
      .eq('file_hash', h)
      .single();
    
    if (error || !data) {
      setError('Enlace judicial no encontrado o expirado.');
    } else {
      setNotif(data as NotificationData);
    }
    setLoading(false);
  };

  const captureEvidence = useCallback(async () => {
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      const geoData = await ipRes.json();
      return geoData;
    } catch {
      return { city: 'Desconocida', country: 'Desconocido', error: 'Geo bloqueada' };
    }
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');
    
    try {
      const geo = await captureEvidence();
      const { data, error: rpcError } = await supabase.rpc('validate_and_log_access', {
        p_hash: hash,
        p_id_number: idNumber,
        p_ip: geo.ip || '0.0.0.0',
        p_ua: navigator.userAgent,
        p_geo: geo
      });

      if (rpcError) {
        if (rpcError.message === 'INVALID_ID') throw new Error('La identificación no coincide con el registro judicial.');
        throw rpcError;
      }

      if (data && data[0]) {
        // En lugar de redirección, obtenemos URL firmada de Supabase Storage
        const { data: signRes } = await supabase.storage
          .from('lawsuits')
          .createSignedUrl(data[0].file_path_out, 3600); // 1 hora de acceso
        
        if (signRes?.signedUrl) {
          setPdfUrl(signRes.signedUrl);
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>Cargando portal judicial...</div>;

  if (pdfUrl) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileCheck color="#10b981" />
            <span style={{ fontWeight: 700 }}>{notif?.case_name} - ACCESO AUTORIZADO</span>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Notificación Ley 2213 de 2022</div>
        </div>
        <iframe src={pdfUrl} style={{ width: '100%', flex: 1, border: 'none' }} title="Demanda Judicial" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Inter' }}>
      <div style={{ maxWidth: '600px', width: '100%', backgroundColor: 'white', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', padding: '3rem', border: '1px solid #e2e8f0' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ backgroundColor: '#fee2e2', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShieldAlert size={40} color="#ef4444" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>Notificación Judicial Electrónica</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>República de Colombia - Sistema GMA Dynamics</p>
        </div>

        <div style={{ backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316', padding: '1.5rem', marginBottom: '2.5rem', borderRadius: '0 12px 12px 0' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', color: '#9a3412', fontWeight: 700 }}>
            <Lock size={18} /> AVISO LEGAL IMPORTANTE
          </div>
          <p style={{ fontSize: '0.85rem', color: '#9a3412', lineHeight: '1.6', margin: 0 }}>
            Usted ha sido vinculado al proceso <strong>{notif?.case_name}</strong>. El acceso a este documento mediante la validación de su identidad constituye una <strong>NOTIFICACIÓN PERSONAL EFECTIVA</strong> bajo los términos de la Ley 2213 de 2022. Sus datos de conexión (IP, Geo, Device) serán capturados para el Acta de Certificación Judicial.
          </p>
        </div>

        {error && <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Identificación del Demandado (Cédula/NIT)</label>
            <input 
              type="password"
              placeholder="Ingrese su identificación para validar"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '1.1rem', outline: 'none', transition: 'border-color 0.2s' }}
            />
          </div>

          <button 
            onClick={handleVerify}
            disabled={isVerifying || !idNumber}
            style={{ 
              width: '100%', 
              backgroundColor: '#0f172a', 
              color: 'white', 
              padding: '1.25rem', 
              borderRadius: '16px', 
              fontSize: '1.1rem', 
              fontWeight: 800, 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              opacity: isVerifying ? 0.7 : 1
            }}
          >
            {isVerifying ? 'Verificando Identidad...' : <><Eye size={20} /> Firmar y Ver Documento</>}
          </button>
        </div>

        <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}><MapPin size={14} /> Geolocalización Activa</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}><ShieldAlert size={14} /> Trazabilidad SHA-256</div>
        </div>
      </div>
    </div>
  );
};

export default PublicView;

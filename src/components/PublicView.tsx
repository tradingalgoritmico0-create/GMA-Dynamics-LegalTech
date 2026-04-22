import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { DottedBackground } from './ui/Backgrounds';

/**
 * GMA DYNAMICS - VISOR DE EVIDENCIA JUDICIAL V5
 * Este componente es el corazón de la prueba legal. Captura la huella digital del demandado.
 */

interface Notification {
  id: string;
  case_name: string;
  file_path: string;
  file_hash: string;
}

const PublicView = () => {
  // Extracción manual del ID de la URL (/view/ID)
  const id = window.location.pathname.split('/').pop();
  
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [notifData, setNotifData] = useState<Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Capturar evidencia automáticamente al abrir la página
  const captureEvidence = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();
      
      const userAgent = navigator.userAgent;
      
      // Llamar al RPC de Supabase para registrar la visita
      await supabase.rpc('register_view_evidence', {
        notif_id: id,
        p_ip: ip,
        p_ua: userAgent,
        p_geo: { timestamp: new Date().toISOString(), platform: navigator.platform }
      });
    } catch (err) {
      console.error("Error capturando evidencia:", err);
    }
  }, [id]);

  useEffect(() => {
    if (id) captureEvidence();
  }, [id, captureEvidence]);

  // 2. Validar acceso por cédula
  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: isAuthorized, error: rpcError } = await supabase.rpc('check_defendant_access', {
        notif_id: id,
        cedula_input: cedula
      });

      if (rpcError || !isAuthorized) {
        throw new Error("Acceso denegado: La identificación no coincide con el registro judicial.");
      }

      // Traer datos de la notificación para mostrar el PDF
      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      setNotifData(notif);
      setAuthorized(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DottedBackground>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <AnimatePresence mode="wait">
          {!authorized ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', textAlign: 'center' }}
            >
              <h1 style={{ fontWeight: 900, color: '#0f172a', marginBottom: '1rem' }}>GMA <span style={{ color: '#3b82f6' }}>LEGALTECH</span></h1>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Este es un Portal Oficial de Notificación Judicial. Por favor, valide su identidad para acceder al expediente.</p>
              
              <form onSubmit={handleAccess} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase' }}>Cédula de Ciudadanía / NIT</label>
                  <input 
                    type="text" 
                    value={cedula} 
                    onChange={e => setCedula(e.target.value)}
                    placeholder="Ingrese su identificación" 
                    style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '0.5rem', fontSize: '1.1rem' }}
                    required 
                  />
                </div>
                {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>⚠️ {error}</p>}
                <button 
                  disabled={loading}
                  style={{ backgroundColor: '#0f172a', color: 'white', padding: '1.2rem', borderRadius: '16px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  {loading ? 'VALIDANDO...' : 'ACCEDER AL EXPEDIENTE'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="viewer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontWeight: 900, margin: 0 }}>Expediente Digital</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Radicado: {notifData?.case_name}</p>
                </div>
                <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 900 }}>ACCESO VALIDADO</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem' }}>Se ha registrado su acceso con IP y firma digital para fines de trazabilidad legal (Ley 2213 de 2022).</p>
                <a 
                  href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/demandas/${notifData?.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-block', backgroundColor: '#3b82f6', color: 'white', padding: '1.2rem 2.5rem', borderRadius: '16px', fontWeight: 900, textDecoration: 'none', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
                >
                  📥 DESCARGAR DOCUMENTO JUDICIAL
                </a>
              </div>
              
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
                ID de Notificación: {id}<br />
                Huella SHA-256: {notifData?.file_hash}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DottedBackground>
  );
};

export default PublicView;

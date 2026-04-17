import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * GMA DYNAMICS - CERTIFICATE VIEWER v2.0
 * Genera el acta judicial con QR de validación inmutable.
 */

interface CertificateProps {
  data: {
    id: string;
    caseName: string;
    date: string;
    recipient: string;
    email: string;
    hash: string;
    status: string;
    emailStatus: string;
  } | null;
  onClose: () => void;
}

const CertificateViewer = ({ data, onClose }: CertificateProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (data) {
      gsap.from(".cert-content", { y: 50, autoAlpha: 0, duration: 0.6, ease: "power4.out" });
    }
  }, [data]);

  if (!data) return null;

  return (
    <div ref={modalRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="cert-content" style={{ backgroundColor: 'white', width: '100%', maxWidth: '900px', height: '95vh', overflowY: 'auto', padding: '3rem', borderRadius: '2px', position: 'relative', fontFamily: '"Times New Roman", Times, serif', color: '#1a1a1a', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
        
        {/* Marca de Agua */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '4rem', fontWeight: 'bold', color: 'rgba(0,0,0,0.05)',
          transform: 'rotate(-45deg)', pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap'
        }}>
          GMA LEGALTECH - CERTIFICADO
        </div>

        <div style={{ position: 'relative', zIndex: 20 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#f0f0f0', border: '1px solid #ccc', padding: '0.5rem 1rem', cursor: 'pointer' }}>Cerrar</button>
          <button onClick={() => window.print()} style={{ position: 'absolute', top: 0, right: '100px', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer' }}>Descargar</button>
        
        {/* Encabezado Oficial */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '3px double #000', paddingBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', margin: 0, textTransform: 'uppercase' }}>Acta de Notificación Judicial Certificada</h1>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Sistema LegalTech GMA Dynamics | Prestador de Servicios de Certificación Digital</p>
          <p style={{ fontSize: '0.8rem', color: '#555' }}>Generado bajo estándares de la Ley 527 de 1999 y Ley 2213 de 2022</p>
        </div>

        {/* Información del Caso */}
        <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <p><strong>RADICADO / CASO:</strong> {data.caseName}</p>
            <p><strong>ID DE TRANSACCIÓN:</strong> {data.id.padStart(8, '0')}</p>
            <p><strong>FECHA DE OPERACIÓN:</strong> {data.date}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p><strong>ESTADO PROCESAL:</strong> <span style={{ color: '#2c7a7b', fontWeight: 'bold' }}>{data.status === 'Leído' ? 'NOTIFICACIÓN EFECTIVA' : 'EN TRÁMITE'}</span></p>
            {/* DESTINATARIO EMAIL OCULTO PARA MVP
            <p><strong>DESTINATARIO:</strong> {data.email}</p>
            */}
            <p><strong>CANAL:</strong> CANAL WHATSAPP EMPRESARIAL</p>
          </div>
        </div>

        {/* Criptografía */}
        <div style={{ backgroundColor: '#f8fafc', padding: '2rem', border: '1px solid #e2e8f0', marginBottom: '2.5rem', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', borderBottom: '1px solid #1e3a8a', paddingBottom: '0.5rem', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '1px' }}>Certificación de Integridad Documental</h3>
          <div style={{ backgroundColor: '#ffffff', padding: '1.2rem', border: '1px solid #cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
            {data.hash}
          </div>
          <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: '#64748b', lineHeight: '1.4' }}>
            Esta huella digital (HASH SHA-256) garantiza que el contenido del documento no ha sido alterado desde su emisión. 
            Cualquier modificación posterior invalidará este certificado de integridad.
          </p>
        </div>

        {/* QR DE VALIDACIÓN */}
        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ borderTop: '1px solid #000', width: '280px', paddingTop: '0.8rem' }}>
              <strong style={{ fontSize: '0.9rem' }}>Firma Digital de Infraestructura</strong><br />
              <span style={{ fontSize: '0.7rem', color: '#475569' }}>GMA DYNAMICS LEGALTECH SAS</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ textAlign: 'center' }}>
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}?hash=${data.hash.replace('SHA256: ', '')}&case=${data.caseName}`)}`}
                 alt="QR de Validación"
                 style={{ border: '4px solid #fff', boxShadow: '0 0 10px rgba(0,0,0,0.1)', width: '100px', height: '100px' }}
               />
               <p style={{ fontSize: '0.6rem', color: '#666', marginTop: '0.4rem', fontWeight: 'bold' }}>ESCANEAR PARA VALIDAR ACTA</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateViewer;

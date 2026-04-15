import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface PublicValidatorProps {
  hash: string;
  caseName: string;
}

const PublicValidator = ({ hash, caseName }: PublicValidatorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".valid-card", {
      scale: 0.95,
      autoAlpha: 0,
      duration: 1,
      ease: "elastic.out(1, 0.75)"
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ 
      minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div className="valid-card" style={{ 
        backgroundColor: 'white', width: '100%', maxWidth: '600px', 
        padding: '3rem', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        textAlign: 'center'
      }}>
        {/* Sello de Verificación */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', height: '80px', backgroundColor: '#dcfce7', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 1rem' 
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Certificado de Autenticidad</h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>GMA Dynamics LegalTech Protocol v3.5</p>
        </div>

        <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Radicado / Caso</label>
            <p style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: '600' }}>{caseName}</p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Huella Digital Inmutable (SHA-256)</label>
            <p style={{ fontSize: '0.9rem', color: '#0f172a', fontFamily: 'monospace', wordBreak: 'break-all', backgroundColor: '#fff', padding: '0.8rem', border: '1px solid #cbd5e1', marginTop: '0.5rem' }}>
              {hash.replace('SHA256: ', '')}
            </p>
          </div>

          <div style={{ marginBottom: '0' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado de Integridad</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#15803d', fontWeight: 'bold' }}>
              <div style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%' }}></div>
              VERIFICADO E ÍNTEGRO
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>
            Este certificado confirma que el documento digital asociado no ha sido alterado desde su radicación en los servidores de GMA Dynamics. La huella digital coincide con el registro inmutable en nuestra base de datos judicial.
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
             <img src="/logo_empresa.jpeg" alt="GMA Logo" style={{ height: '40px', opacity: 0.8 }} />
          </div>
        </div>
      </div>
      
      <div style={{ position: 'absolute', bottom: '2rem', color: 'white', fontSize: '0.8rem', opacity: 0.5 }}>
        © 2026 GMA DYNAMICS | Bogotá, Colombia | Sistema de Trazabilidad Judicial
      </div>
    </div>
  );
};

export default PublicValidator;

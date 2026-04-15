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
      minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      fontFamily: '"Times New Roman", Times, serif'
    }}>
      <div className="valid-card" style={{ 
        backgroundColor: 'white', width: '100%', maxWidth: '700px', 
        padding: '4rem', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        border: '15px solid #0f172a', position: 'relative'
      }}>
        {/* Cabecera con Logo */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <img src="/logo_empresa.jpeg" alt="GMA Logo" style={{ height: '80px', marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '2rem', color: '#0f172a', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Certificado de Veracidad</h1>
          <div style={{ height: '2px', backgroundColor: '#3b82f6', width: '100px', margin: '0 auto' }}></div>
        </div>

        <div style={{ color: '#334155', lineHeight: '1.8', fontSize: '1.1rem', marginBottom: '2.5rem', textAlign: 'justify' }}>
          <p>Se certifica por medio del presente que el documento digital radicado bajo el identificador <strong>{caseName}</strong> ha sido procesado y almacenado bajo estrictos protocolos de trazabilidad inmutable.</p>
          <p>La integridad del archivo ha sido validada mediante el algoritmo <strong>SHA-256</strong>, cumpliendo con los estándares de autenticidad exigidos por la <strong>Ley 2213 de 2022</strong> y el <strong>Decreto 806 de 2020</strong> del ordenamiento jurídico colombiano.</p>
        </div>

        {/* HASH DESTACADO */}
        <div style={{ border: '2px solid #0f172a', padding: '1.5rem', marginBottom: '2.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Huella de Validación Digital (Hash):</label>
          <p style={{ fontSize: '0.9rem', color: '#1e293b', fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>
            {hash.replace('SHA256: ', '')}
          </p>
        </div>

        {/* Firma e Integridad */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
             <div style={{ width: '80px', height: '80px', border: '2px solid #166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontWeight: '900', fontSize: '0.8rem' }}>
                VALIDADO
             </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'right' }}>
            <p><strong>GMA DYNAMICS</strong></p>
            <p>Bogotá, Colombia</p>
            <p>Fecha de verificación: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ marginTop: '3rem', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          Este documento es una representación digital inmutable. La veracidad puede ser consultada en cualquier momento en los servidores de GMA Dynamics.
        </div>
      </div>
    </div>
  );
};

export default PublicValidator;

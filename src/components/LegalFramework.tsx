import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const LegalFramework = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".legal-content", {
      scrollTrigger: { trigger: ".legal", start: "top 80%" },
      x: -50, opacity: 0, duration: 1, ease: "power3.out"
    });
    gsap.from(".legal-item", {
      scrollTrigger: { trigger: ".legal-list", start: "top 85%" },
      y: 20, opacity: 0, duration: 0.8, stagger: 0.15, ease: "power3.out"
    });
  }, { scope: containerRef });

  const laws = [
    { year: "1999", name: "Ley 527", description: "Equivalencia funcional entre mensajes de datos y documentos físicos." },
    { year: "2022", name: "Ley 2213", description: "Permanencia de la justicia digital y validez de notificaciones virtuales." },
    { year: "2022", name: "STC 16733", description: "Jurisprudencia de la Corte Suprema que valida el uso de canales digitales." },
    { year: "2025", name: "Ley 2452", description: "Modernización procesal para la celeridad en materia laboral y seguridad social." }
  ];

  return (
    <section className="legal" ref={containerRef} style={{ padding: '10rem 0', backgroundColor: 'var(--surface)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '6rem', alignItems: 'center' }}>
          <div className="legal-content">
            <div style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem' }}>Marco Normativo</div>
            <h2 style={{ fontSize: '3rem', marginBottom: '2rem', lineHeight: 1.1 }}>Respaldo de <span style={{ color: 'var(--accent)' }}>Grado Judicial</span></h2>
            <p style={{ marginBottom: '2.5rem', fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              GMA Dynamics no es solo una herramienta de envío; es una infraestructura de blindaje probatorio alineada con los más altos estándares del derecho procesal colombiano.
            </p>
            <div style={{ padding: '2rem', borderLeft: '4px solid var(--accent)', backgroundColor: 'var(--background)', borderRadius: '0 16px 16px 0', fontStyle: 'italic', color: 'var(--primary-light)' }}>
              "La integridad documental se garantiza mediante criptografía SHA-256, proporcionando evidencia técnica superior a la captura de pantalla convencional."
            </div>
          </div>
          
          <div className="legal-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {laws.map((law, i) => (
              <div key={i} className="legal-item" style={{ 
                display: 'flex', gap: '2rem', padding: '2rem', 
                backgroundColor: 'white', borderRadius: '20px', 
                border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}>
                <div style={{ fontWeight: '900', color: 'var(--accent)', fontSize: '1.4rem', opacity: 0.3 }}>{law.year}</div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: '700' }}>{law.name}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{law.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LegalFramework;
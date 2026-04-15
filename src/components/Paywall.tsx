import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const Paywall = () => {
  useGSAP(() => {
    gsap.from(".paywall-card", { scale: 0.9, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f7f9' }}>
      <div className="paywall-card" style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px' }}>
        <h2 style={{ fontSize: '2rem', color: '#1a365d', marginBottom: '1rem' }}>Desbloquea Trazabilidad</h2>
        <p style={{ color: '#718096', marginBottom: '2rem' }}>Selecciona tu plan para iniciar notificaciones judiciales protegidas.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer' }}>Plan Básico: 20 msgs - 15 USD</button>
          <button style={{ padding: '1rem', borderRadius: '12px', border: 'none', backgroundColor: '#2b6cb0', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Plan Premium: 100 msgs - 49 USD</button>
        </div>
      </div>
    </div>
  );
};

export default Paywall;

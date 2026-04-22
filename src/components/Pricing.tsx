import { Shield, Zap, Crown } from 'lucide-react';
import { WompiCheckout } from './WompiCheckout';

const Pricing = () => {
  const tiers = [
    {
      name: "Gratis Judicial",
      id: "Plan Gratis Judicial",
      price: 0,
      limit: 5,
      description: "Acceso básico para validar la plataforma.",
      features: ["5 Notificaciones certificadas (Vitalicio)", "Certificados SHA-256 inmutables", "Validación por QR pública"],
      icon: <Shield size={24} />
    },
    {
      name: "Medio Judicial",
      id: "Plan Medio Judicial",
      price: 60000,
      limit: 20,
      description: "Para firmas en crecimiento.",
      features: ["20 Notificaciones certificadas / mes", "Trazabilidad completa", "Soporte prioritario"],
      highlight: true,
      icon: <Zap size={24} />
    },
    {
      name: "Pro Judicial",
      id: "Plan Pro Judicial",
      price: 196000,
      limit: 100,
      description: "Volumen corporativo de alto rendimiento.",
      features: ["100 Notificaciones certificadas / mes", "Almacenamiento 5 años", "API Corporativa"],
      highlight: false,
      icon: <Crown size={24} />
    }
  ];

  return (
    <section className="pricing" style={{ padding: '8rem 2rem', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <button onClick={() => window.location.href = '/'} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1rem' }}>← Volver al inicio</button>
          <h1 style={{ fontSize: '1rem', color: '#3b82f6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>GMA Dynamics LegalTech</h1>
          <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Seleccionar Plan</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {tiers.map((tier, i) => (
            <div key={i} style={{ 
              backgroundColor: tier.highlight ? '#0f172a' : 'white', 
              color: tier.highlight ? 'white' : '#0f172a',
              padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '1.5rem', color: tier.highlight ? '#3b82f6' : '#3b82f6' }}>{tier.icon}</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tier.name}</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.5rem', minHeight: '3em' }}>{tier.description}</p>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem' }}>${tier.price.toLocaleString()}</div>
              
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flexGrow: 1 }}>
                {tier.features.map((f, idx) => <li key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>✓ {f}</li>)}
              </ul>

              {tier.price > 0 ? (
                  <WompiCheckout plan={tier.id} amount={tier.price} limit={tier.limit} />
              ) : (
                  <button disabled style={{ padding: '1rem', borderRadius: '16px', background: '#e2e8f0', border: 'none', fontWeight: 800 }}>Plan Actual</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
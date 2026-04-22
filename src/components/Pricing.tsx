import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Zap, Crown } from 'lucide-react';
import { WompiCheckout } from './WompiCheckout';

const Pricing = () => {
  const tiers = [
    {
      name: "Gratis Judicial",
      id: "Plan Gratis Judicial",
      price: 0,
      limit: 5,
      description: "Ideal para abogados independientes que inician su transformación digital.",
      features: ["5 Notificaciones certificadas / mes", "Certificados SHA-256 inmutables", "Validación por QR pública", "Mensaje extra: $8.000 COP"],
      icon: <Shield size={24} />
    },
    {
      name: "Medio Judicial",
      id: "Plan Medio Judicial",
      price: 60000,
      limit: 20,
      description: "Para firmas en crecimiento que requieren un flujo constante de procesos.",
      features: ["20 Notificaciones certificadas / mes", "Trazabilidad de metadatos completa", "Soporte técnico prioritario", "Mensaje extra: $6.000 COP"],
      highlight: true,
      icon: <Zap size={24} />
    },
    {
      name: "Pro Judicial",
      id: "Plan Pro Judicial",
      price: 196000,
      limit: 100,
      description: "Alta disponibilidad y volumen para departamentos de cobranza y grandes firmas.",
      features: ["100 Notificaciones certificadas / mes", "Almacenamiento judicial 5 años", "API de integración corporativa", "Mensaje extra: $4.000 COP"],
      highlight: false,
      icon: <Crown size={24} />
    }
  ];

  return (
    <section className="pricing" style={{ padding: '12rem 0', backgroundColor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      <div className="container">
        <div className="pricing-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '2rem',
          alignItems: 'stretch'
        }}>
          {tiers.map((tier, i) => (
            <motion.div 
              key={i} 
              style={{ 
                padding: '4.5rem 3.5rem', 
                borderRadius: '32px', 
                backgroundColor: tier.highlight ? 'var(--primary)' : '#ffffff',
                color: tier.highlight ? '#ffffff' : 'var(--primary)',
                border: tier.highlight ? 'none' : '1px solid #e2e8f0',
                display: 'flex', flexDirection: 'column'
              }}
            >
              <h3 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '1.5rem' }}>{tier.name}</h3>
              <div style={{ fontSize: '3.75rem', fontWeight: '900', marginBottom: '1.5rem' }}>${tier.price.toLocaleString()}</div>
              
              <div style={{ flexGrow: 1, marginBottom: '4rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {tier.features.map((feature, idx) => (
                    <li key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <CheckCircle2 size={20} color="#10b981" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {tier.price > 0 ? (
                  <WompiCheckout plan={tier.id} amount={tier.price} limit={tier.limit} />
              ) : (
                  <button disabled style={{ padding: '1.4rem', borderRadius: '18px', backgroundColor: '#cbd5e1' }}>Plan Actual</button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
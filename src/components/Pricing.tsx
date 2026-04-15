import { motion } from 'framer-motion';

interface PricingProps {
  onSelectPlan: (plan: string) => void;
}

const Pricing = ({ onSelectPlan }: PricingProps) => {
  const tiers = [
    {
      name: "Gratis Judicial",
      price: "0",
      description: "Ideal para abogados independientes que inician su transformación digital.",
      features: ["5 Notificaciones certificadas / mes", "Certificados SHA-256 inmutables", "Validación por QR pública", "Mensaje extra: $8.000 COP"],
      cta: "Empezar Gratis",
      highlight: false
    },
    {
      name: "Medio Judicial",
      price: "60.000",
      period: "por mes",
      description: "Para firmas en crecimiento que requieren un flujo constante de procesos.",
      features: ["20 Notificaciones certificadas / mes", "Trazabilidad de metadatos completa", "Soporte técnico prioritario", "Mensaje extra: $6.000 COP"],
      cta: "Suscribirse Medio",
      highlight: true
    },
    {
      name: "Pro Judicial",
      price: "196.000",
      period: "por mes",
      description: "Alta disponibilidad y volumen para departamentos de cobranza y grandes firmas.",
      features: ["100 Notificaciones certificadas / mes", "Almacenamiento judicial 5 años", "API de integración corporativa", "Mensaje extra: $4.000 COP"],
      cta: "Suscribirse Pro",
      highlight: false
    }
  ];

  return (
    <section className="pricing" style={{ padding: '10rem 0', backgroundColor: '#f8fafc' }}>
      <div className="container">
        <motion.div 
          style={{ textAlign: 'center', marginBottom: '6rem' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Planes de <span style={{ color: 'var(--accent)' }}>Trazabilidad</span></h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto', fontSize: '1.2rem' }}>
            Inversión estratégica para el blindaje probatorio de su práctica jurídica.
          </p>
        </motion.div>

        <div className="pricing-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '2.5rem',
          alignItems: 'stretch'
        }}>
          {tiers.map((tier, i) => (
            <motion.div 
              key={i} 
              className="pricing-card glass-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10, boxShadow: '0 30px 60px -15px rgba(15, 23, 42, 0.15)' }}
              style={{ 
                padding: '4rem 3rem', 
                borderRadius: '32px', 
                backgroundColor: tier.highlight ? 'var(--primary)' : 'white',
                color: tier.highlight ? 'white' : 'var(--primary)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: tier.highlight ? 'none' : '1px solid var(--border)',
                zIndex: tier.highlight ? 2 : 1,
              }}
            >
              {tier.highlight && (
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', backgroundColor: 'var(--accent)', color: 'white', padding: '0.5rem 1.2rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>Más Popular</div>
              )}
              
              <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1.5rem', color: tier.highlight ? 'white' : 'inherit' }}>{tier.name}</h3>
                <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.7 }}>COP</span>
                    <span style={{ fontSize: '3.5rem', fontWeight: '800', letterSpacing: '-0.05em', lineHeight: 1 }}>${tier.price}</span>
                  </div>
                  {tier.period && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '1.8rem' }}>
                      {tier.period}
                    </div>
                  )}
                </div>
                <p style={{ marginTop: '1.5rem', fontSize: '1.05rem', color: tier.highlight ? '#94a3b8' : 'var(--text-muted)', lineHeight: '1.7' }}>{tier.description}</p>
              </div>

              <div style={{ flexGrow: 1, marginBottom: '3.5rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {tier.features.map((feature, idx) => (
                    <li key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '1.05rem' }}>
                      <span style={{ 
                        width: '24px', height: '24px', borderRadius: '50%', backgroundColor: tier.highlight ? 'rgba(59, 130, 246, 0.1)' : '#f0fdf4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: tier.highlight ? 'var(--accent)' : '#10b981', fontSize: '0.8rem'
                      }}>✓</span>
                      <span style={{ opacity: 0.9 }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectPlan(tier.name)}
                style={{ 
                  width: '100%', 
                  padding: '1.3rem', 
                  borderRadius: '18px', 
                  backgroundColor: tier.highlight ? 'var(--accent)' : 'var(--primary)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  boxShadow: tier.highlight ? '0 15px 30px -10px rgba(59, 130, 246, 0.4)' : 'none'
                }}
              >
                {tier.cta}
              </motion.button>
            </motion.div>
          ))}
        </div>

        <motion.div 
          style={{ marginTop: '6rem', textAlign: 'center', fontSize: '1rem', color: 'var(--text-muted)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p>¿Necesita un plan corporativo? <a href="#" style={{ fontWeight: '700', color: 'var(--accent)', textDecoration: 'underline' }}>Contacte a un especialista</a></p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;

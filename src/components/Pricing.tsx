import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Zap, Building2, Crown } from 'lucide-react';

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
      highlight: false,
      icon: <Shield size={24} />
    },
    {
      name: "Medio Judicial",
      price: "60.000",
      period: "por mes",
      description: "Para firmas en crecimiento que requieren un flujo constante de procesos.",
      features: ["20 Notificaciones certificadas / mes", "Trazabilidad de metadatos completa", "Soporte técnico prioritario", "Mensaje extra: $6.000 COP"],
      cta: "Suscribirse Medio",
      highlight: true,
      icon: <Zap size={24} />
    },
    {
      name: "Pro Judicial",
      price: "196.000",
      period: "por mes",
      description: "Alta disponibilidad y volumen para departamentos de cobranza y grandes firmas.",
      features: ["100 Notificaciones certificadas / mes", "Almacenamiento judicial 5 años", "API de integración corporativa", "Mensaje extra: $4.000 COP"],
      cta: "Suscribirse Pro",
      highlight: false,
      icon: <Crown size={24} />
    }
  ];

  return (
    <section className="pricing" style={{ padding: '12rem 0', backgroundColor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      {/* Background elements */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }}></div>
      
      <div className="container">
        <motion.div 
          style={{ textAlign: 'center', marginBottom: '8rem' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1.25rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', 
              color: 'var(--accent)', borderRadius: '100px', fontSize: '0.85rem',
              fontWeight: '800', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.1)'
            }}
          >
            INVERSIÓN ESTRATÉGICA
          </motion.div>
          <h2 style={{ fontSize: '4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 800 }}>Planes de <span style={{ color: 'var(--accent)' }}>Trazabilidad</span></h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto', fontSize: '1.25rem', lineHeight: 1.6 }}>
            Seleccione el nivel de blindaje probatorio que su práctica jurídica requiere para la era digital.
          </p>
        </motion.div>

        <div className="pricing-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '2rem',
          alignItems: 'stretch'
        }}>
          {tiers.map((tier, i) => (
            <motion.div 
              key={i} 
              className="pricing-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              whileHover={{ y: -12 }}
              style={{ 
                padding: '4.5rem 3.5rem', 
                borderRadius: '32px', 
                backgroundColor: tier.highlight ? 'var(--primary)' : '#ffffff',
                color: tier.highlight ? '#ffffff' : 'var(--primary)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: tier.highlight ? 'none' : '1px solid #e2e8f0',
                boxShadow: tier.highlight ? '0 40px 80px -15px rgba(15, 23, 42, 0.3)' : '0 20px 40px -10px rgba(0,0,0,0.03)',
                zIndex: tier.highlight ? 2 : 1,
              }}
            >
              {tier.highlight && (
                <div style={{ position: 'absolute', top: '1.75rem', right: '1.75rem', backgroundColor: 'var(--accent)', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Más Popular</div>
              )}
              
              <div style={{ marginBottom: '3.5rem' }}>
                <div style={{ color: tier.highlight ? 'var(--accent)' : '#3b82f6', marginBottom: '1.5rem' }}>
                  {tier.icon}
                </div>
                <h3 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)', color: tier.highlight ? 'white' : 'inherit' }}>{tier.name}</h3>
                <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', opacity: 0.6 }}>$</span>
                    <span style={{ fontSize: '3.75rem', fontWeight: '900', letterSpacing: '-0.05em', lineHeight: 1 }}>{tier.price}</span>
                  </div>
                  {tier.period && (
                    <div style={{ fontSize: '0.95rem', opacity: 0.6, marginTop: '2.1rem', fontWeight: 600 }}>
                      {tier.period}
                    </div>
                  )}
                </div>
                <p style={{ marginTop: '1.5rem', fontSize: '1.1rem', color: tier.highlight ? '#94a3b8' : 'var(--text-muted)', lineHeight: '1.6' }}>{tier.description}</p>
              </div>

              <div style={{ flexGrow: 1, marginBottom: '4rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {tier.features.map((feature, idx) => (
                    <li key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '1.05rem' }}>
                      <CheckCircle2 size={20} color={tier.highlight ? 'var(--accent)' : '#10b981'} style={{ flexShrink: 0 }} />
                      <span style={{ opacity: 0.9, fontWeight: 500 }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: tier.highlight ? '#4a90ff' : '#1e293b' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectPlan(tier.name)}
                style={{ 
                  width: '100%', 
                  padding: '1.4rem', 
                  borderRadius: '18px', 
                  backgroundColor: tier.highlight ? 'var(--accent)' : 'var(--primary)',
                  color: 'white',
                  fontSize: '1.15rem',
                  fontWeight: '800',
                  boxShadow: tier.highlight ? '0 15px 30px -10px rgba(59, 130, 246, 0.4)' : 'none'
                }}
              >
                {tier.cta}
              </motion.button>
            </motion.div>
          ))}
        </div>

        <motion.div 
          style={{ marginTop: '8rem', textAlign: 'center', padding: '3rem', borderRadius: '32px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              <Shield size={20} color="#3b82f6" /> Certificación SHA-256
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              <Building2 size={20} color="#3b82f6" /> Soporte Corporativo
            </div>
            <p style={{ margin: 0 }}>¿Necesita un plan a medida? <a href="#" style={{ fontWeight: '800', color: 'var(--accent)', textDecoration: 'none', borderBottom: '2px solid rgba(59, 130, 246, 0.2)' }}>Contacte a un especialista</a></p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;


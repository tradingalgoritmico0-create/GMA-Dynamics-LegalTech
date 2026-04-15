import { motion, Variants } from 'framer-motion';

const Features = () => {
  const features = [
    {
      title: "Inmutabilidad Digital",
      description: "Cada notificación genera un Hash SHA-256 único vinculado al documento original, asegurando que la evidencia sea inalterable.",
      icon: "🔐"
    },
    {
      title: "Respaldo Normativo",
      description: "Cumplimiento total con la Ley 527 de 1999 y Ley 2213 de 2022. Validez probatoria reconocida por el sistema judicial colombiano.",
      icon: "⚖️"
    },
    {
      title: "Trazabilidad de Red",
      description: "Registro detallado de metadatos de entrega y lectura mediante webhooks oficiales, superando la validez del pantallazo tradicional.",
      icon: "📊"
    }
  ];

  const containerVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants: Variants = {
    initial: { opacity: 0, y: 40 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }
  };

  return (
    <section className="features" style={{ padding: '10rem 0', backgroundColor: '#fcfdfe', borderTop: '1px solid #f1f5f9' }}>
      <div className="container">
        <motion.div 
          style={{ textAlign: 'center', marginBottom: '6rem' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>Tecnología de Grado <span style={{ color: 'var(--accent)' }}>Forense</span></h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
            Nuestra infraestructura está diseñada para blindar jurídicamente cada comunicación procesal con estándares internacionales de seguridad.
          </p>
        </motion.div>

        <motion.div 
          className="features-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '2.5rem' 
          }}
          variants={containerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((f, i) => (
            <motion.div 
              key={i} 
              className="feature-card glass-card" 
              variants={cardVariants}
              whileHover={{ 
                y: -10, 
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                borderColor: 'var(--accent)' 
              }}
              style={{ 
                padding: '4rem 3rem', 
                backgroundColor: 'white', 
                borderRadius: '28px', 
                border: '1px solid #f1f5f9',
                transition: 'border-color 0.3s ease'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '2rem' }}>{f.icon}</div>
              <h3 style={{ marginBottom: '1.2rem', fontSize: '1.5rem', fontWeight: '700' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.8' }}>{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;

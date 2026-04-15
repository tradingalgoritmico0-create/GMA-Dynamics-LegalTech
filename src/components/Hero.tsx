import { motion, Variants } from 'framer-motion';
import { GridBackground } from './ui/Backgrounds';

interface HeroProps {
  onStart: () => void;
}

const Hero = ({ onStart }: HeroProps) => {
  const containerVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 30 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
        duration: 0.8
      }
    }
  };

  return (
    <GridBackground>
      <section className="hero" style={{ padding: '12rem 0 10rem' }}>
        <div className="container">
          <motion.div 
            style={{ maxWidth: '850px' }}
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.div 
              variants={itemVariants}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.4rem', backgroundColor: 'rgba(59, 130, 246, 0.08)', 
                color: 'var(--accent)', borderRadius: '100px', fontSize: '0.9rem',
                fontWeight: '700', marginBottom: '2.5rem', border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🛡️</span> LegalTech de Alta Precisión
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              style={{ fontSize: '4.5rem', marginBottom: '1.5rem', fontWeight: '800', lineHeight: 1.05, color: 'var(--primary)' }}
            >
              Trazabilidad Judicial con <br/> 
              <span style={{ 
                background: 'linear-gradient(90deg, var(--accent), #60a5fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>Validez Legal Absoluta</span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              style={{ fontSize: '1.35rem', marginBottom: '3.5rem', maxWidth: '700px', color: 'var(--text-muted)', fontWeight: '400', lineHeight: 1.6 }}
            >
              GMA Dynamics garantiza la integridad probatoria de sus notificaciones mediante Hash SHA-256 y certificados inmutables. Diseñado para litigantes que exigen rigor técnico y seguridad total.
            </motion.p>
            
            <motion.div 
              variants={itemVariants}
              style={{ display: 'flex', gap: '1.5rem' }}
            >
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onStart}
                style={{ 
                  backgroundColor: 'var(--primary)', color: 'white', padding: '1.3rem 3rem', 
                  fontSize: '1.1rem', borderRadius: '14px', fontWeight: '700'
                }}
              >
                Comenzar Ahora
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(15, 23, 42, 0.02)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById('solucion')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ 
                  backgroundColor: 'transparent', border: '2px solid var(--border)', 
                  color: 'var(--primary)', padding: '1.3rem 3rem', fontSize: '1.1rem', 
                  borderRadius: '14px', fontWeight: '700'
                }}
              >
                Ver Demo Técnica
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </GridBackground>
  );
};

export default Hero;

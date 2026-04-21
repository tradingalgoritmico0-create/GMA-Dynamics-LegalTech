import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Hero from './components/Hero'
import Features from './components/Features'
import LegalFramework from './components/LegalFramework'
import Pricing from './components/Pricing'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import PublicValidator from './components/PublicValidator'
import AdminDashboard from './components/AdminDashboard'
import PublicView from './components/PublicView'
import TermsOfService from './components/TermsOfService'
import { supabase } from './lib/supabaseClient'

function App() {
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'verify' | 'admin' | 'public_view'>('landing');
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [verifyData, setVerifyData] = useState<{hash: string, caseName: string} | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    // A. Detección de ruta pública para visor de demandas
    const checkPath = () => {
      const path = window.location.pathname;
      if (path.startsWith('/view/')) {
        setView('public_view');
      }
    };
    checkPath();
    window.addEventListener('popstate', checkPath);

    // B. Verificar sesión inicial
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const userEmail = session.user.email?.trim().toLowerCase();

        // A. VERIFICACIÓN DE ADMINISTRADOR
        try {
          const { data: isAdmin } = await supabase.rpc('is_admin');
          if (isAdmin) {
            setRole('admin');
            setUser(userEmail || null);
            setView('admin');
            return;
          }
        } catch (err) { /* Admin check failed or not an admin */ }

        // B. USUARIOS NORMALES
        if (session.user) {
          // Auto-provisión de perfil si no existe (Fix para Google Login)
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          
          if (!profile) {
            const pendingPlan = localStorage.getItem('gma_selected_plan') || 'Gratis Judicial';
            const limits: Record<string, number> = {
              'Plan Gratis Judicial': 5,
              'Plan Medio Judicial': 20,
              'Plan Pro Judicial': 100
            };
            
            // Normalizar nombre del plan si viene de los botones de Pricing
            let planName = 'Plan Gratis Judicial';
            if (pendingPlan.includes('Medio')) planName = 'Plan Medio Judicial';
            else if (pendingPlan.includes('Pro')) planName = 'Plan Pro Judicial';

            await supabase.from('profiles').insert([{
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              plan: planName,
              limit_msgs: limits[planName] || 5,
              status: 'Activo'
            }]);
            localStorage.removeItem('gma_selected_plan');
          }

          setUser(session.user.email || '');
          setRole('user');
          setView('dashboard');
        }
      } else {
        setView('landing');
      }
    };

    checkInitialSession();

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'SIGNED_IN') {
        // Refrescar estatus de sesión para decidir vista
        checkInitialSession();
      } else if (event === 'SIGNED_OUT') {
        setView('landing');
        setUser(null);
        setRole(null);
      }
    });

    // 3. Manejar verificaciones públicas (Hash)
    const params = new URLSearchParams(window.location.search);
    const hash = params.get('hash');
    const caseName = params.get('case');
    if (hash && caseName) {
      setVerifyData({ hash, caseName });
      setView('verify');
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setView('landing');
  };

  if (view === 'verify' && verifyData) {
    return <PublicValidator hash={verifyData.hash} caseName={verifyData.caseName} />;
  }

  if (view === 'admin' && role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (view === 'public_view') {
    return <PublicView />;
  }

  if (view === 'login') {
    return <Login />;
  }

  if (view === 'dashboard' && user) {
    return <Dashboard onLogout={handleLogout} user={user} />;
  }

  return (
    <main style={{ backgroundColor: 'var(--surface)' }}>
      <nav style={{ padding: '1.5rem 0', position: 'absolute', width: '100%', zIndex: 10, backgroundColor: 'transparent' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '800', fontSize: '1.6rem', color: 'var(--primary)', letterSpacing: '-1px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setView('landing')}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>GMA</span>
            <span style={{ color: 'var(--accent)' }}>Dynamics</span>
          </div>
          <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.9rem', fontWeight: '600', alignItems: 'center' }}>
            <a href="#solucion" style={{ textDecoration: 'none', color: 'var(--primary)', opacity: 0.7 }}>Solución</a>
            <a href="#marco" style={{ textDecoration: 'none', color: 'var(--primary)', opacity: 0.7 }}>Marco Legal</a>
            <button onClick={() => setView('login')} style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.7rem 1.5rem', borderRadius: '10px', fontSize: '0.85rem' }}>Acceso Profesional</button>
          </div>
        </div>
      </nav>
      <Hero onStart={() => setView('login')} />
      <div id="solucion"><Features /></div>
      <div id="marco"><LegalFramework /></div>
      <Pricing onSelectPlan={(plan) => {
        localStorage.setItem('gma_selected_plan', plan);
        setView('login');
      }} />
      <section style={{ backgroundColor: 'var(--primary)', color: 'white', textAlign: 'center', padding: '10rem 0', backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.95)), url("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80")', backgroundSize: 'cover' }}>
        <div className="container">
          <h2 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '3.5rem', fontWeight: '800', fontFamily: 'var(--font-serif)' }}>Transforme su firma hoy mismo</h2>
          <p style={{ color: '#94a3b8', marginBottom: '3.5rem', fontSize: '1.3rem', maxWidth: '700px', margin: '0 auto 3.5rem' }}>Únase a los litigantes de élite que ya blindan su evidencia con trazabilidad inmutable.</p>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.5)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setView('login')} 
            style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '1.3rem 3.5rem', fontSize: '1.2rem', borderRadius: '16px', fontWeight: '700' }}
          >
            Empezar Prueba Gratuita
          </motion.button>
        </div>
      </section>
      <footer style={{ padding: '5rem 0', borderTop: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-muted)', backgroundColor: 'white' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4rem', marginBottom: '4rem' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>GMA Dynamics</div>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.8' }}>Infraestructura de trazabilidad judicial para la era digital. Seguridad, validez y eficiencia.</p>
          </div>
          <div>
            <h4 style={{ marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Producto</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <a href="#solucion">Características</a>
              <a href="#">Precios</a>
              <a href="#">API Documentation</a>
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <a href="#marco">Marco Normativo</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowTerms(true); }}>Términos de Servicio</a>
              <a href="#">Privacidad</a>
            </div>
          </div>
        </div>
        <div className="container" style={{ textAlign: 'center', paddingTop: '3rem', borderTop: '1px solid #f1f5f9' }}>
          <p>© 2026 GMA Dynamics. LegalTech de Alta Precisión en Bogotá, Colombia.</p>
        </div>
      </footer>
      <AnimatePresence>
        {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
      </AnimatePresence>
    </main>
  );
}

export default App;

import { useState } from 'react';
import { Shield, Zap, Crown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import MpCheckout from './MpCheckout';
import { supabase } from '../lib/supabaseClient';
import { PLAN_LIST, type PlanId } from '../lib/plans';

const ICONS: Record<PlanId, JSX.Element> = {
  gratis: <Shield size={24} />,
  medio: <Zap size={24} />,
  pro: <Crown size={24} />,
};

const Pricing = ({ onRequireLogin, onUpgraded }: {
  onRequireLogin?: () => void;
  onUpgraded?: () => void;
}) => {
  const [checkoutPlan, setCheckoutPlan] = useState<Exclude<PlanId, 'gratis'> | null>(null);

  const handleSelect = async (planId: Exclude<PlanId, 'gratis'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    setCheckoutPlan(planId);
  };

  return (
    <section className="pricing" style={{ padding: '8rem 2rem', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '1rem', color: '#3b82f6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>GMA Dynamics LegalTech</h1>
          <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Seleccionar Plan</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {PLAN_LIST.map((tier) => {
            const highlight = tier.id === 'medio';
            return (
              <div key={tier.id} style={{
                backgroundColor: highlight ? '#0f172a' : 'white',
                color: highlight ? 'white' : '#0f172a',
                padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ marginBottom: '1.5rem', color: '#3b82f6' }}>{ICONS[tier.id]}</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tier.name.replace('Plan ', '')}</h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.5rem', minHeight: '3em' }}>{tier.description}</p>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '2rem' }}>
                  ${tier.priceCop.toLocaleString('es-CO')}
                  {tier.priceCop > 0 && <span style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.6 }}> / mes</span>}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', flexGrow: 1 }}>
                  {tier.features.map((f, idx) => <li key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>✓ {f}</li>)}
                </ul>

                {tier.priceCop > 0 ? (
                  <button
                    onClick={() => handleSelect(tier.id as Exclude<PlanId, 'gratis'>)}
                    style={{ padding: '1rem', borderRadius: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Contratar {tier.name.replace('Plan ', '')}
                  </button>
                ) : (
                  <button disabled style={{ padding: '1rem', borderRadius: '16px', background: '#e2e8f0', border: 'none', fontWeight: 800 }}>Plan Inicial</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {checkoutPlan && (
          <MpCheckout
            planId={checkoutPlan}
            onClose={() => setCheckoutPlan(null)}
            onSuccess={() => {
              setCheckoutPlan(null);
              if (onUpgraded) onUpgraded();
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default Pricing;

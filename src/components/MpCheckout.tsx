import { useEffect, useRef, useState } from 'react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import { motion } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { PLANS, type PlanId } from '../lib/plans';

// Tipado mínimo del SDK JS v2 de MercadoPago (Checkout Bricks).
// Docs: https://www.mercadopago.com.co/developers/es/docs/checkout-bricks/card-payment-brick/payment-submission
interface CardPaymentFormData {
  token: string;
  payment_method_id: string;
  issuer_id: number | string;
  transaction_amount: number;
  installments: number;
  payer: {
    email: string;
    identification: { type: string; number: string };
  };
}

interface BrickController {
  unmount: () => void;
}

interface BricksBuilder {
  create: (
    brick: 'cardPayment',
    containerId: string,
    settings: unknown,
  ) => Promise<BrickController>;
}

declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => BricksBuilder;
    };
  }
}

type CheckoutState = 'loading' | 'form' | 'processing' | 'success' | 'error';

const CONTAINER_ID = 'gma-card-payment-brick';

const MpCheckout = ({ planId, onSuccess, onClose }: {
  planId: Exclude<PlanId, 'gratis'>;
  onSuccess: () => void;
  onClose: () => void;
}) => {
  const plan = PLANS[planId];
  const [state, setState] = useState<CheckoutState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const controllerRef = useRef<BrickController | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('Debe iniciar sesión para contratar un plan.');
        setState('error');
        return;
      }

      const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
      if (!publicKey) {
        setErrorMsg('Pasarela de pago no configurada (VITE_MERCADOPAGO_PUBLIC_KEY).');
        setState('error');
        return;
      }

      try {
        await loadMercadoPago();
        if (cancelled) return;
        const mp = new window.MercadoPago(publicKey, { locale: 'es-CO' });
        const bricks = mp.bricks();

        controllerRef.current = await bricks.create('cardPayment', CONTAINER_ID, {
          initialization: {
            amount: plan.priceCop,
            payer: { email: session.user.email ?? '' },
          },
          customization: {
            paymentMethods: { maxInstallments: 1 },
          },
          callbacks: {
            onReady: () => { if (!cancelled) setState('form'); },
            onError: (err: { message?: string }) => {
              if (cancelled) return;
              setErrorMsg(err?.message || 'Error inicializando el formulario de pago.');
              setState('error');
            },
            onSubmit: async (formData: CardPaymentFormData) => {
              setState('processing');
              try {
                const { data, error } = await supabase.functions.invoke('process-payment', {
                  body: {
                    token: formData.token,
                    payment_method_id: formData.payment_method_id,
                    issuer_id: formData.issuer_id,
                    installments: formData.installments,
                    payer: formData.payer,
                    description: `Suscripción ${plan.name} — GMA Dynamics`,
                    user_id: session.user.id,
                    payment_type: 'upgrade',
                    plan_id: planId,
                  },
                });

                if (error) {
                  // FunctionsHttpError: intentar leer el mensaje del body
                  let detail = error.message;
                  if ('context' in error && error.context instanceof Response) {
                    try {
                      const body = await error.context.json();
                      detail = body?.error ?? detail;
                    } catch { /* body no-JSON: se conserva el mensaje genérico */ }
                  }
                  throw new Error(detail);
                }
                if (!data?.success) {
                  throw new Error(data?.error || 'El pago no fue aprobado.');
                }
                setState('success');
              } catch (e) {
                setErrorMsg(e instanceof Error ? e.message : 'Error procesando el pago.');
                setState('error');
              }
            },
          },
        });
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'No se pudo cargar la pasarela de pago.');
          setState('error');
        }
      }
    };

    init();
    return () => {
      cancelled = true;
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
  }, [planId, plan.priceCop, plan.name]);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}
      >
        <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={22} color="#3b82f6" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{plan.name}</h3>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          ${plan.priceCop.toLocaleString('es-CO')} COP / mes · {plan.limitMsgs} notificaciones certificadas
        </p>

        {state === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>¡Pago aprobado!</h4>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Su plan ha sido activado.</p>
            <button onClick={onSuccess} style={{ padding: '1rem 2rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '14px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Ir a mi Panel
            </button>
          </div>
        ) : (
          <>
            {state === 'error' && (
              <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMsg}</span>
              </div>
            )}
            {(state === 'loading' || state === 'processing') && (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                {state === 'loading' ? 'Cargando pasarela segura...' : 'Procesando pago...'}
              </div>
            )}
            {/* El brick de MercadoPago se monta aquí */}
            <div id={CONTAINER_ID} />
          </>
        )}
      </motion.div>
    </div>
  );
};

export default MpCheckout;

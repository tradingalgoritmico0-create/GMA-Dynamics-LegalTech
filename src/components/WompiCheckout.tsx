import { supabase } from '../lib/supabaseClient';

declare global {
    interface Window {
        WidgetCheckout: any;
    }
}

export const WompiCheckout = ({ plan, amount, limit, onSuccess }: { plan: string, amount: number, limit: number, onSuccess?: () => void }) => {
  const openWompi = () => {
    const checkout = new window.WidgetCheckout({
      currency: 'COP',
      amountInCents: amount * 100,
      reference: `GMA-${Date.now()}`,
      publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY,
    });

    checkout.open(async (result: any) => {
      if (result.transaction.status === 'APPROVED') {
        const { error } = await supabase.rpc('upgrade_plan', { p_plan: plan, p_limit: limit });
        if (!error) {
            alert("¡Pago aprobado! Tu plan ha sido actualizado.");
            if (onSuccess) onSuccess();
        } else {
            alert("Error al actualizar el plan: " + error.message);
        }
      }
    });
  };

  return (
    <button 
        onClick={openWompi} 
        style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }}
    >
        Pagar {plan}
    </button>
  );
};

// Catálogo canónico de planes — espejo de la tabla public.plans (migración
// 20260707120000). Si se cambia un precio o límite, actualizar AMBOS lugares
// y las PLAN_DEFINITIONS de las Edge Functions process-payment / mp-webhook.

export type PlanId = 'gratis' | 'medio' | 'pro';

export interface PlanDef {
  id: PlanId;
  name: string;
  limitMsgs: number;
  retentionMonths: number;
  priceCop: number;
  description: string;
  features: string[];
}

export const PLANS: Record<PlanId, PlanDef> = {
  gratis: {
    id: 'gratis',
    name: 'Plan Gratis Judicial',
    limitMsgs: 5,
    retentionMonths: 2,
    priceCop: 0,
    description: 'Acceso básico para validar la plataforma.',
    features: ['5 Notificaciones certificadas', 'Certificados SHA-256 inmutables', 'Validación pública por enlace'],
  },
  medio: {
    id: 'medio',
    name: 'Plan Medio Judicial',
    limitMsgs: 20,
    retentionMonths: 12,
    priceCop: 50000,
    description: 'Para firmas en crecimiento.',
    features: ['20 Notificaciones certificadas / mes', 'Trazabilidad completa', 'Soporte prioritario'],
  },
  pro: {
    id: 'pro',
    name: 'Plan Pro Judicial',
    limitMsgs: 100,
    retentionMonths: 60,
    priceCop: 120000,
    description: 'Volumen corporativo de alto rendimiento.',
    features: ['100 Notificaciones certificadas / mes', 'Almacenamiento visible 5 años', 'API Corporativa'],
  },
};

export const PLAN_LIST: PlanDef[] = [PLANS.gratis, PLANS.medio, PLANS.pro];

export const FREE_PLAN_NAME = PLANS.gratis.name;

export function planByName(name: string | null | undefined): PlanDef | null {
  if (!name) return null;
  return PLAN_LIST.find(p => p.name === name) ?? null;
}

export function retentionLabel(planName: string | null | undefined): string {
  const plan = planByName(planName);
  if (!plan) return '2 meses';
  if (plan.retentionMonths % 12 === 0) {
    const years = plan.retentionMonths / 12;
    return years === 1 ? '1 año' : `${years} años`;
  }
  return `${plan.retentionMonths} meses`;
}

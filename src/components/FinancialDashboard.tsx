import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';

interface FinancialMetrics {
  totalRevenue: number;
  activeSubscriptions: number;
  monthlyProjections: number;
  planStats: { name: string, value: number, revenue: number }[];
}

const FinancialDashboard = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    activeSubscriptions: 0,
    monthlyProjections: 0,
    planStats: []
  });

  useEffect(() => {
    const fetchFinanceData = async () => {
      const { data: profiles } = await supabase.from('profiles').select('plan');
      
      if (profiles) {
        const statsMap = {
          'Plan Gratis Judicial': { count: 0, price: 0 },
          'Plan Medio Judicial': { count: 0, price: 60000 },
          'Plan Pro Judicial': { count: 0, price: 196000 }
        };

        profiles.forEach(p => {
          const planName = p.plan as keyof typeof statsMap;
          if (statsMap[planName]) {
            statsMap[planName].count++;
          }
        });

        const planStats = Object.entries(statsMap).map(([name, data]) => ({
          name,
          value: data.count,
          revenue: data.count * data.price
        }));

        const totalRevenue = planStats.reduce((acc, curr) => acc + curr.revenue, 0);
        const activeSubs = profiles.filter(p => p.plan !== 'Plan Gratis Judicial').length;

        setMetrics({
          totalRevenue,
          activeSubscriptions: activeSubs,
          monthlyProjections: totalRevenue,
          planStats
        });
      }
    };
    fetchFinanceData();
  }, []);

  const COLORS = ['#94a3b8', '#3b82f6', '#0f172a'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <MetricCard title="Ingresos Mensuales" value={`$${metrics.totalRevenue.toLocaleString()}`} icon={<DollarSign color="#10b981" />} trend="+12.5%" />
        <MetricCard title="Suscripciones Activas" value={metrics.activeSubscriptions.toString()} icon={<CreditCard color="#3b82f6" />} trend="+4" />
        <MetricCard title="Proyección Anual" value={`$${(metrics.totalRevenue * 12).toLocaleString()}`} icon={<TrendingUp color="#8b5cf6" />} trend="Estable" />
        <MetricCard title="Usuarios Totales" value={(metrics.planStats.reduce((a,b) => a + b.value, 0)).toString()} icon={<Users color="#64748b" />} trend="+8%" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Distribución por Plan</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.planStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {metrics.planStats.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Ingresos por Categoría</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.planStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) => (
  <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '12px' }}>{icon}</div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '100px' }}>{trend}</span>
    </div>
    <div>
      <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{value}</div>
    </div>
  </div>
);

export default FinancialDashboard;
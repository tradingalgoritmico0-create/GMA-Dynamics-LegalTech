import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { Users, DollarSign, Activity } from 'lucide-react';

interface UsageLog {
  created_at: string;
  amount: number;
  profiles?: {
    plan: string;
  };
}

const FinancialDashboard = () => {
  const [stats, setStats] = useState<UsageLog[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        // Obtenemos logs de uso
        const { data } = await supabase.from('usage_log').select('*, profiles(plan)');
        setStats(data || []);
    };
    fetchData();
  }, []);

  // Simulación de métricas
  const totalUsers = stats.length; 
  const totalRevenue = stats.length * 50000; 

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '32px' }}>
      {/* KPIs de Alto Nivel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Ingresos Totales', val: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: '#10b981' },
          { label: 'Abogados Activos', val: totalUsers.toString(), icon: Users, color: '#3b82f6' },
          { label: 'Notificaciones', val: stats.length.toString(), icon: Activity, color: '#8b5cf6' }
        ].map((item, i) => (
          <div key={i} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1rem', backgroundColor: `${item.color}15`, borderRadius: '16px' }}><item.icon size={24} color={item.color} /></div>
            <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{item.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfica Principal */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', height: '400px' }}>
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Evolución de Notificaciones</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="created_at" tick={false} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FinancialDashboard;

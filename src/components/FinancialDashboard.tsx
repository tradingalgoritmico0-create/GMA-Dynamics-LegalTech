import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, TrendingUp, Users, FileText } from 'lucide-react';

const FinancialDashboard = () => {
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        // Obtenemos logs de uso para calcular ingresos (suponiendo Plan Gratis=0, Medio=60k, Pro=196k)
        const { data } = await supabase.from('usage_log').select('*, profiles(plan)');
        setStats(data || []);
    };
    fetchData();
  }, []);

  const exportCSV = () => {
      // Lógica de exportación sencilla
      alert("Exportando reporte financiero...");
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Control Financiero Total</h2>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            <Download size={16} /> Exportar Reporte
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {[
              { label: 'Ingresos Totales', val: '$0', icon: TrendingUp },
              { label: 'Usuarios Activos', val: stats.length.toString(), icon: Users },
              { label: 'Notificaciones Emitidas', val: stats.length.toString(), icon: FileText }
          ].map((item, i) => (
            <div key={i} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <item.icon size={24} color="#3b82f6" />
                <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{item.val}</div>
                </div>
            </div>
          ))}
      </div>

      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', height: '400px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Evolución de Ingresos</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="created_at" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FinancialDashboard;

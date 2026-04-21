import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import FinancialDashboard from './FinancialDashboard';
import { Users, BarChart3, LogOut } from 'lucide-react';

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'finance'>('users');

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_all_users_admin');
    if (error) console.error("Error cargando usuarios:", error);
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Activo' ? 'Suspendido' : 'Activo';
    await supabase.from('profiles').update({ status: nextStatus }).eq('id', userId);
    loadUsers();
  };

  return (
    <div style={{ padding: '3rem', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-serif)', color: '#0f172a' }}>Panel de Control Maestro</h1>
          <p style={{ color: '#64748b' }}>Gestión centralizada de infraestructura GMA Dynamics</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', backgroundColor: 'white', padding: '0.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <button onClick={() => setActiveTab('users')} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', backgroundColor: activeTab === 'users' ? '#0f172a' : 'transparent', color: activeTab === 'users' ? 'white' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> Abogados
            </button>
            <button onClick={() => setActiveTab('finance')} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', backgroundColor: activeTab === 'finance' ? '#0f172a' : 'transparent', color: activeTab === 'finance' ? 'white' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} /> Finanzas
            </button>
            <button onClick={onLogout} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', backgroundColor: '#ef4444', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogOut size={18} /> Salir
            </button>
        </div>
      </header>

      {activeTab === 'users' ? (
        <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
            {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Sincronizando con base de datos...</p> : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem' }}>ABOGADO</th>
                    <th style={{ padding: '1rem' }}>PLAN</th>
                    <th style={{ padding: '1rem' }}>CONSUMO</th>
                    <th style={{ padding: '1rem' }}>ESTADO</th>
                    <th style={{ padding: '1rem' }}>ACCIONES</th>
                </tr>
                </thead>
                <tbody>
                {users.map(u => (
                    <tr key={u.id} style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '1.25rem 1rem', borderRadius: '16px 0 0 16px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem' }}>{u.plan}</td>
                    <td style={{ padding: '1.25rem 1rem' }}><span style={{ fontWeight: 800 }}>{u.sent_msgs}</span> / {u.limit_msgs}</td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                        <span style={{ padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: u.status === 'Activo' ? '#dcfce7' : '#fee2e2', color: u.status === 'Activo' ? '#166534' : '#991b1b' }}>
                        {u.status}
                        </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', borderRadius: '0 16px 16px 0' }}>
                        <button 
                        onClick={() => toggleStatus(u.id, u.status)}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', backgroundColor: '#0f172a', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                        >
                        {u.status === 'Activo' ? 'Suspender' : 'Activar'}
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}
        </div>
      ) : (
          <FinancialDashboard />
      )}
    </div>
  );
};

export default AdminDashboard;

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    // Llamada al RPC protegido de la base de datos
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
    <div style={{ padding: '3rem', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>Panel de Control Maestro</h1>
          <p style={{ color: '#64748b' }}>Gestión centralizada de abogados y notificaciones</p>
        </div>
        <button onClick={onLogout} style={{ padding: '0.8rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Cerrar Sesión</button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        {loading ? <p>Cargando abogados...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.8rem' }}>
                <th style={{ padding: '1rem' }}>ABOGADO</th>
                <th>PLAN</th>
                <th>CONSUMO</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 800 }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td>{u.plan}</td>
                  <td><span style={{ fontWeight: 700 }}>{u.sent_msgs}</span> / {u.limit_msgs}</td>
                  <td>
                    <span style={{ padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: u.status === 'Activo' ? '#dcfce7' : '#fee2e2' }}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => toggleStatus(u.id, u.status)}
                      style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}
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
    </div>
  );
};

export default AdminDashboard;

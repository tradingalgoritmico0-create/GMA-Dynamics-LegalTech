import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

/**
 * GMA DYNAMICS - ADMIN DASHBOARD v2.0 (Optimized)
 * Optimized for: Performance, Strict Typing, and Maintainability.
 */

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  limit_msgs: number;
  sent_msgs: number;
  status: 'Activo' | 'Suspendido' | 'Inactivo';
  updated_at: string;
  plan_start_date?: string;
  display_date?: string;
}

// 1. Sub-component for individual user rows to prevent unnecessary re-renders
const UserRow = memo(({ user, onEdit, onToggleStatus }: { 
  user: UserAccount, 
  onEdit: (u: UserAccount) => void, 
  onToggleStatus: (u: UserAccount) => void 
}) => (
  <motion.tr 
    layout
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.2s' }}
    whileHover={{ backgroundColor: '#fdfdfd' }}
  >
    <td style={{ padding: '1.5rem' }}>
      <div style={{ fontWeight: '700', color: '#0f172a' }}>{user.full_name}</div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{user.email}</div>
    </td>
    <td style={{ padding: '1rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>{user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}</div>
      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Registro</div>
    </td>
    <td style={{ padding: '1rem' }}>
      <span style={{ 
        padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', 
        backgroundColor: '#eff6ff', color: '#2563eb', textTransform: 'uppercase' 
      }}>
        {user.plan || 'Sin Plan'}
      </span>
      <div style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 'bold', marginTop: '4px' }}>
        Vence: {user.plan_start_date ? new Date(new Date(user.plan_start_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : 'N/A'}
      </div>
    </td>
    <td style={{ padding: '1rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>
        {user.sent_msgs} / {user.limit_msgs}
      </div>
      <div style={{ width: '60px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${Math.min((user.sent_msgs / (user.limit_msgs || 1)) * 100, 100)}%`, 
          height: '100%', 
          backgroundColor: user.sent_msgs >= user.limit_msgs ? '#ef4444' : '#3b82f6' 
        }} />
      </div>
    </td>
    <td style={{ padding: '1rem' }}>
      <span style={{ 
        padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', 
        backgroundColor: user.status === 'Activo' ? '#ecfdf5' : '#fef2f2', 
        color: user.status === 'Activo' ? '#059669' : '#dc2626' 
      }}>
        {user.status.toUpperCase()}
      </span>
    </td>
    <td style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => onEdit(user)} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'white', fontWeight: '700' }}>Editar</button>
        <button 
          onClick={() => onToggleStatus(user)} 
          style={{ 
            padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: 'none', 
            backgroundColor: user.status === 'Activo' ? '#fef2f2' : '#ecfdf5', 
            color: user.status === 'Activo' ? '#dc2626' : '#059669', fontWeight: '700' 
          }}
        >
          {user.status === 'Activo' ? 'Suspender' : 'Activar'}
        </button>
      </div>
    </td>
  </motion.tr>
));

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc('get_all_users_admin');
      if (error) throw error;
      
      setUsers(data.map((u: any) => ({
        id: u.id,
        email: u.email || 'N/A',
        full_name: u.full_name || 'Sin nombre',
        plan: u.plan || 'Sin Plan',
        limit_msgs: u.limit_msgs || 0,
        sent_msgs: u.sent_msgs || 0,
        status: u.status || 'Inactivo',
        updated_at: u.updated_at || new Date().toISOString(),
        plan_start_date: u.plan_start_date || u.updated_at,
        display_date: u.updated_at ? new Date(u.updated_at).toLocaleDateString() : 'N/A'
      })));
    } catch (err: any) {
      console.error("Admin Load Error:", err);
      setErrorMsg("Error al cargar usuarios: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: editingUser.plan,
          limit_msgs: editingUser.limit_msgs,
          status: editingUser.status,
          plan_start_date: new Date(editingUser.plan_start_date!).toISOString()
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      setEditingUser(null);
      await loadUsers(); // Refresco explícito
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleStatus = async (user: UserAccount) => {
    const newStatus = user.status === 'Activo' ? 'Suspendido' : 'Activo';
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);
      if (error) throw error;
      await loadUsers();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '2rem 1rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header Section */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', backgroundColor: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          <div>
            <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.025em' }}>
              GMA <span style={{ color: '#3b82f6' }}>Admin</span>
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Gestión centralizada de infraestructura judicial</p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button onClick={loadUsers} disabled={isProcessing} style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
              {isProcessing ? 'Sincronizando...' : '🔄 Recargar'}
            </button>
            <button onClick={onLogout} style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>Salir del Portal</button>
          </div>
        </header>

        {/* Financial Analysis Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ingresos Proyectados (Mensual)</p>
            <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
              ${users.reduce((acc, u) => {
                const prices: {[key: string]: number} = { 'Plan Gratis Judicial': 0, 'Plan Medio Judicial': 60000, 'Plan Pro Judicial': 196000 };
                return acc + (u.status === 'Activo' ? (prices[u.plan] || 0) : 0);
              }, 0).toLocaleString()}
            </h2>
            <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '700', marginTop: '0.5rem' }}>↑ 100% de suscripciones reales</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Usuarios Suscritos</p>
            <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>{users.filter(u => u.status === 'Activo').length}</h2>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>De {users.length} abogados registrados</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Carga de Infraestructura</p>
            <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
              {Math.round(users.reduce((acc, u) => acc + (u.sent_msgs / (u.limit_msgs || 1)), 0) / (users.length || 1) * 100)}%
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>Uso promedio del cupo judicial</p>
          </div>
        </div>

        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #fee2e2', fontWeight: '600', fontSize: '0.9rem' }}>
            ⚠️ {errorMsg}
          </motion.div>
        )}

        {/* Table Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <tr>
                  <th style={{ padding: '1.5rem', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abogado Registrado</th>
                  <th style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inscripción</th>
                  <th style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan & Vencimiento</th>
                  <th style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uso de Cupo</th>
                  <th style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                  <th style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gestión</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {users.map(u => (
                    <UserRow key={u.id} user={u} onEdit={setEditingUser} onToggleStatus={toggleStatus} />
                  ))}
                </AnimatePresence>
                {!isProcessing && users.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>No hay registros de usuarios disponibles.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingUser && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>Ajustar Suscripción</h2>
                <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>Modificando cuenta de <strong>{editingUser.full_name}</strong></p>
                
                <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Plan de Servicio</label>
                    <select value={editingUser.plan} onChange={e => setEditingUser({...editingUser, plan: e.target.value})} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600' }}>
                      <option value="Plan Gratis Judicial">Gratis</option>
                      <option value="Plan Medio Judicial">Medio</option>
                      <option value="Plan Pro Judicial">Pro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Límite Mensual (Notificaciones)</label>
                    <input type="number" value={editingUser.limit_msgs} onChange={e => setEditingUser({...editingUser, limit_msgs: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Fecha de Inicio de Plan</label>
                    <input 
                      type="datetime-local" 
                      value={editingUser.plan_start_date ? editingUser.plan_start_date.substring(0, 16) : ''} 
                      onChange={e => setEditingUser({...editingUser, plan_start_date: e.target.value})} 
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #3b82f6', backgroundColor: '#fff', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: '700', color: '#64748b' }}>Cerrar</button>
                    <button type="submit" disabled={isProcessing} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: '800' }}>Actualizar</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;

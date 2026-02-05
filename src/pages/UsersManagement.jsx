import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function UsersManagement() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'ventas' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      setShowModal(false);
      setNewUser({ email: '', displayName: '', role: 'ventas' });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar rol');
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivateUser = async (userId, email) => {
    if (!confirm(`¿Estás seguro de inhabilitar a ${email}? El usuario no podrá acceder al sistema.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al inhabilitar usuario');
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivateUser = async (userId, email) => {
    if (!confirm(`¿Reactivar a ${email}? El usuario podrá acceder nuevamente al sistema.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/reactivate`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al reactivar usuario');
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`¿ELIMINAR PERMANENTEMENTE a ${email}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/50';
      case 'ventas':
        return 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/50';
      case 'bodega':
        return 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50';
      default:
        return 'bg-[#6B7280]/20 text-[#6B7280] border-[#6B7280]/50';
    }
  };

  // Verificar autenticación y permisos
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#6B7280] font-mono">$ verificando permisos<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-[#10B981]">&gt;</span> gestion_usuarios
          </h1>
          <p className="text-[#6B7280] text-sm">// administra el acceso al sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white px-4 py-2 font-mono transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          $ agregar_usuario
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 font-mono">
          [ERROR] {error}
          <button onClick={() => setError(null)} className="float-right text-[#EF4444] hover:text-[#EF4444]/80">
            [x]
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#111111] border border-[#1F1F1F] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#6B7280] font-mono">$ cargando usuarios<span className="animate-pulse">_</span></p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-[#4B5563] font-mono">
            // no hay usuarios registrados
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#1A1A1A]">
              <tr>
                <th className="text-left text-[#6B7280] font-mono text-sm px-6 py-4">usuario</th>
                <th className="text-left text-[#6B7280] font-mono text-sm px-6 py-4">rol</th>
                <th className="text-left text-[#6B7280] font-mono text-sm px-6 py-4">estado</th>
                <th className="text-left text-[#6B7280] font-mono text-sm px-6 py-4">ultimo_acceso</th>
                <th className="text-right text-[#6B7280] font-mono text-sm px-6 py-4">acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#1A1A1A] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.photoUrl ? (
                        <img
                          src={u.photoUrl}
                          alt={u.displayName}
                          className="w-10 h-10"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#1F1F1F] flex items-center justify-center text-[#FAFAFA] font-mono font-bold">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{u.displayName || u.email}</div>
                        <div className="text-[#6B7280] text-sm font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      disabled={u.email === user?.email}
                      className={`px-3 py-1 text-sm font-mono border cursor-pointer ${getRoleBadgeColor(u.role)} bg-transparent focus:outline-none focus:border-[#10B981] disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="admin" className="bg-[#0A0A0A]">admin</option>
                      <option value="ventas" className="bg-[#0A0A0A]">ventas</option>
                      <option value="bodega" className="bg-[#0A0A0A]">bodega</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-sm font-mono ${u.active ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'}`}>
                      {u.active ? '[activo]' : '[inactivo]'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#6B7280] font-mono text-sm">
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleDateString('es-GT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '// nunca'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.email !== user?.email && (
                      <div className="flex items-center justify-end gap-2">
                        {u.active ? (
                          /* Usuario activo: mostrar botón de Inhabilitar */
                          <button
                            onClick={() => handleDeactivateUser(u.id, u.email)}
                            className="text-[#F59E0B] hover:text-[#F59E0B]/80 transition-colors p-2 flex items-center gap-1 font-mono text-sm"
                            title="Inhabilitar usuario"
                          >
                            $ inhabilitar
                          </button>
                        ) : (
                          /* Usuario inhabilitado: mostrar botones de Reactivar y Eliminar */
                          <>
                            <button
                              onClick={() => handleReactivateUser(u.id, u.email)}
                              className="text-[#10B981] hover:text-[#10B981]/80 transition-colors p-2 flex items-center gap-1 font-mono text-sm"
                              title="Reactivar usuario"
                            >
                              $ reactivar
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="text-[#EF4444] hover:text-[#EF4444]/80 transition-colors p-2 flex items-center gap-1 font-mono text-sm"
                              title="Eliminar permanentemente"
                            >
                              $ rm --force
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Agregar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1F1F1F] w-full max-w-md">
            <div className="px-6 py-4 border-b border-[#1F1F1F] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                <span className="text-[#10B981]">&gt;</span> agregar_usuario
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#6B7280] hover:text-[#EF4444] transition-colors font-mono"
              >
                [x]
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[#6B7280] text-xs font-mono mb-2">
                  // email_google *
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="usuario@gmail.com"
                  className="w-full bg-[#0A0A0A] border border-[#1F1F1F] text-white px-4 py-2 font-mono focus:outline-none focus:border-[#10B981]"
                />
                <p className="text-[#4B5563] text-xs mt-1 font-mono">
                  // login con cuenta google
                </p>
              </div>

              <div>
                <label className="block text-[#6B7280] text-xs font-mono mb-2">
                  // nombre (opcional)
                </label>
                <input
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                  placeholder="Juan Pérez"
                  className="w-full bg-[#0A0A0A] border border-[#1F1F1F] text-white px-4 py-2 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-[#6B7280] text-xs font-mono mb-2">
                  // rol *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#1F1F1F] text-white px-4 py-2 font-mono focus:outline-none focus:border-[#10B981]"
                >
                  <option value="ventas">ventas</option>
                  <option value="bodega">bodega</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              {error && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] px-4 py-2 text-sm font-mono">
                  [ERROR] {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-[#EF4444] text-white py-2 font-mono transition-colors"
                >
                  $ cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#10B981] hover:bg-[#10B981]/80 disabled:bg-[#1A1A1A] disabled:text-[#4B5563] disabled:cursor-not-allowed text-[#0A0A0A] py-2 font-mono font-bold transition-colors"
                >
                  {submitting ? '$ creando_' : '$ crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;

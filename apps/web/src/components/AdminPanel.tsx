import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, Briefcase, FolderGit2, Tags, Plus, Trash2, Loader2, Edit2, Clock, Mail, Link } from 'lucide-react';
import { EmailRemindersModal } from './EmailRemindersModal';

type TabType = 'employees' | 'clients' | 'projects' | 'categories' | 'aliases';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [unlinkedUsers, setUnlinkedUsers] = useState<any[]>([]);
  const [selectedTargetEmps, setSelectedTargetEmps] = useState<Record<string, string>>({});
  
  const [data, setData] = useState({
    employees: [] as any[],
    clients: [] as any[],
    projects: [] as any[],
    categories: [] as any[],
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const fetchUnlinkedUsers = async () => {
    try {
      const res = await api.callMcpTool('get_unlinked_external_users', {});
      const json = await res.json();
      if (json.success && json.result?.unlinked_users) {
        setUnlinkedUsers(json.result.unlinked_users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkUser = async (identifier: string) => {
    const targetId = selectedTargetEmps[identifier];
    if (!targetId) {
      alert('Por favor selecciona un empleado para vincular.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.callMcpTool('link_external_user', {
        alias_identifier: identifier,
        target_employee_id: targetId
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Error al vincular');
      
      alert(json.result?.message || 'Empleado vinculado exitosamente');
      await fetchUnlinkedUsers();
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al vincular empleado.');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, cliRes, projRes, catRes] = await Promise.all([
        api.callMcpTool('get_employees', { company_id: 'mooving-default' }).then(res => res.json()),
        api.callMcpTool('get_clients', { company_id: 'mooving-default' }).then(res => res.json()),
        api.callMcpTool('get_projects', { company_id: 'mooving-default' }).then(res => res.json()),
        api.callMcpTool('get_categories', { company_id: 'mooving-default' }).then(res => res.json()),
      ]);

      setData({
        employees: empRes.result?.employees || [],
        clients: cliRes.result?.clients || [],
        projects: projRes.result?.projects || [],
        categories: catRes.result?.categories || [],
      });
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar datos administrativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUnlinkedUsers();
  }, []);

  const handleDelete = async (id: string, type: TabType) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    
    setLoading(true);
    try {
      let toolName = '';
      if (type === 'employees') toolName = 'delete_employee';
      if (type === 'clients') toolName = 'delete_client';
      if (type === 'projects') toolName = 'delete_project';
      if (type === 'categories') toolName = 'delete_category';

      const res = await api.callMcpTool(toolName, { id });
      if (!res.ok) throw new Error('Error al eliminar');
      
      await fetchData();
    } catch (err) {
      setError('No se pudo eliminar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncClockify = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.callMcpTool('sync_clockify_hours', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar Clockify');
      
      alert(data.result?.message || 'Sincronización de Clockify exitosa');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al sincronizar con Clockify.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const isEdit = !!editingItem;
      let toolName = '';
      
      if (activeTab === 'employees') toolName = isEdit ? 'update_employee' : 'create_employee';
      if (activeTab === 'clients') toolName = isEdit ? 'update_client' : 'create_client';
      if (activeTab === 'projects') toolName = isEdit ? 'update_project' : 'create_project';
      if (activeTab === 'categories') toolName = isEdit ? 'update_category' : 'create_category';

      const payload = isEdit ? { id: editingItem.id, ...formData } : { ...formData };
      
      const res = await api.callMcpTool(toolName, payload);
      if (!res.ok) throw new Error('Error al guardar');
      
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
      await fetchData();
    } catch (err) {
      setError('Error al guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ is_active: 1 });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item, is_active: item.is_active !== undefined ? item.is_active : 1 });
    setIsModalOpen(true);
  };

  const tabs = [
    { id: 'employees', name: 'Empleados', icon: Users },
    { id: 'clients', name: 'Clientes', icon: Briefcase },
    { id: 'projects', name: 'Proyectos', icon: FolderGit2 },
    { id: 'categories', name: 'Categorías', icon: Tags },
    { id: 'aliases', name: 'Vinculación de Empleados', icon: Link },
  ];

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Administración</h1>
            <p className="text-slate-500 mt-1">Gestión de datos maestros y empleados</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              Recordatorios por Mail
            </button>
            <button
              onClick={handleSyncClockify}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
              Sincronizar Clockify
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Actualizar Datos
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors
                    ${activeTab === tab.id 
                      ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'aliases' ? (
              <div>
                <div className="mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-1">
                    🔗 Vinculación de Identidades Externas (Zendesk / Clockify)
                  </h3>
                  <p className="text-xs text-indigo-700">
                    Si un agente en Zendesk o Clockify ingresa con un mail o nombre diferente al padrón oficial, vinculalo aquí en 1 clic para unificar sus horas bajo la persona correcta.
                  </p>
                </div>

                {unlinkedUsers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-emerald-700 font-semibold text-sm">✅ ¡Todos los usuarios externos están 100% vinculados!</p>
                    <p className="text-xs text-slate-500 mt-1">No hay agentes pendientes de asociar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                          <th className="py-3 px-4 font-medium">Identidad Externa / Email</th>
                          <th className="py-3 px-4 font-medium">Origen</th>
                          <th className="py-3 px-4 font-medium">Vincular a Empleado Oficial</th>
                          <th className="py-3 px-4 font-medium text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {unlinkedUsers.map((u: any) => {
                          const identifier = u.employee_id || u.employee_name;
                          return (
                            <tr key={identifier} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-800 font-mono text-xs">
                                {u.employee_name} ({u.employee_id})
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  u.source === 'zendesk' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {u.source === 'zendesk' ? '🟣 Zendesk' : '🟦 Clockify'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={selectedTargetEmps[identifier] || ''}
                                  onChange={(e) => setSelectedTargetEmps(prev => ({ ...prev, [identifier]: e.target.value }))}
                                  className="w-full max-w-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="">-- Seleccionar Empleado Oficial --</option>
                                  {data.employees.map((emp: any) => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name} ({emp.email || emp.id})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleLinkUser(identifier)}
                                  disabled={loading}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                                >
                                  🔗 Vincular
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Listado de {tabs.find(t => t.id === activeTab)?.name}
                  </h2>
                  <button
                    onClick={openCreateModal}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Nuevo
                  </button>
                </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                    <th className="py-3 px-4 font-medium">ID</th>
                    <th className="py-3 px-4 font-medium">Nombre</th>
                    {activeTab === 'employees' && <th className="py-3 px-4 font-medium">Email</th>}
                    {activeTab === 'employees' && <th className="py-3 px-4 font-medium">Estado</th>}
                    {activeTab === 'projects' && <th className="py-3 px-4 font-medium">Client ID</th>}
                    <th className="py-3 px-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data[activeTab].map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs">{item.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                      {activeTab === 'employees' && <td className="py-3 px-4 text-slate-500 font-mono text-xs">{item.email || '-'}</td>}
                      {activeTab === 'employees' && (
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.is_active === 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.is_active === 0 ? 'Fuera de la org.' : 'Activo'}
                          </span>
                        </td>
                      )}
                      {activeTab === 'projects' && <td className="py-3 px-4 text-slate-500 font-mono text-xs">{item.client_id}</td>}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors mr-2"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, activeTab)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data[activeTab].length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                        No hay registros disponibles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingItem ? 'Editar' : 'Crear'} {tabs.find(t => t.id === activeTab)?.name.slice(0, -1)}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {activeTab === 'employees' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado de Empleado</label>
                    <select
                      value={formData.is_active !== 0 ? 1 : 0}
                      onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>Activo (En la organización)</option>
                      <option value={0}>Fuera de la organización (Exempleado)</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'projects' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <select
                    required
                    value={formData.client_id || ''}
                    onChange={e => setFormData({...formData, client_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona un cliente</option>
                    {data.clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium disabled:opacity-70 flex items-center"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Reminders Modal */}
      <EmailRemindersModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
      />
    </div>
  );
}


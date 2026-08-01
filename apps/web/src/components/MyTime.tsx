import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle, ListTodo, Zap, CalendarClock } from 'lucide-react';
import { QuickLogModal } from './QuickLogModal';

const MOOVING_COLORS = {
  primary: '#1a5f7a',
  secondary: '#f97316',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const MyTime: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  // --- A2: edición inline de "Mis registros del mes" ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    client_name: '',
    project_name: '',
    duration_decimal: 1.0,
    date: '',
    work_type: 'project',
    description: ''
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const [formData, setFormData] = useState({
    client_name: '',
    project_name: '',
    duration_decimal: 1.0,
    date: new Date().toISOString().split('T')[0],
    work_type: 'project',
    description: ''
  });

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await api.listRecords();
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('Guardando...');
    
    try {
      const userEmail = localStorage.getItem('mooving_user_email') || 'unknown@moovingtech.com';
      const userName = userEmail.split('@')[0];
      const userId = 'emp_' + userName.replaceAll('.', '_');

      const payload = {
        employee_id: userId,
        employee_name: userName,
        client_id: 'cli_' + formData.client_name.toLowerCase().replace(/\\s/g, ''),
        client_name: formData.client_name,
        project_id: 'proj_' + formData.project_name.toLowerCase().replace(/\\s/g, ''),
        project_name: formData.project_name,
        duration_decimal: Number(formData.duration_decimal),
        date: formData.date,
        work_type: formData.work_type,
        description: formData.description
      };

      const res = await api.createRecord(payload);
      const data = await res.json();
      if (data.success) {
        setMessage('✅ ¡Horas guardadas con éxito!');
        setFormData(prev => ({ ...prev, duration_decimal: 1.0, description: '' }));
        fetchRecords(); // Refresca los datos tras guardar
      } else {
        setMessage('❌ Error al guardar las horas.');
      }
    } catch (err) {
      setMessage('❌ Error de red.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // --- A2: handlers de edición. Usa el MISMO endpoint que la edición existente de la app
  // (PUT /api/data/records/:id vía api.updateRecord, que adjunta el Bearer token con getHeaders()).
  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditError('');
    setEditSuccess('');
    setEditForm({
      client_name: r.client_name || '',
      project_name: r.project_name || '',
      duration_decimal: Number(r.duration_decimal) || 1.0,
      date: r.date ? String(r.date).slice(0, 10) : '',
      work_type: r.work_type || 'project',
      description: r.description || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const original = records.find((r: any) => r.id === editingId);
    if (!original) return;
    setEditSaving(true);
    setEditError('');
    try {
      // Se preserva la identidad original del registro (employee_id/name); solo se editan los campos del form.
      const payload = {
        employee_id: original.employee_id,
        employee_name: original.employee_name,
        client_id: 'cli_' + editForm.client_name.toLowerCase().replace(/\s/g, ''),
        client_name: editForm.client_name,
        project_id: 'proj_' + editForm.project_name.toLowerCase().replace(/\s/g, ''),
        project_name: editForm.project_name,
        duration_decimal: Number(editForm.duration_decimal),
        date: editForm.date,
        work_type: editForm.work_type,
        description: editForm.description
      };

      const res = await api.updateRecord(editingId, payload);
      if (res.status === 403) {
        setEditError('No podés editar este registro');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        setEditSuccess('✅ Registro actualizado con éxito');
        setTimeout(() => setEditSuccess(''), 3000);
        fetchRecords(); // Refresca los datos igual que el alta de horas
      } else {
        setEditError(data.error || 'Error al actualizar el registro.');
      }
    } catch (err) {
      setEditError('Error de red al guardar los cambios.');
    } finally {
      setEditSaving(false);
    }
  };

  const [dailyCapacity, setDailyCapacity] = useState<number>(8.0);

  useEffect(() => {
    const loadUserCapacity = async () => {
      try {
        const userEmail = localStorage.getItem('mooving_user_email') || '';
        const userName = userEmail.split('@')[0];
        const res = await api.callMcpTool('get_employees', {});
        const data = await res.json();
        if (data.success && data.result?.employees) {
          const emp = data.result.employees.find((e: any) => 
            (e.email && e.email.toLowerCase() === userEmail.toLowerCase()) || 
            (e.name && e.name.toLowerCase() === userName.toLowerCase())
          );
          if (emp && emp.daily_hours_expected !== undefined) {
            setDailyCapacity(Number(emp.daily_hours_expected));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUserCapacity();
  }, []);

  // --- Identidad del usuario logueado: "Mis Horas" debe mostrar SOLO sus registros ---
  // (fix P0: `myRecords` se usaba sin declararse -> crasheaba la vista del empleado)
  const currentUserEmail = (typeof localStorage !== 'undefined' && localStorage.getItem('mooving_user_email')) || '';
  const currentUserName = currentUserEmail.split('@')[0];
  const currentUserId = 'emp_' + currentUserName.split('.').join('_');
  const myRecords = currentUserName
    ? records.filter(r =>
        (r.employee_name && String(r.employee_name).toLowerCase() === currentUserName.toLowerCase()) ||
        (r.employee_id && (r.employee_id === currentUserId ||
          String(r.employee_id).toLowerCase() === currentUserName.toLowerCase().replace(/\./g, '-')))
      )
    : records;

  // --- Analíticas Computadas (sobre los registros del propio usuario) ---
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thisMonthRecords = myRecords.filter(r => r.date.startsWith(currentMonth));
  
  const totalHoursThisMonth = thisMonthRecords.reduce((acc, r) => acc + (r.duration_decimal || 0), 0);
  
  // Dynamic expected hours based on working days (Mon-Fri) in the current month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let workdaysCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) workdaysCount++;
  }
  const expectedHours = workdaysCount * dailyCapacity;
  const progress = Math.min(100, Math.round((totalHoursThisMonth / (expectedHours || 1)) * 100));

  // Datos para el gráfico de Donas (Clientes) - redondeo a 2 decimales para evitar flotantes
  const clientsData = Object.values(
    thisMonthRecords.reduce((acc: any, r: any) => {
      acc[r.client_name] = acc[r.client_name] || { name: r.client_name, value: 0 };
      acc[r.client_name].value += r.duration_decimal;
      return acc;
    }, {})
  ).map((c: any) => ({ ...c, value: Math.round(c.value * 100) / 100 })) as any[];

  // Datos de desglose por Tipo de Trabajo (Epic 2)
  const workTypeLabels: Record<string, string> = {
    project: '📁 Proyectos',
    meeting: '💬 Reuniones',
    internal: '⚙️ Interno',
    training: '🎓 Capacitación',
    other: '📌 Otro'
  };

  const workTypeData = Object.values(
    thisMonthRecords.reduce((acc: any, r: any) => {
      const wt = r.work_type || 'project';
      acc[wt] = acc[wt] || { name: workTypeLabels[wt] || wt, value: 0 };
      acc[wt].value += r.duration_decimal;
      return acc;
    }, {})
  ).map((w: any) => ({ ...w, value: Math.round(w.value * 100) / 100 })) as any[];

  const billableHours = thisMonthRecords
    .filter(r => r.is_billable === 1 || r.is_billable === true || r.work_type === 'project')
    .reduce((acc, r) => acc + (r.duration_decimal || 0), 0);
  const billableRate = totalHoursThisMonth > 0 ? ((billableHours / totalHoursThisMonth) * 100).toFixed(0) : '0';

  // Historial personal de 6 meses (Epic 2 - E2-05)
  const historyData = React.useMemo(() => {
    const monthlyMap: Record<string, number> = {}
    myRecords.forEach(r => {
      const m = r.date.slice(0, 7)
      monthlyMap[m] = (monthlyMap[m] || 0) + (r.duration_decimal || 0)
    })
    return Object.entries(monthlyMap)
      .sort()
      .slice(-6)
      .map(([m, val]) => ({ month: m.slice(5), hours: Math.round(val * 10) / 10 }))
  }, [myRecords])

  // --- A2: registros del mes ordenados (más recientes primero) para la lista editable ---
  const monthRecordsSorted = [...thisMonthRecords].sort((a: any, b: any) =>
    String(b.date || '').localeCompare(String(a.date || ''))
  );

  // --- A3: días corridos sin cargar horas (sobre TODOS mis registros matcheados, no solo el mes) ---
  const lastRecordDate = React.useMemo(() => {
    let last = '';
    myRecords.forEach((r: any) => {
      const d = r && r.date ? String(r.date).slice(0, 10) : '';
      if (d && d > last) last = d;
    });
    return last; // '' => nunca cargó horas
  }, [myRecords]);

  const todayStr = new Date().toISOString().split('T')[0];
  const daysWithoutLogging = lastRecordDate
    ? Math.max(0, Math.round((Date.parse(todayStr) - Date.parse(lastRecordDate)) / 86400000))
    : null;

  return (
    <div className="flex-1 bg-slate-50 overflow-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* A3: Aviso de días sin cargar horas */}
        {!loadingRecords && daysWithoutLogging !== null && daysWithoutLogging >= 3 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl shadow-sm p-4 flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">⏰</span>
            <p className="text-sm font-medium text-amber-800">
              Llevás <strong>{daysWithoutLogging} días</strong> sin cargar horas. Mantené tu registro al día.
            </p>
          </div>
        )}
        {!loadingRecords && daysWithoutLogging === null && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm p-4 flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🌱</span>
            <p className="text-sm font-medium text-indigo-700">
              Todavía no registrás horas. ¡Arrancá hoy!
            </p>
          </div>
        )}

        {/* Cabecera y Formulario */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-indigo-600" />
                  Registrar Horas
                </h2>
                <button 
                  onClick={() => setIsQuickLogOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow transition flex items-center gap-2 text-sm"
                >
                  <Zap className="w-4 h-4" />
                  Carga Rápida (Manual)
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <input type="text" required value={formData.client_name} onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Mooving" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                    <input type="text" required value={formData.project_name} onChange={e => setFormData(p => ({ ...p, project_name: e.target.value }))} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Senda Core" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="w-full border rounded-lg p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
                    <input type="number" required step="0.5" min="0.5" max="24" value={formData.duration_decimal} onChange={e => setFormData(p => ({ ...p, duration_decimal: Number(e.target.value) }))} className="w-full border rounded-lg p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Tarea</label>
                    <select className="w-full border rounded-lg p-2 bg-white" value={formData.work_type} onChange={e => setFormData(p => ({ ...p, work_type: e.target.value }))}>
                      <option value="project">Proyecto (Facturable)</option>
                      <option value="internal">Gestión Interna</option>
                      <option value="meeting">Reunión</option>
                      <option value="training">Capacitación</option>
                      <option value="other">Soporte/Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Notas</label>
                  <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg p-2" rows={2} placeholder="Describe las tareas realizadas..." />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm font-medium text-indigo-600">{message}</span>
                  <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition disabled:opacity-50">
                    {isSubmitting ? 'Guardando...' : 'Cargar Horas'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Historial */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-indigo-600" />
                Tu Historial (Últimas Entradas)
              </h2>
              {loadingRecords ? (
                <div className="text-center py-8 text-gray-500">Cargando registros...</div>
              ) : myRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No has registrado horas todavía.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-200 text-sm text-gray-600">
                        <th className="py-3 px-4 font-medium">Fecha</th>
                        <th className="py-3 px-4 font-medium">Cliente</th>
                        <th className="py-3 px-4 font-medium">Proyecto</th>
                        <th className="py-3 px-4 font-medium">Horas</th>
                        <th className="py-3 px-4 font-medium hidden sm:table-cell">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {myRecords.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{r.date}</td>
                          <td className="py-3 px-4">{r.client_name}</td>
                          <td className="py-3 px-4 text-gray-500">{r.project_name}</td>
                          <td className="py-3 px-4 font-semibold text-indigo-600">{Number(r.duration_decimal).toFixed(2)}h</td>
                          <td className="py-3 px-4 text-gray-500 truncate max-w-xs hidden sm:table-cell" title={r.description}>{r.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* A2: Mis registros del mes (edición inline) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-indigo-600" />
                  Mis registros del mes
                </h2>
                {editSuccess && <span className="text-sm font-medium text-emerald-600">{editSuccess}</span>}
              </div>
              {loadingRecords ? (
                <div className="text-center py-8 text-gray-500">Cargando registros...</div>
              ) : monthRecordsSorted.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No tenés registros cargados este mes.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-200 text-sm text-gray-600">
                        <th className="py-3 px-4 font-medium">Fecha</th>
                        <th className="py-3 px-4 font-medium">Cliente / Proyecto</th>
                        <th className="py-3 px-4 font-medium">Tipo</th>
                        <th className="py-3 px-4 font-medium">Horas</th>
                        <th className="py-3 px-4 font-medium hidden sm:table-cell">Descripción</th>
                        <th className="py-3 px-4 font-medium text-right">Editar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {monthRecordsSorted.map((r: any, i: number) => (
                        editingId && r.id === editingId ? (
                          <tr key={r.id} className="bg-indigo-50/60">
                            <td colSpan={6} className="p-4">
                              <form onSubmit={handleEditSave} className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                                    <input type="date" required value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} className="w-full border rounded-lg p-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Duración (horas)</label>
                                    <input type="number" required step="0.5" min="0.5" max="24" value={editForm.duration_decimal} onChange={e => setEditForm(p => ({ ...p, duration_decimal: Number(e.target.value) }))} className="w-full border rounded-lg p-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Tarea</label>
                                    <select className="w-full border rounded-lg p-2 text-sm bg-white" value={editForm.work_type} onChange={e => setEditForm(p => ({ ...p, work_type: e.target.value }))}>
                                      <option value="project">Proyecto (Facturable)</option>
                                      <option value="internal">Gestión Interna</option>
                                      <option value="meeting">Reunión</option>
                                      <option value="training">Capacitación</option>
                                      <option value="other">Soporte/Otro</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                                    <input type="text" required value={editForm.client_name} onChange={e => setEditForm(p => ({ ...p, client_name: e.target.value }))} className="w-full border rounded-lg p-2 text-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Proyecto</label>
                                    <input type="text" required value={editForm.project_name} onChange={e => setEditForm(p => ({ ...p, project_name: e.target.value }))} className="w-full border rounded-lg p-2 text-sm" />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción / Notas</label>
                                  <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg p-2 text-sm" rows={2} placeholder="Describe las tareas realizadas..." />
                                </div>
                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-indigo-100">
                                  <span className="text-sm font-medium text-red-600">{editError}</span>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={cancelEdit} disabled={editSaving} className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition disabled:opacity-50">
                                      Cancelar
                                    </button>
                                    <button type="submit" disabled={editSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-1.5 px-4 rounded-lg shadow-sm transition disabled:opacity-50">
                                      {editSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </td>
                          </tr>
                        ) : (
                          <tr key={r.id || i} className="hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{r.date}</td>
                            <td className="py-3 px-4">
                              {r.client_name}
                              <span className="text-gray-400"> / </span>
                              <span className="text-gray-500">{r.project_name}</span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">{workTypeLabels[r.work_type] || r.work_type || '—'}</td>
                            <td className="py-3 px-4 font-semibold text-indigo-600 whitespace-nowrap">{Number(r.duration_decimal).toFixed(2)}h</td>
                            <td className="py-3 px-4 text-gray-500 truncate max-w-xs hidden sm:table-cell" title={r.description}>{r.description || '-'}</td>
                            <td className="py-3 px-4 text-right">
                              {r.id && (
                                <button
                                  onClick={() => startEdit(r)}
                                  title="Editar registro"
                                  aria-label="Editar registro"
                                  className="p-1.5 rounded-lg border border-transparent hover:border-indigo-200 hover:bg-indigo-50 transition"
                                >
                                  ✏️
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Analítica */}
          <div className="space-y-6">
            <div className="bg-indigo-600 text-white rounded-xl shadow-sm p-6 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-indigo-100 font-medium mb-1">Horas este mes</h3>
                <div className="text-4xl font-bold mb-4">{totalHoursThisMonth.toFixed(2)} <span className="text-lg font-normal text-indigo-200">/ {expectedHours}h</span></div>
                
                <div className="w-full bg-indigo-900/50 rounded-full h-2.5 mb-2">
                  <div className="bg-white h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-sm text-indigo-200 mt-2 font-medium">
                  <span>{progress}% de meta mensual</span>
                  <span className="bg-indigo-500/80 px-2 py-0.5 rounded text-white font-bold">{billableRate}% Facturable</span>
                </div>
              </div>
              <CheckCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
            </div>

            {/* Historial 6 Meses (Epic 2 - E2-05) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-gray-800 font-bold mb-3 text-sm">Evolución Últimos 6 Meses</h3>
              <div className="h-32 w-full">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <RechartsTooltip formatter={(val: number) => [`${val}h`, 'Horas']} />
                      <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">Sin historial</div>
                )}
              </div>
            </div>

            {/* Desglose por Tipo de Trabajo (Epic 2) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-gray-800 font-bold mb-3 text-sm">Distribución por Tipo de Trabajo</h3>
              <div className="space-y-2 text-xs">
                {workTypeData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="font-bold text-indigo-600 font-mono">{item.value.toFixed(1)}h</span>
                  </div>
                ))}
                {workTypeData.length === 0 && (
                  <p className="text-slate-400 italic text-center py-2">Sin registros en el mes</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-gray-800 font-bold mb-4">Distribución por Cliente</h3>
              <div className="h-48 w-full">
                {clientsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={clientsData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {clientsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => [`${Number(value).toFixed(2)}h`, 'Horas']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">Sin datos este mes</div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {clientsData.map((client, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-gray-600">{client.name}</span>
                    </div>
                    <span className="font-medium">{Number(client.value).toFixed(2)}h</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
              <h4 className="font-semibold text-emerald-800 mb-2">🤖 Pregúntale a Senda</h4>
              <p className="text-sm text-emerald-700 leading-relaxed">
                El widget puede decirte cómo vas. Prueba preguntarle: <br/>
                <strong className="mt-1 block">"¿Cuántas horas tengo cargadas este mes y cuántas me faltan?"</strong>
              </p>
            </div>
          </div>
        </div>
        
        <QuickLogModal 
          isOpen={isQuickLogOpen} 
          onClose={() => {
            setIsQuickLogOpen(false);
            fetchRecords();
          }} 
        />

      </div>
    </div>
  );
};

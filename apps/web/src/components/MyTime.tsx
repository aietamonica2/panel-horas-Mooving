import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle, ListTodo, Zap } from 'lucide-react';
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

  // --- Analíticas Computadas ---
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thisMonthRecords = records.filter(r => r.date.startsWith(currentMonth));
  
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
    .filter(r => r.is_billable === 1 || r.is_billable === true || (r.is_billable === undefined && r.work_type === 'project'))
    .reduce((acc, r) => acc + (r.duration_decimal || 0), 0);
  const billableRate = totalHoursThisMonth > 0 ? ((billableHours / totalHoursThisMonth) * 100).toFixed(0) : '0';

  return (
    <div className="flex-1 bg-slate-50 overflow-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
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
              ) : records.length === 0 ? (
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
                      {records.slice(0, 10).map((r, i) => (
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

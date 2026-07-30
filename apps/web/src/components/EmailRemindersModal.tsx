import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Mail, Copy, Check, Settings, Loader2, Calendar, UserX, UserCheck, Send, ExternalLink, X } from 'lucide-react';

interface EmailRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailRemindersModal({ isOpen, onClose }: EmailRemindersModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [month, setMonth] = useState('2026-07');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [ccList, setCcList] = useState('Eddie Rodriguez Von der Becke <eddie.rodriguez@moovingtech.com>; Julieta Albina <julieta.albina@moovingtech.com>');

  const [draftsData, setDraftsData] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, boolean>>({});
  const [customEmails, setCustomEmails] = useState<Record<string, string>>({});

  const [showSettings, setShowSettings] = useState(false);
  const [isAutomated, setIsAutomated] = useState(false);
  const [cronSchedule, setCronSchedule] = useState('0 9 27 * *');

  const fetchDrafts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.callMcpTool('get_email_reminder_drafts', {
        month,
        include_inactive: includeInactive,
        custom_cc: ccList,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener borradores.');

      const result = data.result || {};
      setDraftsData(result);

      if (result.default_cc && !ccList) {
        setCcList(result.default_cc);
      }

      // Default all fetched drafts to selected
      const initialSelected: Record<string, boolean> = {};
      const initialEmails: Record<string, string> = {};
      (result.drafts || []).forEach((d: any) => {
        initialSelected[d.employee_id] = true;
        initialEmails[d.employee_id] = d.email;
      });
      setSelectedEmployees(initialSelected);
      setCustomEmails(initialEmails);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar borradores de mail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDrafts();
    }
  }, [isOpen, month, includeInactive]);

  if (!isOpen) return null;

  const toggleSelectAll = (select: boolean) => {
    const next: Record<string, boolean> = {};
    (draftsData?.drafts || []).forEach((d: any) => {
      next[d.employee_id] = select;
    });
    setSelectedEmployees(next);
  };

  const handleCopySingle = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    if (!draftsData?.drafts) return;

    let fullReport = `Borradores de mail — Horas registradas, ${draftsData.month_name}\nUn mail por persona, listo para copiar y pegar. Datos: Clockify, al ${new Date().toLocaleDateString('es-AR')}.\n\n`;

    const selectedDrafts = draftsData.drafts.filter((d: any) => selectedEmployees[d.employee_id]);

    selectedDrafts.forEach((d: any, idx: number) => {
      const email = customEmails[d.employee_id] || d.email;
      fullReport += `${idx + 1}. ${d.employee_name}\n`;
      fullReport += `Para: ${email}\n`;
      fullReport += `CC: ${ccList}\n`;
      fullReport += `Asunto: ${d.subject}\n`;
      fullReport += `${d.body}\n\n`;
    });

    navigator.clipboard.writeText(fullReport.trim());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleOpenMailto = (draft: any) => {
    const email = customEmails[draft.employee_id] || draft.email;
    const subject = encodeURIComponent(draft.subject);
    const body = encodeURIComponent(draft.body);
    const cc = encodeURIComponent(ccList);
    window.open(`mailto:${email}?cc=${cc}&subject=${subject}&body=${body}`, '_blank');
  };

  const handleSendReminders = async () => {
    const selectedIds = Object.keys(selectedEmployees).filter(id => selectedEmployees[id]);
    if (selectedIds.length === 0) {
      setError('Selecciona al menos un empleado para realizar el envío.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.callMcpTool('send_email_reminders', {
        recipients: selectedIds,
        custom_cc: ccList,
        month,
        sync_clockify_first: false,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar recordatorios.');

      setSuccessMsg(data.result?.message || 'Recordatorios enviados exitosamente.');
    } catch (err: any) {
      setError(err.message || 'No se pudieron enviar los recordatorios.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAutomation = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.callMcpTool('configure_email_reminder_schedule', {
        default_cc: ccList,
        is_automated: isAutomated,
        cron_schedule: cronSchedule,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar automatización.');

      setSuccessMsg(data.result?.message || 'Configuración guardada exitosamente.');
      setShowSettings(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la automatización.');
    } finally {
      setLoading(false);
    }
  };

  const drafts = draftsData?.drafts || [];
  const selectedCount = Object.values(selectedEmployees).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white flex justify-between items-center border-b border-indigo-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-xl">
              <Mail className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Borradores & Recordatorios por Mail</h2>
              <p className="text-xs text-indigo-200 mt-0.5">Gestión de envíos y auditoría de carga de horas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Month selector */}
            <div className="flex items-center space-x-2 bg-white px-3 py-1.5 border border-slate-300 rounded-lg shadow-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="text-sm font-medium text-slate-700 outline-none bg-transparent"
              />
            </div>

            {/* Include inactive toggle */}
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-600 cursor-pointer bg-white px-3 py-1.5 border border-slate-300 rounded-lg shadow-sm">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Incluir Fuera de la Organización</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showSettings ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              {showSettings ? 'Ocultar Automatización' : '⚙️ Régimen Automático'}
            </button>
          </div>
        </div>

        {/* CC Input Bar */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center space-x-3 text-xs">
          <span className="font-semibold text-indigo-900 whitespace-nowrap">CC por defecto:</span>
          <input
            type="text"
            value={ccList}
            onChange={(e) => setCcList(e.target.value)}
            placeholder="Direcciones en copia separadas por punto y coma"
            className="flex-1 px-3 py-1 bg-white border border-indigo-200 rounded-md font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Feedback banners */}
        {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{error}</div>}
        {successMsg && <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">{successMsg}</div>}

        {/* Automation Settings Panel */}
        {showSettings && (
          <div className="p-6 bg-slate-100 border-b border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm flex items-center">
              <Settings className="w-4 h-4 mr-2 text-indigo-600" />
              Configuración de Envío Automático en Régimen
            </h3>
            <p className="text-slate-600">
              Activa la automatización para que Cloudflare Workers / Senda AI envíe automáticamente el recordatorio los días 27 de cada mes.
            </p>
            <div className="flex flex-wrap gap-6 items-center">
              <label className="flex items-center space-x-2 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutomated}
                  onChange={(e) => setIsAutomated(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-slate-800">Activar envío automático mensual sin requerir aprobación</span>
              </label>

              <div className="flex items-center space-x-2">
                <span className="text-slate-600">Programación Cron:</span>
                <input
                  type="text"
                  value={cronSchedule}
                  onChange={(e) => setCronSchedule(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded font-mono bg-white text-slate-800"
                />
              </div>

              <button
                onClick={handleSaveAutomation}
                disabled={loading}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        )}

        {/* Selection Bar */}
        <div className="px-6 py-2 bg-slate-100 text-xs text-slate-600 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <button onClick={() => toggleSelectAll(true)} className="text-indigo-600 hover:underline font-medium">Seleccionar Todos</button>
            <span>•</span>
            <button onClick={() => toggleSelectAll(false)} className="text-slate-500 hover:underline font-medium">Desmarcar Todos</button>
          </div>
          <div>
            <span className="font-semibold text-slate-800">{selectedCount}</span> de {drafts.length} empleados seleccionados
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Generando borradores de mail...</p>
            </div>
          )}

          {!loading && drafts.length === 0 && (
            <div className="py-12 text-center text-slate-500 italic">
              No se encontraron empleados activos para el periodo seleccionado.
            </div>
          )}

          {!loading && drafts.map((draft: any) => {
            const isSelected = !!selectedEmployees[draft.employee_id];
            const currentEmail = customEmails[draft.employee_id] ?? draft.email;
            const hasHours = draft.hours > 0;

            return (
              <div
                key={draft.employee_id}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-white border-indigo-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        setSelectedEmployees({ ...selectedEmployees, [draft.employee_id]: e.target.checked })
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 text-sm">{draft.number}. {draft.employee_name}</span>
                        {!draft.is_active && (
                          <span className="inline-flex items-center text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                            <UserX className="w-3 h-3 mr-1" /> Fuera de la organización
                          </span>
                        )}
                        {draft.is_active && (
                          <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                            <UserCheck className="w-3 h-3 mr-1" /> Activo
                          </span>
                        )}
                      </div>
                      
                      {/* Email input */}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-slate-500">Para:</span>
                        <input
                          type="email"
                          value={currentEmail}
                          onChange={(e) =>
                            setCustomEmails({ ...customEmails, [draft.employee_id]: e.target.value })
                          }
                          className="text-xs px-2 py-0.5 border border-slate-200 rounded font-mono text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      hasHours ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {hasHours ? `${draft.hours_formatted} hs` : 'Sin horas (0,00)'}
                    </div>

                    <button
                      onClick={() => handleOpenMailto(draft)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center transition"
                      title="Abrir en cliente de correo"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Mailto
                    </button>

                    <button
                      onClick={() => handleCopySingle(`Para: ${currentEmail}\nCC: ${ccList}\nAsunto: ${draft.subject}\n${draft.body}`, draft.number)}
                      className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg flex items-center font-medium transition"
                    >
                      {copiedIndex === draft.number ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copiedIndex === draft.number ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* Draft preview body */}
                <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-wrap border border-slate-100">
                  <div className="text-slate-400 mb-1 font-sans text-[11px]">Asunto: <span className="font-semibold text-slate-600">{draft.subject}</span></div>
                  {draft.body}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <button
            onClick={handleCopyAll}
            className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors text-xs font-semibold shadow-sm"
          >
            {copiedAll ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
            {copiedAll ? '¡Todos los borradores copiados!' : '📋 Copiar Borradores Completo'}
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>

            <button
              onClick={handleSendReminders}
              disabled={loading || selectedCount === 0}
              className="flex items-center px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-xs font-semibold shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar {selectedCount} Mails
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

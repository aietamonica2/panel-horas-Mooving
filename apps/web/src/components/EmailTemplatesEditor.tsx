import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Mail, Loader2, Save, Eye, Info } from 'lucide-react';

/**
 * Editor visual de los "mensajes estándar" (plantillas de email) para cada caso.
 *
 * Contrato del backend (MCP):
 *   get_email_templates()
 *     -> { success, result: { templates: EmailTemplate[] } }   // exactamente 3 items
 *   set_email_template({ template_key, subject, body })
 *     -> { success, result: { template_key, subject, body, is_default: false } }  // solo admin
 *
 * Las variables aparecen en el texto como tokens: {firstName}, {hours}, {month}, {days}.
 */

interface EmailTemplate {
  template_key: string;
  label: string;
  subject: string;
  body: string;
  is_default: boolean;
  variables: string[];
}

// Valores de ejemplo usados en la vista previa.
const SAMPLE_VALUES: Record<string, string> = {
  firstName: 'Juan',
  hours: '32,50',
  month: 'julio',
  days: '4',
};

// Orden de presentación de las tarjetas.
const TEMPLATE_ORDER = ['reminder_hours', 'reminder_zero', 'inactivity'];

// Reemplaza tokens {var} por su valor de ejemplo. Deja intacto lo que no tenga muestra.
function substituteVars(text: string, values: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] !== undefined ? values[key] : match
  );
}

export function EmailTemplatesEditor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Recuerda el último campo enfocado por tarjeta, para insertar chips en el cursor.
  const focusRef = useRef<{
    key: string;
    field: 'subject' | 'body';
    el: HTMLInputElement | HTMLTextAreaElement;
  } | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.callMcpTool('get_email_templates', {});
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Error al cargar las plantillas.');
      }
      const list: EmailTemplate[] = json.result?.templates || [];
      const sorted = [...list].sort((a, b) => {
        const ia = TEMPLATE_ORDER.indexOf(a.template_key);
        const ib = TEMPLATE_ORDER.indexOf(b.template_key);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      setTemplates(sorted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar las plantillas de email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const updateField = (key: string, field: 'subject' | 'body', value: string) => {
    setTemplates(prev =>
      prev.map(t => (t.template_key === key ? { ...t, [field]: value } : t))
    );
  };

  // Inserta {variable} en el cursor del último campo enfocado de esa tarjeta.
  // Si no hay foco previo en la tarjeta, lo agrega al final del cuerpo.
  const insertVariable = (tpl: EmailTemplate, variable: string) => {
    const token = `{${variable}}`;
    const focus = focusRef.current;
    if (focus && focus.key === tpl.template_key) {
      const el = focus.el;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const nextValue = el.value.slice(0, start) + token + el.value.slice(end);
      updateField(tpl.template_key, focus.field, nextValue);
      const caret = start + token.length;
      requestAnimationFrame(() => {
        el.focus();
        try { el.setSelectionRange(caret, caret); } catch { /* noop */ }
      });
    } else {
      updateField(tpl.template_key, 'body', `${tpl.body || ''}${token}`);
    }
  };

  const handleSave = async (tpl: EmailTemplate) => {
    setSavingKey(tpl.template_key);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.callMcpTool('set_email_template', {
        template_key: tpl.template_key,
        subject: tpl.subject,
        body: tpl.body,
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Error al guardar la plantilla.');
      }
      const saved = json.result || {};
      setTemplates(prev =>
        prev.map(t =>
          t.template_key === tpl.template_key
            ? {
                ...t,
                subject: saved.subject ?? t.subject,
                body: saved.body ?? t.body,
                is_default: saved.is_default ?? false,
              }
            : t
        )
      );
      setSuccessMsg(`Plantilla "${tpl.label}" guardada correctamente.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo guardar la plantilla.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      {/* Encabezado de sección */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Mensajes estándar de Email</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Editá el asunto y el cuerpo de los mensajes que se envían en cada caso. Usá variables como{' '}
              <code className="px-1 rounded bg-slate-100 dark:bg-slate-700 font-mono text-xs">{'{firstName}'}</code> para personalizar.
            </p>
          </div>
        </div>
        <button
          onClick={fetchTemplates}
          disabled={loading}
          className="shrink-0 flex items-center px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Actualizar
        </button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 flex justify-between items-start gap-4 text-sm">
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700 font-bold leading-none"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {/* Estados: carga inicial / vacío / listado */}
      {loading && templates.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium">Cargando plantillas de email...</p>
        </div>
      ) : !loading && templates.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          No hay plantillas de email disponibles.
        </div>
      ) : (
        <div className="space-y-6">
          {templates.map((tpl) => {
            const isSaving = savingKey === tpl.template_key;
            const previewSubject = substituteVars(tpl.subject, SAMPLE_VALUES);
            const previewBody = substituteVars(tpl.body, SAMPLE_VALUES);
            return (
              <div
                key={tpl.template_key}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 p-5"
              >
                {/* Cabecera de la tarjeta */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{tpl.label}</h3>
                    {tpl.is_default && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Por defecto
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{tpl.template_key}</span>
                  </div>
                  <button
                    onClick={() => handleSave(tpl)}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>

                {/* Asunto */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asunto</label>
                  <input
                    type="text"
                    value={tpl.subject}
                    onChange={(e) => updateField(tpl.template_key, 'subject', e.target.value)}
                    onFocus={(e) => { focusRef.current = { key: tpl.template_key, field: 'subject', el: e.target }; }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Asunto del email"
                  />
                </div>

                {/* Cuerpo */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cuerpo</label>
                  <textarea
                    value={tpl.body}
                    onChange={(e) => updateField(tpl.template_key, 'body', e.target.value)}
                    onFocus={(e) => { focusRef.current = { key: tpl.template_key, field: 'body', el: e.target }; }}
                    rows={8}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed resize-y"
                    placeholder="Cuerpo del mensaje..."
                  />
                </div>

                {/* Variables disponibles (chips) */}
                {tpl.variables && tpl.variables.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <Info className="w-3.5 h-3.5 mr-1" />
                      Variables disponibles:
                    </span>
                    {tpl.variables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(tpl, v)}
                        title="Insertar variable"
                        className="px-2 py-0.5 rounded-md text-xs font-mono bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition-colors"
                      >
                        {`{${v}}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Vista previa */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Vista previa (con datos de ejemplo)
                  </div>
                  <div className="p-3 text-sm">
                    <div className="text-slate-500 dark:text-slate-400 text-xs mb-2">
                      Asunto:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {previewSubject || <em className="text-slate-400 not-italic">(sin asunto)</em>}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-200 leading-relaxed">
                      {previewBody || <em className="text-slate-400">(cuerpo vacío)</em>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

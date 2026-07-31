import React, { useEffect, useId, useRef } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

/**
 * Modal de confirmación reutilizable y accesible.
 * Reemplaza los window.confirm() nativos (prohibidos por las reglas del proyecto).
 * - role="dialog" + aria-modal + aria-labelledby / aria-describedby
 * - Se cierra con Escape y con click en el backdrop
 * - Atrapa el foco de forma básica (foco al botón de confirmar al abrir)
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'default',
}) => {
  const titleId = useId()
  const descId = useId()
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Foco al botón de confirmar al abrir (focus trap básico).
  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus()
    }
  }, [isOpen])

  // Cerrar con la tecla Escape mientras el modal está abierto.
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // Return condicional DESPUÉS de declarar todos los hooks (Reglas de Hooks).
  if (!isOpen) return null

  const isDanger = variant === 'danger'
  const confirmClasses = isDanger
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-[#1a5f7a] hover:bg-[#14485d] focus:ring-[#1a5f7a]'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Click en el backdrop (no en la card) cierra el modal.
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full ${
                isDanger ? 'bg-red-100 text-red-600' : 'bg-[#1a5f7a]/10 text-[#1a5f7a]'
              }`}
              aria-hidden="true"
            >
              <span className="text-xl">{isDanger ? '⚠️' : '❔'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-slate-800">
                {title}
              </h2>
              <p id={descId} className="mt-1 text-sm text-slate-600 break-words">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

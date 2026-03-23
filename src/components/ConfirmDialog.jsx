import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ message, ...options })
    })
  }, [])

  const handleConfirm = () => {
    resolveRef.current?.(true)
    setState(null)
  }

  const handleCancel = () => {
    resolveRef.current?.(false)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmOverlay
          message={state.message}
          confirmLabel={state.confirmLabel || 'Supprimer'}
          cancelLabel={state.cancelLabel || 'Annuler'}
          danger={state.danger !== false}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used within ConfirmProvider')
  return confirm
}

function ConfirmOverlay({ message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) {
  const confirmBtnRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    confirmBtnRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-xl p-5 shadow-2xl max-w-sm w-full mx-4 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)' }}
          >
            <AlertTriangle size={18} style={{ color: danger ? '#ef4444' : '#3b82f6' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Confirmation
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)', background: 'var(--bg-nested)' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg text-white transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

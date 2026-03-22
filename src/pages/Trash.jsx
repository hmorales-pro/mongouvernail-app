import { useState, useMemo } from 'react'
import { Trash2, RotateCcw, AlertTriangle, X } from 'lucide-react'
import useStore from '../store/useStore'
import { formatDate } from '../utils/helpers'

const TYPE_LABELS = {
  client: 'Client',
  project: 'Projet',
  task: 'Tâche',
  transaction: 'Transaction',
  goal: 'Objectif',
}

const TYPE_COLORS = {
  client: '#3B82F6',
  project: '#8B5CF6',
  task: '#F59E0B',
  transaction: '#10B981',
  goal: '#EC4899',
}

function getItemLabel(item) {
  return item.nom || item.titre || item.reference || `#${item.id?.slice(0, 8)}`
}

export default function Trash() {
  const getTrashItems = useStore((s) => s.getTrashItems)
  const restoreTrashItem = useStore((s) => s.restoreTrashItem)
  const purgeTrashItem = useStore((s) => s.purgeTrashItem)
  const emptyTrash = useStore((s) => s.emptyTrash)
  const trashCount = useStore((s) => s.trashCount)

  const [filterType, setFilterType] = useState('Tous')

  const items = useMemo(() => getTrashItems(), [trashCount])

  const filtered = filterType === 'Tous'
    ? items
    : items.filter((i) => i._type === filterType)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Trash2 size={20} /> Corbeille
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {items.length} élément{items.length > 1 ? 's' : ''} supprimé{items.length > 1 ? 's' : ''}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Vider définitivement la corbeille ? Cette action est irréversible.')) {
                emptyTrash()
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg hover:opacity-80"
            style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
          >
            <AlertTriangle size={14} /> Vider la corbeille
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {['Tous', 'client', 'project', 'task', 'transaction', 'goal'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-2.5 py-1 text-xs rounded-md transition-colors"
              style={{
                background: filterType === t ? 'var(--bg-nested)' : 'transparent',
                color: filterType === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {t === 'Tous' ? 'Tous' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Trash2 size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-tertiary)' }}>La corbeille est vide</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={`${item._type}-${item.id}`}
              className="t-card-flat rounded-lg p-3 flex items-center gap-3"
            >
              <div
                className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide flex-shrink-0"
                style={{
                  color: TYPE_COLORS[item._type],
                  background: TYPE_COLORS[item._type] + '15',
                }}
              >
                {TYPE_LABELS[item._type]}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {getItemLabel(item)}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Supprimé le {formatDate(item.deleted_at)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => restoreTrashItem(item._type, item.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors hover:opacity-80"
                  style={{ color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' }}
                  title="Restaurer"
                >
                  <RotateCcw size={11} /> Restaurer
                </button>
                <button
                  onClick={() => {
                    if (confirm('Supprimer définitivement ?')) {
                      purgeTrashItem(item._type, item.id)
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors hover:opacity-80"
                  style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                  title="Supprimer définitivement"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

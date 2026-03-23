import { useState } from 'react'
import { Plus, X, RotateCcw } from 'lucide-react'
import { LIST_DEFAULTS } from '../utils/customLists'

/**
 * Inline editor for a customizable select list.
 * Shows default items (can be hidden) and custom items (can be deleted).
 */
export default function ListEditor({ listKey, customLists, onUpdate }) {
  const [newItem, setNewItem] = useState('')
  const defaults = LIST_DEFAULTS[listKey] || []
  const custom = customLists[listKey] || { added: [], removed: [] }
  const { added = [], removed = [] } = custom

  const visibleDefaults = defaults.filter((v) => !removed.includes(v))
  const allItems = [...visibleDefaults, ...added]

  const addItem = () => {
    const val = newItem.trim()
    if (!val || allItems.includes(val)) return
    onUpdate(listKey, {
      ...custom,
      added: [...added, val],
      // If re-adding a previously removed default, un-remove it
      removed: removed.filter((r) => r !== val),
    })
    setNewItem('')
  }

  const removeItem = (item) => {
    if (defaults.includes(item)) {
      // Hide a default item
      onUpdate(listKey, {
        ...custom,
        removed: [...removed, item],
      })
    } else {
      // Delete a custom item
      onUpdate(listKey, {
        ...custom,
        added: added.filter((a) => a !== item),
      })
    }
  }

  const restoreItem = (item) => {
    onUpdate(listKey, {
      ...custom,
      removed: removed.filter((r) => r !== item),
    })
  }

  const resetAll = () => {
    onUpdate(listKey, { added: [], removed: [] })
  }

  return (
    <div className="space-y-2">
      {/* Current items */}
      <div className="flex flex-wrap gap-1.5">
        {visibleDefaults.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{ background: 'var(--bg-nested)', color: 'var(--text-secondary)' }}
          >
            {item}
            <button
              onClick={() => removeItem(item)}
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {added.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}
          >
            {item}
            <button
              onClick={() => removeItem(item)}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>

      {/* Hidden defaults */}
      {removed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {removed.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded line-through opacity-50 cursor-pointer hover:opacity-75 transition-opacity"
              style={{ background: 'var(--bg-nested)', color: 'var(--text-tertiary)' }}
              onClick={() => restoreItem(item)}
              title="Cliquer pour restaurer"
            >
              {item}
              <RotateCcw size={9} />
            </span>
          ))}
        </div>
      )}

      {/* Add new item */}
      <div className="flex items-center gap-1.5">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
          placeholder="Ajouter…"
          className="flex-1 t-input rounded px-2 py-1 text-xs outline-none"
          style={{ maxWidth: 180 }}
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="p-1 rounded bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-500 transition-colors"
        >
          <Plus size={12} />
        </button>
        {(added.length > 0 || removed.length > 0) && (
          <button
            onClick={resetAll}
            className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="Restaurer les valeurs par défaut"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

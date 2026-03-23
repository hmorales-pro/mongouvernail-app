import { useState, useRef, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import useStore from '../store/useStore'
import { getList } from '../utils/customLists'

/**
 * A select that allows inline addition of new items to a customizable list.
 * Wraps a normal <select> with a small "+" button.
 * When clicked, shows an inline input to add a new value.
 *
 * Props:
 *   listKey     – key in LIST_DEFAULTS (e.g. 'client_types')
 *   value       – current selected value
 *   onChange     – (e) => ... same as <select>
 *   className   – forwarded to the <select>
 *   style       – forwarded to the <select>
 *   children    – optional extra <option>s prepended (e.g. <option value="">Sans client</option>)
 *   labelMap    – optional { value: label } to display labels instead of raw values
 */
export default function CustomSelect({
  listKey,
  value,
  onChange,
  className = '',
  style = {},
  children,
  labelMap,
  ...rest
}) {
  const customLists = useStore((s) => s.customLists)
  const updateCustomList = useStore((s) => s.updateCustomList)
  const items = getList(listKey, customLists)

  const [adding, setAdding] = useState(false)
  const [newVal, setNewVal] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [adding])

  const handleAdd = () => {
    const trimmed = newVal.trim()
    if (!trimmed || items.includes(trimmed)) {
      setAdding(false)
      setNewVal('')
      return
    }
    const custom = customLists[listKey] || { added: [], removed: [] }
    updateCustomList(listKey, {
      ...custom,
      added: [...(custom.added || []), trimmed],
      removed: (custom.removed || []).filter((r) => r !== trimmed),
    })
    // Auto-select the newly added value
    if (onChange) {
      onChange({ target: { value: trimmed } })
    }
    setAdding(false)
    setNewVal('')
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
            if (e.key === 'Escape') { setAdding(false); setNewVal('') }
          }}
          placeholder="Nouvelle valeur…"
          className={className}
          style={{ ...style, flex: 1 }}
        />
        <button
          onClick={handleAdd}
          disabled={!newVal.trim()}
          className="p-1.5 rounded bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-500 transition-colors flex-shrink-0"
          title="Ajouter"
        >
          <Check size={12} />
        </button>
        <button
          onClick={() => { setAdding(false); setNewVal('') }}
          className="p-1.5 rounded transition-colors flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          title="Annuler"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={value}
        onChange={onChange}
        className={className}
        style={{ ...style, flex: 1 }}
        {...rest}
      >
        {children}
        {items.map((item) => (
          <option key={item} value={item}>
            {labelMap?.[item] || item}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="p-1.5 rounded transition-colors flex-shrink-0"
        style={{ color: 'var(--text-tertiary)', background: 'var(--bg-nested)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
        title="Ajouter une option"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

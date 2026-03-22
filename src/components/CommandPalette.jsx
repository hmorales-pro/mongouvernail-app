import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  UserCheck,
  Target,
  FolderKanban,
  Search,
} from 'lucide-react'
import useStore from '../store/useStore'

const ACTIONS = [
  { id: 'add-task', label: 'Créer une tâche', icon: Plus, category: 'Actions' },
  { id: 'add-transaction', label: 'Créer une facture', icon: FileText, category: 'Actions' },
  { id: 'mark-contacted', label: 'Marquer un client contacté', icon: UserCheck, category: 'Actions' },
  { id: 'update-goal', label: 'Mettre à jour un objectif', icon: Target, category: 'Actions' },
  { id: 'nav-home', label: 'Aller au Command Center', icon: FolderKanban, category: 'Navigation' },
  { id: 'nav-clients', label: 'Aller aux Clients', icon: FolderKanban, category: 'Navigation' },
  { id: 'nav-projets', label: 'Aller aux Projets', icon: FolderKanban, category: 'Navigation' },
  { id: 'nav-finances', label: 'Aller aux Finances', icon: FolderKanban, category: 'Navigation' },
  { id: 'nav-objectifs', label: 'Aller aux Objectifs', icon: FolderKanban, category: 'Navigation' },
  { id: 'nav-taches', label: 'Aller aux Tâches', icon: FolderKanban, category: 'Navigation' },
]

export default function CommandPalette() {
  const open = useStore((s) => s.commandPaletteOpen)
  const setOpen = useStore((s) => s.setCommandPaletteOpen)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  const filtered = useMemo(
    () =>
      ACTIONS.filter((a) =>
        a.label.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const execute = (action) => {
    setOpen(false)
    const routes = {
      'nav-home': '/',
      'nav-clients': '/clients',
      'nav-projets': '/projets',
      'nav-finances': '/finances',
      'nav-objectifs': '/objectifs',
      'nav-taches': '/taches',
    }
    if (routes[action.id]) {
      navigate(routes[action.id])
    }
    if (action.id === 'add-task') navigate('/taches')
    if (action.id === 'add-transaction') navigate('/finances')
    if (action.id === 'mark-contacted') navigate('/clients')
    if (action.id === 'update-goal') navigate('/objectifs')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && filtered[selected]) {
      execute(filtered[selected])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0"
        style={{ background: 'var(--bg-overlay)' }}
        onClick={() => setOpen(false)}
      />
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une commande…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{
              color: 'var(--text-primary)',
            }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-nested)',
            }}
          >
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p
              className="px-4 py-6 text-sm text-center"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Aucun résultat
            </p>
          )}
          {filtered.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => execute(action)}
                onMouseEnter={() => setSelected(i)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors"
                style={{
                  background:
                    i === selected ? 'var(--bg-nested)' : 'transparent',
                  color:
                    i === selected
                      ? 'var(--text-primary)'
                      : 'var(--text-tertiary)',
                }}
              >
                <Icon size={16} />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

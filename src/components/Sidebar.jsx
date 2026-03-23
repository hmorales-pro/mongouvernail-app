import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  Target,
  ListTodo,
  CalendarDays,
  FileText,
  Command,
  Sun,
  Moon,
  Trash2,
  Settings,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react'
import useStore from '../store/useStore'
import Logo from './Logo'
import { getAppVersion } from '../utils/updateChecker'

const links = [
  { to: '/', icon: LayoutDashboard, label: '__CC__', key: null },
  { to: '/clients', icon: Users, label: 'Clients', key: 'clients' },
  { to: '/projets', icon: FolderKanban, label: 'Projets', key: 'projets' },
  { to: '/finances', icon: Wallet, label: 'Finances', key: 'finances' },
  { to: '/objectifs', icon: Target, label: 'Objectifs', key: 'objectifs' },
  { to: '/taches', icon: ListTodo, label: 'Tâches', key: 'taches' },
  { to: '/calendrier', icon: CalendarDays, label: 'Calendrier', key: 'calendrier' },
  { to: '/documents', icon: FileText, label: 'Documents', key: 'documents' },
]

function WorkspaceSelector() {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [withDemo, setWithDemo] = useState(false)
  const workspaces = useStore((s) => s.workspaces)
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const activeWorkspaceName = useStore((s) => s.activeWorkspaceName)
  const activeWorkspaceColor = useStore((s) => s.activeWorkspaceColor)
  const switchWorkspace = useStore((s) => s.switchWorkspace)
  const createWorkspace = useStore((s) => s.createWorkspace)

  const handleCreate = async () => {
    if (!newName.trim()) return
    const ws = await createWorkspace(newName.trim(), { withDemoData: withDemo })
    await switchWorkspace(ws.id)
    setNewName('')
    setWithDemo(false)
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--text-primary)' }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: activeWorkspaceColor }}
        />
        <span className="flex-1 text-left truncate text-xs font-medium">
          {activeWorkspaceName || 'Workspace'}
        </span>
        <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setCreating(false) }} />
          <div
            className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-lg overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              minWidth: 230,
              right: 0,
            }}
          >
            <div className="p-1.5">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={async () => {
                    if (ws.id !== activeWorkspaceId) {
                      await switchWorkspace(ws.id)
                    }
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs transition-colors"
                  style={{
                    color: ws.id === activeWorkspaceId ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: ws.id === activeWorkspaceId ? 'var(--bg-nested)' : 'transparent',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ws.color }}
                  />
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  {ws.id === activeWorkspaceId && (
                    <Check size={12} className="text-blue-500" />
                  )}
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-secondary)' }} className="p-1.5">
              {creating ? (
                <div className="px-1 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setWithDemo(false) } }}
                      placeholder="Nom…"
                      className="flex-1 t-input rounded px-2 py-1 text-xs outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleCreate}
                      className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-500 flex-shrink-0"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                  <label
                    className="flex items-center gap-1.5 px-0.5 cursor-pointer"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={withDemo}
                      onChange={(e) => setWithDemo(e.target.checked)}
                      className="w-3 h-3 rounded accent-blue-500"
                    />
                    <span className="text-[10px]">Inclure des données de démo</span>
                  </label>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <Plus size={12} />
                  Nouvel espace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Sidebar() {
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const trashCount = useStore((s) => s.trashCount)
  const enabledModules = useStore((s) => s.enabledModules)
  const commandCenterName = useStore((s) => s.commandCenterName) || 'Command Center'

  const visibleLinks = links
    .filter((l) => l.key === null || enabledModules[l.key] !== false)
    .map((l) => l.label === '__CC__' ? { ...l, label: commandCenterName } : l)

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col transition-colors duration-200"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-primary)',
      }}
    >
      <div
        className="p-4"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <h1
          className="text-base font-semibold tracking-tight flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <Logo size={22} />
          Mon Gouvernail
        </h1>
        <div className="mt-2">
          <WorkspaceSelector />
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {visibleLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--bg-nested)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div
        className="p-2 space-y-0.5"
        style={{ borderTop: '1px solid var(--border-primary)' }}
      >
        {/* Trash */}
        <NavLink
          to="/corbeille"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors"
          style={({ isActive }) => ({
            background: isActive ? 'var(--bg-nested)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
          })}
        >
          <Trash2 size={16} />
          <span className="flex-1 text-left">Corbeille</span>
          {trashCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
            >
              {trashCount}
            </span>
          )}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/parametres"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors"
          style={({ isActive }) => ({
            background: isActive ? 'var(--bg-nested)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
          })}
        >
          <Settings size={16} />
          Paramètres
        </NavLink>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span className="flex-1 text-left">
            {theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          </span>
        </button>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Command size={16} />
          <span className="flex-1 text-left">Commandes</span>
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--bg-nested)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        <div
          className="px-3 pt-1 pb-0.5 text-[10px] font-mono"
          style={{ color: 'var(--text-muted)' }}
        >
          v{getAppVersion()}
        </div>
      </div>
    </aside>
  )
}

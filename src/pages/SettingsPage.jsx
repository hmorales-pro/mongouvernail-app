import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Settings,
  Database,
  Download,
  Upload,
  Camera,
  Trash2,
  Edit3,
  Check,
  X,
  HardDrive,
  Clock,
  Palette,
} from 'lucide-react'
import useStore from '../store/useStore'
import { getBackupSettings, setBackupSettings } from '../db/dbManager'
import { getAppVersion } from '../utils/updateChecker'

const WORKSPACE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
]

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function WorkspaceCard({ ws, isActive, onSwitch, onRename, onDelete, onColorChange }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(ws.name)
  const [showColors, setShowColors] = useState(false)

  const handleSave = () => {
    if (name.trim() && name !== ws.name) {
      onRename(ws.id, name.trim())
    }
    setEditing(false)
  }

  return (
    <div
      className="t-card-flat rounded-lg p-4 relative"
      style={isActive ? { borderLeft: `3px solid ${ws.color}` } : {}}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowColors(!showColors)}
          className="relative"
          title="Changer la couleur"
        >
          <div
            className="w-4 h-4 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all"
            style={{ background: ws.color, ringColor: ws.color }}
          />
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                className="t-input rounded px-2 py-0.5 text-sm outline-none flex-1"
                autoFocus
              />
              <button onClick={handleSave} className="p-0.5" style={{ color: '#10B981' }}>
                <Check size={14} />
              </button>
              <button onClick={() => setEditing(false)} className="p-0.5" style={{ color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {ws.name}
              </span>
              {isActive && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                  Actif
                </span>
              )}
            </div>
          )}
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Créé le {new Date(ws.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!isActive && (
            <button
              onClick={() => onSwitch(ws.id)}
              className="px-2 py-1 text-[11px] rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              Ouvrir
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
            title="Renommer"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Supprimer l'espace "${ws.name}" et toutes ses données ?`)) {
                onDelete(ws.id)
              }
            }}
            className="p-1.5 rounded hover:opacity-80"
            style={{ color: '#ef4444' }}
            title="Supprimer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showColors && (
        <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
          <Palette size={12} style={{ color: 'var(--text-tertiary)' }} />
          {WORKSPACE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onColorChange(ws.id, c); setShowColors(false) }}
              className="w-5 h-5 rounded-full hover:ring-2 hover:ring-offset-1 transition-all"
              style={{
                background: c,
                outline: c === ws.color ? '2px solid var(--text-primary)' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const workspaces = useStore((s) => s.workspaces)
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const switchWorkspace = useStore((s) => s.switchWorkspace)
  const createWs = useStore((s) => s.createWorkspace)
  const renameWs = useStore((s) => s.renameWorkspace)
  const deleteWs = useStore((s) => s.deleteWorkspace)
  const updateWsColor = useStore((s) => s.updateWorkspaceColor)
  const createSnap = useStore((s) => s.createSnapshot)
  const getSnaps = useStore((s) => s.getSnapshots)
  const restoreSnap = useStore((s) => s.restoreSnapshot)
  const deleteSnap = useStore((s) => s.deleteSnapshot)
  const exportWs = useStore((s) => s.exportWorkspace)
  const importWs = useStore((s) => s.importWorkspace)
  const getStorageUsage = useStore((s) => s.getStorageUsage)

  const [snapName, setSnapName] = useState('')
  const [showSnapForm, setShowSnapForm] = useState(false)
  const [snapVersion, setSnapVersion] = useState(0)
  const [maxBackups, setMaxBackups] = useState(() => getBackupSettings().maxAutoBackups)
  const fileInputRef = useRef(null)

  const snapshots = useMemo(() => getSnaps(), [activeWorkspaceId, snapVersion])

  const [storage, setStorage] = useState({ bytes: 0, formatted: '...' })
  useEffect(() => {
    getStorageUsage().then(setStorage)
  }, [activeWorkspaceId, snapVersion])

  const handleCreateSnapshot = () => {
    if (!snapName.trim()) return
    createSnap(snapName.trim())
    setSnapName('')
    setShowSnapForm(false)
    setSnapVersion((v) => v + 1)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      await importWs(file)
      e.target.value = ''
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Settings size={20} /> Paramètres
        </h1>
        <p className="text-[11px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
          MonGouvernail v{getAppVersion()}
        </p>
      </div>

      {/* ── Workspaces ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <Database size={14} /> Espaces de travail
          </h2>
          <button
            onClick={() => {
              const name = prompt('Nom du nouvel espace :')
              if (name?.trim()) createWs(name.trim())
            }}
            className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            + Nouveau
          </button>
        </div>

        <div className="space-y-2">
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              ws={ws}
              isActive={ws.id === activeWorkspaceId}
              onSwitch={switchWorkspace}
              onRename={renameWs}
              onDelete={deleteWs}
              onColorChange={updateWsColor}
            />
          ))}
        </div>
      </section>

      {/* ── Snapshots ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <Camera size={14} /> Snapshots
          </h2>
          <button
            onClick={() => setShowSnapForm(!showSnapForm)}
            className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            + Snapshot
          </button>
        </div>

        {showSnapForm && (
          <div className="t-card-flat rounded-lg p-3 mb-3 flex items-center gap-2">
            <input
              value={snapName}
              onChange={(e) => setSnapName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSnapshot() }}
              placeholder="Nom du snapshot…"
              className="flex-1 t-input rounded px-3 py-1.5 text-sm outline-none"
              autoFocus
            />
            <button
              onClick={handleCreateSnapshot}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              Créer
            </button>
            <button
              onClick={() => setShowSnapForm(false)}
              className="px-2 py-1.5 text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Annuler
            </button>
          </div>
        )}

        {snapshots.length === 0 ? (
          <div className="t-card-flat rounded-lg p-6 text-center">
            <Camera size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Aucun snapshot. Créez-en un pour sauvegarder l'état actuel.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="t-card-flat rounded-lg p-3 flex items-center gap-3"
              >
                <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {snap.name}
                    {snap.isAuto && (
                      <span className="text-[9px] ml-1.5 px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-600">
                        auto
                      </span>
                    )}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(snap.createdAt).toLocaleDateString('fr-FR')} à {new Date(snap.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{formatBytes(snap.size || 0)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      if (confirm('Restaurer ce snapshot ? Les données actuelles seront remplacées.')) {
                        await restoreSnap(snap.id)
                      }
                    }}
                    className="px-2 py-1 text-[11px] rounded hover:opacity-80"
                    style={{ color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' }}
                  >
                    Restaurer
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer ce snapshot ?')) { deleteSnap(snap.id); setSnapVersion((v) => v + 1) }
                    }}
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: '#ef4444' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Export / Import ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2 mb-3" style={{ color: 'var(--text-tertiary)' }}>
          <HardDrive size={14} /> Sauvegarde
        </h2>

        <div className="t-card-flat rounded-lg p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={exportWs}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500"
            >
              <Download size={14} /> Exporter (.hmsdb)
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg hover:opacity-80"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
            >
              <Upload size={14} /> Importer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".hmsdb"
              onChange={handleImport}
              className="hidden"
            />
          </div>

          <p className="text-[11px] mt-3" style={{ color: 'var(--text-tertiary)' }}>
            Exporte l'espace de travail actif en fichier .hmsdb. Importer crée un nouvel espace ou remplace l'existant.
          </p>

          <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Auto-backups à conserver</p>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Un backup auto est créé avant chaque suppression (max 1 toutes les 30s). Mettre à 0 pour désactiver.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={maxBackups}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(50, parseInt(e.target.value) || 0))
                    setMaxBackups(val)
                    setBackupSettings({ maxAutoBackups: val })
                    setSnapVersion((v) => v + 1)
                  }}
                  className="w-16 t-input rounded px-2 py-1 text-sm text-center outline-none font-mono"
                />
              </div>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Stockage utilisé : <span className="font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>{storage.formatted}</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * Multi-workspace & snapshot manager
 * Stores workspace registry + snapshots metadata in localStorage
 * Each workspace DB binary is stored as a separate localStorage key
 */

const REGISTRY_KEY = 'hms-workspaces'
const SNAPSHOT_REGISTRY_KEY = 'hms-snapshots'
const DB_PREFIX = 'hms-db-'
const SNAP_PREFIX = 'hms-snap-'
const AUTO_BACKUP_PREFIX = 'hms-autobackup-'
const SETTINGS_KEY = 'hms-backup-settings'
const DEFAULT_MAX_AUTO_BACKUPS = 5
const AUTO_BACKUP_DEBOUNCE_MS = 30_000 // 30 seconds

let lastAutoBackupTime = 0

// ── Helpers ──

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
}

function getRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { workspaces: [], activeId: null }
}

function saveRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry))
}

function getSnapshotRegistry() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_REGISTRY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveSnapshotRegistry(snapshots) {
  localStorage.setItem(SNAPSHOT_REGISTRY_KEY, JSON.stringify(snapshots))
}

// ── Workspaces ──

export function getWorkspaces() {
  return getRegistry().workspaces
}

export function getActiveWorkspaceId() {
  return getRegistry().activeId
}

export function getActiveWorkspace() {
  const reg = getRegistry()
  return reg.workspaces.find((w) => w.id === reg.activeId) || null
}

/**
 * Create a new workspace. Returns the new workspace object.
 * Does NOT switch to it automatically.
 */
export function createWorkspace(name, options = {}) {
  const reg = getRegistry()
  const ws = {
    id: generateId(),
    name,
    color: options.color || '#3B82F6',
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  }
  reg.workspaces.push(ws)

  // If this is the first workspace, make it active
  if (!reg.activeId) {
    reg.activeId = ws.id
  }

  saveRegistry(reg)
  return ws
}

/**
 * Switch active workspace. Returns the workspace DB key for loading.
 */
export function switchWorkspace(workspaceId) {
  const reg = getRegistry()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  if (!ws) throw new Error(`Workspace ${workspaceId} not found`)

  // Update lastUsed on previous workspace
  const prev = reg.workspaces.find((w) => w.id === reg.activeId)
  if (prev) prev.lastUsed = new Date().toISOString()

  reg.activeId = workspaceId
  ws.lastUsed = new Date().toISOString()
  saveRegistry(reg)
  return getDbKeyForWorkspace(workspaceId)
}

export function renameWorkspace(workspaceId, newName) {
  const reg = getRegistry()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  if (ws) {
    ws.name = newName
    saveRegistry(reg)
  }
}

export function updateWorkspaceColor(workspaceId, color) {
  const reg = getRegistry()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  if (ws) {
    ws.color = color
    saveRegistry(reg)
  }
}

export function deleteWorkspace(workspaceId) {
  const reg = getRegistry()
  // Can't delete active workspace if it's the only one
  if (reg.workspaces.length <= 1) {
    throw new Error('Impossible de supprimer le dernier espace de travail')
  }
  reg.workspaces = reg.workspaces.filter((w) => w.id !== workspaceId)

  // Remove DB data
  localStorage.removeItem(getDbKeyForWorkspace(workspaceId))

  // Remove associated snapshots
  const snapshots = getSnapshotRegistry()
  const toRemove = snapshots.filter((s) => s.workspaceId === workspaceId)
  toRemove.forEach((s) => localStorage.removeItem(SNAP_PREFIX + s.id))
  saveSnapshotRegistry(snapshots.filter((s) => s.workspaceId !== workspaceId))

  // If we deleted the active workspace, switch to first available
  if (reg.activeId === workspaceId) {
    reg.activeId = reg.workspaces[0]?.id || null
  }

  saveRegistry(reg)
  return reg.activeId
}

export function getDbKeyForWorkspace(workspaceId) {
  return DB_PREFIX + workspaceId
}

/**
 * Ensure at least one default workspace exists.
 * Called on first launch. Returns the active workspace id.
 */
export function ensureDefaultWorkspace() {
  const reg = getRegistry()

  if (reg.workspaces.length === 0) {
    // Check if there's old data from pre-workspace era
    const oldData = localStorage.getItem('mongouvernail-sqlite')

    const ws = createWorkspace('Principal')

    if (oldData) {
      // Migrate old single-DB data to the new workspace
      localStorage.setItem(getDbKeyForWorkspace(ws.id), oldData)
      localStorage.removeItem('mongouvernail-sqlite')
    }

    return ws.id
  }

  if (!reg.activeId) {
    reg.activeId = reg.workspaces[0].id
    saveRegistry(reg)
  }

  return reg.activeId
}

// ── Snapshots ──

/**
 * Create a named snapshot of a workspace DB.
 */
export function createSnapshot(workspaceId, name) {
  const dbKey = getDbKeyForWorkspace(workspaceId)
  const dbData = localStorage.getItem(dbKey)
  if (!dbData) return null

  const id = generateId()
  const snapshot = {
    id,
    workspaceId,
    name,
    createdAt: new Date().toISOString(),
    size: dbData.length,
  }

  // Store snapshot data
  localStorage.setItem(SNAP_PREFIX + id, dbData)

  // Update registry
  const snapshots = getSnapshotRegistry()
  snapshots.unshift(snapshot)
  saveSnapshotRegistry(snapshots)

  return snapshot
}

/**
 * Get all snapshots, optionally filtered by workspace.
 */
export function getSnapshots(workspaceId = null) {
  const snapshots = getSnapshotRegistry()
  if (workspaceId) return snapshots.filter((s) => s.workspaceId === workspaceId)
  return snapshots
}

/**
 * Restore a snapshot. Returns the DB data as a base64 data URL string.
 */
export function restoreSnapshot(snapshotId) {
  const snapshots = getSnapshotRegistry()
  const snap = snapshots.find((s) => s.id === snapshotId)
  if (!snap) throw new Error('Snapshot not found')

  const data = localStorage.getItem(SNAP_PREFIX + snapshotId)
  if (!data) throw new Error('Snapshot data missing')

  // Overwrite workspace DB
  const dbKey = getDbKeyForWorkspace(snap.workspaceId)
  localStorage.setItem(dbKey, data)

  return snap.workspaceId
}

export function deleteSnapshot(snapshotId) {
  localStorage.removeItem(SNAP_PREFIX + snapshotId)
  localStorage.removeItem(AUTO_BACKUP_PREFIX + snapshotId)
  const snapshots = getSnapshotRegistry()
  saveSnapshotRegistry(snapshots.filter((s) => s.id !== snapshotId))
}

// ── Backup settings ──

export function getBackupSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { maxAutoBackups: DEFAULT_MAX_AUTO_BACKUPS, ...JSON.parse(raw) }
  } catch {}
  return { maxAutoBackups: DEFAULT_MAX_AUTO_BACKUPS }
}

export function setBackupSettings(settings) {
  const current = getBackupSettings()
  const merged = { ...current, ...settings }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))

  // If limit was reduced, prune excess backups now
  if (settings.maxAutoBackups !== undefined) {
    pruneAutoBackups(null, merged.maxAutoBackups)
  }
}

function pruneAutoBackups(workspaceId, max) {
  const snapshots = getSnapshotRegistry()
  const auto = workspaceId
    ? snapshots.filter((s) => s.isAuto && s.workspaceId === workspaceId)
    : snapshots.filter((s) => s.isAuto)

  // Group by workspace if pruning globally
  const byWs = {}
  auto.forEach((s) => {
    if (!byWs[s.workspaceId]) byWs[s.workspaceId] = []
    byWs[s.workspaceId].push(s)
  })

  const toRemoveIds = new Set()
  Object.values(byWs).forEach((wsBackups) => {
    if (wsBackups.length > max) {
      wsBackups.slice(max).forEach((s) => {
        localStorage.removeItem(AUTO_BACKUP_PREFIX + s.id)
        toRemoveIds.add(s.id)
      })
    }
  })

  if (toRemoveIds.size > 0) {
    saveSnapshotRegistry(snapshots.filter((s) => !toRemoveIds.has(s.id)))
  }
}

// ── Auto-backups (before destructive ops) ──

/**
 * Create an auto-backup before destructive operations.
 * Debounced: skips if last backup was < 30s ago.
 * Keeps only the last N per workspace (configurable).
 */
export function autoBackup(workspaceId) {
  // Debounce: skip if a backup was made very recently
  const now = Date.now()
  if (now - lastAutoBackupTime < AUTO_BACKUP_DEBOUNCE_MS) return
  lastAutoBackupTime = now

  const dbKey = getDbKeyForWorkspace(workspaceId)
  const dbData = localStorage.getItem(dbKey)
  if (!dbData) return

  const { maxAutoBackups } = getBackupSettings()
  if (maxAutoBackups <= 0) return // backups disabled

  const id = generateId()
  const date = new Date()
  const label = `Auto · ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

  localStorage.setItem(AUTO_BACKUP_PREFIX + id, dbData)

  const snapshots = getSnapshotRegistry()
  snapshots.unshift({
    id,
    workspaceId,
    name: label,
    createdAt: date.toISOString(),
    size: dbData.length,
    isAuto: true,
  })
  saveSnapshotRegistry(snapshots)

  // Prune old auto-backups for this workspace
  pruneAutoBackups(workspaceId, maxAutoBackups)
}

/**
 * Restore an auto-backup.
 */
export function restoreAutoBackup(backupId) {
  const data = localStorage.getItem(AUTO_BACKUP_PREFIX + backupId)
  if (!data) {
    // Might be a regular snapshot stored under SNAP_PREFIX
    return restoreSnapshot(backupId)
  }

  const snapshots = getSnapshotRegistry()
  const snap = snapshots.find((s) => s.id === backupId)
  if (!snap) throw new Error('Backup not found')

  const dbKey = getDbKeyForWorkspace(snap.workspaceId)
  localStorage.setItem(dbKey, data)
  return snap.workspaceId
}

// ── Export / Import ──

/**
 * Export a workspace DB as a downloadable file.
 */
export function exportWorkspaceAsFile(workspaceId) {
  const dbKey = getDbKeyForWorkspace(workspaceId)
  const dbData = localStorage.getItem(dbKey)
  if (!dbData) return null

  const reg = getRegistry()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  const name = ws?.name || 'workspace'

  const blob = new Blob([dbData], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hms-backup-${name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.hmsdb`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Import a workspace from a .hmsdb file.
 * Returns the workspace ID that was created or overwritten.
 */
export async function importWorkspaceFromFile(file, targetWorkspaceId = null) {
  const text = await file.text()

  if (targetWorkspaceId) {
    // Overwrite existing workspace
    const dbKey = getDbKeyForWorkspace(targetWorkspaceId)
    localStorage.setItem(dbKey, text)
    return targetWorkspaceId
  } else {
    // Create new workspace from import
    const name = file.name.replace(/\.hmsdb$/, '').replace(/^hms-backup-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/-/g, ' ')
    const ws = createWorkspace(name || 'Import')
    localStorage.setItem(getDbKeyForWorkspace(ws.id), text)
    return ws.id
  }
}

// ── Storage info ──

export function getStorageUsage() {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('hms-')) {
      total += (localStorage.getItem(key) || '').length
    }
  }
  return {
    bytes: total * 2, // UTF-16
    formatted: formatBytes(total * 2),
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

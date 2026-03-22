/**
 * Multi-workspace & snapshot manager.
 *
 * Uses the storage abstraction layer (storage.js) which handles
 * filesystem (Tauri desktop) or localStorage (browser dev) transparently.
 *
 * Data stored:
 *   workspaces.json         — workspace registry
 *   snapshots.json          — snapshot/backup registry
 *   backup-settings.json    — configurable backup limit
 *   db/{workspaceId}.db     — workspace SQLite binaries
 *   snapshots/{id}.db       — named snapshots
 *   backups/{id}.db         — auto-backups
 */

import {
  readJSON,
  writeJSON,
  saveDB,
  loadDB,
  removeDB,
  existsDB,
  getStorageBytes,
} from './storage'

const DEFAULT_MAX_AUTO_BACKUPS = 5
const AUTO_BACKUP_DEBOUNCE_MS = 30_000 // 30 seconds

let lastAutoBackupTime = 0

// ── In-memory cache for registries (avoid async reads on every call) ──

let _workspaceCache = null
let _snapshotCache = null
let _settingsCache = null

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

// ── Registry I/O (cached, async write-through) ──

async function loadRegistry() {
  if (_workspaceCache) return _workspaceCache
  const data = await readJSON('workspaces')
  _workspaceCache = data || { workspaces: [], activeId: null }
  return _workspaceCache
}

function getRegistrySync() {
  // Returns cached version — must have been loaded first via loadRegistry()
  return _workspaceCache || { workspaces: [], activeId: null }
}

async function saveRegistry(registry) {
  _workspaceCache = registry
  await writeJSON('workspaces', registry)
}

async function loadSnapshotRegistry() {
  if (_snapshotCache) return _snapshotCache
  const data = await readJSON('snapshots')
  _snapshotCache = data || []
  return _snapshotCache
}

function getSnapshotRegistrySync() {
  return _snapshotCache || []
}

async function saveSnapshotRegistry(snapshots) {
  _snapshotCache = snapshots
  await writeJSON('snapshots', snapshots)
}

// ── Init (must be called once at startup) ──

export async function initManager() {
  await loadRegistry()
  await loadSnapshotRegistry()
  const settings = await readJSON('backup-settings')
  _settingsCache = settings || { maxAutoBackups: DEFAULT_MAX_AUTO_BACKUPS }
}

// ── Workspaces ──

export function getWorkspaces() {
  return getRegistrySync().workspaces
}

export function getActiveWorkspaceId() {
  return getRegistrySync().activeId
}

export function getActiveWorkspace() {
  const reg = getRegistrySync()
  return reg.workspaces.find((w) => w.id === reg.activeId) || null
}

/**
 * Create a new workspace. Returns the new workspace object.
 * Does NOT switch to it automatically.
 */
export async function createWorkspace(name, options = {}) {
  const reg = getRegistrySync()
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

  await saveRegistry(reg)
  return ws
}

/**
 * Switch active workspace.
 */
export async function switchWorkspace(workspaceId) {
  const reg = getRegistrySync()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  if (!ws) throw new Error(`Workspace ${workspaceId} not found`)

  const prev = reg.workspaces.find((w) => w.id === reg.activeId)
  if (prev) prev.lastUsed = new Date().toISOString()

  reg.activeId = workspaceId
  ws.lastUsed = new Date().toISOString()
  await saveRegistry(reg)
}

export async function renameWorkspace(workspaceId, newName) {
  const reg = getRegistrySync()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  if (ws) {
    ws.name = newName
    await saveRegistry(reg)
  }
}

export async function updateWorkspaceColor(workspaceId, color) {
  const reg = getRegistrySync()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  if (ws) {
    ws.color = color
    await saveRegistry(reg)
  }
}

export async function deleteWorkspace(workspaceId) {
  const reg = getRegistrySync()
  if (reg.workspaces.length <= 1) {
    throw new Error('Impossible de supprimer le dernier espace de travail')
  }
  reg.workspaces = reg.workspaces.filter((w) => w.id !== workspaceId)

  // Remove DB data
  await removeDB('db', workspaceId)

  // Remove associated snapshots
  const snapshots = getSnapshotRegistrySync()
  const toRemove = snapshots.filter((s) => s.workspaceId === workspaceId)
  for (const s of toRemove) {
    if (s.isAuto) {
      await removeDB('backups', s.id)
    } else {
      await removeDB('snapshots', s.id)
    }
  }
  await saveSnapshotRegistry(snapshots.filter((s) => s.workspaceId !== workspaceId))

  if (reg.activeId === workspaceId) {
    reg.activeId = reg.workspaces[0]?.id || null
  }

  await saveRegistry(reg)
  return reg.activeId
}

/**
 * Ensure at least one default workspace exists.
 * Called on first launch. Returns the active workspace id.
 */
export async function ensureDefaultWorkspace() {
  const reg = getRegistrySync()

  if (reg.workspaces.length === 0) {
    const ws = await createWorkspace('Principal')
    return ws.id
  }

  if (!reg.activeId) {
    reg.activeId = reg.workspaces[0].id
    await saveRegistry(reg)
  }

  return reg.activeId
}

// ── Snapshots ──

/**
 * Create a named snapshot of a workspace DB.
 */
export async function createSnapshot(workspaceId, name) {
  const dbData = await loadDB('db', workspaceId)
  if (!dbData) return null

  const id = generateId()
  const snapshot = {
    id,
    workspaceId,
    name,
    createdAt: new Date().toISOString(),
    size: dbData.length,
  }

  await saveDB('snapshots', id, dbData)

  const snapshots = getSnapshotRegistrySync()
  snapshots.unshift(snapshot)
  await saveSnapshotRegistry(snapshots)

  return snapshot
}

/**
 * Get all snapshots, optionally filtered by workspace.
 */
export function getSnapshots(workspaceId = null) {
  const snapshots = getSnapshotRegistrySync()
  if (workspaceId) return snapshots.filter((s) => s.workspaceId === workspaceId)
  return snapshots
}

/**
 * Restore a snapshot. Overwrites the workspace DB.
 */
export async function restoreSnapshot(snapshotId) {
  const snapshots = getSnapshotRegistrySync()
  const snap = snapshots.find((s) => s.id === snapshotId)
  if (!snap) throw new Error('Snapshot not found')

  const category = snap.isAuto ? 'backups' : 'snapshots'
  const data = await loadDB(category, snapshotId)
  if (!data) throw new Error('Snapshot data missing')

  await saveDB('db', snap.workspaceId, data)
  return snap.workspaceId
}

export async function deleteSnapshot(snapshotId) {
  const snapshots = getSnapshotRegistrySync()
  const snap = snapshots.find((s) => s.id === snapshotId)
  if (snap) {
    if (snap.isAuto) {
      await removeDB('backups', snapshotId)
    } else {
      await removeDB('snapshots', snapshotId)
    }
  }
  await saveSnapshotRegistry(snapshots.filter((s) => s.id !== snapshotId))
}

// ── Backup settings ──

export function getBackupSettings() {
  return _settingsCache || { maxAutoBackups: DEFAULT_MAX_AUTO_BACKUPS }
}

export async function setBackupSettings(settings) {
  const current = getBackupSettings()
  _settingsCache = { ...current, ...settings }
  await writeJSON('backup-settings', _settingsCache)

  if (settings.maxAutoBackups !== undefined) {
    await pruneAutoBackups(null, _settingsCache.maxAutoBackups)
  }
}

async function pruneAutoBackups(workspaceId, max) {
  const snapshots = getSnapshotRegistrySync()
  const auto = workspaceId
    ? snapshots.filter((s) => s.isAuto && s.workspaceId === workspaceId)
    : snapshots.filter((s) => s.isAuto)

  const byWs = {}
  auto.forEach((s) => {
    if (!byWs[s.workspaceId]) byWs[s.workspaceId] = []
    byWs[s.workspaceId].push(s)
  })

  const toRemoveIds = new Set()
  for (const wsBackups of Object.values(byWs)) {
    if (wsBackups.length > max) {
      for (const s of wsBackups.slice(max)) {
        await removeDB('backups', s.id)
        toRemoveIds.add(s.id)
      }
    }
  }

  if (toRemoveIds.size > 0) {
    await saveSnapshotRegistry(snapshots.filter((s) => !toRemoveIds.has(s.id)))
  }
}

// ── Auto-backups (before destructive ops) ──

/**
 * Create an auto-backup before destructive operations.
 * Debounced: skips if last backup was < 30s ago.
 */
export async function autoBackup(workspaceId) {
  const now = Date.now()
  if (now - lastAutoBackupTime < AUTO_BACKUP_DEBOUNCE_MS) return
  lastAutoBackupTime = now

  const dbData = await loadDB('db', workspaceId)
  if (!dbData) return

  const { maxAutoBackups } = getBackupSettings()
  if (maxAutoBackups <= 0) return

  const id = generateId()
  const date = new Date()
  const label = `Auto · ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

  await saveDB('backups', id, dbData)

  const snapshots = getSnapshotRegistrySync()
  snapshots.unshift({
    id,
    workspaceId,
    name: label,
    createdAt: date.toISOString(),
    size: dbData.length,
    isAuto: true,
  })
  await saveSnapshotRegistry(snapshots)

  await pruneAutoBackups(workspaceId, maxAutoBackups)
}

// ── Export / Import ──

/**
 * Export a workspace DB as a downloadable file.
 */
export async function exportWorkspaceAsFile(workspaceId) {
  const dbData = await loadDB('db', workspaceId)
  if (!dbData) return null

  const reg = getRegistrySync()
  const ws = reg.workspaces.find((w) => w.id === workspaceId)
  const name = ws?.name || 'workspace'

  const blob = new Blob([dbData], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mongouvernail-${name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.mgdb`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Import a workspace from a .mgdb file.
 */
export async function importWorkspaceFromFile(file, targetWorkspaceId = null) {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)

  if (targetWorkspaceId) {
    await saveDB('db', targetWorkspaceId, data)
    return targetWorkspaceId
  } else {
    const name = file.name
      .replace(/\.(mgdb|hmsdb)$/, '')
      .replace(/^(mongouvernail|hms-backup)-/, '')
      .replace(/-\d{4}-\d{2}-\d{2}$/, '')
      .replace(/-/g, ' ')
    const ws = await createWorkspace(name || 'Import')
    await saveDB('db', ws.id, data)
    return ws.id
  }
}

// ── Storage info ──

export async function getStorageUsage() {
  const bytes = await getStorageBytes()
  return {
    bytes,
    formatted: formatBytes(bytes),
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

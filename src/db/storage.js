/**
 * Storage abstraction layer.
 *
 * In Tauri (desktop):  reads/writes files under AppData dir on disk.
 * In browser (dev):    falls back to localStorage.
 *
 * All operations are async. Binary data (DB files) is stored as raw bytes
 * on disk but as base64 data URLs in localStorage for backwards compat.
 *
 * Directory structure (Tauri):
 *   {appDataDir}/
 *     workspaces.json
 *     snapshots.json
 *     backup-settings.json
 *     db/{workspaceId}.db
 *     snapshots/{snapshotId}.db
 *     backups/{backupId}.db
 */

let fs = null
let path = null
let isTauri = false
let appDataPath = null
let ready = false

/**
 * Initialize the storage layer. Must be called once at startup.
 */
export async function initStorage() {
  if (ready) return

  try {
    // Detect Tauri environment
    if (window.__TAURI_INTERNALS__) {
      fs = await import('@tauri-apps/plugin-fs')
      path = await import('@tauri-apps/api/path')
      appDataPath = await path.appDataDir()
      isTauri = true

      // Ensure directory structure exists
      await ensureDir('')
      await ensureDir('db')
      await ensureDir('snapshots')
      await ensureDir('backups')

      console.log('[Storage] Tauri filesystem mode:', appDataPath)
    } else {
      console.log('[Storage] Browser localStorage mode')
    }
  } catch (err) {
    console.warn('[Storage] Tauri init failed, falling back to localStorage:', err)
    isTauri = false
  }

  ready = true
}

export function isDesktopMode() {
  return isTauri
}

// ── Directory helpers ──

async function ensureDir(subPath) {
  if (!isTauri) return
  try {
    const dirPath = subPath ? `${appDataPath}/${subPath}` : appDataPath
    await fs.mkdir(dirPath, { recursive: true })
  } catch (err) {
    // Directory may already exist
    if (!err.message?.includes('already exists')) {
      console.warn('[Storage] mkdir error:', subPath, err)
    }
  }
}

function getFilePath(subPath) {
  return `${appDataPath}/${subPath}`
}

// ── JSON storage (registry, settings, etc.) ──

/**
 * Read a JSON file. Returns null if not found.
 */
export async function readJSON(key) {
  if (isTauri) {
    try {
      const filePath = getFilePath(`${key}.json`)
      const content = await fs.readTextFile(filePath)
      return JSON.parse(content)
    } catch {
      return null
    }
  } else {
    try {
      const raw = localStorage.getItem(`hms-${key}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
}

/**
 * Write a JSON file.
 */
export async function writeJSON(key, data) {
  if (isTauri) {
    const filePath = getFilePath(`${key}.json`)
    await fs.writeTextFile(filePath, JSON.stringify(data, null, 2))
  } else {
    localStorage.setItem(`hms-${key}`, JSON.stringify(data))
  }
}

/**
 * Delete a JSON file.
 */
export async function removeJSON(key) {
  if (isTauri) {
    try {
      await fs.remove(getFilePath(`${key}.json`))
    } catch {}
  } else {
    localStorage.removeItem(`hms-${key}`)
  }
}

// ── Binary DB storage ──

/**
 * Save a SQLite database binary (Uint8Array) to storage.
 * @param {string} category - 'db', 'snapshots', or 'backups'
 * @param {string} id - the workspace/snapshot/backup ID
 * @param {Uint8Array} data - raw SQLite binary
 */
export async function saveDB(category, id, data) {
  if (isTauri) {
    const filePath = getFilePath(`${category}/${id}.db`)
    await fs.writeFile(filePath, data)
  } else {
    // Store as base64 data URL for localStorage compat
    const base64 = uint8ArrayToBase64DataUrl(data)
    localStorage.setItem(`hms-${category}-${id}`, base64)
  }
}

/**
 * Load a SQLite database binary from storage.
 * @param {string} category - 'db', 'snapshots', or 'backups'
 * @param {string} id - the workspace/snapshot/backup ID
 * @returns {Uint8Array|null}
 */
export async function loadDB(category, id) {
  if (isTauri) {
    try {
      const filePath = getFilePath(`${category}/${id}.db`)
      return await fs.readFile(filePath)
    } catch {
      return null
    }
  } else {
    const saved = localStorage.getItem(`hms-${category}-${id}`)
    if (!saved) return null
    return base64DataUrlToUint8Array(saved)
  }
}

/**
 * Delete a stored DB file.
 */
export async function removeDB(category, id) {
  if (isTauri) {
    try {
      await fs.remove(getFilePath(`${category}/${id}.db`))
    } catch {}
  } else {
    localStorage.removeItem(`hms-${category}-${id}`)
  }
}

/**
 * Check if a DB file exists.
 */
export async function existsDB(category, id) {
  if (isTauri) {
    try {
      return await fs.exists(getFilePath(`${category}/${id}.db`))
    } catch {
      return false
    }
  } else {
    return localStorage.getItem(`hms-${category}-${id}`) !== null
  }
}

// ── Storage usage ──

/**
 * Get total storage usage for MonGouvernail data.
 */
export async function getStorageBytes() {
  if (isTauri) {
    let total = 0
    for (const dir of ['db', 'snapshots', 'backups']) {
      try {
        const entries = await fs.readDir(getFilePath(dir))
        for (const entry of entries) {
          if (entry.name?.endsWith('.db')) {
            try {
              const stat = await fs.stat(getFilePath(`${dir}/${entry.name}`))
              total += stat.size || 0
            } catch {}
          }
        }
      } catch {}
    }
    // Add JSON config files
    for (const file of ['workspaces.json', 'snapshots.json', 'backup-settings.json']) {
      try {
        const stat = await fs.stat(getFilePath(file))
        total += stat.size || 0
      } catch {}
    }
    return total
  } else {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('hms-')) {
        total += (localStorage.getItem(key) || '').length * 2 // UTF-16
      }
    }
    return total
  }
}

// ── Migration: localStorage → filesystem ──

/**
 * Migrate all MonGouvernail data from localStorage to filesystem.
 * Called once after Tauri is detected. Reads old keys, writes to disk, removes old keys.
 */
export async function migrateFromLocalStorage() {
  if (!isTauri) return false

  // Check if migration already done
  const marker = await readJSON('migrated')
  if (marker?.done) return false

  console.log('[Storage] Starting migration from localStorage to filesystem...')
  let migrated = false

  // 1. Migrate registry (workspaces)
  const oldRegistry = localStorage.getItem('hms-workspaces')
  if (oldRegistry) {
    await writeJSON('workspaces', JSON.parse(oldRegistry))
    localStorage.removeItem('hms-workspaces')
    migrated = true
    console.log('[Storage] Migrated workspace registry')
  }

  // 2. Migrate snapshots registry
  const oldSnapshots = localStorage.getItem('hms-snapshots')
  if (oldSnapshots) {
    await writeJSON('snapshots', JSON.parse(oldSnapshots))
    localStorage.removeItem('hms-snapshots')
    migrated = true
  }

  // 3. Migrate backup settings
  const oldSettings = localStorage.getItem('hms-backup-settings')
  if (oldSettings) {
    await writeJSON('backup-settings', JSON.parse(oldSettings))
    localStorage.removeItem('hms-backup-settings')
    migrated = true
  }

  // 4. Migrate workspace DBs (hms-db-{id})
  const dbKeys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('hms-db-')) dbKeys.push(key)
  }
  for (const key of dbKeys) {
    const id = key.replace('hms-db-', '')
    const data = localStorage.getItem(key)
    if (data) {
      const bytes = base64DataUrlToUint8Array(data)
      if (bytes) {
        await saveDB('db', id, bytes)
        localStorage.removeItem(key)
        migrated = true
        console.log('[Storage] Migrated workspace DB:', id)
      }
    }
  }

  // 5. Migrate snapshots (hms-snap-{id})
  const snapKeys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('hms-snap-')) snapKeys.push(key)
  }
  for (const key of snapKeys) {
    const id = key.replace('hms-snap-', '')
    const data = localStorage.getItem(key)
    if (data) {
      const bytes = base64DataUrlToUint8Array(data)
      if (bytes) {
        await saveDB('snapshots', id, bytes)
        localStorage.removeItem(key)
        migrated = true
      }
    }
  }

  // 6. Migrate auto-backups (hms-autobackup-{id})
  const backupKeys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('hms-autobackup-')) backupKeys.push(key)
  }
  for (const key of backupKeys) {
    const id = key.replace('hms-autobackup-', '')
    const data = localStorage.getItem(key)
    if (data) {
      const bytes = base64DataUrlToUint8Array(data)
      if (bytes) {
        await saveDB('backups', id, bytes)
        localStorage.removeItem(key)
        migrated = true
      }
    }
  }

  // 7. Migrate pre-workspace era data (mongouvernail-sqlite)
  const legacyData = localStorage.getItem('mongouvernail-sqlite')
  if (legacyData) {
    // This will be handled by dbManager.ensureDefaultWorkspace later
    // Just leave it for now, dbManager will pick it up
    console.log('[Storage] Found legacy mongouvernail-sqlite key, will migrate on next init')
  }

  // Mark migration as complete
  await writeJSON('migrated', { done: true, date: new Date().toISOString() })

  if (migrated) {
    console.log('[Storage] Migration complete!')
  } else {
    console.log('[Storage] No localStorage data to migrate (fresh install)')
  }

  return migrated
}

// ── Encoding helpers ──

function uint8ArrayToBase64DataUrl(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return 'data:application/octet-stream;base64,' + btoa(binary)
}

function base64DataUrlToUint8Array(dataUrl) {
  try {
    const base64 = dataUrl.split(',')[1]
    if (!base64) return null
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

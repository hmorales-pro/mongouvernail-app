import initSqlJs from 'sql.js'
import { saveDB, loadDB } from './storage'
import { ensureDefaultWorkspace } from './dbManager'

let db = null
let SQL = null
let currentWorkspaceId = null

// Debounced flush: after each write, schedule a save to disk
let flushTimer = null
const FLUSH_DELAY = 500 // ms — batches rapid writes

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    type TEXT DEFAULT 'Freelance',
    statut TEXT DEFAULT 'Actif',
    contact_nom TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    contact_telephone TEXT DEFAULT '',
    derniere_interaction TEXT,
    prochain_jalon_texte TEXT DEFAULT '',
    prochain_jalon_date TEXT,
    notes TEXT DEFAULT '',
    solde_a_encaisser REAL DEFAULT 0,
    tags TEXT DEFAULT '[]',
    deleted_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    client_id TEXT,
    categorie TEXT DEFAULT 'Produit SaaS',
    statut TEXT DEFAULT 'Idée',
    priorite TEXT DEFAULT 'P2',
    notes TEXT DEFAULT '',
    couleur TEXT DEFAULT '#3B82F6',
    deadline TEXT,
    deleted_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    titre TEXT NOT NULL,
    projet_id TEXT,
    client_id TEXT,
    priorite TEXT DEFAULT 'Normal',
    statut TEXT DEFAULT 'À faire',
    date_echeance TEXT,
    tags TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    est_revenus_lie INTEGER DEFAULT 0,
    deleted_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (projet_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS transactions_table (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    projet_id TEXT,
    type TEXT DEFAULT 'Facture',
    montant_ht REAL DEFAULT 0,
    montant_ttc REAL DEFAULT 0,
    statut TEXT DEFAULT 'À émettre',
    date_emission TEXT,
    date_echeance TEXT,
    date_encaissement TEXT,
    reference TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    deleted_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (projet_id) REFERENCES projects(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    titre TEXT NOT NULL,
    projet_id TEXT,
    type TEXT DEFAULT 'CUSTOM',
    valeur_cible REAL DEFAULT 0,
    valeur_actuelle REAL DEFAULT 0,
    unite TEXT DEFAULT '',
    periode_valeur INTEGER DEFAULT 0,
    periode_unite TEXT DEFAULT 'jours',
    date_debut TEXT,
    date_fin TEXT,
    statut TEXT DEFAULT 'Actif',
    notes TEXT DEFAULT '',
    deleted_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (projet_id) REFERENCES projects(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`

// Migration: add deleted_at column to existing tables that don't have it
const MIGRATIONS = [
  "ALTER TABLE clients ADD COLUMN deleted_at TEXT DEFAULT NULL",
  "ALTER TABLE projects ADD COLUMN deleted_at TEXT DEFAULT NULL",
  "ALTER TABLE tasks ADD COLUMN deleted_at TEXT DEFAULT NULL",
  "ALTER TABLE transactions_table ADD COLUMN deleted_at TEXT DEFAULT NULL",
  "ALTER TABLE goals ADD COLUMN deleted_at TEXT DEFAULT NULL",
]

function runMigrations() {
  if (!db) return
  for (const sql of MIGRATIONS) {
    try {
      db.run(sql)
    } catch {
      // Column likely already exists, ignore
    }
  }
}

// ── Persistence ──

/**
 * Schedule a flush to persistent storage (debounced).
 * Called automatically after each write operation.
 */
function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushToDisk()
  }, FLUSH_DELAY)
}

/**
 * Immediately flush current DB to persistent storage.
 * Returns a promise. Use this when you need to guarantee data is saved
 * (e.g., before switching workspace).
 */
export async function flushToDisk(targetWorkspaceId = null) {
  if (!db) return
  const wsId = targetWorkspaceId || currentWorkspaceId
  if (!wsId) return
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const data = db.export()
  const buffer = new Uint8Array(data)
  await saveDB('db', wsId, buffer)
}

/**
 * Synchronous persist: exports the DB and saves it immediately.
 * Uses the storage layer which handles both Tauri (fs) and browser (localStorage).
 * Since saveDB is async, this schedules an immediate flush.
 */
export function persist() {
  scheduleFlush()
}

/**
 * Synchronous persist that blocks until complete.
 * For use in critical paths (seeding demo data before switching workspace).
 */
export async function persistSync() {
  await flushToDisk()
}

// ── Init ──

export async function initDB(workspaceId = null) {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  }

  // Ensure default workspace exists
  const activeId = workspaceId || await ensureDefaultWorkspace()
  currentWorkspaceId = activeId

  // Load or create DB
  const saved = await loadDB('db', activeId)
  if (saved) {
    db = new SQL.Database(saved)
    db.run(SCHEMA) // Ensure new tables exist
    runMigrations()
  } else {
    db = new SQL.Database()
    db.run(SCHEMA)
  }

  await flushToDisk()
  return db
}

/**
 * Switch to a different workspace DB.
 */
export async function switchDB(workspaceId) {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  }

  // Save current DB before switching
  if (db && currentWorkspaceId) {
    await flushToDisk()
  }

  currentWorkspaceId = workspaceId

  const saved = await loadDB('db', workspaceId)
  if (saved) {
    db = new SQL.Database(saved)
    db.run(SCHEMA)
    runMigrations()
  } else {
    db = new SQL.Database()
    db.run(SCHEMA)
  }

  await flushToDisk()
  return db
}

export function getDB() {
  return db
}

export function getCurrentWorkspaceId() {
  return currentWorkspaceId
}

// ── Generic helpers ──

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
}

function rowsToObjects(stmt) {
  const cols = stmt.getColumnNames()
  const results = []
  while (stmt.step()) {
    const row = stmt.get()
    const obj = {}
    cols.forEach((c, i) => {
      obj[c] = row[i]
    })
    results.push(obj)
  }
  stmt.free()
  return results
}

function queryAll(sql, params = []) {
  if (!db) return []
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  return rowsToObjects(stmt)
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows[0] || null
}

function run(sql, params = []) {
  if (!db) return
  db.run(sql, params)
  persist() // schedules debounced flush
}

// ── Clients ──

function mapClient(c) {
  return {
    ...c,
    tags: JSON.parse(c.tags || '[]'),
    contact_principal: {
      nom: c.contact_nom,
      email: c.contact_email,
      telephone: c.contact_telephone,
    },
    prochain_jalon: c.prochain_jalon_texte
      ? { texte: c.prochain_jalon_texte, date: c.prochain_jalon_date }
      : null,
  }
}

export const clientsDB = {
  getAll() {
    return queryAll('SELECT * FROM clients WHERE deleted_at IS NULL ORDER BY nom').map(mapClient)
  },
  getById(id) {
    const c = queryOne('SELECT * FROM clients WHERE id = ? AND deleted_at IS NULL', [id])
    return c ? mapClient(c) : null
  },
  add(client) {
    const id = client.id || generateId()
    run(
      `INSERT INTO clients (id, nom, type, statut, contact_nom, contact_email, contact_telephone,
        derniere_interaction, prochain_jalon_texte, prochain_jalon_date, notes, solde_a_encaisser, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        client.nom,
        client.type || 'Freelance',
        client.statut || 'Actif',
        client.contact_principal?.nom || '',
        client.contact_principal?.email || '',
        client.contact_principal?.telephone || '',
        client.derniere_interaction || null,
        client.prochain_jalon?.texte || '',
        client.prochain_jalon?.date || null,
        client.notes || '',
        client.solde_a_encaisser || 0,
        JSON.stringify(client.tags || []),
      ]
    )
    return id
  },
  update(id, data) {
    const fields = []
    const values = []
    const map = {
      nom: 'nom', type: 'type', statut: 'statut',
      derniere_interaction: 'derniere_interaction',
      notes: 'notes', solde_a_encaisser: 'solde_a_encaisser',
    }
    Object.entries(map).forEach(([jsKey, dbKey]) => {
      if (data[jsKey] !== undefined) {
        fields.push(`${dbKey} = ?`)
        values.push(data[jsKey])
      }
    })
    if (data.contact_principal) {
      if (data.contact_principal.nom !== undefined) { fields.push('contact_nom = ?'); values.push(data.contact_principal.nom) }
      if (data.contact_principal.email !== undefined) { fields.push('contact_email = ?'); values.push(data.contact_principal.email) }
      if (data.contact_principal.telephone !== undefined) { fields.push('contact_telephone = ?'); values.push(data.contact_principal.telephone) }
    }
    if (data.prochain_jalon) {
      fields.push('prochain_jalon_texte = ?'); values.push(data.prochain_jalon.texte || '')
      fields.push('prochain_jalon_date = ?'); values.push(data.prochain_jalon.date || null)
    }
    if (data.tags) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)) }
    if (fields.length === 0) return
    fields.push("updated_at = datetime('now')")
    values.push(id)
    run(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values)
  },
  softDelete(id) {
    run("UPDATE clients SET deleted_at = datetime('now') WHERE id = ?", [id])
  },
  restore(id) {
    run("UPDATE clients SET deleted_at = NULL WHERE id = ?", [id])
  },
  purge(id) {
    run('DELETE FROM clients WHERE id = ?', [id])
  },
  markContacted(id) {
    run("UPDATE clients SET derniere_interaction = date('now'), updated_at = datetime('now') WHERE id = ?", [id])
  },
}

// ── Projects ──

export const projectsDB = {
  getAll() {
    return queryAll('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY priorite, nom')
  },
  getById(id) {
    return queryOne('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL', [id])
  },
  getByClient(clientId) {
    return queryAll('SELECT * FROM projects WHERE client_id = ? AND deleted_at IS NULL', [clientId])
  },
  add(project) {
    const id = project.id || generateId()
    run(
      `INSERT INTO projects (id, nom, client_id, categorie, statut, priorite, notes, couleur, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, project.nom, project.client_id || null,
        project.categorie || 'Produit SaaS', project.statut || 'Idée',
        project.priorite || 'P2', project.notes || '',
        project.couleur || '#3B82F6', project.deadline || null,
      ]
    )
    return id
  },
  update(id, data) {
    const fields = []
    const values = []
    ;['nom', 'client_id', 'categorie', 'statut', 'priorite', 'notes', 'couleur', 'deadline'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push(data[key])
      }
    })
    if (fields.length === 0) return
    fields.push("updated_at = datetime('now')")
    values.push(id)
    run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values)
  },
  softDelete(id) {
    run("UPDATE projects SET deleted_at = datetime('now') WHERE id = ?", [id])
  },
  restore(id) {
    run("UPDATE projects SET deleted_at = NULL WHERE id = ?", [id])
  },
  purge(id) {
    run('DELETE FROM projects WHERE id = ?', [id])
  },
}

// ── Tasks ──

function mapTask(t) {
  return {
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    est_revenus_lie: !!t.est_revenus_lie,
  }
}

export const tasksDB = {
  getAll() {
    return queryAll('SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC').map(mapTask)
  },
  getByProject(projectId) {
    return queryAll('SELECT * FROM tasks WHERE projet_id = ? AND deleted_at IS NULL', [projectId]).map(mapTask)
  },
  getByClient(clientId) {
    return queryAll('SELECT * FROM tasks WHERE client_id = ? AND deleted_at IS NULL', [clientId]).map(mapTask)
  },
  add(task) {
    const id = task.id || generateId()
    run(
      `INSERT INTO tasks (id, titre, projet_id, client_id, priorite, statut, date_echeance, tags, notes, est_revenus_lie)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, task.titre, task.projet_id || null, task.client_id || null,
        task.priorite || 'Normal', task.statut || 'À faire',
        task.date_echeance || null, JSON.stringify(task.tags || []),
        task.notes || '', task.est_revenus_lie ? 1 : 0,
      ]
    )
    return id
  },
  update(id, data) {
    const fields = []
    const values = []
    ;['titre', 'projet_id', 'client_id', 'priorite', 'statut', 'date_echeance', 'notes'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push(data[key])
      }
    })
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)) }
    if (data.est_revenus_lie !== undefined) { fields.push('est_revenus_lie = ?'); values.push(data.est_revenus_lie ? 1 : 0) }
    if (fields.length === 0) return
    fields.push("updated_at = datetime('now')")
    values.push(id)
    run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
  },
  softDelete(id) {
    run("UPDATE tasks SET deleted_at = datetime('now') WHERE id = ?", [id])
  },
  restore(id) {
    run("UPDATE tasks SET deleted_at = NULL WHERE id = ?", [id])
  },
  purge(id) {
    run('DELETE FROM tasks WHERE id = ?', [id])
  },
}

// ── Transactions ──

export const transactionsDB = {
  getAll() {
    return queryAll('SELECT * FROM transactions_table WHERE deleted_at IS NULL ORDER BY date_emission DESC')
  },
  getByClient(clientId) {
    return queryAll('SELECT * FROM transactions_table WHERE client_id = ? AND deleted_at IS NULL', [clientId])
  },
  getByProject(projectId) {
    return queryAll('SELECT * FROM transactions_table WHERE projet_id = ? AND deleted_at IS NULL', [projectId])
  },
  add(tx) {
    const id = tx.id || generateId()
    run(
      `INSERT INTO transactions_table (id, client_id, projet_id, type, montant_ht, montant_ttc, statut,
        date_emission, date_echeance, date_encaissement, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, tx.client_id || null, tx.projet_id || null,
        tx.type || 'Facture', tx.montant_ht || 0, tx.montant_ttc || 0,
        tx.statut || 'À émettre', tx.date_emission || null,
        tx.date_echeance || null, tx.date_encaissement || null,
        tx.reference || '', tx.notes || '',
      ]
    )
    return id
  },
  update(id, data) {
    const fields = []
    const values = []
    ;['client_id', 'projet_id', 'type', 'montant_ht', 'montant_ttc', 'statut',
      'date_emission', 'date_echeance', 'date_encaissement', 'reference', 'notes'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push(data[key])
      }
    })
    if (fields.length === 0) return
    fields.push("updated_at = datetime('now')")
    values.push(id)
    run(`UPDATE transactions_table SET ${fields.join(', ')} WHERE id = ?`, values)
  },
  softDelete(id) {
    run("UPDATE transactions_table SET deleted_at = datetime('now') WHERE id = ?", [id])
  },
  restore(id) {
    run("UPDATE transactions_table SET deleted_at = NULL WHERE id = ?", [id])
  },
  purge(id) {
    run('DELETE FROM transactions_table WHERE id = ?', [id])
  },
}

// ── Goals ──

export const goalsDB = {
  getAll() {
    return queryAll('SELECT * FROM goals WHERE deleted_at IS NULL ORDER BY created_at DESC')
  },
  getActive() {
    return queryAll("SELECT * FROM goals WHERE statut = 'Actif' AND deleted_at IS NULL ORDER BY created_at DESC")
  },
  getByProject(projectId) {
    return queryAll('SELECT * FROM goals WHERE projet_id = ? AND deleted_at IS NULL', [projectId])
  },
  getById(id) {
    return queryOne('SELECT * FROM goals WHERE id = ? AND deleted_at IS NULL', [id])
  },
  add(goal) {
    const id = goal.id || generateId()
    run(
      `INSERT INTO goals (id, titre, projet_id, type, valeur_cible, valeur_actuelle, unite,
        periode_valeur, periode_unite, date_debut, date_fin, statut, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, goal.titre, goal.projet_id || null,
        goal.type || 'CUSTOM', goal.valeur_cible || 0, goal.valeur_actuelle || 0,
        goal.unite || '', goal.periode_valeur || 0, goal.periode_unite || 'jours',
        goal.date_debut || null, goal.date_fin || null,
        goal.statut || 'Actif', goal.notes || '',
      ]
    )
    return id
  },
  update(id, data) {
    const fields = []
    const values = []
    ;['titre', 'projet_id', 'type', 'valeur_cible', 'valeur_actuelle', 'unite',
      'periode_valeur', 'periode_unite', 'date_debut', 'date_fin', 'statut', 'notes'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push(data[key])
      }
    })
    if (fields.length === 0) return
    fields.push("updated_at = datetime('now')")
    values.push(id)
    run(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`, values)
  },
  updateValue(id, value) {
    run("UPDATE goals SET valeur_actuelle = ?, updated_at = datetime('now') WHERE id = ?", [value, id])
  },
  softDelete(id) {
    run("UPDATE goals SET deleted_at = datetime('now') WHERE id = ?", [id])
  },
  restore(id) {
    run("UPDATE goals SET deleted_at = NULL WHERE id = ?", [id])
  },
  purge(id) {
    run('DELETE FROM goals WHERE id = ?', [id])
  },
}

// ── Trash (cross-table) ──

export const trashDB = {
  getAll() {
    const clients = queryAll("SELECT *, 'client' as _type FROM clients WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
      .map((c) => ({ ...mapClient(c), _type: 'client' }))
    const projects = queryAll("SELECT *, 'project' as _type FROM projects WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
      .map((p) => ({ ...p, _type: 'project' }))
    const tasks = queryAll("SELECT *, 'task' as _type FROM tasks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
      .map((t) => ({ ...mapTask(t), _type: 'task' }))
    const transactions = queryAll("SELECT *, 'transaction' as _type FROM transactions_table WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
      .map((tx) => ({ ...tx, _type: 'transaction' }))
    const goals = queryAll("SELECT *, 'goal' as _type FROM goals WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
      .map((g) => ({ ...g, _type: 'goal' }))

    return [...clients, ...projects, ...tasks, ...transactions, ...goals]
      .sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''))
  },
  getCount() {
    const tables = ['clients', 'projects', 'tasks', 'transactions_table', 'goals']
    let count = 0
    tables.forEach((t) => {
      const row = queryOne(`SELECT COUNT(*) as c FROM ${t} WHERE deleted_at IS NOT NULL`)
      count += row?.c || 0
    })
    return count
  },
  restoreItem(type, id) {
    const tableMap = { client: 'clients', project: 'projects', task: 'tasks', transaction: 'transactions_table', goal: 'goals' }
    const table = tableMap[type]
    if (table) run(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, [id])
  },
  purgeItem(type, id) {
    const tableMap = { client: 'clients', project: 'projects', task: 'tasks', transaction: 'transactions_table', goal: 'goals' }
    const table = tableMap[type]
    if (table) run(`DELETE FROM ${table} WHERE id = ?`, [id])
  },
  emptyTrash() {
    ;['clients', 'projects', 'tasks', 'transactions_table', 'goals'].forEach((t) => {
      run(`DELETE FROM ${t} WHERE deleted_at IS NOT NULL`)
    })
  },
}

// ── Settings ──

export const settingsDB = {
  get(key, defaultValue = null) {
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [key])
    return row ? JSON.parse(row.value) : defaultValue
  },
  set(key, value) {
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)])
  },
}

// ── Export DB as binary ──

export function exportDB() {
  if (!db) return null
  return db.export()
}

// ── Import DB from binary ──

export async function importDB(arrayBuffer) {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  }
  db = new SQL.Database(new Uint8Array(arrayBuffer))
  await flushToDisk()
}

// ── Reset (clear all data in current workspace) ──

export function resetDB() {
  if (!db) return
  db.run('DELETE FROM tasks')
  db.run('DELETE FROM transactions_table')
  db.run('DELETE FROM goals')
  db.run('DELETE FROM projects')
  db.run('DELETE FROM clients')
  db.run('DELETE FROM settings')
  persist()
}

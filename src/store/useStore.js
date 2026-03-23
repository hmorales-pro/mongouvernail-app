import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { initStorage, migrateFromLocalStorage } from '../db/storage'
import {
  initDB,
  switchDB,
  clientsDB,
  projectsDB,
  tasksDB,
  transactionsDB,
  goalsDB,
  documentsDB,
  docFoldersDB,
  trashDB,
  settingsDB,
  resetDB as resetDatabase,
  persist as persistDB,
  persistSync as persistDBSync,
  flushToDisk,
} from '../db/database'
import {
  initManager,
  getWorkspaces,
  getActiveWorkspaceId,
  getActiveWorkspace,
  createWorkspace,
  switchWorkspace as switchWs,
  renameWorkspace,
  updateWorkspaceColor,
  deleteWorkspace as deleteWs,
  ensureDefaultWorkspace,
  createSnapshot,
  getSnapshots,
  restoreSnapshot,
  deleteSnapshot,
  autoBackup,
  exportWorkspaceAsFile,
  importWorkspaceFromFile,
  getStorageUsage,
} from '../db/dbManager'
import { seedData } from '../data/seed'

const useStore = create(
  persist(
    (set, get) => ({
      // ── UI state (persisted via Zustand) ──
      commandPaletteOpen: false,
      theme: 'light',
      focus: '',
      dbReady: false,
      onboardingDone: false,

      // ── User profile (persisted via Zustand — global) ──
      userProfile: {
        prenom: '',
        activite: '',
      },

      // ── Workspace state ──
      workspaces: [],
      activeWorkspaceId: null,
      activeWorkspaceName: '',
      activeWorkspaceColor: '#3B82F6',

      // ── Data (loaded from SQLite — per workspace) ──
      clients: [],
      projects: [],
      tasks: [],
      transactions: [],
      goals: [],
      trashCount: 0,
      documents: [],
      docFolders: [],
      customLists: {},

      // ── Per-workspace preferences (stored in settingsDB) ──
      commandCenterName: 'Command Center',
      notificationSettings: {
        delaiJours: 3,
        dismissedIds: [],
      },
      folderClickMode: 'single',
      enabledModules: {
        clients: true,
        projets: true,
        finances: true,
        objectifs: true,
        taches: true,
        calendrier: true,
        documents: true,
      },

      // ── Personalisation (per workspace → settingsDB) ──
      setCommandCenterName: (name) => {
        settingsDB.set('commandCenterName', name)
        set({ commandCenterName: name })
      },

      // ── Theme (global — Zustand only) ──
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

      // ── Document prefs (per workspace) ──
      setFolderClickMode: (mode) => {
        settingsDB.set('folderClickMode', mode)
        set({ folderClickMode: mode })
      },

      // ── Modules sidebar (per workspace) ──
      toggleModule: (key) => {
        const updated = { ...get().enabledModules, [key]: !get().enabledModules[key] }
        settingsDB.set('enabledModules', updated)
        set({ enabledModules: updated })
      },

      // ── Notifications (per workspace) ──
      setNotificationDelay: (days) => {
        const updated = { ...get().notificationSettings, delaiJours: days }
        settingsDB.set('notificationSettings', updated)
        set({ notificationSettings: updated })
      },
      dismissNotification: (id) => {
        const updated = {
          ...get().notificationSettings,
          dismissedIds: [...(get().notificationSettings.dismissedIds || []), id],
        }
        settingsDB.set('notificationSettings', updated)
        set({ notificationSettings: updated })
      },
      clearDismissed: () => {
        const updated = { ...get().notificationSettings, dismissedIds: [] }
        settingsDB.set('notificationSettings', updated)
        set({ notificationSettings: updated })
      },

      // ── User profile ──
      setUserProfile: (profile) => set((s) => ({ userProfile: { ...s.userProfile, ...profile } })),

      // ── Command Palette ──
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // ── Focus ──
      setFocus: (focus) => {
        settingsDB.set('focus', focus)
        set({ focus })
      },

      // ══════════════════════════
      //  INITIALIZE
      // ══════════════════════════
      initialize: async () => {
        // 1. Init storage layer (detects Tauri vs browser)
        await initStorage()

        // 2. Migrate localStorage → filesystem if running in Tauri for the first time
        await migrateFromLocalStorage()

        // 3. Init workspace manager (loads registries into memory)
        await initManager()

        // 4. Init SQLite DB
        await initDB()

        const focus = settingsDB.get('focus', '')

        get()._refreshAll()
        get()._loadWorkspacePrefs()
        get()._refreshWorkspaces()
        set({ dbReady: true, focus })
      },

      // ── Onboarding ──
      completeOnboarding: async (options = {}) => {
        const { prenom, activite, theme, workspaceName } = options

        if (prenom) set((s) => ({ userProfile: { ...s.userProfile, prenom } }))
        if (activite) set((s) => ({ userProfile: { ...s.userProfile, activite } }))
        if (theme) set({ theme })

        // Rename default workspace if a name was provided
        if (workspaceName) {
          const wsId = getActiveWorkspaceId()
          if (wsId) await renameWorkspace(wsId, workspaceName)
        }

        // Create "Démo" workspace with seed data
        const demoWs = await createWorkspace('Démo', { color: '#F59E0B' })
        await switchWs(demoWs.id)
        await switchDB(demoWs.id)
        get()._seedDatabase()
        await persistDBSync()

        // Switch back to the user's main workspace
        const reg = getWorkspaces()
        const mainWs = reg.find((w) => w.id !== demoWs.id)
        if (mainWs) {
          await switchWs(mainWs.id)
          await switchDB(mainWs.id)
        }

        get()._refreshAll()
        get()._loadWorkspacePrefs()
        get()._refreshWorkspaces()
        set({ onboardingDone: true })
      },

      // ══════════════════════════
      //  WORKSPACES
      // ══════════════════════════
      _refreshWorkspaces: () => {
        const workspaces = getWorkspaces()
        const active = getActiveWorkspace()
        set({
          workspaces,
          activeWorkspaceId: active?.id || null,
          activeWorkspaceName: active?.name || '',
          activeWorkspaceColor: active?.color || '#3B82F6',
        })
      },

      createWorkspace: async (name, options = {}) => {
        const ws = await createWorkspace(name, options)

        // If demo data requested, seed the new workspace
        if (options.withDemoData) {
          const currentWsId = getActiveWorkspaceId()
          await switchWs(ws.id)
          await switchDB(ws.id)
          get()._seedDatabase()
          await persistDBSync()
          // Switch back to current workspace
          await switchWs(currentWsId)
          await switchDB(currentWsId)
        }

        get()._refreshWorkspaces()
        return ws
      },

      switchWorkspace: async (workspaceId) => {
        set({ dbReady: false })
        await switchWs(workspaceId)
        await switchDB(workspaceId)

        const focus = settingsDB.get('focus', '')

        get()._refreshAll()
        get()._loadWorkspacePrefs()
        get()._refreshWorkspaces()
        set({ dbReady: true, focus })
      },

      renameWorkspace: async (id, name) => {
        await renameWorkspace(id, name)
        get()._refreshWorkspaces()
      },

      updateWorkspaceColor: async (id, color) => {
        await updateWorkspaceColor(id, color)
        get()._refreshWorkspaces()
      },

      deleteWorkspace: async (id) => {
        const newActiveId = await deleteWs(id)
        if (newActiveId && newActiveId !== get().activeWorkspaceId) {
          await get().switchWorkspace(newActiveId)
        }
        get()._refreshWorkspaces()
      },

      // ══════════════════════════
      //  SNAPSHOTS
      // ══════════════════════════
      createSnapshot: async (name) => {
        const wsId = getActiveWorkspaceId()
        return await createSnapshot(wsId, name)
      },

      getSnapshots: () => {
        const wsId = getActiveWorkspaceId()
        return getSnapshots(wsId)
      },

      getAllSnapshots: () => getSnapshots(),

      restoreSnapshot: async (snapshotId) => {
        const wsId = await restoreSnapshot(snapshotId)
        await switchDB(wsId)
        get()._refreshAll()
        get()._loadWorkspacePrefs()
      },

      deleteSnapshot: async (id) => {
        await deleteSnapshot(id)
      },

      // ══════════════════════════
      //  EXPORT / IMPORT
      // ══════════════════════════
      exportWorkspace: async () => {
        const wsId = getActiveWorkspaceId()
        await exportWorkspaceAsFile(wsId)
      },

      importWorkspace: async (file, targetId = null) => {
        const wsId = await importWorkspaceFromFile(file, targetId)
        await get().switchWorkspace(wsId)
      },

      getStorageUsage,

      // ══════════════════════════
      //  AUTO-BACKUP
      // ══════════════════════════
      _autoBackup: async () => {
        const wsId = getActiveWorkspaceId()
        if (wsId) {
          // Flush current state to disk first so the backup captures latest
          await flushToDisk()
          await autoBackup(wsId)
        }
      },

      // ── Internal: seed database ──
      _seedDatabase: () => {
        seedData.clients.forEach((c) => clientsDB.add(c))
        seedData.projects.forEach((p) => projectsDB.add(p))
        seedData.tasks.forEach((t) => tasksDB.add(t))
        seedData.transactions.forEach((tx) => transactionsDB.add(tx))

        seedData.projects.forEach((p) => {
          if (p.objectif_custom) {
            goalsDB.add({
              titre: p.nom,
              projet_id: p.id,
              type: p.objectif_custom.type,
              valeur_cible: p.objectif_custom.valeur_cible,
              valeur_actuelle: p.objectif_custom.valeur_actuelle,
              unite: p.objectif_custom.unite,
              periode_valeur: p.objectif_custom.periode_valeur,
              periode_unite: p.objectif_custom.periode_unite,
              date_debut: p.objectif_custom.date_debut,
              date_fin: p.objectif_custom.date_fin || p.deadline,
              statut: 'Actif',
            })
          }
        })
      },

      // ── Internal: load per-workspace preferences from SQLite ──
      _loadWorkspacePrefs: () => {
        const defaults = {
          commandCenterName: 'Command Center',
          folderClickMode: 'single',
          enabledModules: { clients: true, projets: true, finances: true, objectifs: true, taches: true, calendrier: true, documents: true },
          notificationSettings: { delaiJours: 3, dismissedIds: [] },
        }
        set({
          commandCenterName: settingsDB.get('commandCenterName', defaults.commandCenterName),
          folderClickMode: settingsDB.get('folderClickMode', defaults.folderClickMode),
          enabledModules: settingsDB.get('enabledModules', defaults.enabledModules),
          notificationSettings: settingsDB.get('notificationSettings', defaults.notificationSettings),
        })
      },

      // ── Internal: refresh all data from SQLite ──
      _refreshAll: () => {
        set({
          clients: clientsDB.getAll(),
          projects: projectsDB.getAll(),
          tasks: tasksDB.getAll(),
          transactions: transactionsDB.getAll(),
          goals: goalsDB.getAll(),
          documents: documentsDB.getAll(),
          docFolders: docFoldersDB.getAll(),
          trashCount: trashDB.getCount(),
          customLists: settingsDB.get('custom_lists', {}),
        })
      },

      // ── Custom lists ──
      updateCustomList: (listKey, data) => {
        const customLists = { ...get().customLists, [listKey]: data }
        settingsDB.set('custom_lists', customLists)
        persistDB()
        set({ customLists })
      },

      _refreshClients: () => set({ clients: clientsDB.getAll() }),
      _refreshProjects: () => set({ projects: projectsDB.getAll() }),
      _refreshTasks: () => set({ tasks: tasksDB.getAll() }),
      _refreshTransactions: () => set({ transactions: transactionsDB.getAll() }),
      _refreshGoals: () => set({ goals: goalsDB.getAll() }),
      _refreshDocuments: () => set({ documents: documentsDB.getAll(), docFolders: docFoldersDB.getAll() }),
      _refreshTrash: () => set({ trashCount: trashDB.getCount() }),

      // ══════════════════════════
      //  CLIENTS
      // ══════════════════════════
      addClient: (client) => {
        clientsDB.add(client)
        get()._refreshClients()
      },
      updateClient: (id, data) => {
        clientsDB.update(id, data)
        get()._refreshClients()
      },
      deleteClient: async (id) => {
        await get()._autoBackup()
        clientsDB.softDelete(id)
        get()._refreshClients()
        get()._refreshTrash()
      },
      markClientContacted: (id) => {
        clientsDB.markContacted(id)
        get()._refreshClients()
      },

      // ══════════════════════════
      //  PROJECTS
      // ══════════════════════════
      addProject: (project) => {
        projectsDB.add(project)
        get()._refreshProjects()
      },
      updateProject: (id, data) => {
        projectsDB.update(id, data)
        get()._refreshProjects()
      },
      deleteProject: async (id) => {
        await get()._autoBackup()
        projectsDB.softDelete(id)
        get()._refreshProjects()
        get()._refreshTrash()
      },

      // ══════════════════════════
      //  TASKS
      // ══════════════════════════
      addTask: (task) => {
        tasksDB.add(task)
        get()._refreshTasks()
      },
      updateTask: (id, data) => {
        tasksDB.update(id, data)
        get()._refreshTasks()
      },
      deleteTask: async (id) => {
        await get()._autoBackup()
        tasksDB.softDelete(id)
        get()._refreshTasks()
        get()._refreshTrash()
      },

      // ══════════════════════════
      //  TRANSACTIONS
      // ══════════════════════════
      addTransaction: (tx) => {
        transactionsDB.add(tx)
        get()._refreshTransactions()
      },
      updateTransaction: (id, data) => {
        transactionsDB.update(id, data)
        get()._refreshTransactions()
      },
      deleteTransaction: async (id) => {
        await get()._autoBackup()
        transactionsDB.softDelete(id)
        get()._refreshTransactions()
        get()._refreshTrash()
      },

      // ══════════════════════════
      //  DOCUMENTS & FOLDERS
      // ══════════════════════════
      addDocFolder: (folder) => {
        docFoldersDB.add(folder)
        get()._refreshDocuments()
      },
      updateDocFolder: (id, data) => {
        docFoldersDB.update(id, data)
        get()._refreshDocuments()
      },
      deleteDocFolder: (id) => {
        docFoldersDB.remove(id)
        get()._refreshDocuments()
      },
      getDocumentById: (id) => documentsDB.getById(id),
      searchDocuments: (query) => documentsDB.search(query),
      getRecentDocuments: (limit) => documentsDB.getRecent(limit),
      getDocumentsByProject: (projectId) => documentsDB.getByProject(projectId),
      getDocumentsByClient: (clientId) => documentsDB.getByClient(clientId),
      addDocument: (doc) => {
        const id = documentsDB.add(doc)
        get()._refreshDocuments()
        return id
      },
      updateDocument: (id, data) => {
        documentsDB.update(id, data)
        get()._refreshDocuments()
      },
      toggleDocPin: (id) => {
        const doc = documentsDB.getById(id)
        if (doc) {
          documentsDB.update(id, { epingle: !doc.epingle })
          get()._refreshDocuments()
        }
      },
      deleteDocument: async (id) => {
        await get()._autoBackup()
        documentsDB.softDelete(id)
        get()._refreshDocuments()
        get()._refreshTrash()
      },

      // ══════════════════════════
      //  GOALS
      // ══════════════════════════
      addGoal: (goal) => {
        goalsDB.add(goal)
        get()._refreshGoals()
      },
      updateGoal: (id, data) => {
        goalsDB.update(id, data)
        get()._refreshGoals()
      },
      updateGoalValue: (id, value) => {
        goalsDB.updateValue(id, value)
        get()._refreshGoals()
      },
      deleteGoal: async (id) => {
        await get()._autoBackup()
        goalsDB.softDelete(id)
        get()._refreshGoals()
        get()._refreshTrash()
      },

      // ══════════════════════════
      //  TRASH
      // ══════════════════════════
      getTrashItems: () => trashDB.getAll(),

      restoreTrashItem: (type, id) => {
        trashDB.restoreItem(type, id)
        get()._refreshAll()
      },

      purgeTrashItem: (type, id) => {
        trashDB.purgeItem(type, id)
        get()._refreshTrash()
      },

      emptyTrash: () => {
        trashDB.emptyTrash()
        get()._refreshTrash()
      },

      // ══════════════════════════
      //  COMPUTED
      // ══════════════════════════
      getClientById: (id) => get().clients.find((c) => c.id === id),
      getProjectById: (id) => get().projects.find((p) => p.id === id),
      getProjectsByClient: (clientId) => get().projects.filter((p) => p.client_id === clientId),
      getTasksByProject: (projectId) => get().tasks.filter((t) => t.projet_id === projectId),
      getTasksByClient: (clientId) => get().tasks.filter((t) => t.client_id === clientId),
      getTransactionsByClient: (clientId) => get().transactions.filter((t) => t.client_id === clientId),
      getTransactionsByProject: (projectId) => get().transactions.filter((t) => t.projet_id === projectId),
      getGoalsByProject: (projectId) => get().goals.filter((g) => g.projet_id === projectId),

      // ══════════════════════════
      //  RESET
      // ══════════════════════════
      resetData: async () => {
        await get()._autoBackup()
        resetDatabase()
        get()._seedDatabase()
        get()._refreshAll()
        get()._loadWorkspacePrefs()
        set({ focus: '' })
        settingsDB.set('focus', '')
      },
    }),
    {
      name: 'mongouvernail-ui',
      partialize: (state) => ({
        theme: state.theme,
        commandPaletteOpen: false,
        onboardingDone: state.onboardingDone,
        userProfile: state.userProfile,
      }),
    }
  )
)

export default useStore

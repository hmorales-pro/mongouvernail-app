import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  initDB,
  switchDB,
  clientsDB,
  projectsDB,
  tasksDB,
  transactionsDB,
  goalsDB,
  trashDB,
  settingsDB,
  resetDB as resetDatabase,
  persist as persistDB,
} from '../db/database'
import {
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
  restoreAutoBackup,
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

      // ── User profile (persisted via Zustand) ──
      userProfile: {
        prenom: '',
        activite: '',
      },

      // ── Workspace state ──
      workspaces: [],
      activeWorkspaceId: null,
      activeWorkspaceName: '',
      activeWorkspaceColor: '#3B82F6',

      // ── Data (loaded from SQLite) ──
      clients: [],
      projects: [],
      tasks: [],
      transactions: [],
      goals: [],
      trashCount: 0,

      // ── Theme ──
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

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
        await initDB()

        const focus = settingsDB.get('focus', '')

        // Only auto-seed if onboarding was already completed
        // (otherwise onboarding will decide whether to seed or not)
        if (get().onboardingDone) {
          const existingClients = clientsDB.getAll()
          if (existingClients.length === 0) {
            get()._seedDatabase()
          }
        }

        get()._refreshAll()
        get()._refreshWorkspaces()
        set({ dbReady: true, focus })
      },

      // ── Onboarding ──
      completeOnboarding: (options = {}) => {
        const { prenom, activite, theme, workspaceName, withDemoData } = options

        if (prenom) set((s) => ({ userProfile: { ...s.userProfile, prenom } }))
        if (activite) set((s) => ({ userProfile: { ...s.userProfile, activite } }))
        if (theme) set({ theme })

        // Rename default workspace if a name was provided
        if (workspaceName) {
          const wsId = getActiveWorkspaceId()
          if (wsId) renameWorkspace(wsId, workspaceName)
          get()._refreshWorkspaces()
        }

        // Seed demo data if requested
        if (withDemoData) {
          const existingClients = clientsDB.getAll()
          if (existingClients.length === 0) {
            get()._seedDatabase()
            get()._refreshAll()
          }
        }

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

      createWorkspace: (name, options = {}) => {
        const ws = createWorkspace(name, options)
        get()._refreshWorkspaces()
        return ws
      },

      switchWorkspace: async (workspaceId) => {
        set({ dbReady: false })
        switchWs(workspaceId)
        await switchDB(workspaceId)

        const focus = settingsDB.get('focus', '')
        const existingClients = clientsDB.getAll()
        if (existingClients.length === 0) {
          // Empty workspace, don't auto-seed
        }

        get()._refreshAll()
        get()._refreshWorkspaces()
        set({ dbReady: true, focus })
      },

      renameWorkspace: (id, name) => {
        renameWorkspace(id, name)
        get()._refreshWorkspaces()
      },

      updateWorkspaceColor: (id, color) => {
        updateWorkspaceColor(id, color)
        get()._refreshWorkspaces()
      },

      deleteWorkspace: async (id) => {
        const newActiveId = deleteWs(id)
        if (newActiveId && newActiveId !== get().activeWorkspaceId) {
          await get().switchWorkspace(newActiveId)
        }
        get()._refreshWorkspaces()
      },

      // ══════════════════════════
      //  SNAPSHOTS
      // ══════════════════════════
      createSnapshot: (name) => {
        const wsId = getActiveWorkspaceId()
        return createSnapshot(wsId, name)
      },

      getSnapshots: () => {
        const wsId = getActiveWorkspaceId()
        return getSnapshots(wsId)
      },

      getAllSnapshots: () => getSnapshots(),

      restoreSnapshot: async (snapshotId) => {
        try {
          const wsId = restoreSnapshot(snapshotId)
          await switchDB(wsId)
          get()._refreshAll()
        } catch {
          // Might be an auto-backup, try that
          const wsId = restoreAutoBackup(snapshotId)
          await switchDB(wsId)
          get()._refreshAll()
        }
      },

      restoreAutoBackup: async (backupId) => {
        const wsId = restoreAutoBackup(backupId)
        await switchDB(wsId)
        get()._refreshAll()
      },

      deleteSnapshot: (id) => {
        deleteSnapshot(id)
      },

      // ══════════════════════════
      //  EXPORT / IMPORT
      // ══════════════════════════
      exportWorkspace: () => {
        const wsId = getActiveWorkspaceId()
        exportWorkspaceAsFile(wsId)
      },

      importWorkspace: async (file, targetId = null) => {
        const wsId = await importWorkspaceFromFile(file, targetId)
        await get().switchWorkspace(wsId)
      },

      getStorageUsage,

      // ══════════════════════════
      //  AUTO-BACKUP
      // ══════════════════════════
      _autoBackup: () => {
        const wsId = getActiveWorkspaceId()
        if (wsId) autoBackup(wsId)
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

      // ── Internal: refresh all data from SQLite ──
      _refreshAll: () => {
        set({
          clients: clientsDB.getAll(),
          projects: projectsDB.getAll(),
          tasks: tasksDB.getAll(),
          transactions: transactionsDB.getAll(),
          goals: goalsDB.getAll(),
          trashCount: trashDB.getCount(),
        })
      },

      _refreshClients: () => set({ clients: clientsDB.getAll() }),
      _refreshProjects: () => set({ projects: projectsDB.getAll() }),
      _refreshTasks: () => set({ tasks: tasksDB.getAll() }),
      _refreshTransactions: () => set({ transactions: transactionsDB.getAll() }),
      _refreshGoals: () => set({ goals: goalsDB.getAll() }),
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
      deleteClient: (id) => {
        get()._autoBackup()
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
      deleteProject: (id) => {
        get()._autoBackup()
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
      deleteTask: (id) => {
        get()._autoBackup()
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
      deleteTransaction: (id) => {
        get()._autoBackup()
        transactionsDB.softDelete(id)
        get()._refreshTransactions()
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
      deleteGoal: (id) => {
        get()._autoBackup()
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
      resetData: () => {
        get()._autoBackup()
        resetDatabase()
        get()._seedDatabase()
        get()._refreshAll()
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

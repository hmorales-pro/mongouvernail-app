import { useState } from 'react'
import {
  ListTodo,
  Plus,
  Search,
  Check,
  Wallet,
  Calendar,
  X,
} from 'lucide-react'
import useStore from '../store/useStore'
import { formatDateShort, daysUntil } from '../utils/helpers'
import {
  TASK_PRIORITIES,
  TASK_STATUTS,
  TASK_PRIORITY_COLORS,
} from '../utils/constants'

function TaskRow({ task, getProject, updateTask, setEditing, deleteTask }) {
  const [hovered, setHovered] = useState(false)
  const project = getProject(task.projet_id)
  const overdue =
    task.date_echeance && daysUntil(task.date_echeance) < 0 && task.statut !== 'Terminé'

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group border ${
        overdue ? 'border-red-500/20' : 'border-transparent'
      }`}
      style={
        task.statut === 'Terminé'
          ? { backgroundColor: 'var(--bg-nested)', opacity: 0.5 }
          : { backgroundColor: hovered ? 'var(--bg-nested-hover)' : 'var(--bg-card)' }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() =>
          updateTask(task.id, {
            statut: task.statut === 'Terminé' ? 'À faire' : 'Terminé',
          })
        }
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          task.statut === 'Terminé'
            ? 'bg-green-500 border-green-500'
            : 'hover:border-green-400'
        }`}
        style={
          task.statut !== 'Terminé'
            ? { borderColor: 'var(--border-primary)' }
            : {}
        }
      >
        {task.statut === 'Terminé' && <Check size={10} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            task.statut === 'Terminé' ? 'line-through' : ''
          }`}
          style={{
            color: task.statut === 'Terminé' ? 'var(--text-tertiary)' : 'var(--text-primary)',
          }}
        >
          {task.titre}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {project && (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{project.nom}</span>
          )}
          {task.tags?.map((tag, i) => (
            <span
              key={i}
              className="t-tag text-[9px] px-1.5 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {task.est_revenus_lie && <Wallet size={12} className="text-green-400" />}
        {task.date_echeance && (
          <span
            className="text-[11px] flex items-center gap-1"
            style={{
              color: overdue ? '#ff6b6b' : 'var(--text-tertiary)',
            }}
          >
            <Calendar size={10} />
            {formatDateShort(task.date_echeance)}
          </span>
        )}
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            color: TASK_PRIORITY_COLORS[task.priorite],
            background: TASK_PRIORITY_COLORS[task.priorite] + '15',
          }}
        >
          {task.priorite}
        </span>
        <button
          onClick={() => setEditing(task.id)}
          className="text-[10px] transition-opacity"
          style={{
            opacity: hovered ? 1 : 0,
            color: 'var(--text-tertiary)',
          }}
          onMouseEnter={(e) => { e.target.style.color = 'var(--text-secondary)' }}
          onMouseLeave={(e) => { e.target.style.color = 'var(--text-tertiary)' }}
        >
          Modifier
        </button>
        <button
          onClick={() => {
            if (confirm('Supprimer ?')) deleteTask(task.id)
          }}
          className="text-[10px] transition-opacity"
          style={{
            opacity: hovered ? 1 : 0,
            color: '#ff6b6b',
          }}
          onMouseEnter={(e) => { e.target.style.opacity = 1 }}
          onMouseLeave={(e) => { e.target.style.opacity = hovered ? 1 : 0 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function TaskForm({ initial, projects, clients, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      titre: '',
      projet_id: '',
      client_id: '',
      priorite: 'Normal',
      statut: 'À faire',
      date_echeance: '',
      tags: [],
      notes: '',
      est_revenus_lie: false,
    }
  )
  const [tagInput, setTagInput] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="t-nested rounded-lg p-4 space-y-3" style={{ backgroundColor: 'var(--bg-nested)' }}>
      <input
        autoFocus
        value={form.titre}
        onChange={(e) => set('titre', e.target.value)}
        placeholder="Titre de la tâche"
        className="t-input w-full rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && form.titre) onSave(form)
        }}
      />
      <div className="grid grid-cols-4 gap-3">
        <select
          value={form.projet_id}
          onChange={(e) => set('projet_id', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        >
          <option value="">Sans projet</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.nom}</option>
          ))}
        </select>
        <select
          value={form.priorite}
          onChange={(e) => set('priorite', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          value={form.statut}
          onChange={(e) => set('statut', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        >
          {TASK_STATUTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.date_echeance}
          onChange={(e) => set('date_echeance', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
          <input
            type="checkbox"
            checked={form.est_revenus_lie}
            onChange={(e) => set('est_revenus_lie', e.target.checked)}
          />
          Lié aux revenus
        </label>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              set('tags', [...(form.tags || []), tagInput.trim()])
              setTagInput('')
              e.preventDefault()
            }
          }}
          placeholder="Tag + Entrée"
          className="t-input flex-1 rounded px-3 py-1.5 text-sm outline-none"
        />
        <div className="flex gap-1">
          {(form.tags || []).map((t, i) => (
            <span key={i} className="t-tag text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
              #{t}
              <button onClick={() => set('tags', form.tags.filter((_, j) => j !== i))}>
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>
          Annuler
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.titre}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {initial ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const tasks = useStore((s) => s.tasks)
  const projects = useStore((s) => s.projects)
  const clients = useStore((s) => s.clients)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterPriorite, setFilterPriorite] = useState('Tous')
  const [groupBy, setGroupBy] = useState('priorite')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showToday, setShowToday] = useState(false)

  const getProject = (id) => projects.find((p) => p.id === id)

  const filtered = tasks.filter((t) => {
    if (filterStatut !== 'Tous' && t.statut !== filterStatut) return false
    if (filterPriorite !== 'Tous' && t.priorite !== filterPriorite) return false
    if (search && !t.titre.toLowerCase().includes(search.toLowerCase())) return false
    if (showToday) {
      const today = new Date().toISOString().split('T')[0]
      if (t.statut === 'Terminé') return false
      if (t.priorite === 'Urgent' || t.priorite === 'Important') return true
      if (t.date_echeance === today) return true
      return false
    }
    return true
  })

  const grouped = {}
  if (groupBy === 'priorite') {
    TASK_PRIORITIES.forEach((p) => {
      const items = filtered.filter((t) => t.priorite === p)
      if (items.length) grouped[p] = items
    })
  } else if (groupBy === 'projet') {
    const byProject = {}
    filtered.forEach((t) => {
      const key = t.projet_id || '_none'
      if (!byProject[key]) byProject[key] = []
      byProject[key].push(t)
    })
    Object.entries(byProject).forEach(([key, items]) => {
      const project = getProject(key)
      grouped[project?.nom || 'Sans projet'] = items
    })
  } else if (groupBy === 'statut') {
    TASK_STATUTS.forEach((s) => {
      const items = filtered.filter((t) => t.statut === s)
      if (items.length) grouped[s] = items
    })
  } else {
    grouped['Toutes'] = filtered
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ListTodo size={20} /> Tâches
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {tasks.filter((t) => t.statut !== 'Terminé').length} en cours ·{' '}
            {tasks.filter((t) => t.statut === 'Terminé').length} terminées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowToday(!showToday)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              showToday
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                : ''
            }`}
            style={
              showToday
                ? {}
                : {
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-tertiary)',
                  }
            }
            onMouseEnter={(e) => {
              if (!showToday) e.target.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              if (!showToday) e.target.style.color = 'var(--text-tertiary)'
            }}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            <Plus size={14} /> Nouvelle tâche
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="t-input w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="t-input rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option>Tous</option>
          {TASK_STATUTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterPriorite}
          onChange={(e) => setFilterPriorite(e.target.value)}
          className="t-input rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option>Tous</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          className="t-input rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option value="priorite">Par priorité</option>
          <option value="projet">Par projet</option>
          <option value="statut">Par statut</option>
          <option value="none">Sans groupement</option>
        </select>
      </div>

      {creating && (
        <div className="mb-4">
          <TaskForm
            projects={projects}
            clients={clients}
            onSave={(data) => {
              addTask(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {editing && (
        <div className="mb-4">
          <TaskForm
            initial={tasks.find((t) => t.id === editing)}
            projects={projects}
            clients={clients}
            onSave={(data) => {
              updateTask(editing, data)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={
                  TASK_PRIORITY_COLORS[group]
                    ? {
                        color: TASK_PRIORITY_COLORS[group],
                        background: TASK_PRIORITY_COLORS[group] + '20',
                      }
                    : { color: 'var(--text-tertiary)', background: 'var(--border-primary)' }
                }
              >
                {group}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{items.length}</span>
            </div>
            <div className="space-y-1">
              {items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  getProject={getProject}
                  updateTask={updateTask}
                  setEditing={setEditing}
                  deleteTask={deleteTask}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <ListTodo size={32} className="mx-auto mb-3" style={{ color: 'var(--border-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucune tâche trouvée</p>
        </div>
      )}
    </div>
  )
}

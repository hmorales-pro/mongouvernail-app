import { useState } from 'react'
import {
  FolderKanban,
  Plus,
  Search,
  Clock,
  List,
  LayoutGrid,
  X,
} from 'lucide-react'
import useStore from '../store/useStore'
import {
  formatDate,
  daysUntil,
  calculateGoalProgress,
} from '../utils/helpers'
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUTS,
  PROJECT_PRIORITIES,
  CATEGORY_COLORS,
  PRIORITY_COLORS,
  GOAL_TYPES,
  PERIOD_UNITS,
} from '../utils/constants'

function ProgressBar({ value, color = '#3B82F6' }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--progress-track)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  )
}

function ProjectForm({ initial, clients, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      nom: '',
      client_id: '',
      categorie: 'Produit SaaS',
      statut: 'Idée',
      priorite: 'P2',
      objectif_custom: null,
      notes: '',
      couleur: '#3B82F6',
      deadline: '',
    }
  )
  const [hasGoal, setHasGoal] = useState(!!initial?.objectif_custom)
  const [goal, setGoal] = useState(
    initial?.objectif_custom || {
      type: 'TASKS',
      valeur_cible: 10,
      valeur_actuelle: 0,
      unite: 'tâches',
      periode_valeur: 4,
      periode_unite: 'semaines',
      date_debut: new Date().toISOString().split('T')[0],
      date_fin: '',
    }
  )

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setG = (k, v) => setGoal((g) => ({ ...g, [k]: v }))

  return (
    <div className="t-nested rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-nested)', border: '1px solid var(--border-primary)' }}>
      <input
        value={form.nom}
        onChange={(e) => set('nom', e.target.value)}
        placeholder="Nom du projet"
        className="t-input w-full rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
      />
      <div className="grid grid-cols-4 gap-3">
        <select
          value={form.client_id}
          onChange={(e) => set('client_id', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        >
          <option value="">Sans client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.nom.split('—')[0]?.trim()}</option>
          ))}
        </select>
        <select
          value={form.categorie}
          onChange={(e) => set('categorie', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        >
          {PROJECT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={form.statut}
          onChange={(e) => set('statut', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        >
          {PROJECT_STATUTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={form.priorite}
          onChange={(e) => set('priorite', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        >
          {PROJECT_PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <input
        type="date"
        value={form.deadline}
        onChange={(e) => set('deadline', e.target.value)}
        className="t-input rounded px-3 py-2 text-sm outline-none"
        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        placeholder="Deadline"
      />
      <textarea
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Notes"
        rows={2}
        className="t-input w-full rounded px-3 py-2 text-sm outline-none resize-none"
        style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
      />

      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
          <input
            type="checkbox"
            checked={hasGoal}
            onChange={(e) => setHasGoal(e.target.checked)}
            className="rounded"
            style={{ borderColor: 'var(--border-primary)' }}
          />
          Objectif custom
        </label>
        {hasGoal && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select
              value={goal.type}
              onChange={(e) => setG('type', e.target.value)}
              className="t-input rounded px-3 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              {GOAL_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              value={goal.valeur_cible}
              onChange={(e) => setG('valeur_cible', +e.target.value)}
              placeholder="Cible"
              className="t-input rounded px-3 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
            <input
              value={goal.unite}
              onChange={(e) => setG('unite', e.target.value)}
              placeholder="Unité"
              className="t-input rounded px-3 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              value={goal.valeur_actuelle}
              onChange={(e) => setG('valeur_actuelle', +e.target.value)}
              placeholder="Actuel"
              className="t-input rounded px-3 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              value={goal.periode_valeur}
              onChange={(e) => setG('periode_valeur', +e.target.value)}
              placeholder="Période"
              className="t-input rounded px-3 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
            <select
              value={goal.periode_unite}
              onChange={(e) => setG('periode_unite', e.target.value)}
              className="t-input rounded px-3 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              {PERIOD_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Annuler
        </button>
        <button
          onClick={() =>
            onSave({
              ...form,
              objectif_custom: hasGoal ? goal : null,
            })
          }
          disabled={!form.nom}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {initial ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

export default function Projects() {
  const projects = useStore((s) => s.projects)
  const clients = useStore((s) => s.clients)
  const tasks = useStore((s) => s.tasks)
  const addProject = useStore((s) => s.addProject)
  const updateProject = useStore((s) => s.updateProject)
  const deleteProject = useStore((s) => s.deleteProject)

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterCat, setFilterCat] = useState('Tous')
  const [viewMode, setViewMode] = useState('list')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)

  const filtered = projects.filter((p) => {
    if (filterStatut !== 'Tous' && p.statut !== filterStatut) return false
    if (filterCat !== 'Tous' && p.categorie !== filterCat) return false
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = {
    P0: filtered.filter((p) => p.priorite === 'P0'),
    P1: filtered.filter((p) => p.priorite === 'P1'),
    P2: filtered.filter((p) => p.priorite === 'P2'),
    P3: filtered.filter((p) => p.priorite === 'P3'),
  }

  const getClient = (id) => clients.find((c) => c.id === id)
  const getNextTask = (projectId) =>
    tasks.find((t) => t.projet_id === projectId && t.statut !== 'Terminé')

  function ProjectCard({ project }) {
    const progress = calculateGoalProgress(project.objectif_custom)
    const color = CATEGORY_COLORS[project.categorie] || '#6B7280'
    const nextTask = getNextTask(project.id)
    const client = getClient(project.client_id)

    return (
      <div
        className="t-card rounded-lg p-3 cursor-pointer transition-colors"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
        onClick={() => setSelected(selected === project.id ? null : project.id)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{project.nom}</span>
          </div>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
            style={{
              color: PRIORITY_COLORS[project.priorite],
              background: PRIORITY_COLORS[project.priorite] + '20',
            }}
          >
            {project.priorite}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="t-tag text-[10px] px-1.5 py-0.5 rounded">
            {project.categorie}
          </span>
          <span className="t-tag text-[10px] px-1.5 py-0.5 rounded">
            {project.statut}
          </span>
          {client && (
            <span className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
              {client.nom.split('—')[0]?.trim()}
            </span>
          )}
        </div>

        {project.objectif_custom && (
          <>
            <ProgressBar value={progress} color={color} />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {project.objectif_custom.valeur_actuelle} / {project.objectif_custom.valeur_cible}{' '}
                {project.objectif_custom.unite}
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{progress}%</span>
            </div>
          </>
        )}

        {nextTask && (
          <div className="mt-2 text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
            → {nextTask.titre}
          </div>
        )}

        {project.deadline && (
          <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            <Clock size={10} />
            J-{daysUntil(project.deadline)}
          </div>
        )}

        {selected === project.id && (
          <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border-primary)' }}>
            {project.notes && (
              <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-tertiary)' }}>{project.notes}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(project.id)
                }}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-nested)', color: 'var(--text-secondary)' }}
              >
                Modifier
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Supprimer ?')) deleteProject(project.id)
                }}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FolderKanban size={20} /> Projets
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{projects.length} projets</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="p-2 rounded-lg t-card transition-colors"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}
          >
            {viewMode === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            <Plus size={14} /> Nouveau projet
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
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="t-input rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
        >
          <option>Tous</option>
          {PROJECT_STATUTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="t-input rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
        >
          <option>Tous</option>
          {PROJECT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {creating && (
        <div className="mb-4">
          <ProjectForm
            clients={clients}
            onSave={(data) => {
              addProject(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {editing && (
        <div className="mb-4">
          <ProjectForm
            initial={projects.find((p) => p.id === editing)}
            clients={clients}
            onSave={(data) => {
              updateProject(editing, data)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(grouped).map(([priority, items]) => (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{
                    color: PRIORITY_COLORS[priority],
                    background: PRIORITY_COLORS[priority] + '20',
                  }}
                >
                  {priority}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

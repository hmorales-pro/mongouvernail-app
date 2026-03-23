import { useState } from 'react'
import { Target, Clock, Plus, X, Pencil, Trash2, Link2 } from 'lucide-react'
import useStore from '../store/useStore'
import { calculateGoalProgress, daysUntil } from '../utils/helpers'
import { CATEGORY_COLORS, GOAL_TYPE_LABELS } from '../utils/constants'
import { getList } from '../utils/customLists'
import CustomSelect from '../components/CustomSelect'
import { useConfirm } from '../components/ConfirmDialog'

function ProgressRing({ value, size = 64, strokeWidth = 5, color = '#3B82F6' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, value) / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  )
}

function GoalForm({ initial, projects, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      titre: '',
      projet_id: '',
      type: 'CUSTOM',
      valeur_cible: 10,
      valeur_actuelle: 0,
      unite: '',
      periode_valeur: 4,
      periode_unite: 'semaines',
      date_debut: new Date().toISOString().split('T')[0],
      date_fin: '',
      notes: '',
    }
  )

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="t-nested rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-nested)', border: '1px solid var(--border-primary)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {initial ? 'Modifier l\'objectif' : 'Nouvel objectif'}
        </h3>
        <button onClick={onCancel} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Titre</label>
        <input
          autoFocus
          value={form.titre}
          onChange={(e) => set('titre', e.target.value)}
          placeholder="ex: Atteindre 50 clients B2B"
          className="t-input w-full rounded-lg px-3 py-2.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Projet lié</label>
          <select
            value={form.projet_id || ''}
            onChange={(e) => set('projet_id', e.target.value || null)}
            className="w-full t-input rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Objectif indépendant</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Type</label>
          <CustomSelect
            listKey="goal_types"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className="w-full t-input rounded-lg px-3 py-2 text-sm"
            labelMap={GOAL_TYPE_LABELS}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Valeur actuelle
          </label>
          <input
            type="number"
            value={form.valeur_actuelle}
            onChange={(e) => set('valeur_actuelle', +e.target.value)}
            className="t-input w-full rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Cible
          </label>
          <input
            type="number"
            value={form.valeur_cible}
            onChange={(e) => set('valeur_cible', +e.target.value)}
            className="t-input w-full rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Unité
          </label>
          <input
            value={form.unite}
            onChange={(e) => set('unite', e.target.value)}
            placeholder="ex: clients, €, vidéos"
            className="t-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Période
          </label>
          <input
            type="number"
            value={form.periode_valeur}
            onChange={(e) => set('periode_valeur', +e.target.value)}
            className="t-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Unité période
          </label>
          <CustomSelect
            listKey="period_units"
            value={form.periode_unite}
            onChange={(e) => set('periode_unite', e.target.value)}
            className="w-full t-input rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Début
          </label>
          <input
            type="date"
            value={form.date_debut || ''}
            onChange={(e) => set('date_debut', e.target.value)}
            className="t-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Fin
          </label>
          <input
            type="date"
            value={form.date_fin || ''}
            onChange={(e) => set('date_fin', e.target.value)}
            className="t-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <textarea
        value={form.notes || ''}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Notes (optionnel)"
        rows={2}
        className="t-input w-full rounded-lg px-3 py-2 text-sm resize-none"
      />

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.titre}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {initial ? 'Mettre à jour' : 'Créer l\'objectif'}
        </button>
      </div>
    </div>
  )
}

export default function Goals() {
  const projects = useStore((s) => s.projects)
  const goals = useStore((s) => s.goals)
  const addGoal = useStore((s) => s.addGoal)
  const updateGoal = useStore((s) => s.updateGoal)
  const updateGoalValue = useStore((s) => s.updateGoalValue)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const customLists = useStore((s) => s.customLists)
  const goalTypes = getList('goal_types', customLists)
  const periodUnits = getList('period_units', customLists)
  const confirm = useConfirm()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterStatut, setFilterStatut] = useState('Actif')

  const filtered = goals.filter((g) => {
    if (filterStatut !== 'Tous' && g.statut !== filterStatut) return false
    return true
  })

  const getProject = (id) => projects.find((p) => p.id === id)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Target size={20} /> Objectifs
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {goals.filter((g) => g.statut === 'Actif').length} actifs · {goals.length} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="t-input rounded-lg px-3 py-2 text-sm"
          >
            <option value="Tous">Tous</option>
            <option value="Actif">Actifs</option>
            <option value="Terminé">Terminés</option>
            <option value="En pause">En pause</option>
          </select>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Plus size={14} /> Nouvel objectif
          </button>
        </div>
      </div>

      {creating && (
        <div className="mb-6">
          <GoalForm
            projects={projects}
            onSave={(data) => {
              addGoal(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <GoalForm
            initial={goals.find((g) => g.id === editing)}
            projects={projects}
            onSave={(data) => {
              updateGoal(editing, data)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((goal) => {
          const progress = goal.valeur_cible > 0
            ? Math.min(100, Math.round((goal.valeur_actuelle / goal.valeur_cible) * 100))
            : 0
          const project = getProject(goal.projet_id)
          const color = project ? (CATEGORY_COLORS[project.categorie] || '#6B7280') : '#3B82F6'
          const remaining = daysUntil(goal.date_fin)
          const isAtRisk = remaining <= 7 && remaining > 0 && progress < 50
          const isOverdue = remaining <= 0 && progress < 100

          return (
            <div
              key={goal.id}
              className="rounded-xl p-4 group"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isAtRisk || isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border-primary)'}`,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {project && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    )}
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {goal.titre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="t-tag text-[10px] px-1.5 py-0.5 rounded">
                      {GOAL_TYPE_LABELS[goal.type] || goal.type}
                    </span>
                    {project && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                        <Link2 size={9} />
                        {project.nom.split('—')[0]?.trim()}
                      </span>
                    )}
                    {!project && goal.projet_id === null && (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Indépendant
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <ProgressRing value={progress} color={color} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-mono font-semibold rotate-90" style={{ color: 'var(--text-primary)' }}>
                      {progress}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Progression
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={goal.valeur_actuelle}
                      onChange={(e) => updateGoalValue(goal.id, +e.target.value)}
                      className="w-16 t-input rounded px-2 py-0.5 text-sm text-right font-mono"
                    />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      / {goal.valeur_cible} {goal.unite}
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--progress-track)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, progress)}%`, background: color }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  <span>
                    {goal.periode_valeur} {goal.periode_unite}
                  </span>
                  {goal.date_fin && (
                    <span
                      className="flex items-center gap-1"
                      style={{ color: isAtRisk || isOverdue ? '#ef4444' : 'var(--text-tertiary)' }}
                    >
                      <Clock size={10} />
                      {remaining > 0 ? `J-${remaining}` : 'Dépassé'}
                    </span>
                  )}
                </div>

                {goal.notes && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {goal.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(goal.id)}
                    className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors"
                    style={{ background: 'var(--bg-nested)', color: 'var(--text-tertiary)' }}
                  >
                    <Pencil size={9} /> Modifier
                  </button>
                  {goal.statut === 'Actif' && progress >= 100 && (
                    <button
                      onClick={() => updateGoal(goal.id, { statut: 'Terminé' })}
                      className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-500"
                    >
                      Marquer terminé
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (await confirm('Supprimer cet objectif ?')) deleteGoal(goal.id)
                    }}
                    className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Target size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>
            {filterStatut === 'Tous'
              ? 'Aucun objectif créé.'
              : `Aucun objectif ${filterStatut.toLowerCase()}.`}
          </p>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
            >
              Créer un objectif
            </button>
          )}
        </div>
      )}
    </div>
  )
}

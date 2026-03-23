import { useState, useMemo } from 'react'
import {
  Flame,
  Wallet,
  FolderKanban,
  Users,
  Pencil,
  Check,
  AlertTriangle,
  Clock,
  TrendingUp,
  Zap,
  CircleDollarSign,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import {
  formatCurrency,
  formatDateShort,
  daysSince,
  daysUntil,
  calculateGoalProgress,
  getRelationHealth,
} from '../utils/helpers'
import {
  CATEGORY_COLORS,
  TRANSACTION_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '../utils/constants'

/* ── tiny reusable bits ── */

function ProgressBar({ value, color = '#3B82F6', height = 4 }) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'var(--progress-track)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  )
}

function SectionHeader({ icon: Icon, iconColor, title, count, to, linkLabel }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: iconColor + '15' }}
        >
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <h2
          className="text-[13px] font-semibold tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {title}
        </h2>
        {count !== undefined && (
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ color: iconColor, background: iconColor + '12' }}
          >
            {count}
          </span>
        )}
      </div>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-1 text-[11px] transition-colors group"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {linkLabel || 'Voir tout'}
          <ChevronRight
            size={12}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      )}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl p-5 backdrop-blur-sm ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </div>
  )
}

/* ── main component ── */

export default function CommandCenter() {
  const userProfile = useStore((s) => s.userProfile)
  const focus = useStore((s) => s.focus)
  const setFocus = useStore((s) => s.setFocus)
  const clients = useStore((s) => s.clients)
  const tasks = useStore((s) => s.tasks)
  const transactions = useStore((s) => s.transactions)
  const projects = useStore((s) => s.projects)
  const updateTask = useStore((s) => s.updateTask)
  const markClientContacted = useStore((s) => s.markClientContacted)

  const urgentTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.statut !== 'Terminé' &&
            (t.priorite === 'Urgent' || t.priorite === 'Important')
        )
        .sort((a, b) => {
          const order = { Urgent: 0, Important: 1 }
          return (order[a.priorite] ?? 2) - (order[b.priorite] ?? 2)
        })
        .slice(0, 3),
    [tasks]
  )

  const pendingTx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.statut === 'En attente' ||
          t.statut === 'En retard' ||
          t.statut === 'Envoyée'
      ),
    [transactions]
  )

  const totalToCollect = useMemo(
    () =>
      transactions
        .filter((t) => t.statut !== 'Encaissée')
        .reduce((sum, t) => sum + (t.montant_ttc || 0), 0),
    [transactions]
  )

  const activeProjects = useMemo(
    () => projects.filter((p) => p.statut === 'Actif'),
    [projects]
  )

  const clientsToFollowUp = useMemo(() => {
    const now = Date.now()
    const thresholdDays = 14
    return clients
      .filter((c) => {
        if (c.statut !== 'Actif') return false
        if (!c.derniere_interaction) return true
        const diff = now - new Date(c.derniere_interaction).getTime()
        return diff > thresholdDays * 24 * 60 * 60 * 1000
      })
      .sort(
        (a, b) =>
          new Date(a.derniere_interaction || 0) -
          new Date(b.derniere_interaction || 0)
      )
  }, [clients])

  const caMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    return transactions
      .filter((t) => {
        if (t.statut !== 'Encaissée' || !t.date_encaissement) return false
        const d = new Date(t.date_encaissement)
        return d.getMonth() === month && d.getFullYear() === year
      })
      .reduce((sum, t) => sum + (t.montant_ttc || 0), 0)
  }, [transactions])

  const [editingFocus, setEditingFocus] = useState(false)
  const [focusDraft, setFocusDraft] = useState(focus)

  const overdueTx = pendingTx.filter((t) => t.statut === 'En retard')

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  })()

  return (
    <div className="p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {greeting}{userProfile.prenom ? `, ${userProfile.prenom}` : ''}
        </h1>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'À encaisser',
            value: formatCurrency(totalToCollect),
            icon: CircleDollarSign,
            color: '#10B981',
            sub:
              overdueTx.length > 0
                ? `${overdueTx.length} en retard`
                : null,
            subColor: '#EF4444',
          },
          {
            label: 'CA du mois',
            value: formatCurrency(caMonth),
            icon: TrendingUp,
            color: '#3B82F6',
          },
          {
            label: 'Projets actifs',
            value: activeProjects.length,
            icon: FolderKanban,
            color: '#8B5CF6',
          },
          {
            label: 'Tâches urgentes',
            value: urgentTasks.length,
            icon: Zap,
            color: '#F59E0B',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl p-4 flex items-start gap-3"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-secondary)',
              boxShadow: 'var(--shadow-kpi)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: kpi.color + '12' }}
            >
              <kpi.icon size={16} style={{ color: kpi.color }} />
            </div>
            <div>
              <p
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {kpi.label}
              </p>
              <p
                className="text-lg font-bold font-mono mt-0.5 leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {kpi.value}
              </p>
              {kpi.sub && (
                <p
                  className="text-[10px] font-medium mt-0.5 flex items-center gap-1"
                  style={{ color: kpi.subColor || kpi.color }}
                >
                  <AlertTriangle size={10} />
                  {kpi.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Focus ── */}
      <div
        className="mb-6 rounded-xl p-4 transition-all"
        style={{
          background: focus ? 'var(--focus-bg)' : 'var(--focus-empty-bg)',
          border: `1px solid ${focus ? 'var(--focus-border)' : 'var(--focus-empty-border)'}`,
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-blue-400/60" />
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Focus du moment
            </span>
          </div>
          <button
            onClick={() => {
              if (editingFocus) {
                setFocus(focusDraft)
                setEditingFocus(false)
              } else {
                setFocusDraft(focus)
                setEditingFocus(true)
              }
            }}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {editingFocus ? <Check size={13} /> : <Pencil size={13} />}
          </button>
        </div>
        {editingFocus ? (
          <input
            autoFocus
            value={focusDraft}
            onChange={(e) => setFocusDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setFocus(focusDraft)
                setEditingFocus(false)
              }
              if (e.key === 'Escape') setEditingFocus(false)
            }}
            placeholder="Quelle est ta priorité aujourd'hui ?"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {focus || (
              <span
                className="italic cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => {
                  setFocusDraft('')
                  setEditingFocus(true)
                }}
              >
                Clique pour définir ton focus du jour…
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 3 du jour */}
        <Card>
          <SectionHeader
            icon={Flame}
            iconColor="#F97316"
            title="Top 3 du jour"
            to="/taches"
            linkLabel="Toutes les tâches"
          />
          {urgentTasks.length === 0 ? (
            <p
              className="text-sm py-6 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              Rien d'urgent — beau travail
            </p>
          ) : (
            <div className="space-y-2">
              {urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg transition-colors group"
                  style={{ background: 'var(--bg-nested)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'var(--bg-nested-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'var(--bg-nested)')
                  }
                >
                  <button
                    onClick={() =>
                      updateTask(task.id, { statut: 'Terminé' })
                    }
                    className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      borderColor:
                        TASK_PRIORITY_COLORS[task.priorite] + '50',
                    }}
                  >
                    <Check
                      size={10}
                      className="text-transparent group-hover:text-green-500 transition-colors"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] leading-snug"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {task.titre}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{
                          color: TASK_PRIORITY_COLORS[task.priorite],
                          background:
                            TASK_PRIORITY_COLORS[task.priorite] + '15',
                        }}
                      >
                        {task.priorite}
                      </span>
                      {task.date_echeance && (
                        <span
                          className="text-[11px] flex items-center gap-1"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Clock size={10} />
                          {formatDateShort(task.date_echeance)}
                        </span>
                      )}
                      {task.est_revenus_lie && (
                        <CircleDollarSign
                          size={11}
                          className="text-green-500/70"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Argent à encaisser */}
        <Card>
          <SectionHeader
            icon={Wallet}
            iconColor="#10B981"
            title="À encaisser"
            to="/finances"
            linkLabel="Finances"
          />
          <div className="space-y-3">
            {pendingTx.slice(0, 4).map((tx) => {
              const client = clients.find((c) => c.id === tx.client_id)
              const isOverdue = tx.statut === 'En retard'
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background:
                          TRANSACTION_STATUS_COLORS[tx.statut],
                        boxShadow: isOverdue
                          ? '0 0 6px rgba(239,68,68,0.4)'
                          : 'none',
                      }}
                    />
                    <div className="min-w-0">
                      <span
                        className="text-[13px] truncate block"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {client?.nom?.split('—')[0]?.trim() || 'Client'}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {tx.reference}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className="text-[13px] font-mono font-semibold block"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {formatCurrency(tx.montant_ttc)}
                    </span>
                    <span
                      className="text-[10px] font-medium"
                      style={{
                        color: TRANSACTION_STATUS_COLORS[tx.statut],
                      }}
                    >
                      {tx.statut}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Projets actifs */}
        <Card>
          <SectionHeader
            icon={FolderKanban}
            iconColor="#8B5CF6"
            title="Projets actifs"
            count={activeProjects.length}
            to="/projets"
            linkLabel="Tous les projets"
          />
          <div className="space-y-3">
            {activeProjects.slice(0, 5).map((p) => {
              const progress = calculateGoalProgress(p.objectif_custom)
              const color = CATEGORY_COLORS[p.categorie] || '#6B7280'
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <span
                        className="text-[13px] truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {p.nom}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-mono font-semibold ml-3 flex-shrink-0"
                      style={{ color }}
                    >
                      {progress}%
                    </span>
                  </div>
                  <ProgressBar value={progress} color={color} height={3} />
                  {p.objectif_custom && (
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {p.objectif_custom.valeur_actuelle} /{' '}
                        {p.objectif_custom.valeur_cible}{' '}
                        {p.objectif_custom.unite}
                      </span>
                      {p.deadline && (
                        <span
                          className="text-[10px] flex items-center gap-1"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Clock size={9} />
                          J-{daysUntil(p.deadline)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Clients à relancer */}
        <Card>
          <SectionHeader
            icon={Users}
            iconColor="#F59E0B"
            title="Clients à relancer"
            count={
              clientsToFollowUp.length > 0
                ? clientsToFollowUp.length
                : undefined
            }
            to="/clients"
            linkLabel="Tous les clients"
          />
          {clientsToFollowUp.length === 0 ? (
            <p
              className="text-sm py-6 text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              Tous les clients sont à jour
            </p>
          ) : (
            <div className="space-y-1">
              {clientsToFollowUp.slice(0, 4).map((c) => {
                const days = daysSince(c.derniere_interaction)
                const health = getRelationHealth(c.derniere_interaction)
                const healthColor =
                  health === 'good'
                    ? '#10B981'
                    : health === 'warning'
                    ? '#F59E0B'
                    : '#EF4444'
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors group"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        'var(--bg-nested)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background: healthColor,
                          boxShadow: `0 0 6px ${healthColor}30`,
                        }}
                      />
                      <span
                        className="text-[13px] truncate"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {c.nom.split('—')[0]?.trim()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {days === Infinity ? 'Jamais' : `${days}j`}
                      </span>
                      <button
                        onClick={() => markClientContacted(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] font-medium text-green-500 bg-green-500/10 hover:bg-green-500/20 px-2.5 py-1 rounded-md transition-all"
                      >
                        Contacté
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

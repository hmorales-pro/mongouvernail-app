import { useState, useMemo } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  FolderKanban,
  Wallet,
  Target,
  Users,
  Repeat,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import useStore from '../store/useStore'
import { formatCurrency } from '../utils/helpers'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const FILTERS = [
  { key: 'taches', icon: ListTodo, label: 'Tâches', color: '#3B82F6' },
  { key: 'projets', icon: FolderKanban, label: 'Projets', color: '#8B5CF6' },
  { key: 'finances', icon: Wallet, label: 'Échéances', color: '#10B981', group: 'finances' },
  { key: 'abonnements', icon: Repeat, label: 'Abonnements', color: '#8B5CF6', group: 'finances' },
  { key: 'retards', icon: AlertTriangle, label: 'Retards', color: '#EF4444', group: 'finances' },
  { key: 'objectifs', icon: Target, label: 'Objectifs', color: '#F59E0B' },
  { key: 'clients', icon: Users, label: 'Clients', color: '#EC4899' },
]

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  // Monday=0 ... Sunday=6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const cells = []
  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, current: false, date: new Date(year, month - 1, daysInPrev - i) })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(year, month, d) })
  }
  // Next month padding
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false, date: new Date(year, month + 1, d) })
  }
  return cells
}

function toDateStr(d) {
  if (!d) return null
  const date = new Date(d)
  if (isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function EventDot({ event }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="text-[9px] leading-tight px-1 py-0.5 rounded truncate cursor-default"
        style={{
          color: event.color,
          background: event.color + '18',
        }}
      >
        {event.label}
      </div>
      {hovered && (
        <div
          className="absolute z-50 bottom-full left-0 mb-1 p-2 rounded-lg shadow-lg text-xs min-w-[160px] max-w-[220px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: event.color }} />
            <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{event.label}</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{event.detail}</p>
        </div>
      )}
    </div>
  )
}

export default function Calendar() {
  const tasks = useStore((s) => s.tasks)
  const projects = useStore((s) => s.projects)
  const transactions = useStore((s) => s.transactions)
  const goals = useStore((s) => s.goals)
  const clients = useStore((s) => s.clients)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [filters, setFilters] = useState({
    taches: true,
    projets: true,
    finances: true,
    abonnements: true,
    retards: true,
    objectifs: true,
    clients: true,
  })

  const toggleFilter = (key) => setFilters((f) => ({ ...f, [key]: !f[key] }))

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  // Build events map: dateStr -> events[]
  const eventsMap = useMemo(() => {
    const map = {}
    const add = (dateStr, event) => {
      if (!dateStr) return
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(event)
    }

    if (filters.taches) {
      tasks.forEach((t) => {
        if (t.statut === 'Terminée') return
        const d = toDateStr(t.date_echeance)
        add(d, {
          key: 'task-' + t.id,
          label: t.titre,
          detail: `Tâche · ${t.priorite} · ${t.statut}`,
          color: '#3B82F6',
          type: 'tache',
        })
      })
    }

    if (filters.projets) {
      projects.forEach((p) => {
        const d = toDateStr(p.deadline)
        add(d, {
          key: 'proj-' + p.id,
          label: p.nom,
          detail: `Projet · ${p.statut}`,
          color: '#8B5CF6',
          type: 'projet',
        })
      })
    }

    // Finances: 3 sub-filters
    // Visible range for generating recurring dates
    const viewStart = new Date(year, month, 1)
    const viewEnd = new Date(year, month + 1, 0) // last day of month

    transactions.forEach((tx) => {
      const isAbonnement = tx.type === 'Abonnement' && tx.recurrence
      const isRetard = tx.statut === 'En retard'

      // Retards
      if (isRetard && filters.retards) {
        const d = toDateStr(tx.date_echeance)
        add(d, {
          key: 'tx-retard-' + tx.id,
          label: tx.reference || formatCurrency(tx.montant_ttc),
          detail: `En retard · ${tx.type} · ${formatCurrency(tx.montant_ttc)}`,
          color: '#EF4444',
          type: 'retard',
        })
        return // don't double-show
      }

      // Abonnements — place on the correct day of each matching month
      if (isAbonnement && filters.abonnements) {
        if (tx.recurrence_active === false) return // skip paused
        const freq = tx.recurrence || 'mensuel'
        const monthStep = freq === 'mensuel' ? 1 : freq === 'trimestriel' ? 3 : freq === 'semestriel' ? 6 : 12

        // Determine the recurring day
        const startDate = new Date(tx.date_echeance || tx.date_emission)
        const jour = tx.recurrence_jour || (!isNaN(startDate.getTime()) ? startDate.getDate() : 1)

        // For quarterly/semiannual/annual, check if this month aligns with the cycle
        let showThisMonth = true
        if (monthStep > 1 && !isNaN(startDate.getTime())) {
          const startM = startDate.getFullYear() * 12 + startDate.getMonth()
          const viewM = year * 12 + month
          showThisMonth = (viewM - startM) % monthStep === 0
        }

        if (showThisMonth) {
          // Clamp day to max days in this month (e.g. jour=31 in Feb → 28)
          const maxDay = new Date(year, month + 1, 0).getDate()
          const actualDay = Math.min(jour, maxDay)
          const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`
          add(d, {
            key: `tx-abo-${tx.id}-${d}`,
            label: tx.reference || formatCurrency(tx.montant_ttc),
            detail: `Abonnement ${freq} · le ${jour} · ${formatCurrency(tx.montant_ttc)}`,
            color: '#8B5CF6',
            type: 'abonnement',
          })
        }
        return
      }

      // Échéances classiques
      if (filters.finances && !isAbonnement && !isRetard) {
        if (tx.statut === 'Encaissée') return
        const d = toDateStr(tx.date_echeance)
        add(d, {
          key: 'tx-' + tx.id,
          label: tx.reference || formatCurrency(tx.montant_ttc),
          detail: `${tx.type} · ${formatCurrency(tx.montant_ttc)} · ${tx.statut}`,
          color: '#10B981',
          type: 'finance',
        })
      }
    })

    if (filters.objectifs) {
      goals.forEach((g) => {
        if (g.statut === 'Terminé') return
        const d = toDateStr(g.date_fin)
        add(d, {
          key: 'goal-' + g.id,
          label: g.titre,
          detail: `Objectif · ${g.statut} · Fin le ${g.date_fin || '—'}`,
          color: '#F59E0B',
          type: 'objectif',
        })
      })
    }

    if (filters.clients) {
      clients.forEach((c) => {
        const d = toDateStr(c.prochain_jalon?.date || c.prochain_jalon_date)
        if (!d) return
        add(d, {
          key: 'client-' + c.id,
          label: c.nom?.split('—')[0]?.trim(),
          detail: `Client · ${c.prochain_jalon?.texte || c.prochain_jalon_texte || 'Relance'}`,
          color: '#EC4899',
          type: 'client',
        })
      })
    }

    return map
  }, [tasks, projects, transactions, goals, clients, filters, year, month])

  const cells = getMonthGrid(year, month)
  const todayStr = toDateStr(today)

  // Count total events visible
  const totalEvents = Object.values(eventsMap).reduce((s, arr) => s + arr.length, 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarDays size={20} /> Calendrier
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {totalEvents} échéance{totalEvents !== 1 ? 's' : ''} visible{totalEvents !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {FILTERS.map(({ key, icon: Icon, label, color, group }, i) => (
          <div key={key} className="flex items-center gap-2">
            {/* Separator before finance group */}
            {group === 'finances' && FILTERS[i - 1]?.group !== 'finances' && (
              <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-secondary)' }} />
            )}
            <button
              onClick={() => toggleFilter(key)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{
                color: filters[key] ? color : 'var(--text-muted)',
                background: filters[key] ? color + '15' : 'var(--bg-nested)',
                border: filters[key] ? `1px solid ${color}40` : '1px solid transparent',
              }}
            >
              <Icon size={12} />
              {label}
            </button>
            {/* Separator after finance group */}
            {group === 'finances' && FILTERS[i + 1]?.group !== 'finances' && (
              <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-secondary)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:opacity-80 transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold min-w-[180px] text-center" style={{ color: 'var(--text-primary)' }}>
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={next}
            className="p-1.5 rounded-lg hover:opacity-80 transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs rounded-lg hover:opacity-80 transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
        >
          Aujourd'hui
        </button>
      </div>

      {/* Calendar grid */}
      <div className="t-card-flat rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          {DAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-medium uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {[0, 1, 2, 3, 4, 5].map((week) => (
          <div
            key={week}
            className="grid grid-cols-7"
            style={{ borderBottom: week < 5 ? '1px solid var(--border-secondary)' : 'none' }}
          >
            {cells.slice(week * 7, week * 7 + 7).map((cell) => {
              const dateStr = toDateStr(cell.date)
              const events = eventsMap[dateStr] || []
              const isToday = dateStr === todayStr

              return (
                <div
                  key={dateStr}
                  className="min-h-[90px] px-1.5 py-1 relative"
                  style={{
                    borderRight: '1px solid var(--border-secondary)',
                    background: isToday ? 'var(--bg-nested)' : 'transparent',
                    opacity: cell.current ? 1 : 0.35,
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : ''}`}
                      style={isToday ? {} : { color: 'var(--text-secondary)' }}
                    >
                      {cell.day}
                    </span>
                    {events.length > 3 && (
                      <span className="text-[9px] px-1 rounded-full" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-nested)' }}>
                        +{events.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((ev) => (
                      <EventDot key={ev.key} event={ev} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

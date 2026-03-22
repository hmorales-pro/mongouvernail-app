import { useState, useMemo } from 'react'
import {
  Wallet,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  ArrowRight,
} from 'lucide-react'
import useStore from '../store/useStore'
import { formatCurrency, formatDate, daysUntil } from '../utils/helpers'
import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUTS,
  TRANSACTION_STATUS_COLORS,
} from '../utils/constants'

function KPICard({ label, value, icon: Icon, color = 'var(--text-primary)', sub }) {
  return (
    <div className="t-card-flat rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <p className="text-xl font-semibold font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  )
}

function TransactionForm({ initial, clients, projects, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      client_id: '',
      projet_id: '',
      type: 'Facture',
      montant_ht: 0,
      montant_ttc: 0,
      statut: 'À émettre',
      date_emission: new Date().toISOString().split('T')[0],
      date_echeance: '',
      date_encaissement: null,
      reference: '',
      notes: '',
    }
  )

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="t-nested rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <select
          value={form.client_id}
          onChange={(e) => set('client_id', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        >
          <option value="">Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.nom.split('—')[0]?.trim()}</option>
          ))}
        </select>
        <select
          value={form.type}
          onChange={(e) => set('type', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          value={form.statut}
          onChange={(e) => set('statut', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        >
          {TRANSACTION_STATUTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <input
          value={form.reference}
          onChange={(e) => set('reference', e.target.value)}
          placeholder="Référence"
          className="t-input rounded px-3 py-2 text-sm outline-none"
        />
        <input
          type="number"
          value={form.montant_ht || ''}
          onChange={(e) => {
            const ht = +e.target.value
            set('montant_ht', ht)
            set('montant_ttc', Math.round(ht * 1.2 * 100) / 100)
          }}
          placeholder="Montant HT"
          className="t-input rounded px-3 py-2 text-sm outline-none"
        />
        <input
          type="number"
          value={form.montant_ttc || ''}
          onChange={(e) => set('montant_ttc', +e.target.value)}
          placeholder="Montant TTC"
          className="t-input rounded px-3 py-2 text-sm outline-none"
        />
        <input
          type="date"
          value={form.date_echeance}
          onChange={(e) => set('date_echeance', e.target.value)}
          className="t-input rounded px-3 py-2 text-sm outline-none"
        />
      </div>
      <textarea
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Notes"
        rows={2}
        className="w-full t-input rounded px-3 py-2 text-sm outline-none resize-none"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm hover:opacity-75" style={{ color: 'var(--text-secondary)' }}>
          Annuler
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          {initial ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

function TransactionRow({ tx, client, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottomColor: 'var(--border-secondary)',
        backgroundColor: hovered ? 'var(--bg-nested-hover)' : 'transparent',
      }}
      className="border-b transition-colors"
    >
      <td className="px-4 py-2.5 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
        {tx.reference}
      </td>
      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
        {client?.nom?.split('—')[0]?.trim() || '—'}
      </td>
      <td className="px-4 py-2.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded t-tag" style={{ color: 'var(--text-secondary)' }}>
          {tx.type}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{
            color: TRANSACTION_STATUS_COLORS[tx.statut],
            background: TRANSACTION_STATUS_COLORS[tx.statut] + '20',
          }}
        >
          {tx.statut}
        </span>
      </td>
      <td className="px-4 py-2.5 text-sm font-mono text-right" style={{ color: 'var(--text-primary)' }}>
        {formatCurrency(tx.montant_ttc)}
      </td>
      <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {formatDate(tx.date_echeance)}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(tx.id)}
            className="text-[10px] px-1.5 py-0.5 hover:opacity-75"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Modifier
          </button>
          <button
            onClick={() => {
              if (confirm('Supprimer ?')) onDelete(tx.id)
            }}
            className="text-[10px] px-1.5 py-0.5 hover:opacity-75"
            style={{ color: '#ef4444' }}
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  )
}

const PIPELINE_STEPS = ['À émettre', 'Envoyée', 'En attente', 'Encaissée']

export default function Finances() {
  const transactions = useStore((s) => s.transactions)
  const clients = useStore((s) => s.clients)
  const projects = useStore((s) => s.projects)
  const addTransaction = useStore((s) => s.addTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const deleteTransaction = useStore((s) => s.deleteTransaction)

  // Compute totals using useMemo to avoid infinite loop
  const { totalToCollect, mrr, caMonth, caYTD } = useMemo(() => {
    // Get raw data from store
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let total = 0
    let monthTotal = 0
    let ytdTotal = 0
    let mrrTotal = 0

    transactions.forEach((t) => {
      if (t.statut === 'Encaissée' || t.statut === 'En attente') {
        total += t.montant_ttc || 0
      }
      if (t.statut === 'Encaissée') {
        const date = new Date(t.date_encaissement || '')
        if (!isNaN(date.getTime())) {
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            monthTotal += t.montant_ttc || 0
          }
          if (date.getFullYear() === currentYear) {
            ytdTotal += t.montant_ttc || 0
          }
        }
      }
      if (t.type === 'Facture') {
        mrrTotal += t.montant_ttc || 0
      }
    })

    return {
      totalToCollect: total,
      mrr: Math.round(mrrTotal / 12),
      caMonth: monthTotal,
      caYTD: ytdTotal,
    }
  }, [transactions])

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterType, setFilterType] = useState('Tous')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'pipeline'

  const overdue = transactions.filter((t) => t.statut === 'En retard')

  const getClient = (id) => clients.find((c) => c.id === id)

  const filtered = transactions.filter((t) => {
    if (filterStatut !== 'Tous' && t.statut !== filterStatut) return false
    if (filterType !== 'Tous' && t.type !== filterType) return false
    if (search) {
      const client = getClient(t.client_id)
      const q = search.toLowerCase()
      if (
        !t.reference?.toLowerCase().includes(q) &&
        !client?.nom?.toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Wallet size={20} /> Finances
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{transactions.length} transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'list' ? 'pipeline' : 'list')}
            className="px-3 py-2 text-sm rounded-lg t-card hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            {view === 'list' ? 'Pipeline' : 'Liste'}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            <Plus size={14} /> Nouvelle transaction
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KPICard
          label="À encaisser"
          value={formatCurrency(totalToCollect)}
          icon={Wallet}
          color={overdue.length > 0 ? '#F59E0B' : undefined}
          sub={overdue.length > 0 ? `${overdue.length} en retard` : undefined}
        />
        <KPICard label="MRR estimé" value={formatCurrency(mrr)} icon={TrendingUp} />
        <KPICard label="CA du mois" value={formatCurrency(caMonth)} icon={CalendarDays} />
        <KPICard label="CA YTD" value={formatCurrency(caYTD)} icon={TrendingUp} color="text-green-400" />
      </div>

      {creating && (
        <div className="mb-4">
          <TransactionForm
            clients={clients}
            projects={projects}
            onSave={(data) => {
              addTransaction(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {editing && (
        <div className="mb-4">
          <TransactionForm
            initial={transactions.find((t) => t.id === editing)}
            clients={clients}
            projects={projects}
            onSave={(data) => {
              updateTransaction(editing, data)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {view === 'pipeline' ? (
        /* Pipeline view */
        <div className="grid grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((step) => {
            const items = transactions.filter((t) => t.statut === step)
            const total = items.reduce((s, t) => s + (t.montant_ttc || 0), 0)
            return (
              <div key={step}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: TRANSACTION_STATUS_COLORS[step] }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{step}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((tx) => {
                    const client = getClient(tx.client_id)
                    return (
                      <div
                        key={tx.id}
                        className="t-card-flat rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{tx.reference}</span>
                          <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(tx.montant_ttc)}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {client?.nom?.split('—')[0]?.trim() || '—'}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          {tx.type} · {formatDate(tx.date_echeance)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {/* En retard column */}
          {overdue.length > 0 && (
            <div className="col-span-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-xs font-medium text-red-400">
                  En retard ({overdue.length})
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {overdue.map((tx) => {
                  const client = getClient(tx.client_id)
                  return (
                    <div
                      key={tx.id}
                      className="t-card-flat rounded-lg p-3"
                      style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{tx.reference}</span>
                        <span className="text-sm font-mono font-medium" style={{ color: '#ef4444' }}>
                          {formatCurrency(tx.montant_ttc)}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {client?.nom?.split('—')[0]?.trim()}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>
                        Échéance : {formatDate(tx.date_echeance)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full t-input rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
              />
            </div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="t-input rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option>Tous</option>
              {TRANSACTION_STATUTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="t-input rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option>Tous</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="t-card-flat rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottomColor: 'var(--border-primary)' }} className="border-b">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Référence
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Client
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Statut
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Montant TTC
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    Échéance
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    client={getClient(tx.client_id)}
                    onEdit={setEditing}
                    onDelete={deleteTransaction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

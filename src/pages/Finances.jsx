import { useState, useMemo } from 'react'
import {
  Wallet,
  Plus,
  Search,
  TrendingUp,
  CalendarDays,
  Repeat,
  Pause,
  Play,
} from 'lucide-react'
import useStore from '../store/useStore'
import { formatCurrency, formatDate, daysUntil } from '../utils/helpers'
import { TRANSACTION_STATUS_COLORS } from '../utils/constants'
import { getList } from '../utils/customLists'
import CustomSelect from '../components/CustomSelect'
import { useConfirm } from '../components/ConfirmDialog'

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

const RECURRENCE_LABELS = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  semestriel: 'Semestriel',
  annuel: 'Annuel',
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
      recurrence: null,
      recurrence_active: true,
      recurrence_jour: null,
    }
  )

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="t-nested rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Client</label>
          <select
            value={form.client_id}
            onChange={(e) => set('client_id', e.target.value)}
            className="w-full t-input rounded px-3 py-2 text-sm outline-none"
          >
            <option value="">Sans client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom.split('—')[0]?.trim()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Type</label>
          <CustomSelect
            listKey="transaction_types"
            value={form.type}
            onChange={(e) => {
              const val = e.target.value
              set('type', val)
              if (val === 'Abonnement' && !form.recurrence) set('recurrence', 'mensuel')
              if (val !== 'Abonnement') { set('recurrence', null); set('recurrence_active', true) }
            }}
            className="w-full t-input rounded px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Statut</label>
          <CustomSelect
            listKey="transaction_statuts"
            value={form.statut}
            onChange={(e) => set('statut', e.target.value)}
            className="w-full t-input rounded px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Référence</label>
          <input
            value={form.reference}
            onChange={(e) => set('reference', e.target.value)}
            placeholder="FAC-001"
            className="w-full t-input rounded px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Montant HT</label>
          <input
            type="number"
            value={form.montant_ht || ''}
            onChange={(e) => {
              const ht = +e.target.value
              set('montant_ht', ht)
              set('montant_ttc', Math.round(ht * 1.2 * 100) / 100)
            }}
            placeholder="0.00"
            className="w-full t-input rounded px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Montant TTC</label>
          <input
            type="number"
            value={form.montant_ttc || ''}
            onChange={(e) => set('montant_ttc', +e.target.value)}
            placeholder="0.00"
            className="w-full t-input rounded px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Échéance</label>
          <input
            type="date"
            value={form.date_echeance}
            onChange={(e) => set('date_echeance', e.target.value)}
            className="w-full t-input rounded px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>
      {/* Récurrence — visible quand type = Abonnement */}
      {form.type === 'Abonnement' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Fréquence</label>
            <select
              value={form.recurrence || 'mensuel'}
              onChange={(e) => set('recurrence', e.target.value)}
              className="w-full t-input rounded px-3 py-2 text-sm outline-none"
            >
              {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Jour du mois</label>
            <select
              value={form.recurrence_jour || ''}
              onChange={(e) => set('recurrence_jour', e.target.value ? +e.target.value : null)}
              className="w-full t-input rounded px-3 py-2 text-sm outline-none"
            >
              <option value="">Auto</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Le {d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
              <input
                type="checkbox"
                checked={form.recurrence_active !== false}
                onChange={(e) => set('recurrence_active', e.target.checked)}
                className="rounded"
              />
              Récurrence active
            </label>
          </div>
        </div>
      )}
      <div>
        <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Notes"
          rows={2}
          className="w-full t-input rounded px-3 py-2 text-sm outline-none resize-none"
        />
      </div>
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

function TransactionRow({ tx, client, onEdit, onDelete, onTogglePause }) {
  const [hovered, setHovered] = useState(false)
  const confirm = useConfirm()
  const isRecurrent = tx.type === 'Abonnement' && tx.recurrence
  const isPaused = isRecurrent && tx.recurrence_active === false

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottomColor: 'var(--border-secondary)',
        backgroundColor: hovered ? 'var(--bg-nested-hover)' : 'transparent',
        opacity: isPaused ? 0.55 : 1,
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
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded t-tag" style={{ color: 'var(--text-secondary)' }}>
            {tx.type}
          </span>
          {isRecurrent && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{
                color: isPaused ? '#F59E0B' : '#8B5CF6',
                background: isPaused ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)',
              }}
            >
              {isPaused ? <Pause size={8} /> : <Repeat size={8} />}
              {RECURRENCE_LABELS[tx.recurrence]}{tx.recurrence_jour ? ` · le ${tx.recurrence_jour}` : ''}
              {isPaused && ' · En pause'}
            </span>
          )}
        </div>
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
          {isRecurrent && (
            <button
              onClick={() => onTogglePause(tx.id, !isPaused)}
              className="text-[10px] px-1.5 py-0.5 rounded hover:opacity-75 flex items-center gap-0.5"
              style={{
                color: isPaused ? '#10B981' : '#F59E0B',
                background: isPaused ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              }}
              title={isPaused ? 'Reprendre' : 'Mettre en pause'}
            >
              {isPaused ? <Play size={8} /> : <Pause size={8} />}
              {isPaused ? 'Reprendre' : 'Pause'}
            </button>
          )}
          <button
            onClick={() => onEdit(tx.id)}
            className="text-[10px] px-1.5 py-0.5 hover:opacity-75"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Modifier
          </button>
          <button
            onClick={async () => {
              if (await confirm('Supprimer cette transaction ?')) onDelete(tx.id)
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

export default function Finances() {
  const transactions = useStore((s) => s.transactions)
  const clients = useStore((s) => s.clients)
  const projects = useStore((s) => s.projects)
  const addTransaction = useStore((s) => s.addTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const deleteTransaction = useStore((s) => s.deleteTransaction)
  const customLists = useStore((s) => s.customLists)
  const transactionTypes = getList('transaction_types', customLists)
  const transactionStatuts = getList('transaction_statuts', customLists)

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
      if (t.statut !== 'Encaissée') {
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
      // MRR : abonnements actifs, ramenés au mois
      if (t.type === 'Abonnement' && t.recurrence_active !== false) {
        const amount = t.montant_ttc || 0
        const freq = t.recurrence || 'mensuel'
        if (freq === 'mensuel') mrrTotal += amount
        else if (freq === 'trimestriel') mrrTotal += amount / 3
        else if (freq === 'semestriel') mrrTotal += amount / 6
        else if (freq === 'annuel') mrrTotal += amount / 12
      }
    })

    return {
      totalToCollect: total,
      mrr: Math.round(mrrTotal),
      caMonth: monthTotal,
      caYTD: ytdTotal,
    }
  }, [transactions])

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterType, setFilterType] = useState('Tous')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

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
              {transactionStatuts.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="t-input rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option>Tous</option>
              {transactionTypes.map((t) => (
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
                    onTogglePause={(id, paused) => updateTransaction(id, { recurrence_active: !paused })}
                  />
                ))}
              </tbody>
            </table>
          </div>
    </div>
  )
}

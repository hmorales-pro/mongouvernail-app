import { useState } from 'react'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  Wallet,
  X,
} from 'lucide-react'
import useStore from '../store/useStore'
import {
  formatCurrency,
  formatDate,
  daysSince,
  getRelationHealth,
} from '../utils/helpers'
import { getList } from '../utils/customLists'
import CustomSelect from '../components/CustomSelect'
import { useConfirm } from '../components/ConfirmDialog'

function ClientForm({ initial, onSave, onCancel }) {
  const defaults = {
    nom: '',
    type: 'Freelance',
    statut: 'Prospect',
    contact_principal: { nom: '', email: '', telephone: '' },
    derniere_interaction: new Date().toISOString().split('T')[0],
    prochain_jalon: { texte: '', date: '' },
    notes: '',
    solde_a_encaisser: 0,
    tags: [],
  }
  const [form, setForm] = useState(
    initial
      ? {
          ...defaults,
          ...initial,
          contact_principal: { ...defaults.contact_principal, ...initial.contact_principal },
          prochain_jalon: { ...defaults.prochain_jalon, ...initial.prochain_jalon },
          tags: initial.tags || [],
        }
      : defaults
  )
  const [tagInput, setTagInput] = useState('')

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const setContact = (key, val) =>
    setForm((f) => ({
      ...f,
      contact_principal: { ...f.contact_principal, [key]: val },
    }))
  const setJalon = (key, val) =>
    setForm((f) => ({
      ...f,
      prochain_jalon: { ...f.prochain_jalon, [key]: val },
    }))

  return (
    <div className="t-card-flat border rounded-lg p-4 space-y-3" style={{ borderColor: 'var(--border-primary)' }}>
      <div>
        <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Nom du client</label>
        <input
          value={form.nom}
          onChange={(e) => set('nom', e.target.value)}
          placeholder="Nom du client"
          className="w-full t-input border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
          style={{ borderColor: 'var(--border-secondary)' }}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Type</label>
          <CustomSelect
            listKey="client_types"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className="w-full t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Statut</label>
          <CustomSelect
            listKey="client_statuts"
            value={form.statut}
            onChange={(e) => set('statut', e.target.value)}
            className="w-full t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Contact</label>
          <input
            value={form.contact_principal.nom}
            onChange={(e) => setContact('nom', e.target.value)}
            placeholder="Nom du contact"
            className="w-full t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Email</label>
          <input
            value={form.contact_principal.email}
            onChange={(e) => setContact('email', e.target.value)}
            placeholder="email@exemple.com"
            className="w-full t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Téléphone</label>
          <input
            value={form.contact_principal.telephone}
            onChange={(e) => setContact('telephone', e.target.value)}
            placeholder="06 12 34 56 78"
            className="w-full t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Prochain jalon</label>
          <input
            value={form.prochain_jalon.texte}
            onChange={(e) => setJalon('texte', e.target.value)}
            placeholder="Description du jalon"
            className="w-full t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Date du jalon</label>
          <input
            type="date"
            value={form.prochain_jalon.date}
            onChange={(e) => setJalon('date', e.target.value)}
            className="w-full t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Notes (markdown)"
          rows={3}
          className="w-full t-input border rounded px-3 py-2 text-sm outline-none resize-none"
          style={{ borderColor: 'var(--border-secondary)' }}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Tags</label>
        <div className="flex items-center gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                set('tags', [...(form.tags || []), tagInput.trim()])
                setTagInput('')
              }
            }}
            placeholder="Ajouter un tag (Entrée)"
            className="flex-1 t-input border rounded px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
          <div className="flex gap-1 flex-wrap">
            {(form.tags || []).map((tag, i) => (
              <span
                key={i}
                className="t-tag text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
              >
                #{tag}
                <button
                  onClick={() =>
                    set(
                      'tags',
                      form.tags.filter((_, j) => j !== i)
                    )
                  }
                >
                  <X size={8} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.nom}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {initial ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

export default function Clients() {
  const clients = useStore((s) => s.clients)
  const addClient = useStore((s) => s.addClient)
  const updateClient = useStore((s) => s.updateClient)
  const deleteClient = useStore((s) => s.deleteClient)
  const markClientContacted = useStore((s) => s.markClientContacted)
  const transactions = useStore((s) => s.transactions)
  const projects = useStore((s) => s.projects)
  const customLists = useStore((s) => s.customLists)
  const clientTypes = getList('client_types', customLists)
  const clientStatuts = getList('client_statuts', customLists)
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterType, setFilterType] = useState('Tous')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const filtered = clients.filter((c) => {
    if (filterStatut !== 'Tous' && c.statut !== filterStatut) return false
    if (filterType !== 'Tous' && c.type !== filterType) return false
    if (search && !c.nom.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users size={20} /> Clients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{clients.length} clients</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus size={14} /> Nouveau client
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full t-input border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500"
            style={{ borderColor: 'var(--border-secondary)' }}
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="t-input border rounded-lg px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border-secondary)' }}
        >
          <option>Tous</option>
          {clientStatuts.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="t-input border rounded-lg px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border-secondary)' }}
        >
          <option>Tous</option>
          {clientTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {creating && (
        <div className="mb-4">
          <ClientForm
            onSave={(data) => {
              addClient(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* Client list */}
      <div className="space-y-2">
        {filtered.map((client) => {
          const health = getRelationHealth(client.derniere_interaction)
          const healthColor =
            health === 'good' ? '#10B981' : health === 'warning' ? '#F59E0B' : '#EF4444'
          const clientTx = transactions.filter((t) => t.client_id === client.id)
          const clientProjects = projects.filter((p) => p.client_id === client.id)
          const isExpanded = expanded === client.id
          const isEditing = editing === client.id

          return (
            <div
              key={client.id}
              className="t-card border rounded-lg overflow-hidden"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <div
                className="flex items-center gap-3 p-4 cursor-pointer transition-colors"
                onClick={() => setExpanded(isExpanded ? null : client.id)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-nested)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: healthColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {client.nom}
                    </span>
                    <span className="t-tag text-[10px] px-1.5 py-0.5 rounded">
                      {client.type}
                    </span>
                    <span className="t-tag text-[10px] px-1.5 py-0.5 rounded">
                      {client.statut}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {client.derniere_interaction
                        ? `${daysSince(client.derniere_interaction)}j`
                        : 'Jamais'}
                    </span>
                    {client.contact_principal?.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={10} />
                        {client.contact_principal.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {client.solde_a_encaisser > 0 && (
                    <span className="text-sm font-mono font-medium text-amber-400">
                      {formatCurrency(client.solde_a_encaisser)}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t p-4" style={{ borderColor: 'var(--border-primary)' }}>
                  {isEditing ? (
                    <ClientForm
                      initial={client}
                      onSave={(data) => {
                        updateClient(client.id, data)
                        setEditing(null)
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <>
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markClientContacted(client.id)
                          }}
                          className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded hover:bg-green-500/20 transition-colors"
                        >
                          Marquer contacté
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditing(client.id)
                          }}
                          className="text-xs px-2.5 py-1 rounded transition-colors"
                          style={{ background: 'var(--bg-nested)', color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-nested-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-nested)'}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (await confirm('Supprimer ce client et toutes ses données associées ?')) deleteClient(client.id)
                          }}
                          className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded hover:bg-red-500/20 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Contact */}
                        <div>
                          <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
                            Contact
                          </h3>
                          <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <p>{client.contact_principal?.nom}</p>
                            {client.contact_principal?.email && (
                              <p className="flex items-center gap-1.5">
                                <Mail size={12} style={{ color: 'var(--text-tertiary)' }} />
                                {client.contact_principal.email}
                              </p>
                            )}
                            {client.contact_principal?.telephone && (
                              <p className="flex items-center gap-1.5">
                                <Phone size={12} style={{ color: 'var(--text-tertiary)' }} />
                                {client.contact_principal.telephone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Prochain jalon */}
                        {client.prochain_jalon?.texte && (
                          <div>
                            <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
                              Prochain jalon
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {client.prochain_jalon.texte}
                            </p>
                            {client.prochain_jalon.date && (
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                {formatDate(client.prochain_jalon.date)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Projets liés */}
                        {clientProjects.length > 0 && (
                          <div>
                            <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
                              Projets ({clientProjects.length})
                            </h3>
                            <div className="space-y-1">
                              {clientProjects.map((p) => (
                                <p key={p.id} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {p.nom}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transactions */}
                        {clientTx.length > 0 && (
                          <div>
                            <h3 className="text-xs font-medium uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
                              Transactions ({clientTx.length})
                            </h3>
                            <div className="space-y-1">
                              {clientTx.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span style={{ color: 'var(--text-tertiary)' }}>{tx.reference}</span>
                                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                                    {formatCurrency(tx.montant_ttc)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {client.tags?.length > 0 && (
                        <div className="flex gap-1 mt-3">
                          {client.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="t-tag text-[10px] px-2 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

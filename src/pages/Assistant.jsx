import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Send, Square, Settings as SettingsIcon, RefreshCw, AlertCircle,
  Trash2, MessageSquare, Search, ArrowUpRight,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import useStore from '../store/useStore'
import { chat, checkOllama } from '../ai/ollama'
import { buildSystemPrompt } from '../ai/context'
import { computeInsights } from '../ai/insights'
import { buildCorpus } from '../ai/corpus'
import { semanticSearch, DEFAULT_EMBED_MODEL } from '../ai/embeddings'
import { documentsDB, settingsDB, persist as persistDB } from '../db/database'

const SUGGESTIONS = [
  { icon: '📇', text: 'Quels clients dois-je relancer en priorité ?' },
  { icon: '✅', text: 'Résume mes tâches urgentes et en retard.' },
  { icon: '💰', text: 'Fais le point sur mes finances (encaissé, en attente, retards).' },
  { icon: '✉️', text: 'Rédige un email de relance chaleureux pour mon client le plus en retard.' },
]

const CACHE_KEY = 'ai_embed_cache'

// Décode le contenu texte (base64 → UTF-8) d'un document markdown/texte.
function decodeDocContent(doc) {
  try {
    const full = documentsDB.getById(doc.id)
    if (!full?.file_data) return ''
    const bytes = Uint8Array.from(atob(full.file_data), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes).slice(0, 2000)
  } catch {
    return ''
  }
}

export default function Assistant() {
  const [tab, setTab] = useState('chat')
  const aiSettings = useStore((s) => s.aiSettings)
  const configured = aiSettings.enabled && aiSettings.model

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-6 py-6">
      <Header tab={tab} setTab={setTab} />
      {tab === 'chat' ? <ChatTab configured={configured} /> : <SearchTab />}
    </div>
  )
}

function Header({ tab, setTab }) {
  return (
    <div className="flex items-center justify-between mb-4 flex-shrink-0">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Sparkles size={20} className="text-blue-500" />
          Assistant IA
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          100 % local · vos données ne quittent jamais votre machine
        </p>
      </div>
      <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'var(--bg-nested)' }}>
        {[
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'search', label: 'Recherche', icon: Search },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-card)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: tab === t.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  Onglet Chat
// ══════════════════════════════════════════════════════════
function ChatTab({ configured }) {
  const aiSettings = useStore((s) => s.aiSettings)
  const userProfile = useStore((s) => s.userProfile)
  const activeWorkspaceName = useStore((s) => s.activeWorkspaceName)
  const clients = useStore((s) => s.clients)
  const projects = useStore((s) => s.projects)
  const tasks = useStore((s) => s.tasks)
  const transactions = useStore((s) => s.transactions)
  const goals = useStore((s) => s.goals)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [status, setStatus] = useState({ state: 'idle', error: null })
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const verify = useCallback(async () => {
    if (!aiSettings.enabled) return setStatus({ state: 'disabled', error: null })
    setStatus({ state: 'checking', error: null })
    const res = await checkOllama(aiSettings.baseUrl)
    if (!res.ok) setStatus({ state: 'offline', error: res.error })
    else if (!aiSettings.model) setStatus({ state: 'no-model', error: null })
    else if (!res.models.includes(aiSettings.model)) setStatus({ state: 'model-missing', error: aiSettings.model })
    else setStatus({ state: 'ready', error: null })
  }, [aiSettings.enabled, aiSettings.baseUrl, aiSettings.model])

  useEffect(() => { verify() }, [verify])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || streaming || !configured) return

    const systemPrompt = buildSystemPrompt(
      { clients, projects, tasks, transactions, goals },
      { userProfile, workspaceName: activeWorkspaceName }
    )
    const history = [...messages, { role: 'user', content }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      await chat({
        baseUrl: aiSettings.baseUrl,
        model: aiSettings.model,
        messages: [{ role: 'system', content: systemPrompt }, ...history],
        signal: controller.signal,
        onToken: (token) => {
          setMessages((msgs) => {
            const copy = [...msgs]
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + token }
            return copy
          })
        },
      })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setMessages((msgs) => {
          const copy = [...msgs]
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = {
            ...last,
            content: last.content || `⚠️ Erreur : ${err?.message || 'échec de la génération'}`,
            error: !last.content,
          }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!configured) {
    return (
      <>
        <div className="flex items-center justify-end mb-2">
          <StatusBadge status={status} model={aiSettings.model} onRefresh={verify} />
        </div>
        <SetupCard status={status} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-2 flex-shrink-0">
        <StatusBadge status={status} model={aiSettings.model} onRefresh={verify} />
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            title="Effacer la conversation"
            className="p-2 rounded-lg hover:opacity-80 transition-colors"
            style={{ color: 'var(--text-tertiary)', background: 'var(--bg-nested)' }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <ChatEmptyState onPick={send} data={{ clients, projects, tasks, transactions, goals }} />
        ) : (
          messages.map((m, i) => <Bubble key={i} message={m} streaming={streaming && i === messages.length - 1} />)
        )}
      </div>

      <div className="mt-4 flex-shrink-0">
        <div
          className="flex items-end gap-2 rounded-xl p-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Posez une question sur votre activité…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm px-2 py-1.5 max-h-40"
            style={{ color: 'var(--text-primary)' }}
          />
          {streaming ? (
            <button
              onClick={stop}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
              title="Arrêter"
            >
              <Square size={15} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-40 flex-shrink-0"
              title="Envoyer"
            >
              <Send size={15} />
            </button>
          )}
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
          L'IA peut se tromper. Vérifiez les informations importantes.
        </p>
      </div>
    </>
  )
}

function ChatEmptyState({ onPick, data }) {
  const navigate = useNavigate()
  const [insights] = useState(() => computeInsights(data))

  return (
    <div className="flex flex-col h-full py-6">
      {insights.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-3 px-1" style={{ color: 'var(--text-tertiary)' }}>
            Suggestions proactives
          </p>
          <div className="space-y-2">
            {insights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} onPrompt={onPick} onNavigate={navigate} />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
          <Sparkles size={22} className="text-blue-500" />
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
          Interrogez votre activité, ou lancez-vous avec une suggestion :
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              onClick={() => onPick(s.text)}
              className="text-left text-sm rounded-xl px-3.5 py-3 hover:opacity-80 transition-colors"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
            >
              <span className="mr-1.5">{s.icon}</span>
              {s.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const SEVERITY_STYLE = {
  high: { dot: '#EF4444', bg: 'rgba(239, 68, 68, 0.06)' },
  medium: { dot: '#F59E0B', bg: 'rgba(245, 158, 11, 0.06)' },
  low: { dot: '#6B7280', bg: 'var(--bg-card)' },
}

function InsightCard({ insight, onPrompt, onNavigate }) {
  const s = SEVERITY_STYLE[insight.severity] || SEVERITY_STYLE.low
  const clickable = !!insight.prompt
  return (
    <div
      onClick={() => insight.prompt && onPrompt(insight.prompt)}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ background: s.bg, border: '1px solid var(--border-primary)' }}
    >
      <span className="text-lg flex-shrink-0">{insight.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{insight.title}</p>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{insight.description}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate(insight.to) }}
        title="Ouvrir"
        className="p-1.5 rounded-lg hover:opacity-70 flex-shrink-0"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <ArrowUpRight size={15} />
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  Onglet Recherche sémantique
// ══════════════════════════════════════════════════════════
function SearchTab() {
  const navigate = useNavigate()
  const aiSettings = useStore((s) => s.aiSettings)
  const clients = useStore((s) => s.clients)
  const projects = useStore((s) => s.projects)
  const tasks = useStore((s) => s.tasks)
  const goals = useStore((s) => s.goals)
  const documents = useStore((s) => s.documents)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [mode, setMode] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const abortRef = useRef(null)

  const run = async () => {
    const q = query.trim()
    if (!q) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSearching(true)
    setSearched(true)
    try {
      const corpus = buildCorpus({ clients, projects, tasks, goals, documents }, decodeDocContent)
      const cache = settingsDB.get(CACHE_KEY, {})
      const { results: res, cacheUpdated, mode: m } = await semanticSearch({
        query: q,
        items: corpus,
        cache,
        baseUrl: aiSettings.baseUrl,
        model: aiSettings.embedModel || DEFAULT_EMBED_MODEL,
        signal: controller.signal,
      })
      if (cacheUpdated) {
        settingsDB.set(CACHE_KEY, cache)
        persistDB()
      }
      setResults(res)
      setMode(m)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setResults([])
        setMode('keyword')
      }
    } finally {
      setSearching(false)
    }
  }

  const TYPE_ICON = { client: '📇', projet: '🗂️', tache: '✅', objectif: '🎯', document: '📄' }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2 flex-shrink-0"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      >
        <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run() }}
          placeholder="Recherchez par le sens : « relances impayées », « idées de contenu »…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={run}
          disabled={!query.trim() || searching}
          className="px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          {searching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
          Rechercher
        </button>
      </div>

      {mode && (
        <p className="text-[11px] mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: mode === 'semantic' ? '#10B981' : '#F59E0B' }} />
          {mode === 'semantic'
            ? 'Recherche sémantique (embeddings locaux)'
            : 'Repli mot-clé — modèle d\'embedding indisponible'}
        </p>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {!searched && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
              <Search size={22} className="text-blue-500" />
            </div>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-tertiary)' }}>
              Retrouvez clients, projets, tâches, objectifs et notes <strong>par le sens</strong>,
              pas seulement par mot exact. Tout est calculé localement.
            </p>
          </div>
        )}

        {searched && !searching && results.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Aucun résultat pertinent.
          </div>
        )}

        {results.map((r) => (
          <button
            key={`${r.type}:${r.id}`}
            onClick={() => navigate(r.to)}
            className="flex items-center gap-3 w-full text-left rounded-lg px-3.5 py-2.5 transition-colors hover:opacity-80"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
          >
            <span className="text-base flex-shrink-0">{TYPE_ICON[r.type] || '•'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.sublabel}</p>
            </div>
            {mode === 'semantic' && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: 'var(--bg-nested)', color: 'var(--text-muted)' }}
              >
                {Math.round(r.score * 100)}%
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  Composants partagés
// ══════════════════════════════════════════════════════════
function StatusBadge({ status, model, onRefresh }) {
  const map = {
    ready: { color: '#10B981', label: model },
    checking: { color: '#F59E0B', label: 'Vérification…' },
    offline: { color: '#EF4444', label: 'Ollama hors ligne' },
    'model-missing': { color: '#EF4444', label: 'Modèle absent' },
    'no-model': { color: '#F59E0B', label: 'Aucun modèle' },
    disabled: { color: '#6B7280', label: 'Désactivé' },
    idle: { color: '#6B7280', label: '—' },
  }
  const s = map[status.state] || map.idle
  return (
    <button
      onClick={onRefresh}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] hover:opacity-80 transition-colors group"
      style={{ background: 'var(--bg-nested)', color: 'var(--text-secondary)' }}
      title="Rafraîchir l'état"
    >
      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
      <span className="font-mono truncate max-w-[140px]">{s.label}</span>
      <RefreshCw size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  )
}

function SetupCard({ status }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-md text-center rounded-2xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
          <Sparkles size={26} className="text-blue-500" />
        </div>
        <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Activez votre assistant local
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-tertiary)' }}>
          Mon Gouvernail utilise <strong>Ollama</strong> pour faire tourner un modèle d'IA
          directement sur votre machine. Installez Ollama, téléchargez un modèle
          (ex. <code className="font-mono text-xs">llama3.2</code>), puis activez l'assistant
          dans les paramètres.
        </p>
        {status.state === 'offline' && (
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4 justify-center" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
            <AlertCircle size={14} />
            Ollama ne répond pas ({status.error || 'hors ligne'})
          </div>
        )}
        <NavLink
          to="/parametres"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
        >
          <SettingsIcon size={15} />
          Configurer l'IA locale
        </NavLink>
      </div>
    </div>
  )
}

function Bubble({ message, streaming }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words"
        style={{
          maxWidth: '85%',
          background: isUser ? '#3B82F6' : 'var(--bg-card)',
          color: isUser ? '#fff' : message.error ? '#EF4444' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border-primary)',
        }}
      >
        {message.content || (streaming ? '' : '…')}
        {streaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-current opacity-60 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}

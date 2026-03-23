import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Eye, Edit3, Save, FileText, Maximize2, Minimize2, HelpCircle, Tag, Briefcase, Users, ChevronDown } from 'lucide-react'

/* ── Minimal Markdown renderer ── */
function renderMarkdown(md) {
  let html = md
    // Code blocks (```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="nm-code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="nm-inline-code">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="nm-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="nm-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="nm-h1">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="nm-hr" />')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="nm-blockquote">$1</blockquote>')
    // Unordered list items
    .replace(/^[*-] (.+)$/gm, '<li class="nm-li">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="nm-link">$1</a>')
    // Line breaks (double newline → paragraph)
    .replace(/\n\n/g, '</p><p class="nm-p">')
    // Single newline → <br>
    .replace(/\n/g, '<br/>')

  return `<div class="nm-preview"><p class="nm-p">${html}</p></div>`
}

export default function NoteEditor({
  isOpen, onClose, onSave,
  initialTitle, initialContent,
  initialProjetId, initialClientId, initialTags,
  projects, clients,
  fullscreen: startFullscreen,
}) {
  const [title, setTitle] = useState(initialTitle || '')
  const [content, setContent] = useState(initialContent || '')
  const [mode, setMode] = useState('edit') // 'edit' | 'preview' | 'split'
  const [fullscreen, setFullscreen] = useState(startFullscreen || false)
  const [saved, setSaved] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const textareaRef = useRef(null)

  // Metadata state
  const [projetId, setProjetId] = useState(initialProjetId || '')
  const [clientId, setClientId] = useState(initialClientId || '')
  const [tags, setTags] = useState(initialTags || [])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    setTitle(initialTitle || '')
    setContent(initialContent || '')
    setProjetId(initialProjetId || '')
    setClientId(initialClientId || '')
    setTags(initialTags || [])
    setTagInput('')
    setSaved(false)
  }, [initialTitle, initialContent, initialProjetId, initialClientId, initialTags, isOpen])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, title, content, projetId, clientId, tags])

  const handleSave = () => {
    const finalTitle = title.trim() || `Note du ${new Date().toLocaleDateString('fr-FR')}`
    const fileName = finalTitle.endsWith('.md') ? finalTitle : `${finalTitle}.md`
    onSave({
      title: fileName,
      content,
      projet_id: projetId || null,
      client_id: clientId || null,
      tags,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const previewHtml = useMemo(() => renderMarkdown(content), [content])

  const hasProjects = projects && projects.length > 0
  const hasClients = clients && clients.length > 0
  const hasMeta = hasProjects || hasClients

  if (!isOpen) return null

  const panelClass = fullscreen
    ? 'fixed inset-0 z-[9999]'
    : 'fixed inset-6 z-[9999] rounded-2xl'

  return (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div
        className={`${panelClass} overflow-hidden flex flex-col`}
        style={{ background: 'var(--bg-card)', border: fullscreen ? 'none' : '1px solid var(--border-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-secondary)' }}
        >
          <FileText size={16} style={{ color: 'var(--accent)' }} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la note..."
            className="flex-1 text-sm font-medium bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />

          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border-primary)' }}
          >
            {[
              { key: 'edit', icon: <Edit3 size={12} />, label: 'Écrire' },
              { key: 'split', icon: null, label: 'Split' },
              { key: 'preview', icon: <Eye size={12} />, label: 'Aperçu' },
            ].map((btn, i) => (
              <button
                key={btn.key}
                onClick={() => setMode(btn.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: mode === btn.key ? 'var(--text-primary)' : 'var(--bg-nested)',
                  color: mode === btn.key ? 'var(--bg-card)' : 'var(--text-primary)',
                  borderLeft: i > 0 ? '1px solid var(--border-primary)' : 'none',
                }}
              >
                {btn.icon}{btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95"
            style={{
              background: saved ? '#10B981' : 'var(--text-primary)',
              color: 'var(--bg-card)',
            }}
          >
            <Save size={12} /> {saved ? 'Enregistré !' : 'Enregistrer'}
          </button>

          {hasMeta && (
            <button
              onClick={() => setShowMeta(!showMeta)}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-lg hover:opacity-80 transition-colors"
              style={{
                color: showMeta ? 'var(--accent)' : 'var(--text-tertiary)',
                background: showMeta ? 'var(--accent)' + '15' : 'transparent',
              }}
              title="Métadonnées (projet, client, tags)"
            >
              <Tag size={13} />
            </button>
          )}

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded-lg hover:opacity-80 transition-colors"
            style={{ color: showHelp ? 'var(--accent)' : 'var(--text-tertiary)' }}
            title="Aide Markdown"
          >
            <HelpCircle size={15} />
          </button>

          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 rounded-lg hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Metadata bar (collapsible) */}
        {showMeta && (
          <div
            className="flex items-center gap-3 px-5 py-2.5 flex-shrink-0 flex-wrap"
            style={{ borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-nested)' }}
          >
            {/* Project select */}
            {hasProjects && (
              <div className="flex items-center gap-1.5">
                <Briefcase size={12} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={projetId}
                  onChange={(e) => setProjetId(e.target.value)}
                  className="text-[11px] rounded-md px-2 py-1 outline-none cursor-pointer"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                >
                  <option value="">Aucun projet</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Client select */}
            {hasClients && (
              <div className="flex items-center gap-1.5">
                <Users size={12} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="text-[11px] rounded-md px-2 py-1 outline-none cursor-pointer"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                >
                  <option value="">Aucun client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Separator */}
            <div className="w-px h-5" style={{ background: 'var(--border-secondary)' }} />

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              <Tag size={12} style={{ color: 'var(--text-muted)' }} />
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: 'var(--accent)' + '18', color: 'var(--accent)' }}
                >
                  {t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:opacity-60 transition-opacity"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    handleAddTag()
                  }
                  if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                    handleRemoveTag(tags[tags.length - 1])
                  }
                }}
                onBlur={() => { if (tagInput.trim()) handleAddTag() }}
                placeholder="Ajouter un tag…"
                className="text-[11px] bg-transparent outline-none min-w-[80px] flex-1"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        {/* Editor body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Edit pane */}
          {(mode === 'edit' || mode === 'split') && (
            <div className={`flex-1 flex flex-col ${mode === 'split' ? 'border-r' : ''}`} style={{ borderColor: 'var(--border-secondary)' }}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Écrivez votre note en Markdown..."
                className="flex-1 w-full resize-none p-5 text-sm font-mono outline-none"
                style={{
                  background: 'var(--bg-page)',
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                }}
                spellCheck={false}
              />
              <div
                className="px-5 py-1.5 text-[10px] flex items-center justify-between flex-shrink-0"
                style={{ background: 'var(--bg-nested)', color: 'var(--text-muted)' }}
              >
                <span>{content.length} caractères · {content.split(/\s+/).filter(Boolean).length} mots</span>
                <span>Markdown · Ctrl+S pour sauver</span>
              </div>
            </div>
          )}

          {/* Preview pane */}
          {(mode === 'preview' || mode === 'split') && (
            <div
              className="flex-1 overflow-auto p-6"
              style={{ background: 'var(--bg-page)' }}
            >
              <style>{`
                .nm-preview { color: var(--text-primary); line-height: 1.8; }
                .nm-h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; color: var(--text-primary); }
                .nm-h2 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--text-primary); }
                .nm-h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.4rem; color: var(--text-primary); }
                .nm-p { margin: 0.4rem 0; }
                .nm-code-block { background: var(--bg-nested); border: 1px solid var(--border-secondary); border-radius: 8px; padding: 12px 16px; margin: 0.75rem 0; overflow-x: auto; font-size: 0.8rem; }
                .nm-inline-code { background: var(--bg-nested); padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
                .nm-blockquote { border-left: 3px solid var(--accent); padding-left: 12px; margin: 0.5rem 0; color: var(--text-secondary); font-style: italic; }
                .nm-hr { border: none; border-top: 1px solid var(--border-secondary); margin: 1rem 0; }
                .nm-li { margin-left: 1.5rem; list-style: disc; }
                .nm-link { color: var(--accent); text-decoration: underline; }
              `}</style>
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  L'aperçu apparaîtra ici...
                </p>
              )}
            </div>
          )}

          {/* Help panel */}
          {showHelp && (
            <div
              className="w-64 flex-shrink-0 overflow-y-auto p-4 text-xs space-y-3"
              style={{ borderLeft: '1px solid var(--border-secondary)', background: 'var(--bg-nested)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Aide Markdown
                </h3>
                <button onClick={() => setShowHelp(false)} className="p-0.5 hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                  <X size={12} />
                </button>
              </div>

              {[
                { label: 'Titres', items: ['# Titre 1', '## Titre 2', '### Titre 3'] },
                { label: 'Texte', items: ['**gras**', '*italique*', '~~barré~~'] },
                { label: 'Listes', items: ['- élément', '- autre élément'] },
                { label: 'Citation', items: ['> texte cité'] },
                { label: 'Code', items: ['`code inline`', '```\nbloc de code\n```'] },
                { label: 'Lien', items: ['[texte](url)'] },
                { label: 'Séparateur', items: ['---'] },
              ].map((section) => (
                <div key={section.label}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{section.label}</p>
                  {section.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Insert at cursor position
                        const ta = textareaRef.current
                        if (!ta) return
                        const start = ta.selectionStart
                        const end = ta.selectionEnd
                        const before = content.slice(0, start)
                        const after = content.slice(end)
                        const insertion = (start > 0 && !before.endsWith('\n') && item.startsWith('#') ? '\n' : '') + item
                        setContent(before + insertion + after)
                        setTimeout(() => {
                          ta.focus()
                          ta.selectionStart = ta.selectionEnd = start + insertion.length
                        }, 0)
                      }}
                      className="block w-full text-left font-mono py-0.5 px-2 rounded hover:opacity-70 cursor-pointer transition-colors"
                      style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
                      title="Cliquer pour insérer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '8px' }}>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Raccourcis</p>
                <div className="space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  <p><kbd className="font-mono px-1 rounded" style={{ background: 'var(--bg-card)' }}>Ctrl+S</kbd> Enregistrer</p>
                  <p><kbd className="font-mono px-1 rounded" style={{ background: 'var(--bg-card)' }}>Echap</kbd> Fermer</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

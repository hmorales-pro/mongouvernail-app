import { useState, useMemo, useRef } from 'react'
import {
  FileText,
  Folder,
  FolderPlus,
  Upload,
  Trash2,
  ChevronRight,
  Home,
  Edit3,
  Check,
  X,
  MoreVertical,
  File,
  Image,
  FileSpreadsheet,
  FileCode,
  Download,
  Search,
  Pin,
  Tag,
  Grid,
  List,
  SortAsc,
  SortDesc,
  FolderInput,
} from 'lucide-react'
import useStore from '../store/useStore'
import { useConfirm } from '../components/ConfirmDialog'
import NoteEditor from '../components/NoteEditor'

/* ── helpers ── */

const FOLDER_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
]

function getFileIcon(mime) {
  if (!mime) return File
  if (mime.startsWith('image/')) return Image
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  if (mime.includes('pdf')) return FileText
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html') || mime.includes('css')) return FileCode
  return File
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / 1048576).toFixed(1) + ' Mo'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── components ── */

function Breadcrumb({ path, onNavigate }) {
  return (
    <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:opacity-80"
        style={{ color: path.length === 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
      >
        <Home size={13} />
        <span className="text-[13px]">Documents</span>
      </button>
      {path.map((folder, i) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
          <button
            onClick={() => onNavigate(folder.id)}
            className="px-2 py-1 rounded-md text-[13px] transition-colors hover:opacity-80"
            style={{ color: i === path.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {folder.nom}
          </button>
        </span>
      ))}
    </div>
  )
}

function FolderCard({ folder, onOpen, onRename, onDelete, onColorChange, clickMode }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(folder.nom)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuBtnRef = useRef(null)
  const confirm = useConfirm()

  const openMenu = (e) => {
    e.stopPropagation()
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 })
    }
    setShowMenu(!showMenu)
  }

  const handleSave = () => {
    if (name.trim() && name !== folder.nom) onRename(folder.id, name.trim())
    setEditing(false)
  }

  return (
    <div
      className="group relative rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-card)',
      }}
      onClick={clickMode === 'single' ? () => onOpen(folder.id) : undefined}
      onDoubleClick={clickMode !== 'single' ? () => onOpen(folder.id) : undefined}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: (folder.couleur || '#6B7280') + '15' }}
        >
          <Folder size={20} style={{ color: folder.couleur || '#6B7280' }} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                className="flex-1 t-input rounded px-2 py-0.5 text-sm outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button onClick={(e) => { e.stopPropagation(); handleSave() }} className="p-0.5" style={{ color: '#10B981' }}>
                <Check size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setEditing(false) }} className="p-0.5" style={{ color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {folder.nom}
            </p>
          )}
        </div>
        <div>
          <button
            ref={menuBtnRef}
            onClick={openMenu}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <MoreVertical size={14} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
              <div
                className="fixed z-[9999] rounded-lg shadow-lg py-1 min-w-[140px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', top: menuPos.top, left: menuPos.left }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(folder.id); setShowMenu(false) }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Ouvrir
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); setShowMenu(false) }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Renommer
                </button>
                <div className="flex items-center gap-1 px-3 py-1.5">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={(e) => { e.stopPropagation(); onColorChange(folder.id, c); setShowMenu(false) }}
                      className="w-4 h-4 rounded-full hover:ring-2 hover:ring-offset-1 transition-all"
                      style={{
                        background: c,
                        outline: c === folder.couleur ? '2px solid var(--text-primary)' : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    if (await confirm(`Supprimer le dossier "${folder.nom}" ?`)) onDelete(folder.id)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80"
                  style={{ color: '#EF4444' }}
                >
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Move-to menu (shared between context menu and ⋮ menu) ── */

function MoveToMenu({ doc, folders, onMove, onClose }) {
  const targets = folders.filter((f) => f.id !== doc.folder_id)
  if (targets.length === 0 && !doc.folder_id) return null

  return (
    <div className="py-1" style={{ borderTop: '1px solid var(--border-secondary)' }}>
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
        style={{ color: 'var(--text-muted)' }}
      >
        <FolderInput size={10} /> Déplacer vers
      </p>
      {doc.folder_id && (
        <button
          onClick={() => { onMove(doc.id, null); onClose() }}
          className="w-full text-left px-3 py-1.5 text-xs hover:opacity-80 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Home size={11} /> Racine
        </button>
      )}
      {targets.map((f) => (
        <button
          key={f.id}
          onClick={() => { onMove(doc.id, f.id); onClose() }}
          className="w-full text-left px-3 py-1.5 text-xs hover:opacity-80 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Folder size={11} style={{ color: f.couleur }} /> {f.nom}
        </button>
      ))}
    </div>
  )
}

/* ── Context menu (right-click) ── */

function DocContextMenu({ doc, pos, folders, onOpen, onPin, onRename, onMove, onDelete, onClose }) {
  const confirm = useConfirm()
  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div
        className="fixed z-[9999] rounded-lg shadow-xl py-1 min-w-[180px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', top: pos.y, left: pos.x }}
      >
        <button
          onClick={() => { onOpen(doc); onClose() }}
          className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Download size={12} /> Ouvrir
        </button>
        <button
          onClick={() => { onPin(doc.id); onClose() }}
          className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Pin size={12} /> {doc.epingle ? 'Désépingler' : 'Épingler'}
        </button>
        <button
          onClick={() => { onRename(doc); onClose() }}
          className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Edit3 size={12} /> Renommer
        </button>

        <MoveToMenu doc={doc} folders={folders} onMove={onMove} onClose={onClose} />

        <div style={{ borderTop: '1px solid var(--border-secondary)' }}>
          <button
            onClick={async () => {
              onClose()
              if (await confirm(`Supprimer "${doc.nom}" ?`)) onDelete(doc.id)
            }}
            className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
            style={{ color: '#EF4444' }}
          >
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      </div>
    </>
  )
}

function DocRow({ doc, onDelete, onRename, onMove, onOpen, onPin, folders, viewMode, onContextMenu }) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(doc.nom)
  const confirm = useConfirm()
  const menuBtnRef = useRef(null)
  const Icon = getFileIcon(doc.mime_type)

  const openMenu = () => {
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 })
    }
    setShowMenu(true)
  }

  const handleSave = () => {
    if (name.trim() && name !== doc.nom) onRename(doc.id, name.trim())
    setEditing(false)
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    onContextMenu?.(doc, { x: e.clientX, y: e.clientY })
  }

  const tags = doc.tags || []

  if (viewMode === 'grid') {
    return (
      <div
        className="group rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] relative"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-card)' }}
        onClick={() => onOpen?.(doc)}
        onContextMenu={handleContextMenu}
      >
        {doc.epingle && (
          <Pin size={10} className="absolute top-2 right-2" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
        )}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-nested)' }}>
            <Icon size={24} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-xs font-medium truncate w-full" style={{ color: 'var(--text-primary)' }}>{doc.nom}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatSize(doc.taille)}</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {tags.slice(0, 2).map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--bg-nested)', color: 'var(--text-tertiary)' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: '1px solid var(--border-secondary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-nested)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onContextMenu={handleContextMenu}
    >
      {doc.epingle && <Pin size={10} className="flex-shrink-0" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />}
      {!doc.epingle && <span className="w-[10px] flex-shrink-0" />}
      <Icon size={18} style={{ color: 'var(--text-tertiary)' }} />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
              className="flex-1 t-input rounded px-2 py-0.5 text-sm outline-none"
              autoFocus
            />
            <button onClick={handleSave} className="p-0.5" style={{ color: '#10B981' }}><Check size={14} /></button>
            <button onClick={() => setEditing(false)} className="p-0.5" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpen?.(doc)}
              className="text-sm truncate text-left hover:underline cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
              title="Ouvrir"
            >
              {doc.nom}
            </button>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-shrink-0">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'var(--bg-nested)', color: 'var(--text-tertiary)' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <span className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
        {formatSize(doc.taille)}
      </span>
      <span className="text-[11px] flex-shrink-0 w-20 text-right" style={{ color: 'var(--text-tertiary)' }}>
        {formatDate(doc.updated_at || doc.created_at)}
      </span>

      <div>
        <button
          ref={menuBtnRef}
          onClick={() => showMenu ? setShowMenu(false) : openMenu()}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <MoreVertical size={14} />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
            <div
              className="fixed z-[9999] rounded-lg shadow-lg py-1 min-w-[180px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', top: menuPos.top, left: menuPos.left }}
            >
              <button
                onClick={() => { onOpen?.(doc); setShowMenu(false) }}
                className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Download size={12} /> Ouvrir
              </button>
              <button
                onClick={() => { onPin?.(doc.id); setShowMenu(false) }}
                className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Pin size={12} /> {doc.epingle ? 'Désépingler' : 'Épingler'}
              </button>
              <button
                onClick={() => { setEditing(true); setShowMenu(false) }}
                className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Edit3 size={12} /> Renommer
              </button>

              <MoveToMenu doc={doc} folders={folders} onMove={onMove} onClose={() => setShowMenu(false)} />

              <div style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <button
                  onClick={async () => {
                    setShowMenu(false)
                    if (await confirm(`Supprimer "${doc.nom}" ?`)) onDelete(doc.id)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2"
                  style={{ color: '#EF4444' }}
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── main ── */

export default function Documents() {
  const documents = useStore((s) => s.documents)
  const docFolders = useStore((s) => s.docFolders)
  const addDocFolder = useStore((s) => s.addDocFolder)
  const updateDocFolder = useStore((s) => s.updateDocFolder)
  const deleteDocFolder = useStore((s) => s.deleteDocFolder)
  const addDocument = useStore((s) => s.addDocument)
  const updateDocument = useStore((s) => s.updateDocument)
  const deleteDocument = useStore((s) => s.deleteDocument)
  const toggleDocPin = useStore((s) => s.toggleDocPin)
  const searchDocuments = useStore((s) => s.searchDocuments)
  const projects = useStore((s) => s.projects)
  const clients = useStore((s) => s.clients)
  const folderClickMode = useStore((s) => s.folderClickMode) || 'single'

  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const fileInputRef = useRef(null)

  // Search, sort, view
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortDir, setSortDir] = useState('desc')
  const [viewMode, setViewMode] = useState('list')
  const [filterType, setFilterType] = useState('all')

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState(null) // { doc, pos: {x, y} }

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    const path = []
    let id = currentFolderId
    while (id) {
      const folder = docFolders.find((f) => f.id === id)
      if (!folder) break
      path.unshift(folder)
      id = folder.parent_id
    }
    return path
  }, [currentFolderId, docFolders])

  // Current folder's subfolders and documents
  const subFolders = useMemo(
    () => docFolders.filter((f) => (f.parent_id || null) === currentFolderId),
    [docFolders, currentFolderId]
  )

  const currentDocs = useMemo(() => {
    let docs = searchQuery
      ? searchDocuments(searchQuery)
      : documents.filter((d) => (d.folder_id || null) === currentFolderId)

    if (filterType === 'notes') docs = docs.filter((d) => d.mime_type?.includes('text/') || d.nom?.endsWith('.md'))
    else if (filterType === 'images') docs = docs.filter((d) => d.mime_type?.startsWith('image/'))
    else if (filterType === 'pdf') docs = docs.filter((d) => d.mime_type?.includes('pdf'))

    docs = [...docs].sort((a, b) => {
      if (a.epingle && !b.epingle) return -1
      if (!a.epingle && b.epingle) return 1
      let cmp = 0
      if (sortBy === 'nom') cmp = (a.nom || '').localeCompare(b.nom || '')
      else if (sortBy === 'taille') cmp = (a.taille || 0) - (b.taille || 0)
      else if (sortBy === 'created_at') cmp = (a.created_at || '').localeCompare(b.created_at || '')
      else cmp = (a.updated_at || '').localeCompare(b.updated_at || '')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return docs
  }, [documents, currentFolderId, searchQuery, sortBy, sortDir, filterType])

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    addDocFolder({ nom: newFolderName.trim(), parent_id: currentFolderId })
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const getDocumentById = useStore((s) => s.getDocumentById)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [downloadMsg, setDownloadMsg] = useState(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState(null)

  const handleSaveNote = ({ title, content, projet_id, client_id, tags }) => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(content)
    const base64 = btoa(String.fromCharCode(...bytes))

    if (editingNote?.id) {
      updateDocument(editingNote.id, {
        nom: title,
        file_data: base64,
        mime_type: 'text/markdown',
        taille: bytes.length,
        ...(projet_id !== undefined && { projet_id }),
        ...(client_id !== undefined && { client_id }),
        ...(tags !== undefined && { tags }),
      })
    } else {
      addDocument({
        nom: title,
        folder_id: currentFolderId,
        mime_type: 'text/markdown',
        taille: bytes.length,
        file_data: base64,
        projet_id: projet_id || null,
        client_id: client_id || null,
        tags: tags || [],
      })
    }
  }

  const handleEditNote = (doc) => {
    try {
      const fullDoc = getDocumentById(doc.id)
      if (!fullDoc?.file_data) return
      const text = atob(fullDoc.file_data)
      setEditingNote({
        id: fullDoc.id,
        title: fullDoc.nom,
        content: text,
        projet_id: fullDoc.projet_id || '',
        client_id: fullDoc.client_id || '',
        tags: fullDoc.tags || [],
      })
      setNoteOpen(true)
    } catch (err) {
      console.error('[Documents] Failed to open note for editing:', err)
    }
  }

  function arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return btoa(binary)
  }

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (const file of files) {
      let filePath = ''
      let fileData = null

      try {
        const buffer = await file.arrayBuffer()
        fileData = arrayBufferToBase64(buffer)

        if (window.__TAURI__) {
          try {
            const tauriPath = window.__TAURI__.path
            const tauriFs = window.__TAURI__.fs
            const dir = await tauriPath.appDataDir()
            const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
            const ext = file.name.split('.').pop()
            const destName = `${id}.${ext}`
            const destPath = `${dir}documents/${destName}`

            try { await tauriFs.mkdir(`${dir}documents`, { recursive: true }) } catch { /* exists */ }

            await tauriFs.writeFile(destPath, new Uint8Array(buffer))
            filePath = destPath
          } catch (err) {
            console.warn('Tauri file save failed, using base64 only:', err)
          }
        }
      } catch (err) {
        console.warn('File read failed:', err)
      }

      addDocument({
        nom: file.name,
        folder_id: currentFolderId,
        mime_type: file.type,
        taille: file.size,
        file_path: filePath,
        file_data: fileData,
      })
    }
    e.target.value = ''
  }

  const handleOpenDocument = (doc) => {
    try {
      const ext = (doc.nom || '').split('.').pop()?.toLowerCase()
      const isMarkdown = ext === 'md' || ext === 'markdown' || ext === 'txt'

      if (isMarkdown && doc.mime_type?.startsWith('text/')) {
        handleEditNote(doc)
        return
      }

      const fullDoc = getDocumentById(doc.id)
      if (!fullDoc) {
        console.warn('[Documents] getDocumentById returned null for id:', doc.id)
        return
      }
      setPreviewDoc(fullDoc)
    } catch (err) {
      console.error('[Documents] Error opening document:', err)
    }
  }

  const handleNavigate = (folderId) => setCurrentFolderId(folderId)

  const handleToggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const handleContextMenu = (doc, pos) => {
    setCtxMenu({ doc, pos })
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1
            className="text-xl font-semibold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <FileText size={20} /> Documents
          </h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} · {docFolders.length} dossier{docFolders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingNote(null); setNoteOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg hover:opacity-80 transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
          >
            <Edit3 size={14} /> Note
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg hover:opacity-80 transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
          >
            <FolderPlus size={14} /> Dossier
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-500"
          >
            <Upload size={14} /> Importer
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Search + filters bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les documents..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1">
          {[
            { key: 'all', label: 'Tout' },
            { key: 'notes', label: 'Notes' },
            { key: 'images', label: 'Images' },
            { key: 'pdf', label: 'PDF' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className="px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors"
              style={{
                background: filterType === f.key ? 'var(--text-primary)' : 'var(--bg-nested)',
                color: filterType === f.key ? 'var(--bg-card)' : 'var(--text-tertiary)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <button
          onClick={() => handleToggleSort(sortBy)}
          className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg hover:opacity-80"
          style={{ color: 'var(--text-tertiary)', background: 'var(--bg-nested)' }}
          title={`Tri par ${sortBy}`}
        >
          {sortDir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent outline-none text-[11px] cursor-pointer"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <option value="updated_at">Modifié</option>
            <option value="created_at">Créé</option>
            <option value="nom">Nom</option>
            <option value="taille">Taille</option>
          </select>
        </button>

        {/* View toggle */}
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-secondary)' }}>
          <button
            onClick={() => setViewMode('list')}
            className="p-1.5 transition-colors"
            style={{ background: viewMode === 'list' ? 'var(--text-primary)' : 'transparent', color: viewMode === 'list' ? 'var(--bg-card)' : 'var(--text-tertiary)' }}
          >
            <List size={13} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className="p-1.5 transition-colors"
            style={{ background: viewMode === 'grid' ? 'var(--text-primary)' : 'transparent', color: viewMode === 'grid' ? 'var(--bg-card)' : 'var(--text-tertiary)' }}
          >
            <Grid size={13} />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {!searchQuery && <Breadcrumb path={breadcrumbPath} onNavigate={handleNavigate} />}

      {/* New folder form */}
      {showNewFolder && (
        <div
          className="mb-4 flex items-center gap-2 p-3 rounded-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        >
          <Folder size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            placeholder="Nom du dossier…"
            className="flex-1 t-input rounded px-2 py-1 text-sm outline-none"
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Créer
          </button>
          <button
            onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
            className="px-2 py-1 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Folders grid */}
      {!searchQuery && subFolders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {subFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onOpen={handleNavigate}
              onRename={(id, nom) => updateDocFolder(id, { nom })}
              onDelete={deleteDocFolder}
              onColorChange={(id, couleur) => updateDocFolder(id, { couleur })}
              clickMode={folderClickMode}
            />
          ))}
        </div>
      )}

      {/* Search results indicator */}
      {searchQuery && (
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          {currentDocs.length} résultat{currentDocs.length !== 1 ? 's' : ''} pour « {searchQuery} »
        </p>
      )}

      {/* Documents */}
      {currentDocs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {currentDocs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                folders={docFolders}
                viewMode="grid"
                onDelete={deleteDocument}
                onRename={(id, nom) => updateDocument(id, { nom })}
                onMove={(id, folderId) => updateDocument(id, { folder_id: folderId })}
                onOpen={handleOpenDocument}
                onPin={toggleDocPin}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-secondary)' }}
            >
              <span className="w-[10px]" />
              <span className="flex-1 cursor-pointer hover:opacity-70" onClick={() => handleToggleSort('nom')}>
                Nom {sortBy === 'nom' && (sortDir === 'asc' ? '↑' : '↓')}
              </span>
              <span className="w-16 text-right cursor-pointer hover:opacity-70" onClick={() => handleToggleSort('taille')}>
                Taille {sortBy === 'taille' && (sortDir === 'asc' ? '↑' : '↓')}
              </span>
              <span className="w-20 text-right cursor-pointer hover:opacity-70" onClick={() => handleToggleSort('updated_at')}>
                Modifié {sortBy === 'updated_at' && (sortDir === 'asc' ? '↑' : '↓')}
              </span>
              <span className="w-8" />
            </div>
            {currentDocs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                folders={docFolders}
                viewMode="list"
                onDelete={deleteDocument}
                onRename={(id, nom) => updateDocument(id, { nom })}
                onMove={(id, folderId) => updateDocument(id, { folder_id: folderId })}
                onOpen={handleOpenDocument}
                onPin={toggleDocPin}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )
      ) : subFolders.length === 0 && !searchQuery ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-primary)',
          }}
        >
          <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            Aucun document
          </p>
          <p className="text-[11px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Importez des fichiers ou créez un dossier pour organiser vos documents.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg hover:opacity-80"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
            >
              <FolderPlus size={14} /> Nouveau dossier
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-500"
            >
              <Upload size={14} /> Importer un fichier
            </button>
          </div>
        </div>
      ) : searchQuery && currentDocs.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <Search size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aucun résultat pour « {searchQuery} »</p>
        </div>
      ) : null}

      {/* ── Right-click context menu ── */}
      {ctxMenu && (
        <DocContextMenu
          doc={ctxMenu.doc}
          pos={ctxMenu.pos}
          folders={docFolders}
          onOpen={handleOpenDocument}
          onPin={toggleDocPin}
          onRename={(doc) => {
            // Trigger inline rename — find the DocRow and set editing
            // Simpler: directly open a prompt-style rename
            const newName = prompt('Renommer :', doc.nom)
            if (newName && newName.trim() && newName !== doc.nom) {
              updateDocument(doc.id, { nom: newName.trim() })
            }
          }}
          onMove={(id, folderId) => updateDocument(id, { folder_id: folderId })}
          onDelete={deleteDocument}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* ── Preview Modal ── */}
      {previewDoc && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setPreviewDoc(null)}
          />
          <div
            className="fixed inset-6 z-[9999] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
          >
            {/* Preview header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-secondary)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={16} style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {previewDoc.nom}
                </p>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {formatSize(previewDoc.taille)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!previewDoc.file_data) return
                    try {
                      const byteChars = atob(previewDoc.file_data)
                      const byteArray = new Uint8Array(byteChars.length)
                      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i)

                      if (window.__TAURI__) {
                        const filePath = await window.__TAURI__.dialog.save({
                          defaultPath: previewDoc.nom || 'document',
                          filters: [{ name: 'Fichier', extensions: [(previewDoc.nom || '').split('.').pop() || '*'] }],
                        })
                        if (filePath) {
                          await window.__TAURI__.fs.writeFile(filePath, byteArray)
                          setDownloadMsg(`Fichier enregistré : ${filePath.split('/').pop()}`)
                        }
                      } else {
                        const blob = new Blob([byteArray], { type: previewDoc.mime_type || 'application/octet-stream' })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = previewDoc.nom || 'document'
                        link.style.display = 'none'
                        document.body.appendChild(link)
                        link.click()
                        setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url) }, 1000)
                        setDownloadMsg(`« ${previewDoc.nom} » téléchargé dans votre dossier Téléchargements`)
                      }
                      setTimeout(() => setDownloadMsg(null), 4000)
                    } catch (err) {
                      console.error('[Documents] Download failed:', err)
                      setDownloadMsg('Erreur lors du téléchargement')
                      setTimeout(() => setDownloadMsg(null), 4000)
                    }
                  }}
                  disabled={!previewDoc.file_data}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-150 hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-nested)' }}
                >
                  <Download size={13} /> Télécharger
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg hover:opacity-80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
              {previewDoc.file_data ? (
                (() => {
                  const mime = previewDoc.mime_type || ''
                  const ext = (previewDoc.nom || '').split('.').pop()?.toLowerCase() || ''
                  const textExtensions = ['md', 'markdown', 'txt', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'xml', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'env', 'sh', 'bash', 'py', 'rb', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'sql', 'csv', 'log', 'gitignore']
                  const isImage = mime.startsWith('image/')
                  const isPdf = mime === 'application/pdf' || ext === 'pdf'
                  const isText = mime.startsWith('text/') || mime === 'application/json' || mime.includes('markdown') || textExtensions.includes(ext)
                  const dataUrl = `data:${mime || 'application/octet-stream'};base64,${previewDoc.file_data}`

                  if (isImage) {
                    return <img src={dataUrl} alt={previewDoc.nom} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                  }
                  if (isPdf) {
                    return <iframe src={dataUrl} className="w-full h-full rounded-lg" title={previewDoc.nom} />
                  }
                  if (isText) {
                    try {
                      const text = atob(previewDoc.file_data)
                      return (
                        <pre
                          className="w-full h-full overflow-auto p-6 rounded-lg text-sm font-mono whitespace-pre-wrap"
                          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)' }}
                        >
                          {text}
                        </pre>
                      )
                    } catch {
                      return <p style={{ color: 'var(--text-muted)' }}>Impossible de décoder le contenu texte.</p>
                    }
                  }

                  return (
                    <div className="text-center">
                      <File size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Aperçu non disponible pour ce type de fichier
                      </p>
                      <p className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
                        {mime || ext || 'Type inconnu'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Utilisez le bouton Télécharger pour ouvrir ce fichier.
                      </p>
                    </div>
                  )
                })()
              ) : (
                <div className="text-center">
                  <File size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Ce document n'a pas de contenu enregistré.
                  </p>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    Il a été ajouté avant l'activation du stockage de fichiers.
                  </p>
                  <label
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    <Upload size={14} />
                    Ré-importer le fichier
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          const buffer = await file.arrayBuffer()
                          const base64 = arrayBufferToBase64(buffer)
                          updateDocument(previewDoc.id, {
                            file_data: base64,
                            mime_type: file.type || previewDoc.mime_type,
                            taille: file.size,
                          })
                          setPreviewDoc({ ...previewDoc, file_data: base64, mime_type: file.type || previewDoc.mime_type, taille: file.size })
                        } catch (err) {
                          console.error('Re-import failed:', err)
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Download toast */}
            {downloadMsg && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm animate-[fadeInUp_0.3s_ease-out]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Check size={15} style={{ color: '#10B981' }} />
                {downloadMsg}
              </div>
            )}
          </div>
        </>
      )}

      {/* Note Editor */}
      <NoteEditor
        isOpen={noteOpen}
        onClose={() => { setNoteOpen(false); setEditingNote(null) }}
        onSave={handleSaveNote}
        initialTitle={editingNote?.title || ''}
        initialContent={editingNote?.content || ''}
        initialProjetId={editingNote?.projet_id || ''}
        initialClientId={editingNote?.client_id || ''}
        initialTags={editingNote?.tags || []}
        projects={projects}
        clients={clients}
      />
    </div>
  )
}

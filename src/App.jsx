import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import useStore from './store/useStore'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import UpdateBanner from './components/UpdateBanner'
import Onboarding from './components/Onboarding'
import { ConfirmProvider } from './components/ConfirmDialog'
import NotificationBell from './components/NotificationBell'
import NoteEditor from './components/NoteEditor'
import CommandCenter from './pages/CommandCenter'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import Finances from './pages/Finances'
import Goals from './pages/Goals'
import Tasks from './pages/Tasks'
import Trash from './pages/Trash'
import SettingsPage from './pages/SettingsPage'
import Calendar from './pages/Calendar'
import Documents from './pages/Documents'

function App() {
  const initialize = useStore((s) => s.initialize)
  const dbReady = useStore((s) => s.dbReady)
  const onboardingDone = useStore((s) => s.onboardingDone)
  const commandPaletteOpen = useStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)
  const theme = useStore((s) => s.theme)
  const addDocument = useStore((s) => s.addDocument)
  const projects = useStore((s) => s.projects)
  const clients = useStore((s) => s.clients)
  const [quickNoteOpen, setQuickNoteOpen] = useState(false)

  const handleQuickNoteSave = ({ title, content, projet_id, client_id, tags }) => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(content)
    const base64 = btoa(String.fromCharCode(...bytes))
    addDocument({
      nom: title,
      folder_id: null, // root folder
      mime_type: 'text/markdown',
      taille: bytes.length,
      file_data: base64,
      projet_id: projet_id || null,
      client_id: client_id || null,
      tags: tags || [],
    })
  }

  useEffect(() => {
    initialize()
  }, [initialize])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setQuickNoteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  if (!dbReady) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'var(--bg-page)' }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Chargement…
          </p>
        </div>
      </div>
    )
  }

  if (!onboardingDone) {
    return <Onboarding />
  }

  return (
    <ConfirmProvider>
      <div
        className="flex flex-col h-screen overflow-hidden transition-colors duration-200"
        style={{ background: 'var(--bg-page)' }}
      >
        <UpdateBanner />
        <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div
            className="flex items-center justify-end gap-2 px-4 py-2 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-secondary)' }}
          >
            <button
              onClick={() => setQuickNoteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg hover:opacity-80 transition-colors"
              style={{ color: 'var(--text-tertiary)', background: 'var(--bg-nested)' }}
              title="Note rapide"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z"/></svg>
              Note
            </button>
            <NotificationBell />
          </div>
          <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/projets" element={<Projects />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/objectifs" element={<Goals />} />
            <Route path="/taches" element={<Tasks />} />
            <Route path="/calendrier" element={<Calendar />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/corbeille" element={<Trash />} />
            <Route path="/parametres" element={<SettingsPage />} />
          </Routes>
        </main>
        </div>
        <CommandPalette />
        <NoteEditor
          isOpen={quickNoteOpen}
          onClose={() => setQuickNoteOpen(false)}
          onSave={handleQuickNoteSave}
          initialTitle=""
          initialContent=""
          projects={projects}
          clients={clients}
        />
        </div>
      </div>
    </ConfirmProvider>
  )
}

export default App

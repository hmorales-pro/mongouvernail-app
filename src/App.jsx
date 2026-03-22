import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import useStore from './store/useStore'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import UpdateBanner from './components/UpdateBanner'
import Onboarding from './components/Onboarding'
import CommandCenter from './pages/CommandCenter'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import Finances from './pages/Finances'
import Goals from './pages/Goals'
import Tasks from './pages/Tasks'
import Trash from './pages/Trash'
import SettingsPage from './pages/SettingsPage'

function App() {
  const initialize = useStore((s) => s.initialize)
  const dbReady = useStore((s) => s.dbReady)
  const onboardingDone = useStore((s) => s.onboardingDone)
  const commandPaletteOpen = useStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useStore((s) => s.setCommandPaletteOpen)
  const theme = useStore((s) => s.theme)

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
    <div
      className="flex flex-col h-screen overflow-hidden transition-colors duration-200"
      style={{ background: 'var(--bg-page)' }}
    >
      <UpdateBanner />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/projets" element={<Projects />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/objectifs" element={<Goals />} />
          <Route path="/taches" element={<Tasks />} />
          <Route path="/corbeille" element={<Trash />} />
          <Route path="/parametres" element={<SettingsPage />} />
        </Routes>
      </main>
      <CommandPalette />
      </div>
    </div>
  )
}

export default App

import { useState } from 'react'
import { ArrowRight, Sun, Moon, Database, Sparkles } from 'lucide-react'
import useStore from '../store/useStore'
import Logo from './Logo'

const ACTIVITES = [
  { value: 'freelance', label: 'Freelance / Indépendant' },
  { value: 'agence', label: 'Agence / Studio' },
  { value: 'startup', label: 'Startup / SaaS' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'createur', label: 'Créateur de contenu' },
  { value: 'autre', label: 'Autre' },
]

const STEPS = ['prenom', 'activite', 'theme', 'workspace', 'done']

export default function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)

  const [step, setStep] = useState(0)
  const [prenom, setPrenom] = useState('')
  const [activite, setActivite] = useState('')
  const [theme, setTheme] = useState('light')
  const [workspaceName, setWorkspaceName] = useState('')


  const currentStep = STEPS[step]
  const canNext =
    (currentStep === 'prenom' && prenom.trim().length > 0) ||
    (currentStep === 'activite') ||
    (currentStep === 'theme') ||
    (currentStep === 'workspace') ||
    (currentStep === 'done')

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    }
  }

  const finish = () => {
    completeOnboarding({
      prenom: prenom.trim(),
      activite,
      theme,
      workspaceName: workspaceName.trim() || 'Principal',
    })
  }

  // Apply theme preview in real-time
  const previewTheme = (t) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="w-full max-w-md px-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                background: i <= step ? '#3B82F6' : 'var(--border-primary)',
              }}
            />
          ))}
        </div>

        {/* Step: Prénom */}
        {currentStep === 'prenom' && (
          <div className="text-center">
            <div className="mb-4 flex justify-center"><Logo size={56} /></div>
            <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Bienvenue sur MonGouvernail
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>
              Votre tableau de bord personnel pour piloter votre activité.
            </p>
            <div>
              <label className="block text-xs font-medium mb-2 text-left" style={{ color: 'var(--text-secondary)' }}>
                Comment vous appelez-vous ?
              </label>
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canNext) next() }}
                placeholder="Votre prénom"
                className="w-full t-input rounded-lg px-4 py-3 text-base outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step: Activité */}
        {currentStep === 'activite' && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Quelle est votre activité, {prenom} ?
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
              Cela nous aide à adapter l'expérience.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setActivite(a.value)}
                  className="px-4 py-3 rounded-lg text-sm text-left transition-all"
                  style={{
                    background: activite === a.value ? 'var(--bg-nested)' : 'var(--bg-card)',
                    color: activite === a.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: activite === a.value ? '2px solid #3B82F6' : '2px solid var(--border-secondary)',
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Thème */}
        {currentStep === 'theme' && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Choisissez votre ambiance
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
              Vous pourrez changer à tout moment.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => previewTheme('light')}
                className="flex-1 rounded-xl p-5 transition-all flex flex-col items-center gap-3"
                style={{
                  background: '#FFFFFF',
                  border: theme === 'light' ? '2px solid #3B82F6' : '2px solid #E5E7EB',
                }}
              >
                <Sun size={28} color="#F59E0B" />
                <span className="text-sm font-medium" style={{ color: '#1F2937' }}>Clair</span>
                <div className="w-full space-y-1.5">
                  <div className="h-2 rounded bg-gray-200 w-full" />
                  <div className="h-2 rounded bg-gray-200 w-3/4" />
                  <div className="h-2 rounded bg-gray-100 w-1/2" />
                </div>
              </button>
              <button
                onClick={() => previewTheme('dark')}
                className="flex-1 rounded-xl p-5 transition-all flex flex-col items-center gap-3"
                style={{
                  background: '#111827',
                  border: theme === 'dark' ? '2px solid #3B82F6' : '2px solid #374151',
                }}
              >
                <Moon size={28} color="#60A5FA" />
                <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Sombre</span>
                <div className="w-full space-y-1.5">
                  <div className="h-2 rounded w-full" style={{ background: '#1F2937' }} />
                  <div className="h-2 rounded w-3/4" style={{ background: '#1F2937' }} />
                  <div className="h-2 rounded w-1/2" style={{ background: '#111827' }} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step: Workspace + Demo data */}
        {currentStep === 'workspace' && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Votre premier espace de travail
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
              Vous pourrez en créer d'autres plus tard.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2 text-left" style={{ color: 'var(--text-secondary)' }}>
                  Nom de votre espace de travail
                </label>
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') next() }}
                  placeholder="Principal"
                  className="w-full t-input rounded-lg px-4 py-3 text-sm outline-none"
                />
              </div>

              <div
                className="rounded-lg p-4 text-left"
                style={{ background: 'var(--bg-nested)', border: '1px solid var(--border-secondary)' }}
              >
                <div className="flex items-start gap-3">
                  <Database size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#3B82F6' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Un espace « Démo » sera aussi créé
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      Il contient des clients, projets et transactions fictifs pour explorer l'interface. Vous pourrez le supprimer à tout moment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {currentStep === 'done' && (
          <div className="text-center">
            <div className="text-4xl mb-4">
              <Sparkles size={40} className="mx-auto text-yellow-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Tout est prêt, {prenom} !
            </h2>
            <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Votre tableau de bord est configuré.
            </p>
            <div
              className="inline-flex flex-col gap-1 text-left text-[11px] rounded-lg p-3 mt-2 mb-4"
              style={{ background: 'var(--bg-nested)', color: 'var(--text-secondary)' }}
            >
              <span className="flex items-center gap-1"><Logo size={12} /> Espace : <strong>{workspaceName || 'Principal'}</strong></span>
              <span>{theme === 'light' ? '☀️' : '🌙'} Thème : <strong>{theme === 'light' ? 'Clair' : 'Sombre'}</strong></span>
              {activite && <span>💼 Activité : <strong>{ACTIVITES.find((a) => a.value === activite)?.label || activite}</strong></span>}
              <span>📊 Espace « Démo » inclus</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <div>
            {step > 0 && currentStep !== 'done' && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Retour
              </button>
            )}
          </div>

          {currentStep === 'done' ? (
            <button
              onClick={finish}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors mx-auto"
            >
              Commencer <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!canNext}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ml-auto"
              style={{
                background: canNext ? '#3B82F6' : 'var(--bg-nested)',
                color: canNext ? '#fff' : 'var(--text-muted)',
                cursor: canNext ? 'pointer' : 'not-allowed',
              }}
            >
              Continuer <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { checkForUpdates } from '../utils/updateChecker'

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check once on mount, with a small delay to not block startup
    const timer = setTimeout(async () => {
      const info = await checkForUpdates()
      if (info) setUpdate(info)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (!update || dismissed) return null

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 text-sm"
      style={{
        background: 'linear-gradient(90deg, #3B82F6, #6366F1)',
        color: '#fff',
      }}
    >
      <Download size={14} />
      <span className="flex-1">
        Nouvelle version <strong>{update.latestVersion}</strong> disponible
        {update.notes && <span className="opacity-80"> — {update.notes}</span>}
      </span>
      <a
        href={update.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2.5 py-1 text-xs font-medium rounded bg-white/20 hover:bg-white/30 transition-colors"
      >
        Télécharger
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 hover:opacity-75"
      >
        <X size={14} />
      </button>
    </div>
  )
}

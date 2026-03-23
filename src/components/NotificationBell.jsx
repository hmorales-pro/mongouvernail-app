import { useState, useRef, useEffect } from 'react'
import { Bell, X, ListTodo, Wallet, Users, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import useNotifications from '../hooks/useNotifications'

const SEVERITY_COLORS = {
  critical: { bg: '#EF444415', border: '#EF444430', dot: '#EF4444' },
  warning: { bg: '#F59E0B12', border: '#F59E0B25', dot: '#F59E0B' },
  info: { bg: '#3B82F612', border: '#3B82F620', dot: '#3B82F6' },
}

const TYPE_ICONS = {
  task: ListTodo,
  finance: Wallet,
  client: Users,
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const notifications = useNotifications()
  const dismissedIds = useStore((s) => s.notificationSettings?.dismissedIds || [])
  const dismissNotification = useStore((s) => s.dismissNotification)

  const visible = notifications.filter((n) => !dismissedIds.includes(n.id))
  const count = visible.length

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-colors"
        style={{
          color: count > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
          background: open ? 'var(--bg-nested)' : 'transparent',
        }}
        title={`${count} notification${count !== 1 ? 's' : ''}`}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ background: '#EF4444' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            width: 380,
            maxHeight: 480,
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border-secondary)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{
                color: count > 0 ? '#EF4444' : 'var(--text-muted)',
                background: count > 0 ? '#EF444412' : 'var(--bg-nested)',
              }}
            >
              {count}
            </span>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
            {visible.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Aucune notification
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {visible.map((notif) => {
                  const colors = SEVERITY_COLORS[notif.severity] || SEVERITY_COLORS.info
                  const Icon = TYPE_ICONS[notif.icon] || Bell
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors group"
                      style={{ background: colors.bg }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: colors.dot + '20' }}
                      >
                        <Icon size={13} style={{ color: colors.dot }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {notif.title}
                        </p>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {notif.message}
                        </p>
                        {notif.link && (
                          <Link
                            to={notif.link}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium mt-1 transition-colors"
                            style={{ color: colors.dot }}
                          >
                            Voir <ChevronRight size={10} />
                          </Link>
                        )}
                      </div>
                      <button
                        onClick={() => dismissNotification(notif.id)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                        title="Masquer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

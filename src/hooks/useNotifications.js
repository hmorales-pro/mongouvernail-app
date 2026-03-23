import { useMemo } from 'react'
import useStore from '../store/useStore'
import { daysUntil, formatCurrency, formatDateShort } from '../utils/helpers'

/**
 * Génère les notifications/rappels à partir des données du store.
 * Retourne un tableau trié par priorité (critique → info).
 */
export default function useNotifications() {
  const tasks = useStore((s) => s.tasks)
  const transactions = useStore((s) => s.transactions)
  const clients = useStore((s) => s.clients)
  const projects = useStore((s) => s.projects)
  const notificationSettings = useStore((s) => s.notificationSettings)

  return useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const alerts = []
    const delai = notificationSettings?.delaiJours ?? 3

    // ── 1. Tâches en retard ou bientôt dues ──
    tasks.forEach((t) => {
      if (t.statut === 'Terminé' || !t.date_echeance) return
      const days = daysUntil(t.date_echeance)

      if (days < 0) {
        alerts.push({
          id: `task-overdue-${t.id}`,
          type: 'task',
          severity: 'critical',
          icon: 'task',
          title: t.titre,
          message: `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`,
          date: t.date_echeance,
          link: '/taches',
        })
      } else if (days <= delai) {
        alerts.push({
          id: `task-soon-${t.id}`,
          type: 'task',
          severity: days === 0 ? 'critical' : 'warning',
          icon: 'task',
          title: t.titre,
          message: days === 0 ? "Échéance aujourd'hui" : `Échéance dans ${days} jour${days > 1 ? 's' : ''}`,
          date: t.date_echeance,
          link: '/taches',
        })
      }
    })

    // ── 2. Échéances financières (factures en retard / bientôt dues) ──
    transactions.forEach((tx) => {
      if (tx.statut === 'Encaissée') return

      // Retards
      if (tx.statut === 'En retard') {
        const days = tx.date_echeance ? Math.abs(daysUntil(tx.date_echeance)) : 0
        alerts.push({
          id: `tx-overdue-${tx.id}`,
          type: 'finance',
          severity: 'critical',
          icon: 'finance',
          title: tx.reference || formatCurrency(tx.montant_ttc),
          message: `En retard${days > 0 ? ` de ${days}j` : ''} · ${formatCurrency(tx.montant_ttc)}`,
          date: tx.date_echeance,
          link: '/finances',
        })
        return
      }

      // Bientôt dues
      if (tx.date_echeance && tx.type !== 'Abonnement') {
        const days = daysUntil(tx.date_echeance)
        if (days >= 0 && days <= delai) {
          alerts.push({
            id: `tx-soon-${tx.id}`,
            type: 'finance',
            severity: days === 0 ? 'critical' : 'warning',
            icon: 'finance',
            title: tx.reference || formatCurrency(tx.montant_ttc),
            message: days === 0
              ? `Échéance aujourd'hui · ${formatCurrency(tx.montant_ttc)}`
              : `Échéance dans ${days}j · ${formatCurrency(tx.montant_ttc)}`,
            date: tx.date_echeance,
            link: '/finances',
          })
        }
      }
    })

    // ── 3. Jalons clients proches ou dépassés ──
    clients.forEach((c) => {
      if (c.statut !== 'Actif' && c.statut !== 'Prospect') return
      const jalon = c.prochain_jalon
      if (!jalon?.date || !jalon?.texte) return

      const days = daysUntil(jalon.date)

      if (days < 0) {
        alerts.push({
          id: `client-jalon-${c.id}`,
          type: 'client',
          severity: 'warning',
          icon: 'client',
          title: c.nom.split('—')[0]?.trim(),
          message: `Jalon dépassé : ${jalon.texte}`,
          date: jalon.date,
          link: '/clients',
        })
      } else if (days <= delai) {
        alerts.push({
          id: `client-jalon-soon-${c.id}`,
          type: 'client',
          severity: days === 0 ? 'warning' : 'info',
          icon: 'client',
          title: c.nom.split('—')[0]?.trim(),
          message: days === 0
            ? `Jalon aujourd'hui : ${jalon.texte}`
            : `Jalon dans ${days}j : ${jalon.texte}`,
          date: jalon.date,
          link: '/clients',
        })
      }
    })

    // ── Tri par sévérité puis par date ──
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => {
      const diff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
      if (diff !== 0) return diff
      return new Date(a.date || 0) - new Date(b.date || 0)
    })

    return alerts
  }, [tasks, transactions, clients, projects, notificationSettings])
}

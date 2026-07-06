// ── Suggestions proactives ──
// Analyse déterministe des données du workspace pour faire remonter des
// actions à mener (relances, retards, échéances…). Aucune dépendance à
// Ollama : c'est instantané et fonctionne toujours, même IA désactivée.
// Chaque insight peut proposer un « prompt » à envoyer à l'assistant IA.

import { daysSince, daysUntil, formatCurrency } from '../utils/helpers'
import { RELANCE_THRESHOLD_DAYS } from '../utils/constants'

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }

/**
 * @param {Object} data - { clients, projects, tasks, transactions, goals }
 * @returns {Array<{id,severity,icon,title,description,to,prompt?}>}
 */
export function computeInsights(data) {
  const { clients = [], projects = [], tasks = [], transactions = [], goals = [] } = data
  const insights = []

  // ── Clients à relancer ──
  const relances = clients
    .filter((c) => c.statut !== 'Terminé' && c.derniere_interaction && daysSince(c.derniere_interaction) >= RELANCE_THRESHOLD_DAYS)
    .sort((a, b) => daysSince(b.derniere_interaction) - daysSince(a.derniere_interaction))

  if (relances.length) {
    const top = relances[0]
    insights.push({
      id: 'relances',
      severity: 'high',
      icon: '📇',
      title: relances.length === 1 ? '1 client à relancer' : `${relances.length} clients à relancer`,
      description: `${top.nom} n'a pas été contacté depuis ${daysSince(top.derniere_interaction)} jours.`,
      to: '/clients',
      prompt: `Rédige un email de relance chaleureux et professionnel pour ${top.nom}, sans contact depuis ${daysSince(top.derniere_interaction)} jours.`,
    })
  }

  // ── Tâches en retard ──
  const overdue = tasks
    .filter((t) => t.statut !== 'Terminé' && t.date_echeance && daysUntil(t.date_echeance) < 0)
    .sort((a, b) => daysUntil(a.date_echeance) - daysUntil(b.date_echeance))

  if (overdue.length) {
    insights.push({
      id: 'taches-retard',
      severity: 'high',
      icon: '⏰',
      title: overdue.length === 1 ? '1 tâche en retard' : `${overdue.length} tâches en retard`,
      description: `« ${overdue[0].titre} » — en retard de ${Math.abs(daysUntil(overdue[0].date_echeance))} j.`,
      to: '/taches',
      prompt: `Voici mes tâches en retard. Aide-moi à les prioriser et propose un plan pour les rattraper.`,
    })
  }

  // ── Échéances proches (≤ 3 jours, non en retard) ──
  const soon = tasks.filter((t) => {
    if (t.statut === 'Terminé' || !t.date_echeance) return false
    const d = daysUntil(t.date_echeance)
    return d >= 0 && d <= 3
  })

  if (soon.length) {
    insights.push({
      id: 'taches-proches',
      severity: 'medium',
      icon: '📅',
      title: `${soon.length} échéance${soon.length > 1 ? 's' : ''} sous 3 jours`,
      description: soon.map((t) => t.titre).slice(0, 2).join(' · ') + (soon.length > 2 ? '…' : ''),
      to: '/taches',
      prompt: `Résume mes tâches à échéance dans les 3 prochains jours et dis-moi par laquelle commencer.`,
    })
  }

  // ── Factures en retard ──
  const lateInvoices = transactions.filter((t) => t.statut === 'En retard')
  if (lateInvoices.length) {
    const total = lateInvoices.reduce((s, t) => s + (t.montant_ttc || 0), 0)
    insights.push({
      id: 'factures-retard',
      severity: 'high',
      icon: '🔴',
      title: `${formatCurrency(total)} en retard de paiement`,
      description: `${lateInvoices.length} facture${lateInvoices.length > 1 ? 's' : ''} non encaissée${lateInvoices.length > 1 ? 's' : ''} au-delà de l'échéance.`,
      to: '/finances',
      prompt: `Rédige une relance de paiement ferme mais courtoise pour mes factures en retard.`,
    })
  }

  // ── Factures à émettre ──
  const toIssue = transactions.filter((t) => t.statut === 'À émettre')
  if (toIssue.length) {
    const total = toIssue.reduce((s, t) => s + (t.montant_ttc || 0), 0)
    insights.push({
      id: 'factures-emettre',
      severity: 'medium',
      icon: '🧾',
      title: `${toIssue.length} facture${toIssue.length > 1 ? 's' : ''} à émettre`,
      description: `${formatCurrency(total)} en attente d'émission.`,
      to: '/finances',
    })
  }

  // ── Projets actifs sans tâche en cours ──
  const stalledProjects = projects.filter((p) => {
    if (p.statut !== 'Actif') return false
    const projectTasks = tasks.filter((t) => t.projet_id === p.id && t.statut !== 'Terminé')
    return projectTasks.length === 0
  })

  if (stalledProjects.length) {
    insights.push({
      id: 'projets-sans-taches',
      severity: 'low',
      icon: '🗂️',
      title: `${stalledProjects.length} projet${stalledProjects.length > 1 ? 's' : ''} sans tâche active`,
      description: `${stalledProjects[0].nom}${stalledProjects.length > 1 ? ` +${stalledProjects.length - 1}` : ''} n'a plus de tâche ouverte.`,
      to: '/projets',
      prompt: `Le projet « ${stalledProjects[0].nom} » n'a plus de tâche active. Propose-moi 3 à 5 prochaines étapes concrètes.`,
    })
  }

  // ── Objectifs en retard sur la deadline ──
  const goalsAtRisk = goals.filter((g) => {
    const deadline = g.date_fin || g.deadline
    if (!deadline) return false
    const d = daysUntil(deadline)
    const cible = g.valeur_cible ?? g.cible
    const actuel = g.valeur_actuelle ?? g.actuel ?? 0
    if (cible == null) return false
    // À risque : deadline sous 14 j et moins de 70 % atteint
    return d >= 0 && d <= 14 && actuel < cible * 0.7
  })

  if (goalsAtRisk.length) {
    insights.push({
      id: 'objectifs-risque',
      severity: 'low',
      icon: '🎯',
      title: `${goalsAtRisk.length} objectif${goalsAtRisk.length > 1 ? 's' : ''} à risque`,
      description: `« ${goalsAtRisk[0].titre || goalsAtRisk[0].type} » approche de son échéance sans être atteint.`,
      to: '/objectifs',
    })
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

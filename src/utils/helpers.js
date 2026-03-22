export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateStr))
}

export function daysSince(dateStr) {
  if (!dateStr) return Infinity
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function daysUntil(dateStr) {
  if (!dateStr) return Infinity
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function calculateGoalProgress(goal) {
  if (!goal || !goal.valeur_cible || goal.valeur_cible === 0) return 0
  return Math.min(100, Math.round((goal.valeur_actuelle / goal.valeur_cible) * 100))
}

export function getRelationHealth(lastInteraction, thresholdDays = 14) {
  const days = daysSince(lastInteraction)
  if (days <= thresholdDays / 2) return 'good'
  if (days <= thresholdDays) return 'warning'
  return 'danger'
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

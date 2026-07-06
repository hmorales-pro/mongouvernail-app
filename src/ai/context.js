// ── Construction du contexte pour l'assistant local ──
// Résume les données du workspace actif (clients, projets, tâches, finances,
// objectifs) en un texte compact injecté dans le prompt système. Le modèle
// peut ainsi répondre à des questions concrètes sur l'activité de l'utilisateur
// sans qu'aucune donnée ne sorte de la machine.

import { formatCurrency, daysSince, daysUntil } from '../utils/helpers'
import { RELANCE_THRESHOLD_DAYS } from '../utils/constants'

function section(title, lines) {
  if (!lines.length) return ''
  return `\n## ${title}\n${lines.join('\n')}`
}

/**
 * Construit un instantané textuel des données du workspace.
 * @param {Object} data - { clients, projects, tasks, transactions, goals }
 * @param {Object} [opts]
 * @param {number} [opts.maxItems=12] - nombre max d'éléments par section
 */
export function buildDataSnapshot(data, { maxItems = 12 } = {}) {
  const { clients = [], projects = [], tasks = [], transactions = [], goals = [] } = data
  const parts = []

  // ── Clients & relances ──
  const activeClients = clients.filter((c) => c.statut !== 'Terminé')
  const relances = activeClients
    .filter((c) => c.derniere_interaction && daysSince(c.derniere_interaction) >= RELANCE_THRESHOLD_DAYS)
    .sort((a, b) => daysSince(b.derniere_interaction) - daysSince(a.derniere_interaction))

  parts.push(
    section(
      `Clients (${clients.length} au total, ${activeClients.length} actifs)`,
      activeClients.slice(0, maxItems).map((c) => {
        const last = c.derniere_interaction
          ? `dernier contact il y a ${daysSince(c.derniere_interaction)} j`
          : 'aucun contact enregistré'
        const jalon = c.prochain_jalon?.texte ? ` — prochain jalon : ${c.prochain_jalon.texte}` : ''
        return `- ${c.nom} [${c.type} · ${c.statut}] — ${last}${jalon}`
      })
    )
  )

  if (relances.length) {
    parts.push(
      section(
        `Clients à relancer (sans contact depuis ${RELANCE_THRESHOLD_DAYS} j+)`,
        relances.slice(0, maxItems).map(
          (c) => `- ${c.nom} — ${daysSince(c.derniere_interaction)} j sans contact`
        )
      )
    )
  }

  // ── Projets ──
  const activeProjects = projects.filter((p) => p.statut === 'Actif')
  parts.push(
    section(
      `Projets (${activeProjects.length} actifs)`,
      activeProjects.slice(0, maxItems).map((p) => {
        const deadline = p.deadline ? ` — échéance dans ${daysUntil(p.deadline)} j` : ''
        return `- ${p.nom} [${p.categorie} · ${p.priorite}]${deadline}`
      })
    )
  )

  // ── Tâches ──
  const openTasks = tasks.filter((t) => t.statut !== 'Terminé')
  const sortedTasks = [...openTasks].sort((a, b) => {
    const da = a.date_echeance ? daysUntil(a.date_echeance) : 9999
    const db = b.date_echeance ? daysUntil(b.date_echeance) : 9999
    return da - db
  })
  parts.push(
    section(
      `Tâches en cours (${openTasks.length})`,
      sortedTasks.slice(0, maxItems).map((t) => {
        let ech = ''
        if (t.date_echeance) {
          const d = daysUntil(t.date_echeance)
          ech = d < 0 ? ` — EN RETARD de ${Math.abs(d)} j` : ` — échéance dans ${d} j`
        }
        return `- ${t.titre} [${t.priorite} · ${t.statut}]${ech}`
      })
    )
  )

  // ── Finances ──
  const encaisse = transactions
    .filter((t) => t.statut === 'Encaissée')
    .reduce((s, t) => s + (t.montant_ttc || 0), 0)
  const enAttente = transactions
    .filter((t) => ['Envoyée', 'En attente', 'À émettre'].includes(t.statut))
    .reduce((s, t) => s + (t.montant_ttc || 0), 0)
  const enRetard = transactions.filter((t) => t.statut === 'En retard')
  const enRetardTotal = enRetard.reduce((s, t) => s + (t.montant_ttc || 0), 0)

  const financeLines = [
    `- Encaissé (total) : ${formatCurrency(encaisse)}`,
    `- En attente d'encaissement : ${formatCurrency(enAttente)}`,
  ]
  if (enRetard.length) {
    financeLines.push(`- En retard : ${formatCurrency(enRetardTotal)} sur ${enRetard.length} facture(s)`)
    enRetard.slice(0, maxItems).forEach((t) => {
      financeLines.push(`  · ${t.reference || t.type} — ${formatCurrency(t.montant_ttc || 0)}`)
    })
  }
  parts.push(section('Finances', financeLines))

  // ── Objectifs ──
  if (goals.length) {
    parts.push(
      section(
        `Objectifs (${goals.length})`,
        goals.slice(0, maxItems).map((g) => {
          const cible = g.cible != null ? ` — cible ${g.cible}` : ''
          const actuel = g.actuel != null ? `, actuel ${g.actuel}` : ''
          return `- ${g.titre || g.type}${cible}${actuel}`
        })
      )
    )
  }

  return parts.filter(Boolean).join('\n').trim()
}

/**
 * Construit le message système complet pour l'assistant.
 */
export function buildSystemPrompt(data, { userProfile, workspaceName } = {}) {
  const prenom = userProfile?.prenom ? ` ${userProfile.prenom}` : ''
  const snapshot = buildDataSnapshot(data)

  return `Tu es l'assistant de Mon Gouvernail, une application locale de pilotage d'activité pour indépendants et freelances. Tu aides${prenom ? ` ${userProfile.prenom}` : ' l\'utilisateur'} à gérer ses clients, projets, tâches, finances et objectifs.

Règles :
- Réponds en français, de façon concise, concrète et actionnable.
- Appuie-toi UNIQUEMENT sur les données ci-dessous. Si l'information manque, dis-le clairement plutôt que d'inventer.
- Cite des chiffres et des noms précis quand ils sont disponibles.
- Pour la rédaction (emails de relance, résumés…), adopte un ton professionnel et chaleureux.
- Tu tournes en local (Ollama), aucune donnée ne quitte la machine.

# Données de l'espace « ${workspaceName || 'Principal'} » (instantané)
${snapshot || 'Aucune donnée pour le moment.'}`
}

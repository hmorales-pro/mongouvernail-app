// ── Corpus indexable pour la recherche sémantique ──
// Transforme les données du workspace en une liste d'éléments homogènes
// { id, type, label, sublabel, to, text } où `text` est la représentation
// textuelle indexée (nom + notes + tags + contenu des notes).

const clean = (v) => (v == null ? '' : String(v)).trim()

function tagsToText(tags) {
  if (!Array.isArray(tags)) return ''
  return tags.join(' ')
}

/**
 * @param {Object} data - { clients, projects, tasks, goals, documents }
 * @param {(doc) => string|null} [getDocContent] - renvoie le texte décodé d'un
 *        document (notes markdown). Optionnel : si absent, seules les
 *        métadonnées du document sont indexées.
 * @returns {Array<{id,type,label,sublabel,to,text}>}
 */
export function buildCorpus(data, getDocContent) {
  const { clients = [], projects = [], tasks = [], goals = [], documents = [] } = data
  const items = []

  for (const c of clients) {
    const contact = c.contact_principal
      ? `${clean(c.contact_principal.nom)} ${clean(c.contact_principal.email)}`
      : ''
    const jalon = clean(c.prochain_jalon?.texte)
    items.push({
      id: c.id,
      type: 'client',
      label: c.nom,
      sublabel: `Client · ${clean(c.type)}${c.statut ? ` · ${c.statut}` : ''}`,
      to: '/clients',
      text: [c.nom, c.type, c.statut, contact, jalon, clean(c.notes), tagsToText(c.tags)]
        .filter(Boolean)
        .join(' — '),
    })
  }

  for (const p of projects) {
    items.push({
      id: p.id,
      type: 'projet',
      label: p.nom,
      sublabel: `Projet · ${clean(p.categorie)}${p.statut ? ` · ${p.statut}` : ''}`,
      to: '/projets',
      text: [p.nom, p.categorie, p.statut, p.priorite, clean(p.notes), tagsToText(p.tags)]
        .filter(Boolean)
        .join(' — '),
    })
  }

  for (const t of tasks) {
    items.push({
      id: t.id,
      type: 'tache',
      label: t.titre,
      sublabel: `Tâche · ${clean(t.priorite)}${t.statut ? ` · ${t.statut}` : ''}`,
      to: '/taches',
      text: [t.titre, t.priorite, t.statut, clean(t.notes), tagsToText(t.tags)]
        .filter(Boolean)
        .join(' — '),
    })
  }

  for (const g of goals) {
    const label = g.titre || g.type
    items.push({
      id: g.id,
      type: 'objectif',
      label,
      sublabel: 'Objectif',
      to: '/objectifs',
      text: [label, g.type, clean(g.notes)].filter(Boolean).join(' — '),
    })
  }

  for (const d of documents) {
    let body = ''
    // Indexe le contenu textuel des notes/markdown si un loader est fourni.
    if (getDocContent && /text|markdown/.test(clean(d.mime_type))) {
      body = clean(getDocContent(d)) || ''
    }
    items.push({
      id: d.id,
      type: 'document',
      label: d.nom,
      sublabel: 'Document',
      to: '/documents',
      text: [d.nom, clean(d.notes), tagsToText(d.tags), body].filter(Boolean).join(' — '),
    })
  }

  return items.filter((it) => it.text && it.text.length > 0)
}

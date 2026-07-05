// ── Recherche sémantique locale ──
// Calcule des embeddings via Ollama (modèle dédié type « nomic-embed-text »)
// et classe les éléments par similarité cosinus. Les vecteurs sont mis en
// cache par hash de contenu : on ne recalcule que ce qui a changé. Si Ollama
// n'est pas disponible, on retombe proprement sur une recherche par mot-clé.

export const DEFAULT_EMBED_MODEL = 'nomic-embed-text'

/** Hash déterministe (djb2) d'une chaîne — sert de clé de cache par contenu. */
export function hashText(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/** Similarité cosinus entre deux vecteurs de même dimension. */
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || 'http://localhost:11434').trim().replace(/\/+$/, '')
}

/**
 * Calcule les embeddings d'une liste de textes.
 * Utilise /api/embed (batch) avec repli sur /api/embeddings (unitaire) pour
 * les versions plus anciennes d'Ollama.
 * @returns {Promise<number[][]>}
 */
export async function embedTexts({ baseUrl, model, texts, signal }) {
  const base = normalizeBaseUrl(baseUrl)
  const mdl = model || DEFAULT_EMBED_MODEL
  if (!texts.length) return []

  // Tentative batch (Ollama récent).
  try {
    const res = await fetch(`${base}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: mdl, input: texts }),
      signal,
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.embeddings) && data.embeddings.length === texts.length) {
        return data.embeddings
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // sinon on tente le mode unitaire ci-dessous
  }

  // Repli : /api/embeddings, un texte à la fois.
  const out = []
  for (const text of texts) {
    const res = await fetch(`${base}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: mdl, prompt: text }),
      signal,
    })
    if (!res.ok) throw new Error(`Embeddings indisponibles (HTTP ${res.status})`)
    const data = await res.json()
    out.push(data.embedding || [])
  }
  return out
}

/** Recherche par mot-clé (repli quand les embeddings sont indisponibles). */
export function keywordSearch(query, items, { topK = 20 } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  return items
    .map((it) => {
      const text = it.text.toLowerCase()
      let score = 0
      for (const term of terms) {
        if (text.includes(term)) score += 1
      }
      return { ...it, score }
    })
    .filter((it) => it.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * Recherche sémantique sur un corpus.
 *
 * @param {Object} params
 * @param {string} params.query
 * @param {Array<{id,type,label,sublabel,to,text}>} params.items
 * @param {Object} params.cache  - map { "type:id": { hash, vec } } (mutée en place)
 * @param {string} params.baseUrl
 * @param {string} params.model
 * @param {AbortSignal} [params.signal]
 * @param {number} [params.topK=20]
 * @param {number} [params.minScore=0.35]
 * @returns {Promise<{results, cacheUpdated: boolean, mode: 'semantic'|'keyword'}>}
 */
export async function semanticSearch({
  query,
  items,
  cache = {},
  baseUrl,
  model,
  signal,
  topK = 20,
  minScore = 0.35,
}) {
  const q = query.trim()
  if (!q) return { results: [], cacheUpdated: false, mode: 'semantic' }

  // Détermine les éléments dont le vecteur doit être (re)calculé.
  const toEmbed = []
  for (const it of items) {
    const key = `${it.type}:${it.id}`
    const h = hashText(it.text)
    if (!cache[key] || cache[key].hash !== h) {
      toEmbed.push({ key, hash: h, it })
    }
  }

  let cacheUpdated = false
  try {
    // Embarque en une passe les items manquants + la requête.
    const inputs = [q, ...toEmbed.map((e) => e.it.text)]
    const vectors = await embedTexts({ baseUrl, model, texts: inputs, signal })
    const queryVec = vectors[0]

    toEmbed.forEach((e, i) => {
      cache[e.key] = { hash: e.hash, vec: vectors[i + 1] }
    })
    if (toEmbed.length) cacheUpdated = true

    // Purge les entrées de cache orphelines (éléments supprimés).
    const liveKeys = new Set(items.map((it) => `${it.type}:${it.id}`))
    for (const key of Object.keys(cache)) {
      if (!liveKeys.has(key)) {
        delete cache[key]
        cacheUpdated = true
      }
    }

    const results = items
      .map((it) => {
        const entry = cache[`${it.type}:${it.id}`]
        return { ...it, score: entry ? cosine(queryVec, entry.vec) : 0 }
      })
      .filter((it) => it.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return { results, cacheUpdated, mode: 'semantic' }
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // Repli mot-clé si Ollama/modèle d'embedding indisponible.
    return { results: keywordSearch(q, items, { topK }), cacheUpdated, mode: 'keyword' }
  }
}

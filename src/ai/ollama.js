// ── Service d'inférence locale via Ollama ──
// Communique en HTTP avec un serveur Ollama tournant sur la machine de
// l'utilisateur (par défaut http://localhost:11434). Aucune donnée ne quitte
// le poste : cohérent avec l'approche 100 % locale de Mon Gouvernail.

export const DEFAULT_BASE_URL = 'http://localhost:11434'

function normalizeBaseUrl(baseUrl) {
  const url = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
  return url || DEFAULT_BASE_URL
}

/**
 * Vérifie qu'un serveur Ollama répond et renvoie la liste des modèles installés.
 * @returns {Promise<{ ok: boolean, models: string[], error?: string }>}
 */
export async function checkOllama(baseUrl, { signal } = {}) {
  const base = normalizeBaseUrl(baseUrl)
  try {
    const res = await fetch(`${base}/api/tags`, { signal })
    if (!res.ok) {
      return { ok: false, models: [], error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    const models = Array.isArray(data.models)
      ? data.models.map((m) => m.name).filter(Boolean)
      : []
    return { ok: true, models }
  } catch (err) {
    return { ok: false, models: [], error: err?.message || 'Connexion impossible' }
  }
}

/**
 * Envoie une conversation au modèle et diffuse la réponse token par token.
 *
 * @param {Object}   params
 * @param {string}   params.baseUrl
 * @param {string}   params.model
 * @param {Array<{role: string, content: string}>} params.messages
 * @param {(token: string) => void} [params.onToken] - appelé à chaque fragment
 * @param {AbortSignal} [params.signal]
 * @param {Object}   [params.options] - options Ollama (temperature, num_ctx…)
 * @returns {Promise<string>} la réponse complète
 */
export async function chat({ baseUrl, model, messages, onToken, signal, options }) {
  const base = normalizeBaseUrl(baseUrl)
  if (!model) throw new Error('Aucun modèle sélectionné')

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, options }),
    signal,
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Ollama a renvoyé une erreur (${res.status})${detail ? ` : ${detail}` : ''}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Ollama renvoie du NDJSON : un objet JSON par ligne.
    let newlineIndex
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      if (!line) continue
      let parsed
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      const token = parsed?.message?.content || ''
      if (token) {
        full += token
        onToken?.(token)
      }
      if (parsed?.error) {
        throw new Error(parsed.error)
      }
    }
  }

  return full
}

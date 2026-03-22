/**
 * Update checker for MonGouvernail.
 * Calls the remote endpoint on app startup and compares versions.
 * Shows a non-intrusive notification banner if a newer version is available.
 */

import { version } from '../../package.json'

const CHECK_URL = 'https://mon-gouvernail.fr/app/check-updates'
const APP_VERSION = version

/**
 * Compare two semver strings. Returns:
 *  1 if a > b, -1 if a < b, 0 if equal
 */
function compareSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/**
 * Check for updates. Returns update info or null.
 * Expected response from server:
 * {
 *   "version": "1.2.0",
 *   "url": "https://mon-gouvernail.fr/download",
 *   "notes": "Nouveautés: ..."
 * }
 */
export async function checkForUpdates() {
  try {
    const res = await fetch(`${CHECK_URL}?v=${APP_VERSION}&t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()

    if (data.version && compareSemver(data.version, APP_VERSION) > 0) {
      return {
        currentVersion: APP_VERSION,
        latestVersion: data.version,
        downloadUrl: data.url || 'https://mon-gouvernail.fr/download',
        notes: data.notes || '',
      }
    }

    return null
  } catch {
    // Network error, server down, timeout — silently ignore
    return null
  }
}

export function getAppVersion() {
  return APP_VERSION
}

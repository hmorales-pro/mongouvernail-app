/**
 * Custom lists management.
 * Users can add/edit/remove items from select lists.
 * Custom values are stored in the DB settings under 'custom_lists'.
 * Default values come from constants.js and can't be deleted, only hidden.
 */

import {
  CLIENT_TYPES,
  CLIENT_STATUTS,
  PROJECT_CATEGORIES,
  PROJECT_STATUTS,
  PROJECT_PRIORITIES,
  TASK_PRIORITIES,
  TASK_STATUTS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUTS,
  GOAL_TYPES,
  PERIOD_UNITS,
} from './constants'

// Map of list keys to their default values
export const LIST_DEFAULTS = {
  client_types: CLIENT_TYPES,
  client_statuts: CLIENT_STATUTS,
  project_categories: PROJECT_CATEGORIES,
  project_statuts: PROJECT_STATUTS,
  project_priorities: PROJECT_PRIORITIES,
  task_priorities: TASK_PRIORITIES,
  task_statuts: TASK_STATUTS,
  transaction_types: TRANSACTION_TYPES,
  transaction_statuts: TRANSACTION_STATUTS,
  goal_types: GOAL_TYPES,
  period_units: PERIOD_UNITS,
}

// Human-friendly labels for each list
export const LIST_LABELS = {
  client_types: 'Types de clients',
  client_statuts: 'Statuts des clients',
  project_categories: 'Catégories de projets',
  project_statuts: 'Statuts des projets',
  project_priorities: 'Priorités des projets',
  task_priorities: 'Priorités des tâches',
  task_statuts: 'Statuts des tâches',
  transaction_types: 'Types de transactions',
  transaction_statuts: 'Statuts des transactions',
  goal_types: 'Types d\'objectifs',
  period_units: 'Unités de période',
}

/**
 * Merge defaults with user-added custom items.
 * customLists format: { [listKey]: { added: [...], removed: [...] } }
 */
export function getList(listKey, customLists = {}) {
  const defaults = LIST_DEFAULTS[listKey] || []
  const custom = customLists[listKey]
  if (!custom) return defaults

  const { added = [], removed = [] } = custom
  const filtered = defaults.filter((v) => !removed.includes(v))
  return [...filtered, ...added]
}

/**
 * Get all customizable lists merged with user customizations.
 */
export function getAllLists(customLists = {}) {
  const result = {}
  for (const key of Object.keys(LIST_DEFAULTS)) {
    result[key] = getList(key, customLists)
  }
  return result
}

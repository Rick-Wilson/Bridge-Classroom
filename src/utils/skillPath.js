/**
 * Generic Skill Path Utilities
 *
 * Skill paths are formatted as "category/skill_name" (e.g., "bidding_conventions/stayman").
 * These utilities work with any skill path format without requiring a hardcoded taxonomy.
 *
 * PBN files should embed [SkillPath "..."] tags. For files without embedded paths,
 * a path is generated from the subfolder name.
 */

/**
 * Generate a skill path from a subfolder name
 * Used as fallback when PBN doesn't have embedded [SkillPath] tag
 * @param {string} subfolder - The subfolder name (e.g., "Stayman", "2over1")
 * @returns {string} Generated skill path (e.g., "uncategorized/stayman")
 */
export function generateSkillPath(subfolder) {
  if (!subfolder) return 'uncategorized/unknown'

  // Normalize: lowercase, replace spaces/special chars with underscores
  const normalized = subfolder
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  return `uncategorized/${normalized || 'unknown'}`
}

/**
 * Get skill info from a skill path (for display purposes)
 * Parses the path to extract human-readable name and category
 * @param {string} skillPath - The skill path (e.g., "bidding_conventions/stayman")
 * @returns {Object} Skill information: { path, name, category }
 */
export function getSkillFromPath(skillPath) {
  if (!skillPath) {
    return {
      path: 'uncategorized/unknown',
      name: 'Unknown',
      category: 'Uncategorized'
    }
  }

  const parts = skillPath.split('/')
  const categorySlug = parts[0] || 'uncategorized'
  const skillSlug = parts[parts.length - 1] || 'unknown'

  // Convert slugs to display names (snake_case to Title Case)
  const toDisplayName = (slug) => {
    return slug
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return {
    path: skillPath,
    name: toDisplayName(skillSlug),
    category: toDisplayName(categorySlug)
  }
}

/**
 * Get category ID from skill path
 * @param {string} skillPath - The skill path (e.g., "bidding_conventions/stayman")
 * @returns {string} The category ID (e.g., "bidding_conventions")
 */
export function getCategoryFromPath(skillPath) {
  if (!skillPath) return 'uncategorized'
  const [category] = skillPath.split('/')
  return category || 'uncategorized'
}

/**
 * Group observations by category
 * @param {Array} observations - Array of observation objects with skill_path property
 * @returns {Object} Object with category IDs as keys and observation arrays as values
 */
export function groupObservationsByCategory(observations) {
  const groups = {}

  for (const obs of observations) {
    const category = getCategoryFromPath(obs.skill_path)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(obs)
  }

  return groups
}

/**
 * Group observations by skill path
 * @param {Array} observations - Array of observation objects with skill_path property
 * @returns {Object} Object with skill paths as keys and observation arrays as values
 */
export function groupObservationsBySkill(observations) {
  const groups = {}

  for (const obs of observations) {
    const path = obs.skill_path || 'uncategorized/unknown'
    if (!groups[path]) {
      groups[path] = []
    }
    groups[path].push(obs)
  }

  return groups
}

/**
 * Get display info for a category ID
 * @param {string} categoryId - Category ID (e.g., "bidding_conventions")
 * @returns {Object} Category info: { id, name }
 */
export function getCategoryInfo(categoryId) {
  if (!categoryId) {
    return { id: 'uncategorized', name: 'Uncategorized' }
  }

  const name = categoryId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return { id: categoryId, name }
}

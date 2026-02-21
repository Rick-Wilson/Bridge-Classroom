/**
 * Convention Card Skill Utilities
 *
 * Extract relevant skill paths from a convention card using the
 * card-to-taxonomy mapping. Used for filtered proficiency views,
 * gap analysis, and practice recommendations.
 */

import { CARD_TO_TAXONOMY_MAPPING } from './cardToTaxonomyMapping.js'
import { evaluateCondition } from './conditionEvaluator.js'
import { getSkillFromPath } from './skillPath.js'

/**
 * Extract all relevant skill paths from a convention card
 * @param {Object} card - The convention card JSON object
 * @returns {string[]} Sorted array of unique skill paths
 */
export function getSkillsFromCard(card) {
  const skills = new Set()

  for (const mapping of CARD_TO_TAXONOMY_MAPPING) {
    if (evaluateCondition(card, mapping)) {
      mapping.skill_paths.forEach(skill => skills.add(skill))
    }
  }

  return Array.from(skills).sort()
}

/**
 * Check if a specific skill is relevant for a convention card
 * @param {Object} card - The convention card JSON object
 * @param {string} skillPath - The skill path to check
 * @returns {boolean} True if the skill is relevant for this card
 */
export function isSkillRelevantForCard(card, skillPath) {
  const relevantSkills = getSkillsFromCard(card)
  return relevantSkills.includes(skillPath)
}

/**
 * Group skill objects by category for display
 * @param {Array} skills - Array of skill objects with category property
 * @returns {Object} Skills grouped by category in display order
 */
export function groupSkillsByCategory(skills) {
  const groups = {}

  for (const skill of skills) {
    const category = skill.category || 'Other'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(skill)
  }

  const orderedCategories = [
    'Basic Bidding',
    'Bidding Conventions',
    'Competitive Bidding',
    'Declarer Play',
    'Defense',
    'Practice Deals',
    'Partnership Bidding',
    'Other'
  ]

  const sorted = {}
  for (const cat of orderedCategories) {
    if (groups[cat]) {
      sorted[cat] = groups[cat]
    }
  }
  // Include any categories not in the ordered list
  for (const cat of Object.keys(groups)) {
    if (!sorted[cat]) {
      sorted[cat] = groups[cat]
    }
  }

  return sorted
}

/**
 * Get skills from a card with display metadata
 * Uses skillPath.js utilities for name/category derivation
 * @param {Object} card - The convention card JSON object
 * @returns {Array} Array of { path, name, category } objects
 */
export function getSkillsFromCardWithInfo(card) {
  const skillPaths = getSkillsFromCard(card)
  return skillPaths.map(path => getSkillFromPath(path))
}

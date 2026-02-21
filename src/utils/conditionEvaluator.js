/**
 * Condition Evaluator for Card-to-Taxonomy Mapping
 *
 * Evaluates whether a mapping entry applies to a given convention card,
 * based on the condition type and the value at the card_path.
 */

/**
 * Get a nested value from an object using a dotted path
 * @param {Object} obj - The object to traverse
 * @param {string} path - Dotted path (e.g., "notrump.stayman.forcing")
 * @returns {*} The value at the path, or undefined if not found
 */
export function getNestedValue(obj, path) {
  if (!path) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    current = current[part]
  }
  return current
}

/**
 * Evaluate whether a mapping condition is satisfied by a convention card
 * @param {Object} card - The convention card JSON object
 * @param {Object} mapping - A mapping entry with card_path and condition
 * @returns {boolean} True if the condition is met
 */
export function evaluateCondition(card, mapping) {
  const { card_path, condition } = mapping

  if (condition.type === 'always') {
    return true
  }

  const value = card_path ? getNestedValue(card, card_path) : null

  switch (condition.type) {
    case 'equals':
      return value === condition.value

    case 'not_equals':
      return value !== condition.value

    case 'exists':
      return value !== undefined && value !== null && value !== ''

    case 'truthy':
      return Boolean(value)

    case 'in':
      return condition.values.includes(value)

    case 'not_in':
      return !condition.values.includes(value)

    case 'greater_than':
      return value > condition.value

    case 'any_true':
      return condition.paths.some(path => getNestedValue(card, path) === true)

    default:
      console.warn(`Unknown condition type: ${condition.type}`)
      return false
  }
}

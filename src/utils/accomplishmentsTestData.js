/**
 * Test data for Accomplishments view
 * Use this to test the component locally without needing real API data
 *
 * Usage:
 *   import { useAccomplishments } from '../composables/useAccomplishments.js'
 *   import { generateTestObservations } from '../utils/accomplishmentsTestData.js'
 *
 *   const accomplishments = useAccomplishments()
 *   accomplishments.enableTestMode(generateTestObservations())
 */

/**
 * Generate a random observation
 * @param {Object} overrides - Properties to override
 */
function createObservation(overrides = {}) {
  const lessons = [
    'Stayman',
    'Jacoby_Transfer',
    'Weak_Two_Bids',
    'Strong_2C',
    '2_Over_1',
    'Blackwood',
    'Gerber',
    'Negative_Double',
    'Takeout_Double',
    'Michaels_Cuebid',
    'Unusual_2NT',
    'Drury',
    'Fourth_Suit_Forcing',
    'New_Minor_Forcing'
  ]

  const taxons = [
    'bidding_conventions/stayman',
    'bidding_conventions/jacoby_transfer',
    'bidding_conventions/blackwood',
    'opening_bids/weak_twos',
    'opening_bids/strong_2c',
    'opening_bids/one_notrump',
    'responses/raising_partners_suit',
    'responses/new_suit_response',
    'competitive_bidding/negative_double',
    'competitive_bidding/takeout_double',
    'competitive_bidding/michaels',
    'slam_bidding/blackwood',
    'slam_bidding/gerber',
    'advanced/drury',
    'advanced/fourth_suit_forcing'
  ]

  const randomLesson = lessons[Math.floor(Math.random() * lessons.length)]
  const randomTaxon = taxons[Math.floor(Math.random() * taxons.length)]
  const correct = Math.random() > 0.35 // ~65% success rate

  // Generate random timestamp within last 30 days
  const daysAgo = Math.floor(Math.random() * 30)
  const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

  return {
    id: crypto.randomUUID(),
    timestamp,
    user_id: overrides.user_id || 'test-user-123',
    session_id: overrides.session_id || crypto.randomUUID(),
    skill_path: overrides.skill_path || randomTaxon,
    correct: overrides.correct ?? correct,
    deal_subfolder: overrides.deal_subfolder || randomLesson,
    deal_number: overrides.deal_number || Math.floor(Math.random() * 20) + 1,
    classroom: overrides.classroom || 'test-classroom',
    ...overrides
  }
}

/**
 * Generate a set of test observations
 * @param {number} count - Number of observations to generate
 * @param {Object} options - Generation options
 * @returns {Array} Array of test observations
 */
export function generateTestObservations(count = 100, options = {}) {
  const observations = []

  for (let i = 0; i < count; i++) {
    observations.push(createObservation(options))
  }

  // Sort by timestamp descending
  observations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  return observations
}

/**
 * Generate observations focused on specific lessons
 * Useful for testing the lessons tab
 */
export function generateLessonFocusedObservations() {
  const lessons = [
    { name: 'Stayman', successRate: 0.85, count: 30 },
    { name: 'Jacoby_Transfer', successRate: 0.78, count: 25 },
    { name: 'Weak_Two_Bids', successRate: 0.65, count: 20 },
    { name: 'Strong_2C', successRate: 0.50, count: 15 },
    { name: 'Blackwood', successRate: 0.90, count: 40 },
    { name: 'Negative_Double', successRate: 0.55, count: 10 }
  ]

  const observations = []

  for (const lesson of lessons) {
    for (let i = 0; i < lesson.count; i++) {
      observations.push(createObservation({
        deal_subfolder: lesson.name,
        correct: Math.random() < lesson.successRate
      }))
    }
  }

  observations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return observations
}

/**
 * Generate observations focused on specific taxons
 * Useful for testing the taxons tab
 */
export function generateTaxonFocusedObservations() {
  const taxons = [
    { path: 'bidding_conventions/stayman', successRate: 0.80, count: 25 },
    { path: 'bidding_conventions/jacoby_transfer', successRate: 0.75, count: 20 },
    { path: 'bidding_conventions/blackwood', successRate: 0.88, count: 35 },
    { path: 'opening_bids/weak_twos', successRate: 0.62, count: 15 },
    { path: 'opening_bids/strong_2c', successRate: 0.45, count: 12 },
    { path: 'competitive_bidding/negative_double', successRate: 0.55, count: 18 },
    { path: 'competitive_bidding/takeout_double', successRate: 0.70, count: 22 },
    { path: 'slam_bidding/gerber', successRate: 0.92, count: 10 }
  ]

  const observations = []

  for (const taxon of taxons) {
    for (let i = 0; i < taxon.count; i++) {
      observations.push(createObservation({
        skill_path: taxon.path,
        correct: Math.random() < taxon.successRate
      }))
    }
  }

  observations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return observations
}

/**
 * Generate empty test data (edge case testing)
 */
export function generateEmptyObservations() {
  return []
}

/**
 * Generate test users for user selector testing
 */
export function generateTestUsers() {
  return [
    {
      id: 'test-user-123',
      name: 'John Smith',
      email: 'john@example.com',
      isSelf: true
    },
    {
      id: 'test-user-456',
      name: 'Jane Doe',
      email: 'jane@example.com',
      isSelf: false
    },
    {
      id: 'test-user-789',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      isSelf: false
    }
  ]
}

/**
 * Sample observation for documentation/testing
 */
export const sampleObservation = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  timestamp: '2024-01-15T10:30:00.000Z',
  user_id: 'user-123',
  session_id: 'session-456',
  skill_path: 'bidding_conventions/stayman',
  correct: true,
  deal_subfolder: 'Stayman',
  deal_number: 5,
  classroom: 'beginners-2024'
}

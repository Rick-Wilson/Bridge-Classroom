/**
 * Test Observation Generator
 *
 * Generates fake observations for testing progress views, teacher dashboard,
 * and sharing functionality without having to manually practice deals.
 */

import { encryptObservation } from './crypto.js'
import { generateSkillPath } from './skillPath.js'

// Sample lessons to generate observations for
const DEFAULT_LESSONS = [
  'Stayman',
  'Transfers',
  'DONT',
  'Landy',
  'Jacoby2NT',
  'Signals',
  'Preempts',
  'Weak2Bids'
]

// Sample bids for generating fake responses
const SAMPLE_BIDS = ['Pass', '1C', '1D', '1H', '1S', '1NT', '2C', '2D', '2H', '2S', '2NT', '3C', '3D', '3H', '3S', '3NT', '4H', '4S', 'Dbl', 'Rdbl']

/**
 * Generate a random date within a range
 * @param {number} daysBack - Maximum days in the past
 * @returns {string} ISO date string
 */
function randomDate(daysBack) {
  const now = new Date()
  const msBack = Math.random() * daysBack * 24 * 60 * 60 * 1000
  return new Date(now.getTime() - msBack).toISOString()
}

/**
 * Generate a random UUID
 * @returns {string}
 */
function randomUUID() {
  return crypto.randomUUID()
}

/**
 * Generate a random bid
 * @returns {string}
 */
function randomBid() {
  return SAMPLE_BIDS[Math.floor(Math.random() * SAMPLE_BIDS.length)]
}

/**
 * Generate a single test observation
 * @param {Object} options
 * @param {string} options.userId
 * @param {string} options.lesson
 * @param {boolean} options.correct
 * @param {string} options.timestamp
 * @param {string} options.classroom
 * @returns {Object} Observation object
 */
function generateObservation({ userId, lesson, correct, timestamp, classroom }) {
  const observationId = randomUUID()
  const sessionId = randomUUID()
  const dealNumber = Math.floor(Math.random() * 20) + 1
  const expectedBid = randomBid()
  const studentBid = correct ? expectedBid : randomBid()

  return {
    observation_id: observationId,
    user_id: userId,
    session_id: sessionId,
    timestamp,
    skill_path: generateSkillPath(lesson),
    deal: {
      subfolder: lesson,
      deal_number: dealNumber,
      dealer: ['N', 'E', 'S', 'W'][Math.floor(Math.random() * 4)],
      vulnerability: ['None', 'NS', 'EW', 'Both'][Math.floor(Math.random() * 4)]
    },
    prompt_index: Math.floor(Math.random() * 3),
    auction_so_far: [],
    expected_bid: expectedBid,
    student_bid: studentBid,
    correct,
    attempt_number: correct ? 1 : Math.floor(Math.random() * 2) + 1,
    time_taken_ms: Math.floor(Math.random() * 30000) + 1000,
    classroom
  }
}

/**
 * Generate test observations for a user
 *
 * @param {Object} options
 * @param {string} options.userId - User ID
 * @param {string} options.secretKey - User's AES secret key (base64)
 * @param {number} [options.count=50] - Number of observations to generate
 * @param {string[]} [options.lessons] - Lesson subfolders to use
 * @param {number} [options.correctRate=0.7] - Percentage correct (0-1)
 * @param {number} [options.daysBack=30] - Spread observations over N days
 * @param {string} [options.classroom] - Classroom to assign
 * @returns {Promise<Object[]>} Array of encrypted observations ready for storage
 */
export async function generateTestObservations({
  userId,
  secretKey,
  count = 50,
  lessons = DEFAULT_LESSONS,
  correctRate = 0.7,
  daysBack = 30,
  classroom = null
}) {
  const encryptedObservations = []

  for (let i = 0; i < count; i++) {
    // Pick a random lesson
    const lesson = lessons[Math.floor(Math.random() * lessons.length)]

    // Determine if this observation is correct
    const correct = Math.random() < correctRate

    // Generate random timestamp
    const timestamp = randomDate(daysBack)

    // Generate the observation
    const observation = generateObservation({
      userId,
      lesson,
      correct,
      timestamp,
      classroom
    })

    // Encrypt the observation
    const { encrypted_data, iv } = await encryptObservation(observation, secretKey)

    // Build the encrypted package with metadata
    encryptedObservations.push({
      encrypted_data,
      iv,
      metadata: {
        observation_id: observation.observation_id,
        user_id: userId,
        timestamp: observation.timestamp,
        skill_path: observation.skill_path,
        correct: observation.correct,
        classroom: observation.classroom,
        deal_subfolder: observation.deal?.subfolder || null,
        deal_number: observation.deal?.deal_number || null
      },
      encrypted: true,
      queuedAt: new Date().toISOString()
    })
  }

  return encryptedObservations
}

/**
 * Generate and store test observations directly to localStorage
 * Useful for testing progress views without server sync
 *
 * @param {Object} options - Same as generateTestObservations
 * @returns {Promise<number>} Number of observations generated
 */
export async function generateAndStoreObservations(options) {
  const observations = await generateTestObservations(options)

  // Get current pending observations from localStorage
  const STORAGE_KEY = 'bridgePractice'
  let stored = {}
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      stored = JSON.parse(data)
    }
  } catch (err) {
    console.error('Failed to read storage:', err)
  }

  // Merge with existing pending observations
  const existing = stored.pendingObservations || []
  stored.pendingObservations = [...existing, ...observations]

  // Save back to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

  console.log(`Generated ${observations.length} test observations`)
  return observations.length
}

/**
 * Clear all test observations from localStorage
 * @returns {number} Number of observations cleared
 */
export function clearTestObservations() {
  const STORAGE_KEY = 'bridgePractice'
  let count = 0

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const stored = JSON.parse(data)
      count = stored.pendingObservations?.length || 0
      stored.pendingObservations = []
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    }
  } catch (err) {
    console.error('Failed to clear observations:', err)
  }

  console.log(`Cleared ${count} observations`)
  return count
}

/**
 * Get available lessons for test generation
 * @returns {string[]}
 */
export function getAvailableLessons() {
  return [...DEFAULT_LESSONS]
}

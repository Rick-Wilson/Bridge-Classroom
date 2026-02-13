/**
 * Test data for Board Mastery feature
 * Generates observations with controlled timestamps and correctness
 * to exercise all mastery states: Grey, Red, Yellow, Orange, Green, Silver, Gold.
 *
 * Mastery rules (evaluated in order):
 * 1. No observations → GREY
 * 2. Most recent not correct → RED
 * 3. Any failure within past hour → YELLOW
 * 4. Most recent success within 1hr after most recent failure → ORANGE
 * 5. Else → GREEN
 *
 * Usage:
 *   Add ?test=mastery to the URL, or:
 *   import { generateBoardMasteryTestData } from '../utils/boardMasteryTestData.js'
 *   accomplishments.enableTestMode(generateBoardMasteryTestData())
 */

const TEST_USER_ID = 'test-user-mastery'
const TEST_CLASSROOM = 'test-classroom'
const TEST_LESSON = 'Negative_Double'
const TEST_SKILL_PATH = 'competitive_bidding/negative_double'

let obsCounter = 0

/**
 * Create a test observation (one per board outcome)
 */
function obs({ boardNumber, correct, timestamp }) {
  obsCounter++
  return {
    id: `mastery-test-${obsCounter}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    user_id: TEST_USER_ID,
    skill_path: TEST_SKILL_PATH,
    correct,
    deal_subfolder: TEST_LESSON,
    deal_number: boardNumber,
    classroom: TEST_CLASSROOM
  }
}

/**
 * Get an ISO timestamp for N days ago at a given hour
 */
function daysAgo(days, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/**
 * Get an ISO timestamp for N minutes ago
 */
function minutesAgo(minutes) {
  const d = new Date(Date.now() - minutes * 60 * 1000)
  return d.toISOString()
}

/**
 * Generate test data exercising all mastery states for a "Negative_Double" lesson
 * with boards 1-8.
 *
 * Board 1: Grey (no observations)
 * Board 2: Red (most recent incorrect)
 * Board 3: Yellow (failed 30min ago, succeeded 20min ago - failure within hour)
 * Board 4: Orange (failed 90min ago, succeeded 60min ago - success within 1hr of failure)
 * Board 5: Green (clean correct, no recent failures)
 * Board 6: Silver (2 consecutive green weeks)
 * Board 7: Gold (3 consecutive green weeks)
 * Board 8: Gold + Red (earned gold previously, but most recent is wrong)
 */
export function generateBoardMasteryTestData() {
  obsCounter = 0
  const observations = []

  // Board 1: Grey - no observations at all

  // Board 2: Red - most recent incorrect
  observations.push(
    obs({ boardNumber: 2, correct: true, timestamp: daysAgo(5) }),
    obs({ boardNumber: 2, correct: false, timestamp: daysAgo(1) })
  )

  // Board 3: Yellow - failed 30min ago, succeeded 20min ago
  // Failure is within past hour → YELLOW
  observations.push(
    obs({ boardNumber: 3, correct: false, timestamp: minutesAgo(30) }),
    obs({ boardNumber: 3, correct: true, timestamp: minutesAgo(20) })
  )

  // Board 4: Orange - failed 90min ago, succeeded 60min ago
  // Failure is >1hr ago (not YELLOW), success is 30min after failure (<1hr → ORANGE)
  observations.push(
    obs({ boardNumber: 4, correct: false, timestamp: minutesAgo(90) }),
    obs({ boardNumber: 4, correct: true, timestamp: minutesAgo(60) })
  )

  // Board 5: Green - clean correct, last failure >1hr ago with success >1hr after it
  observations.push(
    obs({ boardNumber: 5, correct: false, timestamp: daysAgo(10) }),
    obs({ boardNumber: 5, correct: true, timestamp: daysAgo(2) })
  )

  // Board 6: Silver - 2 consecutive green weeks
  observations.push(
    obs({ boardNumber: 6, correct: true, timestamp: daysAgo(14) }),
    obs({ boardNumber: 6, correct: true, timestamp: daysAgo(7) })
  )

  // Board 7: Gold - 3 consecutive green weeks
  observations.push(
    obs({ boardNumber: 7, correct: true, timestamp: daysAgo(21) }),
    obs({ boardNumber: 7, correct: true, timestamp: daysAgo(14) }),
    obs({ boardNumber: 7, correct: true, timestamp: daysAgo(7) })
  )

  // Board 8: Gold + Red - earned gold in weeks past, but most recent attempt is wrong
  observations.push(
    obs({ boardNumber: 8, correct: true, timestamp: daysAgo(28) }),
    obs({ boardNumber: 8, correct: true, timestamp: daysAgo(21) }),
    obs({ boardNumber: 8, correct: true, timestamp: daysAgo(14) }),
    obs({ boardNumber: 8, correct: false, timestamp: daysAgo(1) })
  )

  // Also add a second lesson with some data for the accomplishments grid test
  const lesson2Obs = [1, 2, 3, 4, 5].map(bn => ({
    ...obs({ boardNumber: bn, correct: true, timestamp: daysAgo(3) }),
    deal_subfolder: 'Stayman',
    skill_path: 'bidding_conventions/stayman'
  }))
  observations.push(...lesson2Obs)

  return observations
}

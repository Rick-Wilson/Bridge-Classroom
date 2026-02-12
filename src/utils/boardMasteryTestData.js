/**
 * Test data for Board Mastery feature
 * Generates observations with controlled timestamps and correctness
 * to exercise all mastery states: Grey, Red, Yellow, Green, Silver, Gold.
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

let sessionCounter = 0

/**
 * Create a test observation
 */
function obs({ boardNumber, correct, timestamp, sessionId }) {
  sessionCounter++
  return {
    id: `mastery-test-${sessionCounter}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    user_id: TEST_USER_ID,
    session_id: sessionId || `session-${sessionCounter}`,
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
 * Generate test data exercising all mastery states for a "Negative_Double" lesson
 * with boards 1-8.
 *
 * Board 1: Grey (no observations)
 * Board 2: Red (most recent incorrect)
 * Board 3: Yellow (failed today then succeeded today)
 * Board 4: Green (clean correct, recent)
 * Board 5: Silver (2 consecutive green weeks)
 * Board 6: Gold (3 consecutive green weeks)
 * Board 7: Gold + Red (earned gold previously, but most recent is wrong)
 * Board 8: Silver + Yellow (earned silver, but struggled today)
 */
export function generateBoardMasteryTestData() {
  sessionCounter = 0
  const observations = []

  // Board 1: Grey - no observations at all

  // Board 2: Red - most recent incorrect
  const s2 = 'session-board2'
  observations.push(
    obs({ boardNumber: 2, correct: true, timestamp: daysAgo(5), sessionId: s2 + '-old' }),
    obs({ boardNumber: 2, correct: false, timestamp: daysAgo(1), sessionId: s2 + '-recent' })
  )

  // Board 3: Yellow - failed today then succeeded today
  const s3a = 'session-board3-fail'
  const s3b = 'session-board3-success'
  observations.push(
    obs({ boardNumber: 3, correct: false, timestamp: daysAgo(0, 9), sessionId: s3a }),
    obs({ boardNumber: 3, correct: true, timestamp: daysAgo(0, 14), sessionId: s3b })
  )

  // Board 4: Green - clean correct most recently, no failures today
  const s4 = 'session-board4'
  observations.push(
    obs({ boardNumber: 4, correct: false, timestamp: daysAgo(10), sessionId: s4 + '-old' }),
    obs({ boardNumber: 4, correct: true, timestamp: daysAgo(2), sessionId: s4 + '-recent' })
  )

  // Board 5: Silver - 2 consecutive green weeks
  // Week -2 (14 days ago): green day
  // Week -1 (7 days ago): green day
  observations.push(
    obs({ boardNumber: 5, correct: true, timestamp: daysAgo(14), sessionId: 'session-b5-w1' }),
    obs({ boardNumber: 5, correct: true, timestamp: daysAgo(7), sessionId: 'session-b5-w2' })
  )

  // Board 6: Gold - 3 consecutive green weeks
  // Week -3 (21 days ago): green day
  // Week -2 (14 days ago): green day
  // Week -1 (7 days ago): green day
  observations.push(
    obs({ boardNumber: 6, correct: true, timestamp: daysAgo(21), sessionId: 'session-b6-w1' }),
    obs({ boardNumber: 6, correct: true, timestamp: daysAgo(14), sessionId: 'session-b6-w2' }),
    obs({ boardNumber: 6, correct: true, timestamp: daysAgo(7), sessionId: 'session-b6-w3' })
  )

  // Board 7: Gold + Red - earned gold in weeks past, but most recent attempt is wrong
  observations.push(
    obs({ boardNumber: 7, correct: true, timestamp: daysAgo(28), sessionId: 'session-b7-w1' }),
    obs({ boardNumber: 7, correct: true, timestamp: daysAgo(21), sessionId: 'session-b7-w2' }),
    obs({ boardNumber: 7, correct: true, timestamp: daysAgo(14), sessionId: 'session-b7-w3' }),
    obs({ boardNumber: 7, correct: false, timestamp: daysAgo(1), sessionId: 'session-b7-recent' })
  )

  // Board 8: Silver + Yellow - earned silver, but struggled today
  observations.push(
    obs({ boardNumber: 8, correct: true, timestamp: daysAgo(14), sessionId: 'session-b8-w1' }),
    obs({ boardNumber: 8, correct: true, timestamp: daysAgo(7), sessionId: 'session-b8-w2' }),
    obs({ boardNumber: 8, correct: false, timestamp: daysAgo(0, 8), sessionId: 'session-b8-fail' }),
    obs({ boardNumber: 8, correct: true, timestamp: daysAgo(0, 12), sessionId: 'session-b8-fix' })
  )

  // Also add a second lesson with some data for the accomplishments grid test
  const lesson2Obs = [1, 2, 3, 4, 5].map(bn => ({
    ...obs({ boardNumber: bn, correct: true, timestamp: daysAgo(3), sessionId: `session-stayman-${bn}` }),
    deal_subfolder: 'Stayman',
    skill_path: 'bidding_conventions/stayman'
  }))
  observations.push(...lesson2Obs)

  return observations
}

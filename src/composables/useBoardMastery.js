import { computed } from 'vue'
import { useAccomplishments } from './useAccomplishments.js'
import { useObservationStore } from './useObservationStore.js'

// Current status values
const STATUS = {
  GREY: 'grey',
  RED: 'red',
  YELLOW: 'yellow',
  ORANGE: 'orange',
  GREEN: 'green'
}

// Achievement values (permanent once earned)
const ACHIEVEMENT = {
  NONE: 'none',
  SILVER: 'silver',
  GOLD: 'gold'
}

// Achievement spacing: minimum days between qualifying green days
const ACHIEVEMENT_SPACING_DAYS = 6

/**
 * Get date string "YYYY-MM-DD" from a timestamp
 * @param {string} dateStr - ISO8601 timestamp
 * @returns {string}
 */
function getDateStr(dateStr) {
  return dateStr.slice(0, 10)
}

/**
 * Get the number of days between two "YYYY-MM-DD" date strings
 */
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00Z')
  const d2 = new Date(dateStr2 + 'T00:00:00Z')
  return Math.round(Math.abs(d2 - d1) / 86400000)
}

/**
 * Group observations for a single board into board attempts.
 * A board attempt is one practice session on a board.
 * The attempt is "correct" only if ALL observations in the session are correct.
 *
 * @param {Array} observations - Observations for one (subfolder, deal_number)
 * @returns {Array<{timestamp: string, correct: boolean, sessionId: string}>} sorted ascending
 */
function groupIntoBoardAttempts(observations) {
  if (observations.length === 0) return []

  const bySession = {}
  for (const obs of observations) {
    const sid = obs.session_id || obs.id || 'unknown'
    if (!bySession[sid]) {
      bySession[sid] = { observations: [], latestTimestamp: obs.timestamp }
    }
    bySession[sid].observations.push(obs)
    if (obs.timestamp > bySession[sid].latestTimestamp) {
      bySession[sid].latestTimestamp = obs.timestamp
    }
  }

  return Object.values(bySession)
    .map(group => ({
      timestamp: group.latestTimestamp,
      correct: group.observations.every(o => o.correct),
      sessionId: group.observations[0].session_id || group.observations[0].id
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

// How long after a corrected attempt before it becomes eligible for retry (orange)
const YELLOW_TO_ORANGE_MS = 60 * 60 * 1000 // 1 hour

/**
 * Calculate current status for a board based on its observations.
 *
 * State machine: GREY → RED → YELLOW → (1hr) → ORANGE → GREEN
 * - GREY: no attempts
 * - RED: most recent attempt was incorrect
 * - YELLOW: corrected after a failure today, cooling down
 * - ORANGE: cooldown elapsed, eligible for retry
 * - GREEN: no failures today, OR successful retry after cooldown
 *
 * @param {Array} observations - All observations for this board, sorted ascending by timestamp
 * @returns {string} STATUS value
 */
function calculateCurrentStatus(observations) {
  if (observations.length === 0) return STATUS.GREY

  // Work with board attempts (grouped by session) rather than raw observations
  const attempts = groupIntoBoardAttempts(observations)
  const mostRecentAttempt = attempts[attempts.length - 1]

  if (!mostRecentAttempt.correct) return STATUS.RED

  // Most recent attempt was correct. Check if there were failures earlier today.
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayAttempts = attempts.filter(a => a.timestamp.startsWith(todayStr))
  const hadFailureToday = todayAttempts.some(a => !a.correct)

  if (!hadFailureToday) return STATUS.GREEN

  // Had failure today but corrected. Find the first correct attempt after the last failure.
  const lastFailure = todayAttempts.filter(a => !a.correct).pop()
  const firstCorrection = todayAttempts.find(
    a => a.correct && a.timestamp > lastFailure.timestamp
  )

  if (!firstCorrection) return STATUS.YELLOW

  // Check if enough time has passed since the first correction for retry eligibility.
  const elapsed = Date.now() - new Date(firstCorrection.timestamp).getTime()

  if (elapsed < YELLOW_TO_ORANGE_MS) return STATUS.YELLOW

  // Cooldown has elapsed. If the most recent attempt is a different attempt
  // than the first correction, the user has successfully retried → GREEN.
  if (mostRecentAttempt.sessionId !== firstCorrection.sessionId) {
    return STATUS.GREEN
  }

  return STATUS.ORANGE
}

/**
 * Check if a board had a "green day" on a given date.
 * A green day means: the board was practiced AND all observations that day were correct.
 *
 * @param {Array} observations - All observations for this board
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {boolean}
 */
function hasGreenDay(observations, dateStr) {
  const dayObs = observations.filter(o => o.timestamp.startsWith(dateStr))
  if (dayObs.length === 0) return false
  return dayObs.every(o => o.correct)
}

/**
 * Calculate achievement for a board.
 * Collects "green days" (dates where all observations were correct) and finds
 * the longest chain where each consecutive pair is at least ACHIEVEMENT_SPACING_DAYS apart.
 * Silver = chain of 2, Gold = chain of 3+.
 *
 * @param {Array} observations - All observations for this board, sorted ascending by timestamp
 * @returns {string} ACHIEVEMENT value
 */
function calculateAchievement(observations) {
  if (observations.length === 0) return ACHIEVEMENT.NONE

  // Collect all unique dates with observations
  const dateSet = new Set()
  for (const obs of observations) {
    dateSet.add(getDateStr(obs.timestamp))
  }

  // Find green days (all observations on that date were correct) and sort them
  const greenDays = [...dateSet]
    .filter(dateStr => hasGreenDay(observations, dateStr))
    .sort()

  if (greenDays.length < 2) return ACHIEVEMENT.NONE

  // Find the longest chain of green days where each pair is >= ACHIEVEMENT_SPACING_DAYS apart
  let maxChain = 1
  let currentChain = 1
  let lastQualifying = greenDays[0]

  for (let i = 1; i < greenDays.length; i++) {
    const gap = daysBetween(lastQualifying, greenDays[i])
    if (gap >= ACHIEVEMENT_SPACING_DAYS) {
      currentChain++
      lastQualifying = greenDays[i]
      if (currentChain > maxChain) maxChain = currentChain
    }
  }

  if (maxChain >= 3) return ACHIEVEMENT.GOLD
  if (maxChain >= 2) return ACHIEVEMENT.SILVER
  return ACHIEVEMENT.NONE
}

/**
 * Get all observations including local pending ones (for immediate reactivity).
 * Deduplicates by observation_id.
 */
function getAllObservationsIncludingLocal(accomplishments) {
  const synced = accomplishments.observations.value || []

  let local = []
  try {
    const observationStore = useObservationStore()
    const pending = observationStore.getPendingObservations()
    local = pending
      .filter(o => o.metadata)
      .map(o => {
        const meta = o.metadata
        return {
          id: meta.observation_id || 'local-' + Math.random().toString(36).slice(2),
          timestamp: meta.timestamp || o.queuedAt,
          skill_path: meta.skill_path,
          correct: meta.correct,
          deal_subfolder: meta.deal_subfolder,
          deal_number: meta.deal_number,
          session_id: meta.session_id,
          _local: true
        }
      })
  } catch {
    // If observation store isn't available, just use synced data
  }

  // Deduplicate: synced wins over local
  const ids = new Set(synced.map(o => o.id))
  const uniqueLocal = local.filter(o => !ids.has(o.id))

  return [...synced, ...uniqueLocal]
}

/**
 * Raw mastery computation (non-reactive). Use this inside your own computed().
 *
 * @param {Array} allObservations - All observations to search through
 * @param {string} lessonSubfolder - The deal_subfolder value (e.g. "Negative")
 * @param {Array<number>} boardNumbers - Board numbers in the lesson
 * @returns {Array<{boardNumber, status, achievement, attemptCount, lastAttemptTime}>}
 */
function computeBoardMastery(allObservations, lessonSubfolder, boardNumbers) {
  if (!lessonSubfolder || !boardNumbers || boardNumbers.length === 0) return []

  const lessonObs = allObservations.filter(
    o => (o.deal_subfolder || o.deal?.subfolder) === lessonSubfolder
  )

  return boardNumbers.map(bn => {
    const boardObs = lessonObs
      .filter(o => (o.deal_number ?? o.deal?.deal_number) === bn)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    // Group by session for attempt count display only
    const attempts = groupIntoBoardAttempts(boardObs)

    return {
      boardNumber: bn,
      status: calculateCurrentStatus(boardObs),
      achievement: calculateAchievement(boardObs),
      attemptCount: attempts.length,
      lastAttemptTime: boardObs.length > 0
        ? boardObs[boardObs.length - 1].timestamp
        : null
    }
  })
}

/**
 * Compute lesson-level achievement from board mastery results.
 * Gold if all boards have Gold, Silver if all have Silver+.
 *
 * @param {Array} boardMasteryList - Output of computeBoardMastery
 * @returns {{achievement: string}}
 */
function computeLessonAchievement(boardMasteryList) {
  if (!boardMasteryList || boardMasteryList.length === 0) {
    return { achievement: ACHIEVEMENT.NONE }
  }

  const allGold = boardMasteryList.every(b => b.achievement === ACHIEVEMENT.GOLD)
  if (allGold) return { achievement: ACHIEVEMENT.GOLD }

  const allSilverOrGold = boardMasteryList.every(
    b => b.achievement === ACHIEVEMENT.SILVER || b.achievement === ACHIEVEMENT.GOLD
  )
  if (allSilverOrGold) return { achievement: ACHIEVEMENT.SILVER }

  return { achievement: ACHIEVEMENT.NONE }
}

export function useBoardMastery() {
  const accomplishments = useAccomplishments()

  /**
   * Get all observations (synced + local pending) for mastery computation.
   * Use inside computed() for reactivity.
   */
  function getObservations() {
    return getAllObservationsIncludingLocal(accomplishments)
  }

  return {
    STATUS,
    ACHIEVEMENT,
    getObservations,
    computeBoardMastery,
    computeLessonAchievement,
    // Exposed for testing
    groupIntoBoardAttempts,
    calculateCurrentStatus,
    calculateAchievement,
    hasGreenDay,
    daysBetween
  }
}

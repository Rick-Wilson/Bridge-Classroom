import { computed } from 'vue'
import { useAccomplishments } from './useAccomplishments.js'
import { useObservationStore } from './useObservationStore.js'

// Current status values
const STATUS = {
  GREY: 'grey',
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green'
}

// Achievement values (permanent once earned)
const ACHIEVEMENT = {
  NONE: 'none',
  SILVER: 'silver',
  GOLD: 'gold'
}

/**
 * Get ISO week string "YYYY-Www" for a timestamp
 * @param {string} dateStr - ISO8601 timestamp
 * @returns {string} e.g. "2026-W07"
 */
function getISOWeek(dateStr) {
  const date = new Date(dateStr)
  const thursday = new Date(date)
  thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)))
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7)
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/**
 * Get date string "YYYY-MM-DD" from a timestamp
 * @param {string} dateStr - ISO8601 timestamp
 * @returns {string}
 */
function getDateStr(dateStr) {
  return dateStr.slice(0, 10)
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

/**
 * Calculate current status for a board based on its attempts.
 *
 * @param {Array} boardAttempts - Sorted ascending by timestamp
 * @returns {string} STATUS value
 */
function calculateCurrentStatus(boardAttempts) {
  if (boardAttempts.length === 0) return STATUS.GREY

  const mostRecent = boardAttempts[boardAttempts.length - 1]
  if (!mostRecent.correct) return STATUS.RED

  // Most recent was correct. Check if there were failures earlier today.
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayAttempts = boardAttempts.filter(a => a.timestamp.startsWith(todayStr))
  const hadFailureToday = todayAttempts.some(a => !a.correct)

  return hadFailureToday ? STATUS.YELLOW : STATUS.GREEN
}

/**
 * Check if a board had a "green day" on a given date.
 * A green day means: the board was practiced AND all attempts that day were correct.
 *
 * @param {Array} boardAttempts - All attempts for this board, sorted ascending
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {boolean}
 */
function hasGreenDay(boardAttempts, dateStr) {
  const dayAttempts = boardAttempts.filter(a => a.timestamp.startsWith(dateStr))
  if (dayAttempts.length === 0) return false
  return dayAttempts.every(a => a.correct)
}

/**
 * Calculate achievement for a board.
 * A week qualifies if the board had at least one "green day" during that week.
 * Silver = 2 consecutive qualifying weeks, Gold = 3+.
 *
 * @param {Array} boardAttempts - Sorted ascending by timestamp
 * @returns {string} ACHIEVEMENT value
 */
function calculateAchievement(boardAttempts) {
  if (boardAttempts.length === 0) return ACHIEVEMENT.NONE

  // Collect all unique dates with attempts
  const dateSet = new Set()
  for (const attempt of boardAttempts) {
    dateSet.add(getDateStr(attempt.timestamp))
  }

  // For each date, check if it's a green day. Map green days to their ISO weeks.
  const greenWeeks = new Set()
  for (const dateStr of dateSet) {
    if (hasGreenDay(boardAttempts, dateStr)) {
      greenWeeks.add(getISOWeek(dateStr + 'T00:00:00Z'))
    }
  }

  if (greenWeeks.size < 2) return ACHIEVEMENT.NONE

  // Sort the qualifying weeks and find the longest consecutive streak
  const sortedWeeks = [...greenWeeks].sort()

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedWeeks.length; i++) {
    if (areConsecutiveWeeks(sortedWeeks[i - 1], sortedWeeks[i])) {
      currentStreak++
      if (currentStreak > maxStreak) maxStreak = currentStreak
    } else {
      currentStreak = 1
    }
  }

  if (maxStreak >= 3) return ACHIEVEMENT.GOLD
  if (maxStreak >= 2) return ACHIEVEMENT.SILVER
  return ACHIEVEMENT.NONE
}

/**
 * Check if two ISO week strings are consecutive.
 * @param {string} w1 - e.g. "2026-W06"
 * @param {string} w2 - e.g. "2026-W07"
 * @returns {boolean}
 */
function areConsecutiveWeeks(w1, w2) {
  // Parse year and week number
  const [y1, wk1] = parseWeek(w1)
  const [y2, wk2] = parseWeek(w2)

  // Same year, consecutive weeks
  if (y1 === y2 && wk2 === wk1 + 1) return true

  // Year boundary: last week of y1 followed by W01 of y1+1
  if (y2 === y1 + 1 && wk2 === 1) {
    // ISO years can have 52 or 53 weeks
    const maxWeek = getISOWeeksInYear(y1)
    if (wk1 === maxWeek) return true
  }

  return false
}

/**
 * Parse "YYYY-Www" into [year, weekNum]
 */
function parseWeek(weekStr) {
  const parts = weekStr.split('-W')
  return [parseInt(parts[0], 10), parseInt(parts[1], 10)]
}

/**
 * Get the number of ISO weeks in a year (52 or 53)
 */
function getISOWeeksInYear(year) {
  // A year has 53 ISO weeks if Jan 1 is Thursday, or Dec 31 is Thursday
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  return (jan1.getDay() === 4 || dec31.getDay() === 4) ? 53 : 52
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
 * @param {Object} [options] - Optional filters
 * @param {number} [options.excludeSessionBoard] - Board number currently in progress (exclude its current session)
 * @param {string} [options.excludeSessionId] - Session ID to exclude for the in-progress board
 * @returns {Array<{boardNumber, status, achievement, attemptCount, lastAttemptTime}>}
 */
function computeBoardMastery(allObservations, lessonSubfolder, boardNumbers, options) {
  if (!lessonSubfolder || !boardNumbers || boardNumbers.length === 0) return []

  const lessonObs = allObservations.filter(
    o => (o.deal_subfolder || o.deal?.subfolder) === lessonSubfolder
  )

  const excludeBoard = options?.excludeSessionBoard
  const excludeSession = options?.excludeSessionId

  return boardNumbers.map(bn => {
    let boardObs = lessonObs.filter(o =>
      (o.deal_number ?? o.deal?.deal_number) === bn
    )

    // Exclude in-progress session observations for the board being practiced
    if (excludeBoard != null && excludeSession && bn === excludeBoard) {
      boardObs = boardObs.filter(o => o.session_id !== excludeSession)
    }

    const attempts = groupIntoBoardAttempts(boardObs)

    return {
      boardNumber: bn,
      status: calculateCurrentStatus(attempts),
      achievement: calculateAchievement(attempts),
      attemptCount: attempts.length,
      lastAttemptTime: attempts.length > 0
        ? attempts[attempts.length - 1].timestamp
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
    getISOWeek,
    areConsecutiveWeeks
  }
}

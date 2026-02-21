import { computed } from 'vue'
import { useStudentProgress } from './useStudentProgress.js'
import { getSkillFromPath } from '../utils/skillPath.js'

const MIN_ATTEMPTS = 3

/**
 * Compute learning progress data from a raw observations array.
 *
 * For each board attempted MIN_ATTEMPTS+ times, splits attempts chronologically
 * into first half vs second half and compares accuracy. Aggregates by skill_path.
 *
 * @param {Array} obs - Array of observation objects
 * @returns {Object|null} Learning data or null if insufficient data
 */
export function computeLearningData(obs) {
  if (!obs || obs.length === 0) return null

  // Group by (deal_subfolder, deal_number)
  const boardMap = {}
  for (const o of obs) {
    if (!o.deal_subfolder || o.deal_number == null) continue
    const key = `${o.deal_subfolder}|${o.deal_number}`
    if (!boardMap[key]) {
      boardMap[key] = {
        subfolder: o.deal_subfolder,
        number: o.deal_number,
        skillPath: o.skill_path,
        attempts: []
      }
    }
    boardMap[key].attempts.push({ correct: o.correct, timestamp: o.timestamp })
  }

  // For boards with enough attempts, compute first-half vs second-half accuracy
  const boardResults = []
  for (const board of Object.values(boardMap)) {
    if (board.attempts.length < MIN_ATTEMPTS) continue

    // Sort by timestamp
    board.attempts.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    const mid = Math.floor(board.attempts.length / 2)
    const firstHalf = board.attempts.slice(0, mid)
    const secondHalf = board.attempts.slice(mid)

    const earlyCorrect = firstHalf.filter(a => a.correct).length
    const earlyPct = firstHalf.length > 0 ? Math.round(100 * earlyCorrect / firstHalf.length) : 0
    const recentCorrect = secondHalf.filter(a => a.correct).length
    const recentPct = secondHalf.length > 0 ? Math.round(100 * recentCorrect / secondHalf.length) : 0

    boardResults.push({
      subfolder: board.subfolder,
      number: board.number,
      skillPath: board.skillPath,
      attempts: board.attempts.length,
      earlyPct,
      recentPct,
      improvement: recentPct - earlyPct
    })
  }

  if (boardResults.length === 0) return null

  // Aggregate by skill_path
  const skillMap = {}
  for (const br of boardResults) {
    const sp = br.skillPath || 'uncategorized/unknown'
    if (!skillMap[sp]) {
      const info = getSkillFromPath(sp)
      skillMap[sp] = {
        skillPath: sp,
        skillName: info.name,
        category: info.category,
        boards: [],
        earlyTotal: 0,
        earlyCount: 0,
        recentTotal: 0,
        recentCount: 0
      }
    }
    const skill = skillMap[sp]
    skill.boards.push(br)
    // Weight by number of attempts in each half for accurate aggregation
    const mid = Math.floor(br.attempts / 2)
    const firstN = mid
    const secondN = br.attempts - mid
    skill.earlyTotal += br.earlyPct * firstN
    skill.earlyCount += firstN
    skill.recentTotal += br.recentPct * secondN
    skill.recentCount += secondN
  }

  const skillLearning = Object.values(skillMap).map(skill => {
    const earlyPct = skill.earlyCount > 0 ? Math.round(skill.earlyTotal / skill.earlyCount) : 0
    const recentPct = skill.recentCount > 0 ? Math.round(skill.recentTotal / skill.recentCount) : 0
    // Sort boards by improvement desc
    skill.boards.sort((a, b) => b.improvement - a.improvement)
    return {
      skillPath: skill.skillPath,
      skillName: skill.skillName,
      category: skill.category,
      boardCount: skill.boards.length,
      earlyPct,
      recentPct,
      improvement: recentPct - earlyPct,
      boards: skill.boards
    }
  })

  // Sort skills by improvement desc
  skillLearning.sort((a, b) => b.improvement - a.improvement)

  // Overall
  const totalEarlyCount = Object.values(skillMap).reduce((s, sk) => s + sk.earlyCount, 0)
  const totalEarlySum = Object.values(skillMap).reduce((s, sk) => s + sk.earlyTotal, 0)
  const totalRecentCount = Object.values(skillMap).reduce((s, sk) => s + sk.recentCount, 0)
  const totalRecentSum = Object.values(skillMap).reduce((s, sk) => s + sk.recentTotal, 0)

  return {
    skillLearning,
    totalBoardsAnalyzed: boardResults.length,
    overallEarlyPct: totalEarlyCount > 0 ? Math.round(totalEarlySum / totalEarlyCount) : 0,
    overallRecentPct: totalRecentCount > 0 ? Math.round(totalRecentSum / totalRecentCount) : 0
  }
}

/**
 * Composable for the logged-in user's own learning progress.
 * Uses useStudentProgress() internally.
 */
export function useLearningProgress() {
  const progress = useStudentProgress()

  const learningData = computed(() => {
    return computeLearningData(progress.decryptedObservations.value)
  })

  return {
    learningData,
    isLoading: progress.isLoading,
    hasError: progress.hasError,
    error: progress.error,
    fetchProgress: progress.fetchProgress
  }
}

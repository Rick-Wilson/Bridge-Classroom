import { ref, reactive } from 'vue'
import { useObservationStore } from './useObservationStore.js'

// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Singleton cache: { "userId::subfolder" → { boards: [...], fetchedAt: timestamp } }
const cache = reactive({})
const loading = ref(false)
const cacheVersion = ref(0)

// Cooldown: 1 hour in ms (for yellow → orange distinction)
const COOLDOWN_MS = 60 * 60 * 1000

/**
 * Fetch board status from the backend API.
 * Caches by (userId, dealSubfolder) key.
 * @param {string} userId
 * @param {string} [dealSubfolder] - If omitted, fetches all subfolders
 * @param {boolean} [force=false] - Bypass cache
 * @returns {Promise<Array>} Board status entries
 */
async function fetchBoardStatus(userId, dealSubfolder = null, force = false) {
  if (!userId) return []

  const cacheKey = `${userId}::${dealSubfolder || '__all__'}`

  // Return cached if fresh (< 30 seconds) and not forced
  if (!force && cache[cacheKey] && Date.now() - cache[cacheKey].fetchedAt < 30000) {
    return cache[cacheKey].boards
  }

  loading.value = true
  try {
    let url = `${API_URL}/board-status?user_id=${encodeURIComponent(userId)}`
    if (dealSubfolder) {
      url += `&deal_subfolder=${encodeURIComponent(dealSubfolder)}`
    }

    const response = await fetch(url, {
      headers: { 'x-api-key': API_KEY }
    })

    if (!response.ok) {
      console.error('Failed to fetch board status:', response.status)
      return cache[cacheKey]?.boards || []
    }

    const data = await response.json()
    const boards = data.boards || []

    cache[cacheKey] = { boards, fetchedAt: Date.now() }
    return boards
  } catch (err) {
    console.error('Failed to fetch board status:', err)
    return cache[cacheKey]?.boards || []
  } finally {
    loading.value = false
  }
}

/**
 * Invalidate cache for a specific user/subfolder, or all caches.
 */
function invalidateCache(userId = null, dealSubfolder = null) {
  if (!userId) {
    // Clear all
    for (const key in cache) {
      delete cache[key]
    }
    cacheVersion.value++
    return
  }

  const prefix = `${userId}::`
  for (const key in cache) {
    if (key.startsWith(prefix)) {
      if (!dealSubfolder || key === `${userId}::${dealSubfolder}` || key === `${userId}::__all__`) {
        delete cache[key]
      }
    }
  }
  cacheVersion.value++
}

/**
 * Get the display color for a board status, applying time-based logic.
 * - 'corrected' → 'yellow' if < 1hr old, 'orange' if >= 1hr
 * - Others map directly to their color
 * @param {string} status - Board status from API
 * @param {string} [lastObservationAt] - ISO timestamp of last observation
 * @returns {string} CSS color class name
 */
function getDisplayColor(status, lastObservationAt) {
  switch (status) {
    case 'failed': return 'red'
    case 'corrected': {
      if (!lastObservationAt) return 'orange'
      const age = Date.now() - new Date(lastObservationAt).getTime()
      return age < COOLDOWN_MS ? 'yellow' : 'orange'
    }
    case 'fresh_correct': return 'orange'
    case 'clean_correct': return 'green'
    case 'not_attempted':
    default: return 'grey'
  }
}

/**
 * Compute board mastery from API data, with local pending overlay.
 * This replaces useBoardMastery's computeBoardMastery for the online path.
 *
 * @param {Array} apiBoards - Board status entries from fetchBoardStatus
 * @param {Array<number>} boardNumbers - All board numbers in the lesson
 * @returns {Array<{boardNumber, status, achievement, lastObservationAt}>}
 */
function buildBoardMastery(apiBoards, boardNumbers) {
  // Index API data by deal_number
  const byNumber = {}
  for (const b of apiBoards) {
    byNumber[b.deal_number] = b
  }

  return boardNumbers.map(bn => {
    const entry = byNumber[bn]
    if (!entry) {
      return {
        boardNumber: bn,
        status: 'grey',
        achievement: 'none',
        lastObservationAt: null
      }
    }
    return {
      boardNumber: bn,
      status: getDisplayColor(entry.status, entry.last_observation_at),
      achievement: entry.achievement || 'none',
      lastObservationAt: entry.last_observation_at
    }
  })
}

/**
 * Merge local pending observations into board mastery results.
 * Pending observations that haven't synced yet override the API data.
 * @param {Array} mastery - Output of buildBoardMastery
 * @param {string} lessonSubfolder
 */
function mergeLocalPending(mastery, lessonSubfolder) {
  try {
    const observationStore = useObservationStore()
    const pending = observationStore.getPendingObservations()

    for (const obs of pending) {
      if (!obs.metadata) continue
      if (obs.metadata.deal_subfolder !== lessonSubfolder) continue

      const bn = obs.metadata.deal_number
      const board = mastery.find(b => b.boardNumber === bn)
      if (!board) continue

      // Local pending observation overrides the API status
      const boardResult = obs.metadata.board_result
      if (boardResult === 'failed') {
        board.status = 'red'
      } else if (boardResult === 'corrected') {
        board.status = 'yellow'
      } else if (boardResult === 'correct') {
        // Could be fresh or clean — for local display, show green
        board.status = 'green'
      } else {
        // Fallback for observations without board_result
        board.status = obs.metadata.correct ? 'green' : 'red'
      }
    }
  } catch {
    // Observation store not available
  }
}

export function useBoardStatus() {
  return {
    loading,
    cacheVersion,
    fetchBoardStatus,
    invalidateCache,
    getDisplayColor,
    buildBoardMastery,
    mergeLocalPending
  }
}

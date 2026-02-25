import { ref, computed } from 'vue'
import { createObservation, extractMetadata, generateSessionId, validateObservation } from '../utils/observationSchema.js'
import { generateSkillPath } from '../utils/skillPath.js'
import { encryptObservation } from '../utils/crypto.js'
import { useUserStore } from './useUserStore.js'
import { useAssignmentStore } from './useAssignmentStore.js'

const STORAGE_KEY = 'bridgePractice'

// Singleton state (shared across all component instances)
const pendingObservations = ref([])
const sessionId = ref(null)
const initialized = ref(false)

// Stats for current session
const sessionStats = ref({
  totalObservations: 0,
  correctCount: 0,
  wrongCount: 0,
  startedAt: null
})

/**
 * Load pending observations from localStorage
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      pendingObservations.value = data.pendingObservations || []
    }
    initialized.value = true
  } catch (err) {
    console.error('Failed to load observation store from storage:', err)
    initialized.value = true
  }
}

/**
 * Save pending observations to localStorage (merged with existing data)
 */
function saveToStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data = stored ? JSON.parse(stored) : {}
    data.pendingObservations = pendingObservations.value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save observation store to storage:', err)
  }
}

/**
 * Initialize the store
 */
function initialize() {
  if (!initialized.value) {
    loadFromStorage()
  }

  // Start a new session if not already started
  if (!sessionId.value) {
    startNewSession()
  }
}

/**
 * Start a new practice session
 */
function startNewSession() {
  sessionId.value = generateSessionId()
  sessionStats.value = {
    totalObservations: 0,
    correctCount: 0,
    wrongCount: 0,
    startedAt: new Date().toISOString()
  }
}

/**
 * Record a bid attempt observation
 * @param {Object} params
 * @param {Object} params.deal - Current deal object
 * @param {number} params.promptIndex - Which prompt (0-indexed)
 * @param {string[]} params.auctionSoFar - Bids shown so far
 * @param {string} params.expectedBid - The correct bid
 * @param {string} params.studentBid - What student bid
 * @param {boolean} params.correct - Was it correct
 * @param {number} params.attemptNumber - 1, 2, 3...
 * @param {number} params.timeTakenMs - Time in milliseconds
 * @returns {Promise<{success: boolean, observation?: Object, error?: string}>}
 */
async function recordObservation({
  observationId = null,
  deal,
  promptIndex,
  auctionSoFar,
  expectedBid,
  studentBid,
  correct,
  attemptNumber,
  timeTakenMs,
  prompts,
  boardResult = null
}) {
  const userStore = useUserStore()
  const assignmentStore = useAssignmentStore()

  // Ensure initialized
  if (!initialized.value) {
    initialize()
  }

  const user = userStore.currentUser.value
  if (!user) {
    return { success: false, error: 'No authenticated user' }
  }

  // Get skill path: prefer embedded PBN metadata, fallback to generating from subfolder
  let skillPath = deal.skillPath  // Embedded in PBN by lesson builder
  if (!skillPath) {
    // Fallback for PBN files without embedded metadata
    const subfolder = deal.subfolder || deal.category || 'Unknown'
    skillPath = generateSkillPath(subfolder)
  }

  // Get assignment tag if in assignment mode
  const assignment = assignmentStore.getAssignmentTag()

  // Check if this is an upsert (replacing an existing pending observation)
  const isUpsert = observationId && pendingObservations.value.some(
    o => o.metadata?.observation_id === observationId
  )

  // Create the observation
  const observation = createObservation({
    observationId,
    userId: user.id,
    sessionId: sessionId.value,
    deal,
    promptIndex,
    auctionSoFar,
    expectedBid,
    studentBid,
    correct,
    attemptNumber,
    timeTakenMs,
    skillPath,
    assignment,
    prompts,
    boardResult
  })

  // Validate observation
  const validation = validateObservation(observation)
  if (!validation.valid) {
    console.error('Invalid observation:', validation.errors)
    return { success: false, error: validation.errors.join(', ') }
  }

  // Update session stats (skip on upsert to avoid double-counting)
  if (!isUpsert) {
    sessionStats.value.totalObservations++
    if (correct) {
      sessionStats.value.correctCount++
    } else {
      sessionStats.value.wrongCount++
    }
  }

  // If user has data consent and secret key, encrypt the observation
  if (user.dataConsent && user.secretKey) {
    const encryptResult = await encryptAndQueueObservation(observation, user)
    if (!encryptResult.success) {
      console.warn('Failed to encrypt observation, storing unencrypted:', encryptResult.error)
      // Fall back to storing unencrypted (will be encrypted later)
      queueUnencryptedObservation(observation, user.classrooms?.[0] || null)
    }
  } else {
    // Store unencrypted (user may not have consented, or key not yet generated)
    queueUnencryptedObservation(observation, user.classrooms?.[0] || null)
  }

  return { success: true, observation }
}

/**
 * Encrypt and queue an observation using user's secret key
 * Simple AES-256-GCM encryption - no dual-key complexity!
 *
 * @param {Object} observation - The observation to encrypt
 * @param {Object} user - The current user (needs secretKey)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function encryptAndQueueObservation(observation, user) {
  try {
    // Encrypt with user's secret key (AES-256-GCM)
    const { encrypted_data, iv } = await encryptObservation(observation, user.secretKey)

    // Extract metadata for server-side queries
    const classroom = user.classrooms?.[0] || null
    const metadata = extractMetadata(observation, classroom)

    // Queue the encrypted observation (replace existing if same ID)
    const entry = {
      encrypted_data,
      iv,
      metadata,
      encrypted: true,
      queuedAt: new Date().toISOString()
    }
    const existingIdx = pendingObservations.value.findIndex(
      o => o.metadata?.observation_id === metadata.observation_id
    )
    if (existingIdx !== -1) {
      pendingObservations.value[existingIdx] = entry
    } else {
      pendingObservations.value.push(entry)
    }

    saveToStorage()
    return { success: true }
  } catch (err) {
    console.error('Failed to encrypt observation:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Queue an unencrypted observation (fallback when encryption not possible)
 * @param {Object} observation - The observation
 * @param {string|null} classroom - User's classroom
 */
function queueUnencryptedObservation(observation, classroom) {
  const metadata = extractMetadata(observation, classroom)

  const entry = {
    observation, // Store raw observation
    metadata,
    encrypted: false,
    queuedAt: new Date().toISOString()
  }
  const existingIdx = pendingObservations.value.findIndex(
    o => o.metadata?.observation_id === metadata.observation_id
  )
  if (existingIdx !== -1) {
    pendingObservations.value[existingIdx] = entry
  } else {
    pendingObservations.value.push(entry)
  }

  saveToStorage()
}

/**
 * Encrypt any unencrypted observations in the queue
 * Call this after user gets their secret key
 * @returns {Promise<number>} Number of observations encrypted
 */
async function encryptPendingObservations() {
  const userStore = useUserStore()
  const user = userStore.currentUser.value

  if (!user?.secretKey) {
    return 0
  }

  let encryptedCount = 0

  for (let i = 0; i < pendingObservations.value.length; i++) {
    const obs = pendingObservations.value[i]

    if (!obs.encrypted && obs.observation) {
      try {
        const { encrypted_data, iv } = await encryptObservation(obs.observation, user.secretKey)

        // Update the observation to encrypted form
        pendingObservations.value[i] = {
          encrypted_data,
          iv,
          metadata: obs.metadata,
          encrypted: true,
          queuedAt: obs.queuedAt,
          encryptedAt: new Date().toISOString()
        }

        encryptedCount++
      } catch (err) {
        console.error('Failed to encrypt observation:', err)
      }
    }
  }

  if (encryptedCount > 0) {
    saveToStorage()
  }

  return encryptedCount
}

/**
 * Get count of pending observations awaiting sync
 * @returns {number}
 */
function getPendingCount() {
  return pendingObservations.value.length
}

/**
 * Get all pending observations
 * @returns {Array}
 */
function getPendingObservations() {
  return [...pendingObservations.value]
}

/**
 * Remove observations after successful sync
 * @param {string[]} observationIds - IDs of observations that were synced
 */
function removeSyncedObservations(observationIds) {
  pendingObservations.value = pendingObservations.value.filter(
    obs => !observationIds.includes(obs.metadata?.observation_id)
  )
  saveToStorage()
}

/**
 * Clear all pending observations (use with caution)
 */
function clearPendingObservations() {
  pendingObservations.value = []
  saveToStorage()
}

/**
 * Get observations for the current session (from memory, not storage)
 * For local display only - decrypted observations are not stored
 * @returns {Object} Session statistics
 */
function getSessionStats() {
  return { ...sessionStats.value }
}

/**
 * Reset the store (for testing)
 */
function reset() {
  pendingObservations.value = []
  sessionId.value = null
  sessionStats.value = {
    totalObservations: 0,
    correctCount: 0,
    wrongCount: 0,
    startedAt: null
  }
  initialized.value = false
  saveToStorage()
}

export function useObservationStore() {
  // Computed properties
  const pendingCount = computed(() => pendingObservations.value.length)

  const hasPendingObservations = computed(() => pendingObservations.value.length > 0)

  const hasUnencryptedObservations = computed(() =>
    pendingObservations.value.some(obs => !obs.encrypted)
  )

  const currentSessionId = computed(() => sessionId.value)

  return {
    // State
    pendingObservations,
    sessionId,
    sessionStats,
    initialized,

    // Computed
    pendingCount,
    hasPendingObservations,
    hasUnencryptedObservations,
    currentSessionId,

    // Methods
    initialize,
    startNewSession,
    recordObservation,
    encryptPendingObservations,
    getPendingCount,
    getPendingObservations,
    removeSyncedObservations,
    clearPendingObservations,
    getSessionStats,
    reset,

    // Storage methods (exported for testing)
    loadFromStorage,
    saveToStorage
  }
}

import { ref, computed } from 'vue'
import { createObservation, extractMetadata, generateSessionId, validateObservation } from '../utils/observationSchema.js'
import { generateSkillPath } from '../utils/skillPath.js'
import { encryptObservation, importKey } from '../utils/crypto.js'
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
  deal,
  promptIndex,
  auctionSoFar,
  expectedBid,
  studentBid,
  correct,
  attemptNumber,
  timeTakenMs
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

  // Create the observation
  const observation = createObservation({
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
    assignment
  })

  // Validate observation
  const validation = validateObservation(observation)
  if (!validation.valid) {
    console.error('Invalid observation:', validation.errors)
    return { success: false, error: validation.errors.join(', ') }
  }

  // Update session stats
  sessionStats.value.totalObservations++
  if (correct) {
    sessionStats.value.correctCount++
  } else {
    sessionStats.value.wrongCount++
  }

  // If user has data consent and we have keys, encrypt the observation
  if (user.dataConsent && user.publicKey) {
    const encryptResult = await encryptAndQueueObservation(observation, user)
    if (!encryptResult.success) {
      console.warn('Failed to encrypt observation, storing unencrypted:', encryptResult.error)
      // Fall back to storing unencrypted (will be encrypted later)
      queueUnencryptedObservation(observation, user.classrooms?.[0] || null)
    }
  } else {
    // Store unencrypted (user may not have consented, or keys not yet generated)
    queueUnencryptedObservation(observation, user.classrooms?.[0] || null)
  }

  return { success: true, observation }
}

/**
 * Encrypt and queue an observation
 * @param {Object} observation - The observation to encrypt
 * @param {Object} user - The current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function encryptAndQueueObservation(observation, user) {
  const userStore = useUserStore()

  try {
    // Import student public key
    const studentPublicKey = await importKey(user.publicKey, true)

    // Get teacher public key (may not be available yet)
    const teacherPublicKeyBase64 = userStore.getTeacherPublicKey()

    if (teacherPublicKeyBase64) {
      // Full encryption with both keys
      const teacherPublicKey = await importKey(teacherPublicKeyBase64, true)

      const encrypted = await encryptObservation(
        observation,
        studentPublicKey,
        teacherPublicKey
      )

      // Extract metadata for server-side queries
      const classroom = user.classrooms?.[0] || null
      const metadata = extractMetadata(observation, classroom)

      // Queue the encrypted observation
      pendingObservations.value.push({
        ...encrypted,
        metadata,
        encrypted: true,
        queuedAt: new Date().toISOString()
      })
    } else {
      // Encrypt with student key only (teacher key not available yet)
      // This will be re-encrypted when teacher key becomes available
      const encrypted = await encryptObservationStudentOnly(observation, studentPublicKey)

      const classroom = user.classrooms?.[0] || null
      const metadata = extractMetadata(observation, classroom)

      pendingObservations.value.push({
        ...encrypted,
        metadata,
        encrypted: true,
        needsTeacherKey: true,
        queuedAt: new Date().toISOString()
      })
    }

    saveToStorage()
    return { success: true }
  } catch (err) {
    console.error('Failed to encrypt observation:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Encrypt observation with student key only (when teacher key not available)
 * @param {Object} observation - The observation to encrypt
 * @param {CryptoKey} studentPublicKey - Student's public key
 * @returns {Promise<Object>} Partially encrypted package
 */
async function encryptObservationStudentOnly(observation, studentPublicKey) {
  const { encryptWithSymmetricKey, generateSymmetricKey, wrapSymmetricKey } = await import('../utils/crypto.js')

  // Generate one-time symmetric key
  const symmetricKey = await generateSymmetricKey()

  // Encrypt the observation data
  const { ciphertext, iv } = await encryptWithSymmetricKey(
    JSON.stringify(observation),
    symmetricKey
  )

  // Wrap the symmetric key for student only
  const studentKeyBlob = await wrapSymmetricKey(symmetricKey, studentPublicKey)

  return {
    encrypted_data: ciphertext,
    iv,
    student_key_blob: studentKeyBlob,
    teacher_key_blob: null // Will be added later
  }
}

/**
 * Queue an unencrypted observation (fallback when encryption not possible)
 * @param {Object} observation - The observation
 * @param {string|null} classroom - User's classroom
 */
function queueUnencryptedObservation(observation, classroom) {
  const metadata = extractMetadata(observation, classroom)

  pendingObservations.value.push({
    observation, // Store raw observation
    metadata,
    encrypted: false,
    queuedAt: new Date().toISOString()
  })

  saveToStorage()
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
 * Re-encrypt observations that need teacher key
 * Call this after teacher key becomes available
 * @returns {Promise<number>} Number of observations re-encrypted
 */
async function reencryptWithTeacherKey() {
  const userStore = useUserStore()
  const teacherPublicKeyBase64 = userStore.getTeacherPublicKey()

  if (!teacherPublicKeyBase64) {
    return 0
  }

  const user = userStore.currentUser.value
  if (!user?.privateKey) {
    return 0
  }

  try {
    const { importKey, decryptObservation: decryptObs, encryptObservation: encryptObs } = await import('../utils/crypto.js')

    const studentPrivateKey = await importKey(user.privateKey, false)
    const studentPublicKey = await importKey(user.publicKey, true)
    const teacherPublicKey = await importKey(teacherPublicKeyBase64, true)

    let reencryptedCount = 0

    for (let i = 0; i < pendingObservations.value.length; i++) {
      const obs = pendingObservations.value[i]

      if (obs.encrypted && obs.needsTeacherKey) {
        try {
          // Decrypt with student key
          const decrypted = await decryptObs(obs, studentPrivateKey, false)

          // Re-encrypt with both keys
          const encrypted = await encryptObs(decrypted, studentPublicKey, teacherPublicKey)

          // Update the observation
          pendingObservations.value[i] = {
            ...encrypted,
            metadata: obs.metadata,
            encrypted: true,
            needsTeacherKey: false,
            queuedAt: obs.queuedAt,
            reencryptedAt: new Date().toISOString()
          }

          reencryptedCount++
        } catch (err) {
          console.error('Failed to re-encrypt observation:', err)
        }
      }
    }

    if (reencryptedCount > 0) {
      saveToStorage()
    }

    return reencryptedCount
  } catch (err) {
    console.error('Failed to re-encrypt observations:', err)
    return 0
  }
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

  const needsTeacherKey = computed(() =>
    pendingObservations.value.some(obs => obs.needsTeacherKey)
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
    needsTeacherKey,
    currentSessionId,

    // Methods
    initialize,
    startNewSession,
    recordObservation,
    getPendingCount,
    getPendingObservations,
    removeSyncedObservations,
    clearPendingObservations,
    reencryptWithTeacherKey,
    getSessionStats,
    reset,

    // Storage methods (exported for testing)
    loadFromStorage,
    saveToStorage
  }
}

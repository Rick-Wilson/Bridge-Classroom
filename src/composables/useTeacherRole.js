import { ref, computed } from 'vue'
import { useUserStore } from './useUserStore.js'
import { useBoardMastery } from './useBoardMastery.js'
import { useAccomplishments } from './useAccomplishments.js'
import { decryptSharingGrant, decryptObservation } from '../utils/crypto.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Singleton state
const isTeacher = ref(false)
const viewerId = ref(null)
const students = ref([])           // { id, first_name, last_name, email, classroom }
const studentObservations = ref({}) // Map<userId, observations[]>
const studentRawObservations = ref({}) // Map<userId, rawObservations[]> (with encrypted_data/iv)
const loading = ref(false)
const error = ref(null)
const initialized = ref(false)

// Cache timestamps per student
const fetchTimestamps = {}
const CACHE_DURATION_MS = 2 * 60 * 1000 // 2 minutes

// Student key cache: Map<userId, aesKeyBase64>
const studentKeyCache = {}
// Grants cache (fetched once per session)
let grantsCache = null

/**
 * Check if the current user is a teacher (has a viewer record with grants).
 * Called after login.
 */
async function checkTeacherStatus() {
  const userStore = useUserStore()
  const currentUser = userStore.currentUser.value
  if (!currentUser || !currentUser.email) {
    isTeacher.value = false
    return
  }

  try {
    // 1. Look up viewer by email
    const viewerRes = await fetch(
      `${API_URL}/viewers?email=${encodeURIComponent(currentUser.email)}`,
      { headers: { 'x-api-key': API_KEY } }
    )
    if (!viewerRes.ok) return

    const viewers = await viewerRes.json()
    const viewer = Array.isArray(viewers) ? viewers[0] : null
    if (!viewer) return

    viewerId.value = viewer.id

    // 2. Fetch grants where this viewer is grantee
    const grantsRes = await fetch(
      `${API_URL}/grants?grantee_id=${viewer.id}`,
      { headers: { 'x-api-key': API_KEY } }
    )
    if (!grantsRes.ok) return

    const grantsData = await grantsRes.json()
    const grants = grantsData.grants || []

    // Filter out self-grants
    const studentIds = new Set(
      grants
        .filter(g => g.grantor_id !== currentUser.id)
        .map(g => g.grantor_id)
    )

    if (studentIds.size === 0) return

    // 3. Fetch user details
    const usersRes = await fetch(
      `${API_URL}/users`,
      { headers: { 'x-api-key': API_KEY } }
    )
    if (!usersRes.ok) return

    const usersData = await usersRes.json()
    const allUsers = usersData.users || []

    // Filter out the teacher themselves (by ID or email) from the student list
    const teacherEmail = currentUser.email?.toLowerCase()
    students.value = allUsers
      .filter(u => studentIds.has(u.id) && u.id !== currentUser.id && u.email?.toLowerCase() !== teacherEmail)
      .sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      )

    isTeacher.value = true
    initialized.value = true

    // Sync role if server confirms teacher status but local role is still 'student'
    // Don't downgrade admin to teacher
    if (currentUser.role === 'student') {
      userStore.updateUser(currentUser.id, { role: 'teacher' })
      // Also sync to server so backend checks (e.g. create classroom) work
      try {
        await fetch(`${API_URL}/users/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
          body: JSON.stringify({ user_id: currentUser.id, action: 'become_teacher' })
        })
      } catch { /* best-effort sync */ }
    }
  } catch (err) {
    console.error('Failed to check teacher status:', err)
  }
}

/**
 * Fetch observations for a single student (cached).
 */
async function fetchStudentObservations(userId) {
  // Check cache
  const cached = studentObservations.value[userId]
  const cachedAt = fetchTimestamps[userId]
  if (cached && cachedAt && (Date.now() - cachedAt) < CACHE_DURATION_MS) {
    return cached
  }

  try {
    const res = await fetch(
      `${API_URL}/observations?user_id=${encodeURIComponent(userId)}&limit=10000`,
      { headers: { 'x-api-key': API_KEY } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const rawObs = data.observations || []

    // Metadata-only for mastery computation
    const obs = rawObs.map(o => ({
      id: o.id || o.observation_id,
      timestamp: o.timestamp,
      skill_path: o.skill_path,
      correct: o.correct,
      deal_subfolder: o.deal_subfolder,
      deal_number: o.deal_number
    }))

    // Preserve raw observations (with encrypted_data/iv) for on-demand decryption
    studentRawObservations.value = { ...studentRawObservations.value, [userId]: rawObs }
    studentObservations.value = { ...studentObservations.value, [userId]: obs }
    fetchTimestamps[userId] = Date.now()
    return obs
  } catch (err) {
    console.error(`Failed to fetch observations for ${userId}:`, err)
    return []
  }
}

/**
 * Load observations for all students in parallel.
 */
async function loadAllStudentSummaries() {
  loading.value = true
  error.value = null

  try {
    await Promise.allSettled(
      students.value.map(s => fetchStudentObservations(s.id))
    )

    // Trigger board count fetching for any new lesson subfolders
    const mastery = useBoardMastery()
    const allSubfolders = new Set()
    for (const obs of Object.values(studentObservations.value)) {
      for (const o of obs) {
        if (o.deal_subfolder) allSubfolders.add(o.deal_subfolder)
      }
    }
    if (allSubfolders.size > 0) {
      mastery.fetchMissingBoardCounts([...allSubfolders])
    }
  } catch (err) {
    error.value = err.message
    console.error('Failed to load student summaries:', err)
  } finally {
    loading.value = false
  }
}

/**
 * Compute mastery summary for a student.
 * Returns { green, orange, yellow, red, grey, total, lastObservationTime }
 */
function getStudentMasterySummary(userId) {
  const obs = studentObservations.value[userId] || []
  if (obs.length === 0) return { green: 0, orange: 0, yellow: 0, red: 0, grey: 0, total: 0, lastObservationTime: null }

  const mastery = useBoardMastery()
  const lessons = mastery.extractLessonsFromObservations(obs)

  const counts = { green: 0, orange: 0, yellow: 0, red: 0, grey: 0 }

  for (const lesson of lessons) {
    const boardResults = mastery.computeBoardMastery(obs, lesson.subfolder, lesson.boardNumbers)
    for (const board of boardResults) {
      counts[board.status] = (counts[board.status] || 0) + 1
    }
  }

  // Find last observation time
  let lastObservationTime = null
  for (const o of obs) {
    if (!lastObservationTime || o.timestamp > lastObservationTime) {
      lastObservationTime = o.timestamp
    }
  }

  return {
    ...counts,
    total: counts.green + counts.orange + counts.yellow + counts.red + counts.grey,
    lastObservationTime
  }
}

/**
 * Get the N most recently practiced lesson names for a student.
 */
function getStudentRecentLessons(userId, limit = 3) {
  const obs = studentObservations.value[userId] || []
  const accomplishments = useAccomplishments()

  // Group by subfolder, find most recent timestamp per lesson
  const lessonTimes = {}
  for (const o of obs) {
    const sf = o.deal_subfolder
    if (!sf) continue
    if (!lessonTimes[sf] || o.timestamp > lessonTimes[sf]) {
      lessonTimes[sf] = o.timestamp
    }
  }

  return Object.entries(lessonTimes)
    .sort(([, a], [, b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([sf]) => accomplishments.formatLessonName(sf))
}

/**
 * Format relative time from a timestamp.
 */
function formatTimeSince(timestamp) {
  if (!timestamp) return 'Never'
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

/**
 * Get the teacher's RSA private key from sessionStorage.
 * @returns {string|null} Base64-encoded private key
 */
function getTeacherPrivateKey() {
  try {
    const session = JSON.parse(sessionStorage.getItem('bridgeTeacherSession') || 'null')
    if (!session || !session.privateKeyBase64) return null
    if (session.expiry && new Date(session.expiry) < new Date()) return null
    return session.privateKeyBase64
  } catch {
    return null
  }
}

/**
 * Get (or derive) the student's AES secret key via sharing grants.
 * @param {string} studentUserId
 * @returns {Promise<string|null>} Base64-encoded AES key or null
 */
async function getStudentKey(studentUserId) {
  // Check cache
  if (studentKeyCache[studentUserId]) return studentKeyCache[studentUserId]

  const privateKey = getTeacherPrivateKey()
  if (!privateKey) return null

  // Fetch grants if not cached
  if (!grantsCache && viewerId.value) {
    try {
      const res = await fetch(
        `${API_URL}/grants?grantee_id=${viewerId.value}`,
        { headers: { 'x-api-key': API_KEY } }
      )
      if (res.ok) {
        const data = await res.json()
        grantsCache = data.grants || []
      }
    } catch {
      return null
    }
  }

  // Find grant for this student
  const grant = (grantsCache || []).find(g => g.grantor_id === studentUserId)
  if (!grant) return null

  try {
    const aesKey = await decryptSharingGrant(grant.encrypted_payload, privateKey)
    studentKeyCache[studentUserId] = aesKey
    return aesKey
  } catch (err) {
    console.error(`Failed to decrypt grant for student ${studentUserId}:`, err)
    return null
  }
}

/**
 * Decrypt a single student observation on demand.
 * @param {string} studentUserId
 * @param {Object} rawObs - Raw observation with encrypted_data and iv
 * @returns {Promise<Object|null>} Full decrypted observation or null
 */
async function decryptStudentObservation(studentUserId, rawObs) {
  if (!rawObs.encrypted_data || !rawObs.iv) return null

  const aesKey = await getStudentKey(studentUserId)
  if (!aesKey) return null

  try {
    const decrypted = await decryptObservation(rawObs.encrypted_data, rawObs.iv, aesKey)
    return {
      ...decrypted,
      id: rawObs.id,
      timestamp: rawObs.timestamp,
      skill_path: rawObs.skill_path,
      correct: rawObs.correct,
      deal_subfolder: rawObs.deal_subfolder,
      deal_number: rawObs.deal_number
    }
  } catch (err) {
    console.error('Failed to decrypt observation:', rawObs.id, err)
    return null
  }
}

/**
 * Find and decrypt an observation by matching metadata.
 * @param {string} studentUserId
 * @param {number} timestamp - Raw timestamp in ms
 * @param {number} dealNumber
 * @param {boolean} correct
 * @returns {Promise<Object|null>}
 */
async function findAndDecryptObservation(studentUserId, timestamp, dealNumber, correct) {
  const rawObs = studentRawObservations.value[studentUserId] || []

  // Find matching observation by timestamp and deal_number
  const match = rawObs.find(o => {
    const obsTs = new Date(o.timestamp).getTime()
    return Math.abs(obsTs - timestamp) < 1000 && o.deal_number === dealNumber && o.correct === correct
  })

  if (!match) return null
  return decryptStudentObservation(studentUserId, match)
}

/**
 * Clear all state (called on user switch).
 */
function reset() {
  isTeacher.value = false
  viewerId.value = null
  students.value = []
  studentObservations.value = {}
  studentRawObservations.value = {}
  loading.value = false
  error.value = null
  initialized.value = false
  grantsCache = null
  for (const key of Object.keys(studentKeyCache)) {
    delete studentKeyCache[key]
  }
  for (const key of Object.keys(fetchTimestamps)) {
    delete fetchTimestamps[key]
  }
}

export function useTeacherRole() {
  return {
    isTeacher,
    viewerId,
    students,
    studentObservations,
    loading,
    error,
    initialized,

    checkTeacherStatus,
    fetchStudentObservations,
    loadAllStudentSummaries,
    getStudentMasterySummary,
    getStudentRecentLessons,
    formatTimeSince,
    findAndDecryptObservation,
    decryptStudentObservation,
    getStudentKey,
    studentRawObservations,
    reset
  }
}

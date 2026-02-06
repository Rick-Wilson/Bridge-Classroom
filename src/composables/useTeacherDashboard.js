import { ref, computed } from 'vue'
import { useTeacherAuth } from './useTeacherAuth.js'
import { decryptObservation, decryptSharingGrant } from '../utils/crypto.js'
import { getSkillFromPath } from '../utils/skillPath.js'

// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Singleton state
const students = ref([])
const observations = ref([])
const decryptedObservations = ref([])
const loading = ref(false)
const error = ref(null)
const lastFetchedAt = ref(null)
const initialized = ref(false)

// Current filters
const selectedClassroom = ref(null)
const selectedStudent = ref(null)
const dateRange = ref({ start: null, end: null })

// Cache duration (2 minutes for dashboard)
const CACHE_DURATION_MS = 2 * 60 * 1000

/**
 * Fetch all students from server
 * @returns {Promise<Array>}
 */
async function fetchStudents() {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      'x-api-key': API_KEY
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch students: ${response.status}`)
  }

  const data = await response.json()
  return data.users || []
}

/**
 * Fetch observations with optional filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>}
 */
async function fetchObservations(filters = {}) {
  const params = new URLSearchParams()

  if (filters.classroom) params.append('classroom', filters.classroom)
  if (filters.userId) params.append('user_id', filters.userId)
  if (filters.startDate) params.append('start_date', filters.startDate)
  if (filters.endDate) params.append('end_date', filters.endDate)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset) params.append('offset', filters.offset.toString())

  const url = `${API_URL}/observations${params.toString() ? '?' + params.toString() : ''}`

  const response = await fetch(url, {
    headers: {
      'x-api-key': API_KEY
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch observations: ${response.status}`)
  }

  const data = await response.json()
  return data.observations || []
}

/**
 * Fetch observation metadata only (for faster dashboard loading)
 * @param {Object} filters - Query filters
 * @returns {Promise<{observations: Array, total: number}>}
 */
async function fetchObservationMetadata(filters = {}) {
  const params = new URLSearchParams()

  if (filters.classroom) params.append('classroom', filters.classroom)
  if (filters.userId) params.append('user_id', filters.userId)
  if (filters.startDate) params.append('start_date', filters.startDate)
  if (filters.endDate) params.append('end_date', filters.endDate)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset) params.append('offset', filters.offset.toString())

  const url = `${API_URL}/observations/metadata${params.toString() ? '?' + params.toString() : ''}`

  const response = await fetch(url, {
    headers: {
      'x-api-key': API_KEY
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch observation metadata: ${response.status}`)
  }

  return await response.json()
}

/**
 * Decrypt a single observation using student's secret key
 * (Teacher gets secret key from sharing grant)
 * @param {Object} encrypted - Encrypted observation
 * @param {string} secretKey - Student's AES secret key (base64)
 * @returns {Promise<Object|null>}
 */
async function decryptSingleObservation(encrypted, secretKey) {
  try {
    const decrypted = await decryptObservation(encrypted.encrypted_data, encrypted.iv, secretKey)
    return {
      ...decrypted,
      id: encrypted.id,
      timestamp: encrypted.timestamp,
      skill_path: encrypted.skill_path,
      correct: encrypted.correct,
      classroom: encrypted.classroom,
      deal_subfolder: encrypted.deal_subfolder,
      deal_number: encrypted.deal_number
    }
  } catch (err) {
    console.error('Failed to decrypt observation:', encrypted.id, err)
    return null
  }
}

// Cache of student secret keys (recovered from grants)
const studentSecretKeys = new Map()

/**
 * Get a student's secret key from their sharing grant
 * @param {string} userId - Student's user ID
 * @param {string} viewerPrivateKey - Teacher's RSA private key (base64)
 * @returns {Promise<string|null>} Student's AES secret key or null
 */
async function getStudentSecretKey(userId, viewerPrivateKey) {
  // Check cache first
  if (studentSecretKeys.has(userId)) {
    return studentSecretKeys.get(userId)
  }

  const teacherAuth = useTeacherAuth()
  const viewerId = teacherAuth.getViewerId?.() || null

  if (!viewerId) {
    console.error('No viewer ID available')
    return null
  }

  try {
    // Fetch grants for this viewer
    const response = await fetch(`${API_URL}/grants?grantee_id=${viewerId}`, {
      headers: { 'x-api-key': API_KEY }
    })

    if (!response.ok) {
      console.error('Failed to fetch grants:', response.status)
      return null
    }

    const { grants } = await response.json()

    // Find grant from this student
    const grant = grants.find(g => g.grantor_id === userId)
    if (!grant) {
      console.warn('No grant found from student:', userId)
      return null
    }

    // Decrypt the grant to get student's secret key
    const secretKey = await decryptSharingGrant(grant.encrypted_payload, viewerPrivateKey)

    // Cache for future use
    studentSecretKeys.set(userId, secretKey)

    return secretKey
  } catch (err) {
    console.error('Failed to get student secret key:', err)
    return null
  }
}

/**
 * Load dashboard data
 * @param {boolean} forceRefresh - Bypass cache
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function loadDashboard(forceRefresh = false) {
  const teacherAuth = useTeacherAuth()

  if (!teacherAuth.isAuthenticated.value) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check cache
  if (!forceRefresh && lastFetchedAt.value) {
    const age = Date.now() - new Date(lastFetchedAt.value).getTime()
    if (age < CACHE_DURATION_MS) {
      return { success: true, cached: true }
    }
  }

  loading.value = true
  error.value = null

  try {
    // Fetch students and observation metadata in parallel
    const [studentsData, obsMetadata] = await Promise.all([
      fetchStudents(),
      fetchObservationMetadata({ limit: 10000 })
    ])

    students.value = studentsData
    observations.value = obsMetadata.observations || []
    lastFetchedAt.value = new Date().toISOString()

    return { success: true }
  } catch (err) {
    console.error('Failed to load dashboard:', err)
    error.value = err.message
    return { success: false, error: err.message }
  } finally {
    loading.value = false
  }
}

/**
 * Fetch and decrypt observations for a specific student (for detail view)
 * Teacher must have a sharing grant from the student to decrypt
 * @param {string} userId - Student's user ID
 * @returns {Promise<{success: boolean, observations?: Array, error?: string}>}
 */
async function loadStudentObservations(userId) {
  const teacherAuth = useTeacherAuth()

  if (!teacherAuth.isAuthenticated.value) {
    return { success: false, error: 'Not authenticated' }
  }

  const privateKey = teacherAuth.getPrivateKey?.() || null
  if (!privateKey) {
    return { success: false, error: 'Private key not available' }
  }

  loading.value = true
  error.value = null

  try {
    // Get student's secret key from their sharing grant
    const secretKey = await getStudentSecretKey(userId, privateKey)
    if (!secretKey) {
      return { success: false, error: 'No sharing grant from this student or failed to decrypt' }
    }

    // Fetch encrypted observations
    const encrypted = await fetchObservations({ userId, limit: 1000 })

    // Decrypt all observations using student's secret key
    const decryptPromises = encrypted.map(obs => decryptSingleObservation(obs, secretKey))
    const decrypted = await Promise.all(decryptPromises)

    // Filter out failed decryptions
    const validObservations = decrypted.filter(obs => obs !== null)

    return { success: true, observations: validObservations }
  } catch (err) {
    console.error('Failed to load student observations:', err)
    error.value = err.message
    return { success: false, error: err.message }
  } finally {
    loading.value = false
  }
}

/**
 * Get list of unique classrooms
 * @returns {Array<{id: string, name: string, studentCount: number}>}
 */
function getClassrooms() {
  const classroomMap = new Map()

  for (const student of students.value) {
    const classroom = student.classroom || 'ad-hoc'
    if (!classroomMap.has(classroom)) {
      classroomMap.set(classroom, { id: classroom, name: formatClassroomName(classroom), studentCount: 0 })
    }
    classroomMap.get(classroom).studentCount++
  }

  return Array.from(classroomMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Format classroom ID to display name
 * @param {string} classroomId
 * @returns {string}
 */
function formatClassroomName(classroomId) {
  if (!classroomId || classroomId === 'ad-hoc') {
    return 'Ad-hoc Users'
  }
  // Convert kebab-case to Title Case
  return classroomId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get students in a specific classroom
 * @param {string|null} classroomId - Filter by classroom (null for all)
 * @returns {Array}
 */
function getStudentsByClassroom(classroomId = null) {
  if (!classroomId) {
    return students.value
  }

  return students.value.filter(s => {
    if (classroomId === 'ad-hoc') {
      return !s.classroom
    }
    return s.classroom === classroomId
  })
}

/**
 * Get stats for a classroom
 * @param {string} classroomId
 * @returns {Object}
 */
function getClassroomStats(classroomId) {
  const classroomObs = observations.value.filter(obs => {
    if (classroomId === 'ad-hoc') {
      return !obs.classroom
    }
    return obs.classroom === classroomId
  })

  const total = classroomObs.length
  const correct = classroomObs.filter(obs => obs.correct).length

  // Get unique students who have practiced
  const activeStudents = new Set(classroomObs.map(obs => obs.user_id))

  // Get today's observations
  const today = new Date().toISOString().split('T')[0]
  const todayObs = classroomObs.filter(obs => obs.timestamp?.startsWith(today))

  // Get this week's observations
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekObs = classroomObs.filter(obs => obs.timestamp >= weekAgo)

  return {
    totalObservations: total,
    correctObservations: correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    activeStudents: activeStudents.size,
    todayCount: todayObs.length,
    weekCount: weekObs.length
  }
}

/**
 * Get stats for a specific student
 * @param {string} userId
 * @returns {Object}
 */
function getStudentStats(userId) {
  const studentObs = observations.value.filter(obs => obs.user_id === userId)

  const total = studentObs.length
  const correct = studentObs.filter(obs => obs.correct).length

  // Get today's observations
  const today = new Date().toISOString().split('T')[0]
  const todayObs = studentObs.filter(obs => obs.timestamp?.startsWith(today))

  // Get this week's observations
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekObs = studentObs.filter(obs => obs.timestamp >= weekAgo)

  // Get skill breakdown
  const skillStats = {}
  for (const obs of studentObs) {
    const skill = obs.skill_path || 'unknown'
    if (!skillStats[skill]) {
      skillStats[skill] = { total: 0, correct: 0 }
    }
    skillStats[skill].total++
    if (obs.correct) skillStats[skill].correct++
  }

  // Calculate accuracy per skill
  for (const skill in skillStats) {
    const s = skillStats[skill]
    s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
    const skillInfo = getSkillFromPath(skill)
    s.name = skillInfo.name
    s.category = skillInfo.category
  }

  // Find most recent practice
  const sortedObs = [...studentObs].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  )
  const lastPractice = sortedObs[0]?.timestamp || null

  // Calculate streak
  const streak = calculateStreak(studentObs)

  return {
    totalObservations: total,
    correctObservations: correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    todayCount: todayObs.length,
    todayCorrect: todayObs.filter(o => o.correct).length,
    weekCount: weekObs.length,
    weekCorrect: weekObs.filter(o => o.correct).length,
    lastPractice,
    streak,
    skillStats
  }
}

/**
 * Calculate practice streak for a set of observations
 * @param {Array} obs - Observations sorted by timestamp
 * @returns {number}
 */
function calculateStreak(obs) {
  const dates = new Set(obs.map(o => o.timestamp?.split('T')[0]).filter(Boolean))
  const sortedDates = Array.from(dates).sort().reverse()

  if (sortedDates.length === 0) return 0

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Streak must include today or yesterday
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0
  }

  let streak = 1
  let prevDate = new Date(sortedDates[0])

  for (let i = 1; i < sortedDates.length; i++) {
    const currDate = new Date(sortedDates[i])
    const diffDays = Math.round((prevDate - currDate) / (24 * 60 * 60 * 1000))

    if (diffDays === 1) {
      streak++
      prevDate = currDate
    } else {
      break
    }
  }

  return streak
}

/**
 * Get recent errors for a student (for focused review)
 * @param {string} userId
 * @param {number} limit
 * @returns {Array}
 */
function getRecentErrors(userId, limit = 10) {
  return observations.value
    .filter(obs => obs.user_id === userId && !obs.correct)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
}

/**
 * Initialize the dashboard
 */
async function initialize() {
  if (initialized.value) return

  const teacherAuth = useTeacherAuth()
  await teacherAuth.initialize()

  if (teacherAuth.isAuthenticated.value) {
    await loadDashboard()
  }

  initialized.value = true
}

/**
 * Clear cached data (e.g., on logout)
 */
function clearCache() {
  students.value = []
  observations.value = []
  decryptedObservations.value = []
  lastFetchedAt.value = null
  selectedClassroom.value = null
  selectedStudent.value = null
}

export function useTeacherDashboard() {
  // Computed properties
  const totalStudents = computed(() => students.value.length)

  const totalObservations = computed(() => observations.value.length)

  const overallAccuracy = computed(() => {
    const total = observations.value.length
    if (total === 0) return 0
    const correct = observations.value.filter(obs => obs.correct).length
    return Math.round((correct / total) * 100)
  })

  const classrooms = computed(() => getClassrooms())

  const isLoading = computed(() => loading.value)

  const hasError = computed(() => error.value !== null)

  const hasData = computed(() => students.value.length > 0 || observations.value.length > 0)

  return {
    // State
    students,
    observations,
    decryptedObservations,
    loading,
    error,
    lastFetchedAt,
    selectedClassroom,
    selectedStudent,
    dateRange,

    // Computed
    totalStudents,
    totalObservations,
    overallAccuracy,
    classrooms,
    isLoading,
    hasError,
    hasData,

    // Methods
    initialize,
    loadDashboard,
    loadStudentObservations,
    getClassrooms,
    getStudentsByClassroom,
    getClassroomStats,
    getStudentStats,
    getRecentErrors,
    clearCache,
    formatClassroomName
  }
}

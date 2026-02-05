import { ref, computed } from 'vue'

const STORAGE_KEY = 'bridgePractice'

// Singleton state (shared across all component instances)
const assignments = ref({})
const currentAssignmentId = ref(null)
const inAssignmentMode = ref(false)
const initialized = ref(false)

/**
 * Parse assignment parameters from URL
 * Expected format: ?assignment=Week5-Stayman&lessons=Stayman,Transfers&due=2026-02-05
 */
function parseAssignmentFromUrl() {
  const params = new URLSearchParams(window.location.search)

  const name = params.get('assignment')
  const lessonsParam = params.get('lessons')
  const dueDate = params.get('due')
  const teacher = params.get('teacher')
  const classroomsParam = params.get('classrooms')

  if (!name || !lessonsParam) {
    return null
  }

  const lessons = lessonsParam.split(',').map(l => l.trim()).filter(Boolean)
  const classroom = classroomsParam ? classroomsParam.split(',')[0].trim() : null

  return {
    name,
    lessons,
    dueDate: dueDate || null,
    teacherName: teacher || null,
    classroom
  }
}

/**
 * Load assignments from localStorage
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      assignments.value = data.assignments || {}
      currentAssignmentId.value = data.currentAssignmentId || null

      // If there's a current assignment, enable assignment mode
      if (currentAssignmentId.value && assignments.value[currentAssignmentId.value]) {
        inAssignmentMode.value = true
      }
    }
    initialized.value = true
  } catch (err) {
    console.error('Failed to load assignment store from storage:', err)
    initialized.value = true
  }
}

/**
 * Save assignments to localStorage (merged with existing data)
 */
function saveToStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data = stored ? JSON.parse(stored) : {}
    data.assignments = assignments.value
    data.currentAssignmentId = currentAssignmentId.value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save assignment store to storage:', err)
  }
}

/**
 * Create or update an assignment from URL parameters
 * @param {Object} params - Assignment parameters
 * @returns {Object} The created/updated assignment
 */
function createAssignment({ name, teacherName, classroom, lessons, dueDate }) {
  // Check if assignment with same name already exists
  const existing = Object.values(assignments.value).find(a => a.name === name)

  if (existing) {
    // Update existing assignment (merge lessons, update due date)
    const existingLessons = new Set(existing.lessons)
    for (const lesson of lessons) {
      existingLessons.add(lesson)
    }
    existing.lessons = Array.from(existingLessons)
    if (dueDate) {
      existing.dueDate = dueDate
    }
    existing.updatedAt = new Date().toISOString()

    currentAssignmentId.value = existing.id
    inAssignmentMode.value = true
    saveToStorage()
    return existing
  }

  // Create new assignment
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const assignment = {
    id,
    name,
    teacherName,
    classroom,
    lessons,
    assignedAt: now,
    dueDate,
    totalDeals: 0, // Will be calculated when deals are loaded
    completedDeals: 0,
    completedDealIds: [], // Track which specific deals were completed
    completionPercent: 0,
    startedAt: null,
    lastPracticedAt: null,
    createdAt: now,
    updatedAt: now
  }

  assignments.value[id] = assignment
  currentAssignmentId.value = id
  inAssignmentMode.value = true
  saveToStorage()

  return assignment
}

/**
 * Initialize from URL (create assignment if URL contains assignment params)
 */
function initializeFromUrl() {
  if (initialized.value) return

  loadFromStorage()

  const urlAssignment = parseAssignmentFromUrl()
  if (urlAssignment) {
    createAssignment(urlAssignment)
  }

  initialized.value = true
}

/**
 * Check if a lesson/subfolder is part of the current assignment
 * @param {string} subfolder - The lesson subfolder name
 * @returns {boolean}
 */
function isLessonInAssignment(subfolder) {
  if (!inAssignmentMode.value || !currentAssignmentId.value) {
    return false
  }

  const assignment = assignments.value[currentAssignmentId.value]
  if (!assignment) return false

  return assignment.lessons.some(
    lesson => lesson.toLowerCase() === subfolder.toLowerCase()
  )
}

/**
 * Update assignment total deals count (call when deals are loaded)
 * @param {number} totalDeals - Total number of deals in assigned lessons
 */
function setTotalDeals(totalDeals) {
  if (!currentAssignmentId.value) return

  const assignment = assignments.value[currentAssignmentId.value]
  if (!assignment) return

  assignment.totalDeals = totalDeals
  assignment.completionPercent = totalDeals > 0
    ? Math.round((assignment.completedDeals / totalDeals) * 100)
    : 0
  assignment.updatedAt = new Date().toISOString()
  saveToStorage()
}

/**
 * Record a completed deal
 * @param {string} dealId - Unique identifier for the deal (e.g., "Stayman/deal005")
 * @returns {boolean} True if this was a new completion
 */
function recordDealCompletion(dealId) {
  if (!currentAssignmentId.value || !inAssignmentMode.value) return false

  const assignment = assignments.value[currentAssignmentId.value]
  if (!assignment) return false

  // Check if already completed
  if (assignment.completedDealIds.includes(dealId)) {
    return false
  }

  // Record completion
  assignment.completedDealIds.push(dealId)
  assignment.completedDeals = assignment.completedDealIds.length
  assignment.completionPercent = assignment.totalDeals > 0
    ? Math.round((assignment.completedDeals / assignment.totalDeals) * 100)
    : 0

  const now = new Date().toISOString()
  if (!assignment.startedAt) {
    assignment.startedAt = now
  }
  assignment.lastPracticedAt = now
  assignment.updatedAt = now

  saveToStorage()
  return true
}

/**
 * Get assignment metadata for tagging observations
 * @returns {Object|null} Assignment tag data or null if not in assignment mode
 */
function getAssignmentTag() {
  if (!inAssignmentMode.value || !currentAssignmentId.value) {
    return null
  }

  const assignment = assignments.value[currentAssignmentId.value]
  if (!assignment) return null

  return {
    id: assignment.id,
    name: assignment.name,
    teacherName: assignment.teacherName,
    assignedAt: assignment.assignedAt
  }
}

/**
 * Exit assignment mode (user wants to practice freely)
 */
function exitAssignmentMode() {
  inAssignmentMode.value = false
}

/**
 * Return to assignment mode (if there's a current assignment)
 */
function returnToAssignmentMode() {
  if (currentAssignmentId.value && assignments.value[currentAssignmentId.value]) {
    inAssignmentMode.value = true
  }
}

/**
 * Get an assignment by ID
 * @param {string} id - Assignment ID
 * @returns {Object|null}
 */
function getAssignment(id) {
  return assignments.value[id] || null
}

/**
 * Get all assignments for a user
 * @returns {Object[]} Array of assignments
 */
function getAllAssignments() {
  return Object.values(assignments.value)
}

/**
 * Delete an assignment
 * @param {string} id - Assignment ID
 * @returns {boolean}
 */
function deleteAssignment(id) {
  if (!assignments.value[id]) return false

  delete assignments.value[id]

  if (currentAssignmentId.value === id) {
    currentAssignmentId.value = null
    inAssignmentMode.value = false
  }

  saveToStorage()
  return true
}

/**
 * Clear all assignments (for testing)
 */
function clearAssignments() {
  assignments.value = {}
  currentAssignmentId.value = null
  inAssignmentMode.value = false
  initialized.value = false
  saveToStorage()
}

export function useAssignmentStore() {
  // Computed properties
  const currentAssignment = computed(() => {
    if (!currentAssignmentId.value) return null
    return assignments.value[currentAssignmentId.value] || null
  })

  const hasActiveAssignment = computed(() => {
    return inAssignmentMode.value && currentAssignment.value !== null
  })

  const assignmentProgress = computed(() => {
    const assignment = currentAssignment.value
    if (!assignment) {
      return { completed: 0, total: 0, percent: 0 }
    }
    return {
      completed: assignment.completedDeals,
      total: assignment.totalDeals,
      percent: assignment.completionPercent
    }
  })

  const isAssignmentComplete = computed(() => {
    const assignment = currentAssignment.value
    if (!assignment) return false
    return assignment.completedDeals >= assignment.totalDeals && assignment.totalDeals > 0
  })

  return {
    // State
    assignments,
    currentAssignmentId,
    inAssignmentMode,
    initialized,

    // Computed
    currentAssignment,
    hasActiveAssignment,
    assignmentProgress,
    isAssignmentComplete,

    // Methods
    initializeFromUrl,
    loadFromStorage,
    saveToStorage,
    createAssignment,
    isLessonInAssignment,
    setTotalDeals,
    recordDealCompletion,
    getAssignmentTag,
    exitAssignmentMode,
    returnToAssignmentMode,
    getAssignment,
    getAllAssignments,
    deleteAssignment,
    clearAssignments,

    // Utilities (exported for testing)
    parseAssignmentFromUrl
  }
}

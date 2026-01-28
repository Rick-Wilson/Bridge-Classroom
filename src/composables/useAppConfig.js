import { ref, computed } from 'vue'

const STORAGE_KEY = 'bridgePractice'

// Singleton state (shared across all component instances)
const appConfig = ref({
  teacherName: null,
  availableClassrooms: [],
  configuredAt: null
})

const initialized = ref(false)

/**
 * Parse classroom ID into display name
 * e.g., 'tuesday-am' → 'Tuesday AM'
 */
function classroomIdToName(id) {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Parse URL parameters for teacher and classrooms
 */
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)

  const teacher = params.get('teacher')
  const classroomsParam = params.get('classrooms')

  const classrooms = classroomsParam
    ? classroomsParam.split(',').map(id => ({
        id: id.trim(),
        name: classroomIdToName(id.trim())
      }))
    : []

  return { teacher, classrooms }
}

/**
 * Load config from localStorage
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.appConfig) {
        appConfig.value = data.appConfig
      }
    }
  } catch (err) {
    console.error('Failed to load app config from storage:', err)
  }
}

/**
 * Save config to localStorage (merged with existing data)
 */
function saveToStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data = stored ? JSON.parse(stored) : {}
    data.appConfig = appConfig.value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save app config to storage:', err)
  }
}

/**
 * Merge new classrooms with existing ones (no duplicates)
 */
function mergeClassrooms(existing, incoming) {
  const existingIds = new Set(existing.map(c => c.id))
  const merged = [...existing]

  for (const classroom of incoming) {
    if (!existingIds.has(classroom.id)) {
      merged.push(classroom)
    }
  }

  return merged
}

/**
 * Initialize from URL parameters (silently merge with existing config)
 */
function initializeFromUrl() {
  if (initialized.value) return

  // Load existing config first
  loadFromStorage()

  // Parse URL parameters
  const { teacher, classrooms } = parseUrlParams()

  // Merge new data
  if (teacher || classrooms.length > 0) {
    // Update teacher name if not already set
    if (teacher && !appConfig.value.teacherName) {
      appConfig.value.teacherName = teacher
    }

    // Merge classrooms (keep existing, add new)
    if (classrooms.length > 0) {
      appConfig.value.availableClassrooms = mergeClassrooms(
        appConfig.value.availableClassrooms || [],
        classrooms
      )
    }

    // Update timestamp
    if (!appConfig.value.configuredAt) {
      appConfig.value.configuredAt = new Date().toISOString()
    }

    saveToStorage()
  }

  initialized.value = true
}

/**
 * Get full storage data (for debugging or export)
 */
function getStorageData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Clear all app config (for testing or reset)
 */
function clearConfig() {
  appConfig.value = {
    teacherName: null,
    availableClassrooms: [],
    configuredAt: null
  }
  saveToStorage()
  initialized.value = false
}

export function useAppConfig() {
  // Computed properties
  const isAdHoc = computed(() => {
    return appConfig.value.availableClassrooms.length === 0
  })

  const hasMultipleClassrooms = computed(() => {
    return appConfig.value.availableClassrooms.length > 1
  })

  const hasSingleClassroom = computed(() => {
    return appConfig.value.availableClassrooms.length === 1
  })

  const singleClassroom = computed(() => {
    if (hasSingleClassroom.value) {
      return appConfig.value.availableClassrooms[0]
    }
    return null
  })

  const teacherName = computed(() => appConfig.value.teacherName)
  const availableClassrooms = computed(() => appConfig.value.availableClassrooms)

  return {
    // State
    appConfig,
    initialized,

    // Computed
    isAdHoc,
    hasMultipleClassrooms,
    hasSingleClassroom,
    singleClassroom,
    teacherName,
    availableClassrooms,

    // Methods
    initializeFromUrl,
    loadFromStorage,
    saveToStorage,
    clearConfig,
    getStorageData,

    // Utilities (exported for testing)
    parseUrlParams,
    classroomIdToName,
    mergeClassrooms
  }
}

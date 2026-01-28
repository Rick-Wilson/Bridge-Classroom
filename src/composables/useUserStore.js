import { ref, computed } from 'vue'

const STORAGE_KEY = 'bridgePractice'

// Singleton state (shared across all component instances)
const users = ref({})
const currentUserId = ref(null)
const initialized = ref(false)

/**
 * Load user data from localStorage
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      users.value = data.users || {}
      currentUserId.value = data.currentUserId || null
    }
    initialized.value = true
  } catch (err) {
    console.error('Failed to load user store from storage:', err)
    initialized.value = true
  }
}

/**
 * Save user data to localStorage (merged with existing data)
 */
function saveToStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data = stored ? JSON.parse(stored) : {}
    data.users = users.value
    data.currentUserId = currentUserId.value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save user store to storage:', err)
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.firstName - First name (required)
 * @param {string} userData.lastName - Last name (required)
 * @param {string[]} userData.classrooms - Array of classroom IDs
 * @param {boolean} userData.dataConsent - Data sharing consent
 * @returns {Object} The created user
 */
function createUser({ firstName, lastName, classrooms = [], dataConsent = true }) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const user = {
    id,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    classrooms,
    dataConsent,
    createdAt: now,
    updatedAt: now
  }

  users.value[id] = user
  currentUserId.value = id
  saveToStorage()

  return user
}

/**
 * Update an existing user
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} The updated user or null if not found
 */
function updateUser(userId, updates) {
  if (!users.value[userId]) {
    console.error('User not found:', userId)
    return null
  }

  const user = users.value[userId]

  // Apply updates (only allowed fields)
  if (updates.firstName !== undefined) {
    user.firstName = updates.firstName.trim()
  }
  if (updates.lastName !== undefined) {
    user.lastName = updates.lastName.trim()
  }
  if (updates.classrooms !== undefined) {
    user.classrooms = updates.classrooms
  }
  if (updates.dataConsent !== undefined) {
    user.dataConsent = updates.dataConsent
  }

  user.updatedAt = new Date().toISOString()
  saveToStorage()

  return user
}

/**
 * Delete a user
 * @param {string} userId - User ID to delete
 * @returns {boolean} True if deleted, false if not found
 */
function deleteUser(userId) {
  if (!users.value[userId]) {
    return false
  }

  delete users.value[userId]

  // If deleted user was current, switch to another or clear
  if (currentUserId.value === userId) {
    const remainingIds = Object.keys(users.value)
    currentUserId.value = remainingIds.length > 0 ? remainingIds[0] : null
  }

  saveToStorage()
  return true
}

/**
 * Switch to a different user
 * @param {string} userId - User ID to switch to
 * @returns {boolean} True if switched, false if user not found
 */
function switchUser(userId) {
  if (!users.value[userId]) {
    console.error('User not found:', userId)
    return false
  }

  currentUserId.value = userId
  saveToStorage()
  return true
}

/**
 * Check if a user exists with given first and last name
 * @param {string} firstName
 * @param {string} lastName
 * @returns {Object|null} Existing user or null
 */
function findUserByName(firstName, lastName) {
  const normalizedFirst = firstName.trim().toLowerCase()
  const normalizedLast = lastName.trim().toLowerCase()

  for (const user of Object.values(users.value)) {
    if (
      user.firstName.toLowerCase() === normalizedFirst &&
      user.lastName.toLowerCase() === normalizedLast
    ) {
      return user
    }
  }
  return null
}

/**
 * Get user by ID
 * @param {string} userId
 * @returns {Object|null}
 */
function getUser(userId) {
  return users.value[userId] || null
}

/**
 * Clear all users (for testing or reset)
 */
function clearUsers() {
  users.value = {}
  currentUserId.value = null
  saveToStorage()
  initialized.value = false
}

/**
 * Initialize the store (load from storage if not already done)
 */
function initialize() {
  if (!initialized.value) {
    loadFromStorage()
  }
}

export function useUserStore() {
  // Computed properties
  const currentUser = computed(() => {
    if (!currentUserId.value) return null
    return users.value[currentUserId.value] || null
  })

  const allUsers = computed(() => {
    return Object.values(users.value)
  })

  const hasUsers = computed(() => {
    return Object.keys(users.value).length > 0
  })

  const userCount = computed(() => {
    return Object.keys(users.value).length
  })

  const isAuthenticated = computed(() => {
    return currentUserId.value !== null && users.value[currentUserId.value]
  })

  return {
    // State
    users,
    currentUserId,
    initialized,

    // Computed
    currentUser,
    allUsers,
    hasUsers,
    userCount,
    isAuthenticated,

    // Methods
    initialize,
    loadFromStorage,
    saveToStorage,
    createUser,
    updateUser,
    deleteUser,
    switchUser,
    findUserByName,
    getUser,
    clearUsers
  }
}

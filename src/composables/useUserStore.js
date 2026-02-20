import { ref, computed } from 'vue'
import {
  generateSecretKey,
  createKeyBackup,
  validateKeyBackup,
  validateSecretKey,
  createSharingGrant
} from '../utils/crypto.js'

const STORAGE_KEY = 'bridgePractice'

// Singleton state (shared across all component instances)
const users = ref({})
const currentUserId = ref(null)
const adminViewerId = ref(null)
const initialized = ref(false)

// Flag to track if user just registered (for showing key backup modal)
const showKeyBackupModal = ref(false)

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
      adminViewerId.value = data.adminViewerId || null
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
    if (adminViewerId.value) {
      data.adminViewerId = adminViewerId.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save user store to storage:', err)
  }
}

/**
 * Create a new user with AES secret key
 * @param {Object} userData - User data
 * @param {string} userData.firstName - First name (required)
 * @param {string} userData.lastName - Last name (required)
 * @param {string} userData.email - Email address (required)
 * @param {string[]} userData.classrooms - Array of classroom IDs
 * @param {boolean} userData.dataConsent - Data sharing consent
 * @param {string} userData.apiUrl - API base URL for fetching admin key
 * @returns {Promise<Object>} The created user
 */
async function createUser({ firstName, lastName, email, classrooms = [], dataConsent = true, apiUrl }) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  // Generate AES-256-GCM secret key
  const secretKey = await generateSecretKey()

  // Create admin sharing grant if we have an API URL
  let adminGrantPayload = null
  if (apiUrl) {
    try {
      const adminKeyResponse = await fetch(`${apiUrl}/keys/admin`)
      if (adminKeyResponse.ok) {
        const adminData = await adminKeyResponse.json()
        adminViewerId.value = adminData.viewer_id
        adminGrantPayload = {
          grantee_id: adminData.viewer_id,
          encrypted_payload: await createSharingGrant(secretKey, adminData.public_key)
        }
      }
    } catch (err) {
      console.warn('Failed to create admin sharing grant:', err)
      // Continue without admin grant - can be created later
    }
  }

  const user = {
    id,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    classrooms,
    dataConsent,
    secretKey,
    role: 'student',
    serverRegistered: false,
    adminGrantPayload, // Store for sending to server during registration
    createdAt: now,
    updatedAt: now
  }

  users.value[id] = user
  currentUserId.value = id
  saveToStorage()

  // Trigger key backup modal for new users
  showKeyBackupModal.value = true

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
  if (updates.email !== undefined) {
    user.email = updates.email.trim().toLowerCase()
  }
  if (updates.classrooms !== undefined) {
    user.classrooms = updates.classrooms
  }
  if (updates.dataConsent !== undefined) {
    user.dataConsent = updates.dataConsent
  }
  if (updates.serverRegistered !== undefined) {
    user.serverRegistered = updates.serverRegistered
  }
  if (updates.role !== undefined) {
    user.role = updates.role
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
 * Check if a user exists with given email
 * @param {string} email
 * @returns {Object|null} Existing user or null
 */
function findUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase()

  for (const user of Object.values(users.value)) {
    if (user.email && user.email.toLowerCase() === normalizedEmail) {
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
  adminViewerId.value = null
  showKeyBackupModal.value = false
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

/**
 * Restore a user from a backup file
 * @param {Object} backup - Parsed backup file data
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
async function restoreFromBackup(backup) {
  // Validate backup format
  const validation = validateKeyBackup(backup)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // Validate the secret key actually works
  const keyValid = await validateSecretKey(backup.secret_key)
  if (!keyValid) {
    return { success: false, error: 'The secret key in this backup file is invalid or corrupted' }
  }

  // Check if user already exists
  const existingUser = users.value[backup.user_id]
  if (existingUser) {
    // Update existing user's key (in case it was lost)
    existingUser.secretKey = backup.secret_key
    existingUser.updatedAt = new Date().toISOString()
    currentUserId.value = backup.user_id
    saveToStorage()
    return { success: true, user: existingUser }
  }

  // Create new user from backup
  const nameParts = (backup.name || 'Restored User').split(' ')
  const firstName = nameParts[0] || 'Restored'
  const lastName = nameParts.slice(1).join(' ') || 'User'

  const user = {
    id: backup.user_id,
    firstName,
    lastName,
    email: backup.email || '',
    classrooms: [],
    dataConsent: true,
    secretKey: backup.secret_key,
    serverRegistered: false,
    restoredFromBackup: true,
    createdAt: backup.created || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  users.value[user.id] = user
  currentUserId.value = user.id
  saveToStorage()

  return { success: true, user }
}

/**
 * Get key backup data for current user
 * @returns {Object|null} Backup data or null if no current user
 */
function getKeyBackup() {
  const user = users.value[currentUserId.value]
  if (!user || !user.secretKey) {
    return null
  }
  return createKeyBackup(user)
}

/**
 * Dismiss the key backup modal
 */
function dismissKeyBackupModal() {
  showKeyBackupModal.value = false
}

/**
 * Get the admin viewer ID
 * @returns {string|null}
 */
function getAdminViewerId() {
  return adminViewerId.value
}

/**
 * Set the admin viewer ID
 * @param {string} viewerId
 */
function setAdminViewerId(viewerId) {
  adminViewerId.value = viewerId
  saveToStorage()
}

/**
 * Create a sharing grant for a viewer
 * @param {string} viewerPublicKey - Viewer's RSA public key (base64)
 * @returns {Promise<string|null>} Encrypted payload or null if no current user
 */
async function createGrantForViewer(viewerPublicKey) {
  const user = users.value[currentUserId.value]
  if (!user || !user.secretKey) {
    return null
  }
  return createSharingGrant(user.secretKey, viewerPublicKey)
}

/**
 * Request account recovery for an email address
 * @param {string} email - Email address to recover
 * @param {string} apiUrl - API base URL
 * @returns {Promise<{success: boolean, message: string, userId?: string}>}
 */
async function requestRecovery(email, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/recovery/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    // Handle 404 - endpoint not found or email not registered
    if (response.status === 404) {
      return {
        success: false,
        message: 'No account found with this email address.'
      }
    }

    // Try to parse JSON response
    const text = await response.text()
    if (!text) {
      // Empty response - treat as no account found
      return {
        success: false,
        message: 'No account found with this email address.'
      }
    }

    try {
      return JSON.parse(text)
    } catch (parseErr) {
      console.error('Failed to parse recovery response:', parseErr)
      return {
        success: false,
        message: 'No account found with this email address.'
      }
    }
  } catch (err) {
    console.error('Recovery request failed:', err)
    return {
      success: false,
      message: 'Unable to connect to server. Please try again.'
    }
  }
}

/**
 * Claim account recovery with token from email
 * @param {string} userId - User ID from recovery URL
 * @param {string} token - Recovery token from email
 * @param {string} apiUrl - API base URL
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
async function claimRecovery(userId, token, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/recovery/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId, token })
    })

    const data = await response.json()

    if (!data.success || !data.user) {
      return {
        success: false,
        error: data.error || 'Recovery failed'
      }
    }

    // Restore user to local storage
    const recoveredUser = {
      id: data.user.id,
      firstName: data.user.first_name,
      lastName: data.user.last_name,
      email: data.user.email,
      classrooms: data.user.classroom ? [data.user.classroom] : [],
      dataConsent: true,
      secretKey: data.user.secret_key,
      role: data.user.role || 'student',
      serverRegistered: true,
      recoveredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    users.value[recoveredUser.id] = recoveredUser
    currentUserId.value = recoveredUser.id
    saveToStorage()

    return { success: true, user: recoveredUser }
  } catch (err) {
    console.error('Recovery claim failed:', err)
    return {
      success: false,
      error: 'Unable to connect to server. Please try again.'
    }
  }
}

/**
 * Claim account recovery using a 6-digit numeric code from the email
 * @param {string} email - Email address
 * @param {string} code - 6-digit recovery code
 * @param {string} apiUrl - API base URL
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
async function claimRecoveryByCode(email, code, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/recovery/claim-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code })
    })

    const data = await response.json()

    if (!data.success || !data.user) {
      return {
        success: false,
        error: data.error || 'Invalid code'
      }
    }

    // Restore user to local storage — same logic as claimRecovery()
    const recoveredUser = {
      id: data.user.id,
      firstName: data.user.first_name,
      lastName: data.user.last_name,
      email: data.user.email,
      classrooms: data.user.classroom ? [data.user.classroom] : [],
      dataConsent: true,
      secretKey: data.user.secret_key,
      role: data.user.role || 'student',
      serverRegistered: true,
      recoveredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    users.value[recoveredUser.id] = recoveredUser
    currentUserId.value = recoveredUser.id
    saveToStorage()

    return { success: true, user: recoveredUser }
  } catch (err) {
    console.error('Recovery claim by code failed:', err)
    return {
      success: false,
      error: 'Unable to connect to server. Please try again.'
    }
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
    return currentUserId.value !== null && !!users.value[currentUserId.value]
  })

  return {
    // State
    users,
    currentUserId,
    adminViewerId,
    initialized,
    showKeyBackupModal,

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
    findUserByEmail,
    getUser,
    clearUsers,

    // Key management
    restoreFromBackup,
    getKeyBackup,
    dismissKeyBackupModal,
    getAdminViewerId,
    setAdminViewerId,
    createGrantForViewer,

    // Account recovery
    requestRecovery,
    claimRecovery,
    claimRecoveryByCode
  }
}

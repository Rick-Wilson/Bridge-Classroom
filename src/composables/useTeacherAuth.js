import { ref, computed } from 'vue'
import { importPrivateKey } from '../utils/crypto.js'

const STORAGE_KEY = 'bridgeTeacher'
const SESSION_KEY = 'bridgeTeacherSession'

// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Singleton state
const isAuthenticated = ref(false)
const teacherPrivateKey = ref(null) // CryptoKey object
const privateKeyBase64 = ref(null)  // Base64 string for storage
const viewerId = ref(null)          // Viewer ID in the database
const sessionExpiry = ref(null)
const initialized = ref(false)

// Session duration (8 hours)
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

/**
 * Parse a private key from various formats
 * Supports: PEM format, base64 encoded, raw PKCS8
 * @param {string} keyInput - The key input (PEM or base64)
 * @returns {string} Base64 encoded key
 */
function parsePrivateKey(keyInput) {
  let keyData = keyInput.trim()

  // If it's PEM format, extract the base64 content
  if (keyData.includes('-----BEGIN')) {
    // Remove PEM headers/footers and whitespace
    keyData = keyData
      .replace(/-----BEGIN.*?-----/g, '')
      .replace(/-----END.*?-----/g, '')
      .replace(/\s/g, '')
  }

  return keyData
}

/**
 * Verify the password with the server
 * @param {string} password - The teacher password
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function verifyPassword(password) {
  try {
    const response = await fetch(`${API_URL}/auth/teacher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ password })
    })

    if (response.ok) {
      return { valid: true }
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid password' }
    }

    const errorData = await response.json().catch(() => ({}))
    return { valid: false, error: errorData.message || 'Authentication failed' }
  } catch (err) {
    console.error('Password verification error:', err)
    return { valid: false, error: 'Unable to connect to server' }
  }
}

/**
 * Validate the private key by attempting to import it
 * @param {string} keyBase64 - Base64 encoded RSA private key
 * @returns {Promise<{valid: boolean, key?: CryptoKey, error?: string}>}
 */
async function validatePrivateKey(keyBase64) {
  try {
    const key = await importPrivateKey(keyBase64)
    return { valid: true, key }
  } catch (err) {
    console.error('Private key validation error:', err)
    return { valid: false, error: 'Invalid private key format' }
  }
}

/**
 * Load saved session from storage
 */
function loadSession() {
  try {
    const sessionData = sessionStorage.getItem(SESSION_KEY)
    if (sessionData) {
      const session = JSON.parse(sessionData)

      // Check if session is still valid
      if (session.expiry && new Date(session.expiry) > new Date()) {
        sessionExpiry.value = session.expiry
        privateKeyBase64.value = session.privateKeyBase64
        viewerId.value = session.viewerId || null
        return true
      }
    }
  } catch (err) {
    console.error('Failed to load session:', err)
  }
  return false
}

/**
 * Save session to storage
 */
function saveSession() {
  try {
    const session = {
      expiry: sessionExpiry.value,
      privateKeyBase64: privateKeyBase64.value,
      viewerId: viewerId.value
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (err) {
    console.error('Failed to save session:', err)
  }
}

/**
 * Load remembered key from localStorage (encrypted with password)
 */
function loadRememberedKey() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return data.encryptedKey || null
    }
  } catch (err) {
    console.error('Failed to load remembered key:', err)
  }
  return null
}

/**
 * Save key to localStorage (for "remember me" feature)
 * Note: In a production app, this should be encrypted with the password
 */
function saveRememberedKey(keyBase64) {
  try {
    const data = { encryptedKey: keyBase64 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save remembered key:', err)
  }
}

/**
 * Clear remembered key
 */
function clearRememberedKey() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Initialize the auth state
 */
async function initialize() {
  if (initialized.value) return

  // Try to restore session
  if (loadSession() && privateKeyBase64.value) {
    const keyResult = await validatePrivateKey(privateKeyBase64.value)
    if (keyResult.valid) {
      teacherPrivateKey.value = keyResult.key
      isAuthenticated.value = true
    }
  }

  initialized.value = true
}

/**
 * Login with password and private key
 * @param {string} password - Teacher password
 * @param {string} privateKeyInput - Private key (PEM or base64)
 * @param {boolean} rememberKey - Whether to remember the key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function login(password, privateKeyInput, rememberKey = false) {
  // Verify password with server
  const passwordResult = await verifyPassword(password)
  if (!passwordResult.valid) {
    return { success: false, error: passwordResult.error }
  }

  // Parse and validate private key
  const keyBase64 = parsePrivateKey(privateKeyInput)
  const keyResult = await validatePrivateKey(keyBase64)
  if (!keyResult.valid) {
    return { success: false, error: keyResult.error }
  }

  // Store the key and set session
  teacherPrivateKey.value = keyResult.key
  privateKeyBase64.value = keyBase64
  sessionExpiry.value = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  isAuthenticated.value = true

  // Save session
  saveSession()

  // Optionally remember key
  if (rememberKey) {
    saveRememberedKey(keyBase64)
  }

  return { success: true }
}

/**
 * Logout and clear session
 */
function logout() {
  isAuthenticated.value = false
  teacherPrivateKey.value = null
  privateKeyBase64.value = null
  sessionExpiry.value = null

  sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Get the teacher's private key (base64 encoded) for decryption
 * @returns {string|null}
 */
function getPrivateKey() {
  return privateKeyBase64.value
}

/**
 * Get the teacher's viewer ID
 * @returns {string|null}
 */
function getViewerId() {
  return viewerId.value
}

/**
 * Set the viewer ID (called after login when retrieving viewer info)
 * @param {string} id
 */
function setViewerId(id) {
  viewerId.value = id
  saveSession()
}

/**
 * Check if session is still valid
 * @returns {boolean}
 */
function isSessionValid() {
  if (!sessionExpiry.value) return false
  return new Date(sessionExpiry.value) > new Date()
}

/**
 * Extend the session
 */
function extendSession() {
  if (isAuthenticated.value) {
    sessionExpiry.value = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
    saveSession()
  }
}

export function useTeacherAuth() {
  // Computed properties
  const authenticated = computed(() => isAuthenticated.value)

  const sessionTimeRemaining = computed(() => {
    if (!sessionExpiry.value) return 0
    const remaining = new Date(sessionExpiry.value).getTime() - Date.now()
    return Math.max(0, remaining)
  })

  const hasRememberedKey = computed(() => !!loadRememberedKey())

  return {
    // State
    isAuthenticated: authenticated,
    sessionExpiry,
    initialized,

    // Computed
    sessionTimeRemaining,
    hasRememberedKey,

    // Methods
    initialize,
    login,
    logout,
    getPrivateKey,
    getViewerId,
    setViewerId,
    isSessionValid,
    extendSession,
    clearRememberedKey
  }
}

/**
 * Credential Sync Utility
 *
 * Uses the Credential Management API to store a recovery passphrase
 * in the browser's password manager. This passphrase is used to encrypt
 * the user's private key, enabling cross-device sync via iCloud Keychain,
 * Google Password Manager, Firefox Sync, etc.
 */

// The domain to use for credential storage
const CREDENTIAL_ID = 'bridge-classroom-key'

/**
 * Check if the Credential Management API is supported
 * @returns {boolean}
 */
export function isCredentialSyncSupported() {
  return !!(window.PasswordCredential && navigator.credentials)
}

/**
 * Generate a secure random passphrase
 * @returns {string} A 32-character base64 passphrase
 */
export function generatePassphrase() {
  const array = new Uint8Array(24) // 24 bytes = 32 base64 chars
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

/**
 * Save credentials to the browser's password manager
 * This will trigger the browser's "Save password?" prompt
 *
 * @param {string} userId - The user's ID (used as username)
 * @param {string} passphrase - The passphrase to store (used as password)
 * @returns {Promise<boolean>} True if saved successfully
 */
export async function saveCredential(userId, passphrase) {
  if (!isCredentialSyncSupported()) {
    console.warn('Credential Management API not supported')
    return false
  }

  try {
    const credential = new PasswordCredential({
      id: userId,
      password: passphrase,
      name: 'Bridge Classroom Recovery Key'
    })

    // Store the credential - this may show a browser prompt
    const stored = await navigator.credentials.store(credential)
    console.log('Credential stored:', !!stored)
    return true
  } catch (err) {
    console.error('Failed to save credential:', err)
    return false
  }
}

/**
 * Retrieve credentials from the browser's password manager
 * This may show a browser prompt to select/confirm credentials
 *
 * @param {string} userId - Optional: specific user ID to look for
 * @returns {Promise<{userId: string, passphrase: string}|null>}
 */
export async function getCredential(userId = null) {
  if (!isCredentialSyncSupported()) {
    console.warn('Credential Management API not supported')
    return null
  }

  try {
    const options = {
      password: true,
      mediation: 'optional' // 'silent', 'optional', or 'required'
    }

    const credential = await navigator.credentials.get(options)

    if (credential && credential.type === 'password') {
      // Check if it matches the requested userId
      if (userId && credential.id !== userId) {
        return null
      }

      return {
        userId: credential.id,
        passphrase: credential.password
      }
    }

    return null
  } catch (err) {
    console.error('Failed to get credential:', err)
    return null
  }
}

/**
 * Silently check for stored credentials without prompting
 * @returns {Promise<boolean>} True if credentials exist
 */
export async function hasStoredCredential() {
  if (!isCredentialSyncSupported()) {
    return false
  }

  try {
    const credential = await navigator.credentials.get({
      password: true,
      mediation: 'silent'
    })

    return credential !== null
  } catch (err) {
    // Silent mediation may not be supported or may fail
    return false
  }
}

/**
 * Clear stored credentials (sign out)
 * @returns {Promise<void>}
 */
export async function clearCredential() {
  if (!isCredentialSyncSupported()) {
    return
  }

  try {
    // Prevent auto sign-in
    await navigator.credentials.preventSilentAccess()
  } catch (err) {
    console.error('Failed to clear credential:', err)
  }
}

/**
 * Create a form-based credential save (fallback for better browser support)
 * Some browsers only save credentials from form submissions
 *
 * @param {string} userId
 * @param {string} passphrase
 */
export function triggerCredentialSaveViaForm(userId, passphrase) {
  // Create a hidden form that mimics a login form
  const form = document.createElement('form')
  form.style.display = 'none'
  form.method = 'POST'
  form.action = window.location.href

  const usernameInput = document.createElement('input')
  usernameInput.type = 'text'
  usernameInput.name = 'username'
  usernameInput.autocomplete = 'username'
  usernameInput.value = userId

  const passwordInput = document.createElement('input')
  passwordInput.type = 'password'
  passwordInput.name = 'password'
  passwordInput.autocomplete = 'current-password'
  passwordInput.value = passphrase

  form.appendChild(usernameInput)
  form.appendChild(passwordInput)
  document.body.appendChild(form)

  // Focus the password field briefly to help browser detect it
  passwordInput.focus()

  // Use PasswordCredential API if available
  if (window.PasswordCredential) {
    const credential = new PasswordCredential({
      id: userId,
      password: passphrase,
      name: 'Bridge Classroom'
    })
    navigator.credentials.store(credential).catch(console.error)
  }

  // Clean up
  setTimeout(() => {
    document.body.removeChild(form)
  }, 100)
}

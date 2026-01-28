/**
 * Cryptography utilities using Web Crypto API
 *
 * Encryption scheme:
 * - RSA-OAEP 2048-bit for asymmetric key exchange
 * - AES-256-GCM for symmetric data encryption
 *
 * Flow for encrypting observations:
 * 1. Generate one-time AES-256-GCM symmetric key
 * 2. Encrypt observation JSON with symmetric key
 * 3. Encrypt symmetric key with student's RSA public key
 * 4. Encrypt symmetric key with teacher's RSA public key
 * 5. Package: { encrypted_data, iv, student_key_blob, teacher_key_blob }
 */

const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]), // 65537
  hash: 'SHA-256'
}

const AES_ALGORITHM = {
  name: 'AES-GCM',
  length: 256
}

/**
 * Generate an RSA-OAEP keypair for asymmetric encryption
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 */
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    RSA_ALGORITHM,
    true, // extractable
    ['encrypt', 'decrypt']
  )
  return keyPair
}

/**
 * Export a CryptoKey to base64-encoded string
 * @param {CryptoKey} key - The key to export
 * @param {boolean} isPublic - True for public key (SPKI), false for private (PKCS8)
 * @returns {Promise<string>} Base64-encoded key
 */
export async function exportKey(key, isPublic = true) {
  const format = isPublic ? 'spki' : 'pkcs8'
  const exported = await crypto.subtle.exportKey(format, key)
  return arrayBufferToBase64(exported)
}

/**
 * Import a key from base64-encoded string
 * @param {string} keyData - Base64-encoded key
 * @param {boolean} isPublic - True for public key, false for private
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(keyData, isPublic = true) {
  const format = isPublic ? 'spki' : 'pkcs8'
  const keyBuffer = base64ToArrayBuffer(keyData)

  return crypto.subtle.importKey(
    format,
    keyBuffer,
    RSA_ALGORITHM,
    true, // extractable
    isPublic ? ['encrypt'] : ['decrypt']
  )
}

/**
 * Generate a one-time AES-256-GCM symmetric key
 * @returns {Promise<CryptoKey>}
 */
export async function generateSymmetricKey() {
  return crypto.subtle.generateKey(
    AES_ALGORITHM,
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data with AES-256-GCM
 * @param {string} plaintext - Data to encrypt (will be JSON stringified if object)
 * @param {CryptoKey} symmetricKey - AES key
 * @returns {Promise<{ciphertext: string, iv: string}>} Base64-encoded ciphertext and IV
 */
export async function encryptWithSymmetricKey(plaintext, symmetricKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  const encoder = new TextEncoder()
  const data = encoder.encode(typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    data
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  }
}

/**
 * Decrypt data with AES-256-GCM
 * @param {string} ciphertext - Base64-encoded ciphertext
 * @param {string} iv - Base64-encoded IV
 * @param {CryptoKey} symmetricKey - AES key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptWithSymmetricKey(ciphertext, iv, symmetricKey) {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext)
  const ivBuffer = base64ToArrayBuffer(iv)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    symmetricKey,
    ciphertextBuffer
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Encrypt a symmetric key with an RSA public key
 * @param {CryptoKey} symmetricKey - The AES key to wrap
 * @param {CryptoKey} publicKey - RSA public key
 * @returns {Promise<string>} Base64-encoded encrypted key
 */
export async function wrapSymmetricKey(symmetricKey, publicKey) {
  // Export the symmetric key first
  const rawKey = await crypto.subtle.exportKey('raw', symmetricKey)

  // Encrypt with RSA-OAEP
  const wrapped = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawKey
  )

  return arrayBufferToBase64(wrapped)
}

/**
 * Decrypt a symmetric key with an RSA private key
 * @param {string} wrappedKey - Base64-encoded encrypted key
 * @param {CryptoKey} privateKey - RSA private key
 * @returns {Promise<CryptoKey>} The unwrapped AES key
 */
export async function unwrapSymmetricKey(wrappedKey, privateKey) {
  const wrappedBuffer = base64ToArrayBuffer(wrappedKey)

  // Decrypt with RSA-OAEP
  const rawKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    wrappedBuffer
  )

  // Import as AES key
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt an observation for both student and teacher
 * @param {Object} observation - The observation data to encrypt
 * @param {CryptoKey} studentPublicKey - Student's RSA public key
 * @param {CryptoKey} teacherPublicKey - Teacher's RSA public key
 * @returns {Promise<Object>} Encrypted package
 */
export async function encryptObservation(observation, studentPublicKey, teacherPublicKey) {
  // Generate one-time symmetric key
  const symmetricKey = await generateSymmetricKey()

  // Encrypt the observation data
  const { ciphertext, iv } = await encryptWithSymmetricKey(
    JSON.stringify(observation),
    symmetricKey
  )

  // Wrap the symmetric key for both parties
  const studentKeyBlob = await wrapSymmetricKey(symmetricKey, studentPublicKey)
  const teacherKeyBlob = await wrapSymmetricKey(symmetricKey, teacherPublicKey)

  return {
    encrypted_data: ciphertext,
    iv,
    student_key_blob: studentKeyBlob,
    teacher_key_blob: teacherKeyBlob
  }
}

/**
 * Decrypt an observation using a private key
 * @param {Object} encryptedPackage - The encrypted observation package
 * @param {CryptoKey} privateKey - RSA private key (student or teacher)
 * @param {boolean} isTeacher - True to use teacher_key_blob, false for student_key_blob
 * @returns {Promise<Object>} Decrypted observation
 */
export async function decryptObservation(encryptedPackage, privateKey, isTeacher = false) {
  const keyBlob = isTeacher
    ? encryptedPackage.teacher_key_blob
    : encryptedPackage.student_key_blob

  // Unwrap the symmetric key
  const symmetricKey = await unwrapSymmetricKey(keyBlob, privateKey)

  // Decrypt the observation
  const decrypted = await decryptWithSymmetricKey(
    encryptedPackage.encrypted_data,
    encryptedPackage.iv,
    symmetricKey
  )

  return JSON.parse(decrypted)
}

/**
 * Generate a complete keypair and export both keys as base64
 * Convenience function for user registration
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
export async function generateExportedKeyPair() {
  const keyPair = await generateKeyPair()
  const publicKey = await exportKey(keyPair.publicKey, true)
  const privateKey = await exportKey(keyPair.privateKey, false)
  return { publicKey, privateKey }
}

/**
 * Create a backup file object for a user's keys
 * @param {Object} user - User object with id, firstName, lastName, publicKey, privateKey
 * @returns {Object} Backup file data
 */
export function createKeyBackup(user) {
  return {
    bridge_practice_backup: true,
    version: '1.0',
    user_id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    private_key: user.privateKey,
    public_key: user.publicKey,
    created: new Date().toISOString().split('T')[0],
    note: 'Keep this file safe. Import it to restore your practice history on a new device.'
  }
}

/**
 * Validate a backup file
 * @param {Object} backup - Parsed backup file data
 * @returns {{valid: boolean, error?: string}}
 */
export function validateKeyBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    return { valid: false, error: 'Invalid backup file format' }
  }

  if (!backup.bridge_practice_backup) {
    return { valid: false, error: 'Not a Bridge Practice backup file' }
  }

  if (!backup.private_key || !backup.public_key) {
    return { valid: false, error: 'Backup file is missing key data' }
  }

  if (!backup.user_id) {
    return { valid: false, error: 'Backup file is missing user ID' }
  }

  return { valid: true }
}

/**
 * Test if keys can encrypt/decrypt (validation)
 * @param {string} publicKeyBase64 - Base64-encoded public key
 * @param {string} privateKeyBase64 - Base64-encoded private key
 * @returns {Promise<boolean>}
 */
export async function validateKeyPair(publicKeyBase64, privateKeyBase64) {
  try {
    const publicKey = await importKey(publicKeyBase64, true)
    const privateKey = await importKey(privateKeyBase64, false)

    // Test encrypt/decrypt round trip
    const testData = { test: 'validation', timestamp: Date.now() }
    const symmetricKey = await generateSymmetricKey()
    const { ciphertext, iv } = await encryptWithSymmetricKey(JSON.stringify(testData), symmetricKey)
    const wrappedKey = await wrapSymmetricKey(symmetricKey, publicKey)

    const unwrappedKey = await unwrapSymmetricKey(wrappedKey, privateKey)
    const decrypted = await decryptWithSymmetricKey(ciphertext, iv, unwrappedKey)
    const parsed = JSON.parse(decrypted)

    return parsed.test === 'validation'
  } catch (err) {
    console.error('Key validation failed:', err)
    return false
  }
}

// ============ Utility Functions ============

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

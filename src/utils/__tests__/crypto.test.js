import { describe, it, expect, beforeAll } from 'vitest'
import {
  generateKeyPair,
  exportKey,
  importKey,
  generateSymmetricKey,
  encryptWithSymmetricKey,
  decryptWithSymmetricKey,
  wrapSymmetricKey,
  unwrapSymmetricKey,
  encryptObservation,
  decryptObservation,
  generateExportedKeyPair,
  createKeyBackup,
  validateKeyBackup,
  validateKeyPair,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from '../crypto.js'

describe('crypto utilities', () => {
  describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
    it('round-trips correctly', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128])
      const base64 = arrayBufferToBase64(original.buffer)
      const restored = new Uint8Array(base64ToArrayBuffer(base64))

      expect(restored).toEqual(original)
    })

    it('handles empty buffer', () => {
      const original = new Uint8Array([])
      const base64 = arrayBufferToBase64(original.buffer)
      const restored = new Uint8Array(base64ToArrayBuffer(base64))

      expect(restored).toEqual(original)
    })
  })

  describe('generateKeyPair', () => {
    it('generates a valid RSA keypair', async () => {
      const keyPair = await generateKeyPair()

      expect(keyPair).toHaveProperty('publicKey')
      expect(keyPair).toHaveProperty('privateKey')
      expect(keyPair.publicKey.type).toBe('public')
      expect(keyPair.privateKey.type).toBe('private')
    })
  })

  describe('exportKey / importKey', () => {
    it('exports and imports public key', async () => {
      const keyPair = await generateKeyPair()
      const exported = await exportKey(keyPair.publicKey, true)

      expect(typeof exported).toBe('string')
      expect(exported.length).toBeGreaterThan(100)

      const imported = await importKey(exported, true)
      expect(imported.type).toBe('public')
    })

    it('exports and imports private key', async () => {
      const keyPair = await generateKeyPair()
      const exported = await exportKey(keyPair.privateKey, false)

      expect(typeof exported).toBe('string')
      expect(exported.length).toBeGreaterThan(100)

      const imported = await importKey(exported, false)
      expect(imported.type).toBe('private')
    })
  })

  describe('generateSymmetricKey', () => {
    it('generates AES-GCM key', async () => {
      const key = await generateSymmetricKey()

      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
    })
  })

  describe('symmetric encryption', () => {
    it('encrypts and decrypts string data', async () => {
      const key = await generateSymmetricKey()
      const plaintext = 'Hello, World!'

      const { ciphertext, iv } = await encryptWithSymmetricKey(plaintext, key)
      const decrypted = await decryptWithSymmetricKey(ciphertext, iv, key)

      expect(decrypted).toBe(plaintext)
    })

    it('encrypts and decrypts JSON data', async () => {
      const key = await generateSymmetricKey()
      const data = { name: 'Test', value: 42, nested: { arr: [1, 2, 3] } }

      const { ciphertext, iv } = await encryptWithSymmetricKey(JSON.stringify(data), key)
      const decrypted = await decryptWithSymmetricKey(ciphertext, iv, key)

      expect(JSON.parse(decrypted)).toEqual(data)
    })

    it('produces different ciphertext each time (random IV)', async () => {
      const key = await generateSymmetricKey()
      const plaintext = 'Same message'

      const result1 = await encryptWithSymmetricKey(plaintext, key)
      const result2 = await encryptWithSymmetricKey(plaintext, key)

      expect(result1.ciphertext).not.toBe(result2.ciphertext)
      expect(result1.iv).not.toBe(result2.iv)
    })
  })

  describe('key wrapping', () => {
    it('wraps and unwraps symmetric key with RSA', async () => {
      const rsaKeyPair = await generateKeyPair()
      const symmetricKey = await generateSymmetricKey()

      const wrapped = await wrapSymmetricKey(symmetricKey, rsaKeyPair.publicKey)
      expect(typeof wrapped).toBe('string')

      const unwrapped = await unwrapSymmetricKey(wrapped, rsaKeyPair.privateKey)
      expect(unwrapped.type).toBe('secret')

      // Verify unwrapped key works
      const plaintext = 'Test data'
      const { ciphertext, iv } = await encryptWithSymmetricKey(plaintext, symmetricKey)
      const decrypted = await decryptWithSymmetricKey(ciphertext, iv, unwrapped)

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('observation encryption', () => {
    let studentKeyPair
    let teacherKeyPair

    beforeAll(async () => {
      studentKeyPair = await generateKeyPair()
      teacherKeyPair = await generateKeyPair()
    })

    it('encrypts observation for both student and teacher', async () => {
      const observation = {
        user_id: 'test-user',
        timestamp: new Date().toISOString(),
        deal: { name: 'Test Deal' },
        result: { correct: true }
      }

      const encrypted = await encryptObservation(
        observation,
        studentKeyPair.publicKey,
        teacherKeyPair.publicKey
      )

      expect(encrypted).toHaveProperty('encrypted_data')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('student_key_blob')
      expect(encrypted).toHaveProperty('teacher_key_blob')
    })

    it('student can decrypt their own observation', async () => {
      const observation = {
        user_id: 'student-123',
        skill_path: 'bidding_conventions/stayman',
        correct: false
      }

      const encrypted = await encryptObservation(
        observation,
        studentKeyPair.publicKey,
        teacherKeyPair.publicKey
      )

      const decrypted = await decryptObservation(
        encrypted,
        studentKeyPair.privateKey,
        false
      )

      expect(decrypted).toEqual(observation)
    })

    it('teacher can decrypt student observation', async () => {
      const observation = {
        user_id: 'student-456',
        skill_path: 'bidding_conventions/transfers',
        correct: true
      }

      const encrypted = await encryptObservation(
        observation,
        studentKeyPair.publicKey,
        teacherKeyPair.publicKey
      )

      const decrypted = await decryptObservation(
        encrypted,
        teacherKeyPair.privateKey,
        true
      )

      expect(decrypted).toEqual(observation)
    })
  })

  describe('generateExportedKeyPair', () => {
    it('returns base64-encoded public and private keys', async () => {
      const { publicKey, privateKey } = await generateExportedKeyPair()

      expect(typeof publicKey).toBe('string')
      expect(typeof privateKey).toBe('string')
      expect(publicKey.length).toBeGreaterThan(100)
      expect(privateKey.length).toBeGreaterThan(100)
    })
  })

  describe('createKeyBackup', () => {
    it('creates valid backup object', () => {
      const user = {
        id: 'user-123',
        firstName: 'Margaret',
        lastName: 'Thompson',
        publicKey: 'base64-public-key',
        privateKey: 'base64-private-key'
      }

      const backup = createKeyBackup(user)

      expect(backup.bridge_practice_backup).toBe(true)
      expect(backup.version).toBe('1.0')
      expect(backup.user_id).toBe('user-123')
      expect(backup.name).toBe('Margaret Thompson')
      expect(backup.public_key).toBe('base64-public-key')
      expect(backup.private_key).toBe('base64-private-key')
      expect(backup.note).toContain('Keep this file safe')
    })
  })

  describe('validateKeyBackup', () => {
    it('validates correct backup', () => {
      const backup = {
        bridge_practice_backup: true,
        version: '1.0',
        user_id: 'user-123',
        public_key: 'key-data',
        private_key: 'key-data'
      }

      const result = validateKeyBackup(backup)

      expect(result.valid).toBe(true)
    })

    it('rejects non-backup object', () => {
      const result = validateKeyBackup({ some: 'data' })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Not a Bridge Practice backup')
    })

    it('rejects backup without keys', () => {
      const backup = {
        bridge_practice_backup: true,
        user_id: 'user-123'
      }

      const result = validateKeyBackup(backup)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('missing key data')
    })

    it('rejects backup without user_id', () => {
      const backup = {
        bridge_practice_backup: true,
        public_key: 'key',
        private_key: 'key'
      }

      const result = validateKeyBackup(backup)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('missing user ID')
    })

    it('rejects null/undefined', () => {
      expect(validateKeyBackup(null).valid).toBe(false)
      expect(validateKeyBackup(undefined).valid).toBe(false)
    })
  })

  describe('validateKeyPair', () => {
    it('validates working keypair', async () => {
      const { publicKey, privateKey } = await generateExportedKeyPair()

      const isValid = await validateKeyPair(publicKey, privateKey)

      expect(isValid).toBe(true)
    })

    it('rejects invalid keys', async () => {
      const isValid = await validateKeyPair('invalid', 'keys')

      expect(isValid).toBe(false)
    })

    it('rejects mismatched keys', async () => {
      const keyPair1 = await generateExportedKeyPair()
      const keyPair2 = await generateExportedKeyPair()

      const isValid = await validateKeyPair(keyPair1.publicKey, keyPair2.privateKey)

      expect(isValid).toBe(false)
    })
  })
})

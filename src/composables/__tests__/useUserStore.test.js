import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from '../useUserStore.js'

describe('useUserStore', () => {
  beforeEach(() => {
    localStorage.clear()
    const store = useUserStore()
    store.clearUsers()
  })

  describe('createUser', () => {
    it('creates a new user with required fields', () => {
      const store = useUserStore()

      const user = store.createUser({
        firstName: 'Margaret',
        lastName: 'Thompson',
        classrooms: ['tuesday-am'],
        dataConsent: true
      })

      expect(user.id).toBeDefined()
      expect(user.firstName).toBe('Margaret')
      expect(user.lastName).toBe('Thompson')
      expect(user.classrooms).toEqual(['tuesday-am'])
      expect(user.dataConsent).toBe(true)
      expect(user.createdAt).toBeDefined()
    })

    it('trims whitespace from names', () => {
      const store = useUserStore()

      const user = store.createUser({
        firstName: '  Margaret  ',
        lastName: '  Thompson  ',
        classrooms: []
      })

      expect(user.firstName).toBe('Margaret')
      expect(user.lastName).toBe('Thompson')
    })

    it('sets created user as current user', () => {
      const store = useUserStore()

      const user = store.createUser({
        firstName: 'Margaret',
        lastName: 'Thompson'
      })

      expect(store.currentUserId.value).toBe(user.id)
      expect(store.currentUser.value).toEqual(user)
    })

    it('defaults dataConsent to true', () => {
      const store = useUserStore()

      const user = store.createUser({
        firstName: 'Test',
        lastName: 'User'
      })

      expect(user.dataConsent).toBe(true)
    })

    it('defaults classrooms to empty array', () => {
      const store = useUserStore()

      const user = store.createUser({
        firstName: 'Test',
        lastName: 'User'
      })

      expect(user.classrooms).toEqual([])
    })
  })

  describe('updateUser', () => {
    it('updates user fields', () => {
      const store = useUserStore()
      const user = store.createUser({
        firstName: 'Margaret',
        lastName: 'Thompson'
      })

      store.updateUser(user.id, {
        firstName: 'Maggie',
        dataConsent: false
      })

      expect(store.currentUser.value.firstName).toBe('Maggie')
      expect(store.currentUser.value.lastName).toBe('Thompson')
      expect(store.currentUser.value.dataConsent).toBe(false)
    })

    it('updates updatedAt timestamp', () => {
      const store = useUserStore()
      const user = store.createUser({
        firstName: 'Test',
        lastName: 'User'
      })
      const originalUpdatedAt = user.updatedAt

      // Wait a bit to ensure timestamp difference
      store.updateUser(user.id, { firstName: 'Updated' })

      expect(store.currentUser.value.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('returns null for non-existent user', () => {
      const store = useUserStore()

      const result = store.updateUser('non-existent', { firstName: 'Test' })

      expect(result).toBeNull()
    })
  })

  describe('deleteUser', () => {
    it('deletes user by id', () => {
      const store = useUserStore()
      const user = store.createUser({
        firstName: 'Test',
        lastName: 'User'
      })

      const result = store.deleteUser(user.id)

      expect(result).toBe(true)
      expect(store.hasUsers.value).toBe(false)
    })

    it('switches to another user when current is deleted', () => {
      const store = useUserStore()
      const user1 = store.createUser({
        firstName: 'User',
        lastName: 'One'
      })
      const user2 = store.createUser({
        firstName: 'User',
        lastName: 'Two'
      })

      // Current user is user2
      expect(store.currentUserId.value).toBe(user2.id)

      store.deleteUser(user2.id)

      // Should switch to user1
      expect(store.currentUserId.value).toBe(user1.id)
    })

    it('returns false for non-existent user', () => {
      const store = useUserStore()

      const result = store.deleteUser('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('switchUser', () => {
    it('switches to specified user', () => {
      const store = useUserStore()
      const user1 = store.createUser({
        firstName: 'User',
        lastName: 'One'
      })
      const user2 = store.createUser({
        firstName: 'User',
        lastName: 'Two'
      })

      store.switchUser(user1.id)

      expect(store.currentUserId.value).toBe(user1.id)
      expect(store.currentUser.value.firstName).toBe('User')
    })

    it('returns false for non-existent user', () => {
      const store = useUserStore()

      const result = store.switchUser('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('findUserByName', () => {
    it('finds user by name (case insensitive)', () => {
      const store = useUserStore()
      const user = store.createUser({
        firstName: 'Margaret',
        lastName: 'Thompson'
      })

      const found = store.findUserByName('margaret', 'THOMPSON')

      expect(found).toEqual(user)
    })

    it('returns null when not found', () => {
      const store = useUserStore()
      store.createUser({
        firstName: 'Margaret',
        lastName: 'Thompson'
      })

      const found = store.findUserByName('Robert', 'Thompson')

      expect(found).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('allUsers returns array of all users', () => {
      const store = useUserStore()
      store.createUser({ firstName: 'User', lastName: 'One' })
      store.createUser({ firstName: 'User', lastName: 'Two' })

      expect(store.allUsers.value).toHaveLength(2)
    })

    it('hasUsers is true when users exist', () => {
      const store = useUserStore()

      expect(store.hasUsers.value).toBe(false)

      store.createUser({ firstName: 'Test', lastName: 'User' })

      expect(store.hasUsers.value).toBe(true)
    })

    it('userCount returns number of users', () => {
      const store = useUserStore()

      expect(store.userCount.value).toBe(0)

      store.createUser({ firstName: 'User', lastName: 'One' })
      store.createUser({ firstName: 'User', lastName: 'Two' })

      expect(store.userCount.value).toBe(2)
    })

    it('isAuthenticated is true when current user exists', () => {
      const store = useUserStore()

      expect(store.isAuthenticated.value).toBe(false)

      store.createUser({ firstName: 'Test', lastName: 'User' })

      expect(store.isAuthenticated.value).toBe(true)
    })
  })

  describe('persistence', () => {
    it('persists users to localStorage', () => {
      const store1 = useUserStore()
      store1.createUser({
        firstName: 'Margaret',
        lastName: 'Thompson',
        classrooms: ['tuesday-am']
      })

      // Simulate page reload
      const store2 = useUserStore()
      store2.loadFromStorage()

      expect(store2.hasUsers.value).toBe(true)
      expect(store2.currentUser.value.firstName).toBe('Margaret')
    })
  })
})

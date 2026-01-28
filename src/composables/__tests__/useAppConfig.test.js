import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppConfig } from '../useAppConfig.js'

describe('useAppConfig', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()

    // Reset URL
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true
    })
  })

  describe('classroomIdToName', () => {
    it('converts kebab-case to Title Case', () => {
      const { classroomIdToName } = useAppConfig()

      expect(classroomIdToName('tuesday-am')).toBe('Tuesday Am')
      expect(classroomIdToName('thursday-zoom')).toBe('Thursday Zoom')
      expect(classroomIdToName('private-ladies')).toBe('Private Ladies')
    })

    it('handles single word', () => {
      const { classroomIdToName } = useAppConfig()

      expect(classroomIdToName('online')).toBe('Online')
    })
  })

  describe('parseUrlParams', () => {
    it('returns empty when no params', () => {
      window.location.search = ''
      const { parseUrlParams } = useAppConfig()

      const result = parseUrlParams()

      expect(result.teacher).toBeNull()
      expect(result.classrooms).toEqual([])
    })

    it('parses teacher name', () => {
      window.location.search = '?teacher=Rick'
      const { parseUrlParams } = useAppConfig()

      const result = parseUrlParams()

      expect(result.teacher).toBe('Rick')
    })

    it('parses single classroom', () => {
      window.location.search = '?classrooms=tuesday-am'
      const { parseUrlParams } = useAppConfig()

      const result = parseUrlParams()

      expect(result.classrooms).toHaveLength(1)
      expect(result.classrooms[0].id).toBe('tuesday-am')
      expect(result.classrooms[0].name).toBe('Tuesday Am')
    })

    it('parses multiple classrooms', () => {
      window.location.search = '?classrooms=tuesday-am,tuesday-pm,thursday-zoom'
      const { parseUrlParams } = useAppConfig()

      const result = parseUrlParams()

      expect(result.classrooms).toHaveLength(3)
      expect(result.classrooms.map(c => c.id)).toEqual([
        'tuesday-am',
        'tuesday-pm',
        'thursday-zoom'
      ])
    })

    it('parses both teacher and classrooms', () => {
      window.location.search = '?teacher=Rick&classrooms=tuesday-am'
      const { parseUrlParams } = useAppConfig()

      const result = parseUrlParams()

      expect(result.teacher).toBe('Rick')
      expect(result.classrooms).toHaveLength(1)
    })
  })

  describe('mergeClassrooms', () => {
    it('merges without duplicates', () => {
      const { mergeClassrooms } = useAppConfig()

      const existing = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
      const incoming = [{ id: 'b', name: 'B' }, { id: 'c', name: 'C' }]

      const result = mergeClassrooms(existing, incoming)

      expect(result).toHaveLength(3)
      expect(result.map(c => c.id)).toEqual(['a', 'b', 'c'])
    })

    it('handles empty existing', () => {
      const { mergeClassrooms } = useAppConfig()

      const result = mergeClassrooms([], [{ id: 'a', name: 'A' }])

      expect(result).toHaveLength(1)
    })

    it('handles empty incoming', () => {
      const { mergeClassrooms } = useAppConfig()

      const result = mergeClassrooms([{ id: 'a', name: 'A' }], [])

      expect(result).toHaveLength(1)
    })
  })

  describe('computed properties', () => {
    it('isAdHoc is true when no classrooms', () => {
      const config = useAppConfig()
      config.clearConfig()

      expect(config.isAdHoc.value).toBe(true)
    })

    it('hasSingleClassroom is true with one classroom', () => {
      window.location.search = '?classrooms=tuesday-am'
      const config = useAppConfig()
      config.clearConfig()
      config.initializeFromUrl()

      expect(config.hasSingleClassroom.value).toBe(true)
      expect(config.singleClassroom.value.id).toBe('tuesday-am')
    })

    it('hasMultipleClassrooms is true with multiple classrooms', () => {
      window.location.search = '?classrooms=tuesday-am,tuesday-pm'
      const config = useAppConfig()
      config.clearConfig()
      config.initializeFromUrl()

      expect(config.hasMultipleClassrooms.value).toBe(true)
    })
  })

  describe('persistence', () => {
    it('saves and loads from localStorage', () => {
      window.location.search = '?teacher=Rick&classrooms=tuesday-am'
      const config1 = useAppConfig()
      config1.clearConfig()
      config1.initializeFromUrl()

      // Simulate page reload
      window.location.search = ''
      const config2 = useAppConfig()
      config2.loadFromStorage()

      expect(config2.teacherName.value).toBe('Rick')
      expect(config2.availableClassrooms.value).toHaveLength(1)
    })
  })
})

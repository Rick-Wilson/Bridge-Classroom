import { describe, it, expect, beforeEach } from 'vitest'
import { useAssignmentStore } from '../useAssignmentStore.js'

describe('useAssignmentStore', () => {
  beforeEach(() => {
    localStorage.clear()
    const store = useAssignmentStore()
    store.clearAssignments()

    // Reset URL
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true
    })
  })

  describe('parseAssignmentFromUrl', () => {
    it('returns null when no assignment params', () => {
      window.location.search = ''
      const { parseAssignmentFromUrl } = useAssignmentStore()

      const result = parseAssignmentFromUrl()

      expect(result).toBeNull()
    })

    it('returns null when missing lessons', () => {
      window.location.search = '?assignment=Week5'
      const { parseAssignmentFromUrl } = useAssignmentStore()

      const result = parseAssignmentFromUrl()

      expect(result).toBeNull()
    })

    it('parses assignment with lessons', () => {
      window.location.search = '?assignment=Week5-Stayman&lessons=Stayman,Transfers'
      const { parseAssignmentFromUrl } = useAssignmentStore()

      const result = parseAssignmentFromUrl()

      expect(result.name).toBe('Week5-Stayman')
      expect(result.lessons).toEqual(['Stayman', 'Transfers'])
    })

    it('parses full assignment URL', () => {
      window.location.search = '?teacher=Rick&classrooms=tuesday-am&assignment=Week5&lessons=Stayman&due=2026-02-05'
      const { parseAssignmentFromUrl } = useAssignmentStore()

      const result = parseAssignmentFromUrl()

      expect(result.name).toBe('Week5')
      expect(result.lessons).toEqual(['Stayman'])
      expect(result.dueDate).toBe('2026-02-05')
      expect(result.teacherName).toBe('Rick')
      expect(result.classroom).toBe('tuesday-am')
    })
  })

  describe('createAssignment', () => {
    it('creates a new assignment', () => {
      const store = useAssignmentStore()

      const assignment = store.createAssignment({
        name: 'Week 5 Practice',
        teacherName: 'Rick',
        classroom: 'tuesday-am',
        lessons: ['Stayman', 'Transfers'],
        dueDate: '2026-02-05'
      })

      expect(assignment.id).toBeDefined()
      expect(assignment.name).toBe('Week 5 Practice')
      expect(assignment.lessons).toEqual(['Stayman', 'Transfers'])
      expect(assignment.completedDeals).toBe(0)
      expect(assignment.completionPercent).toBe(0)
    })

    it('sets assignment as current and active', () => {
      const store = useAssignmentStore()

      const assignment = store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })

      expect(store.currentAssignmentId.value).toBe(assignment.id)
      expect(store.inAssignmentMode.value).toBe(true)
    })

    it('merges lessons for existing assignment with same name', () => {
      const store = useAssignmentStore()

      store.createAssignment({
        name: 'Week 5',
        lessons: ['Stayman']
      })

      store.createAssignment({
        name: 'Week 5',
        lessons: ['Transfers', 'Stayman']
      })

      expect(store.currentAssignment.value.lessons).toEqual(['Stayman', 'Transfers'])
    })
  })

  describe('isLessonInAssignment', () => {
    it('returns true for assigned lesson', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman', 'Transfers']
      })

      expect(store.isLessonInAssignment('Stayman')).toBe(true)
      expect(store.isLessonInAssignment('stayman')).toBe(true) // case insensitive
    })

    it('returns false for non-assigned lesson', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })

      expect(store.isLessonInAssignment('Blackwood')).toBe(false)
    })

    it('returns false when not in assignment mode', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })
      store.exitAssignmentMode()

      expect(store.isLessonInAssignment('Stayman')).toBe(false)
    })
  })

  describe('progress tracking', () => {
    it('records deal completion', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })
      store.setTotalDeals(10)

      const recorded = store.recordDealCompletion('Stayman/deal001')

      expect(recorded).toBe(true)
      expect(store.currentAssignment.value.completedDeals).toBe(1)
      expect(store.currentAssignment.value.completionPercent).toBe(10)
    })

    it('does not double-count same deal', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })
      store.setTotalDeals(10)

      store.recordDealCompletion('Stayman/deal001')
      const recorded = store.recordDealCompletion('Stayman/deal001')

      expect(recorded).toBe(false)
      expect(store.currentAssignment.value.completedDeals).toBe(1)
    })

    it('sets startedAt on first completion', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })

      expect(store.currentAssignment.value.startedAt).toBeNull()

      store.recordDealCompletion('Stayman/deal001')

      expect(store.currentAssignment.value.startedAt).toBeDefined()
    })
  })

  describe('assignment mode', () => {
    it('exitAssignmentMode disables assignment mode', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })

      store.exitAssignmentMode()

      expect(store.inAssignmentMode.value).toBe(false)
      expect(store.hasActiveAssignment.value).toBe(false)
    })

    it('returnToAssignmentMode re-enables assignment mode', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })
      store.exitAssignmentMode()

      store.returnToAssignmentMode()

      expect(store.inAssignmentMode.value).toBe(true)
      expect(store.hasActiveAssignment.value).toBe(true)
    })
  })

  describe('getAssignmentTag', () => {
    it('returns tag data when in assignment mode', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Week 5 Practice',
        teacherName: 'Rick',
        lessons: ['Stayman']
      })

      const tag = store.getAssignmentTag()

      expect(tag).toEqual({
        id: store.currentAssignment.value.id,
        name: 'Week 5 Practice',
        teacherName: 'Rick',
        assignedAt: store.currentAssignment.value.assignedAt
      })
    })

    it('returns null when not in assignment mode', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })
      store.exitAssignmentMode()

      expect(store.getAssignmentTag()).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('assignmentProgress returns correct values', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })
      store.setTotalDeals(10)
      store.recordDealCompletion('deal001')
      store.recordDealCompletion('deal002')
      store.recordDealCompletion('deal003')

      const progress = store.assignmentProgress.value

      expect(progress.completed).toBe(3)
      expect(progress.total).toBe(10)
      expect(progress.percent).toBe(30)
    })

    it('isAssignmentComplete is true when all deals done', () => {
      const store = useAssignmentStore()
      store.createAssignment({
        name: 'Test',
        lessons: ['Stayman']
      })
      store.setTotalDeals(2)
      store.recordDealCompletion('deal001')

      expect(store.isAssignmentComplete.value).toBe(false)

      store.recordDealCompletion('deal002')

      expect(store.isAssignmentComplete.value).toBe(true)
    })
  })

  describe('persistence', () => {
    it('persists assignments to localStorage', () => {
      const store1 = useAssignmentStore()
      store1.createAssignment({
        name: 'Week 5',
        lessons: ['Stayman']
      })
      store1.setTotalDeals(10)
      store1.recordDealCompletion('deal001')

      // Simulate page reload
      const store2 = useAssignmentStore()
      store2.loadFromStorage()

      expect(store2.currentAssignment.value.name).toBe('Week 5')
      expect(store2.currentAssignment.value.completedDeals).toBe(1)
    })
  })
})

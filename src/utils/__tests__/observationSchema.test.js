import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createObservation,
  extractMetadata,
  validateObservation,
  generateSessionId
} from '../observationSchema.js'

// Mock crypto.randomUUID
beforeEach(() => {
  let uuidCounter = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    uuidCounter++
    return `test-uuid-${uuidCounter}`
  })
})

describe('observationSchema', () => {
  const mockDeal = {
    subfolder: 'Stayman',
    filename: 'deal005.pbn',
    boardNumber: 5,
    kind: 'BID+NEXT',
    dealer: 'N',
    vulnerable: 'None',
    studentSeat: 'S',
    hands: {
      N: 'SAQ5 H74 DQ962 CAJT8',
      E: 'SKT HQJT982 D83 C652',
      S: 'S872 HK6 DAKJ4 CKQ74',
      W: 'SJ9643 HA53 DT75 C93'
    },
    auction: ['1NT', 'Pass', '2C', 'Pass', '2S', 'Pass', '3NT', 'Pass', 'Pass', 'Pass'],
    contract: '3NT',
    declarer: 'S',
    lead: 'H3',
    steps: [
      { type: 'bid', bid: '2C', text: 'What do you bid?' },
      { type: 'bid', bid: '3NT', text: 'What now?' }
    ]
  }

  describe('createObservation', () => {
    it('should create a valid observation with all fields', () => {
      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: mockDeal,
        promptIndex: 0,
        auctionSoFar: ['1NT', 'Pass'],
        expectedBid: '2C',
        studentBid: '2NT',
        correct: false,
        attemptNumber: 1,
        timeTakenMs: 5000,
        skillPath: 'bidding_conventions/stayman'
      })

      expect(obs.observation_id).toBe('test-uuid-1')
      expect(obs.user_id).toBe('user-123')
      expect(obs.session_id).toBe('session-456')
      expect(obs.timestamp).toBeDefined()
      expect(obs.skill_path).toBe('bidding_conventions/stayman')
      expect(obs.assignment).toBeNull()

      // Deal context
      expect(obs.deal.subfolder).toBe('Stayman')
      expect(obs.deal.dealer).toBe('N')
      expect(obs.deal.student_seat).toBe('S')
      expect(obs.deal.hands.south).toBe('S872 HK6 DAKJ4 CKQ74')

      // Bid prompt
      expect(obs.bid_prompt.prompt_index).toBe(0)
      expect(obs.bid_prompt.total_prompts).toBe(2)
      expect(obs.bid_prompt.auction_so_far).toEqual(['1NT', 'Pass'])
      expect(obs.bid_prompt.expected_bid).toBe('2C')

      // Result
      expect(obs.result.student_bid).toBe('2NT')
      expect(obs.result.correct).toBe(false)
      expect(obs.result.attempt_number).toBe(1)
      expect(obs.result.time_taken_ms).toBe(5000)
    })

    it('should handle correct bid', () => {
      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: mockDeal,
        promptIndex: 0,
        auctionSoFar: ['1NT', 'Pass'],
        expectedBid: '2C',
        studentBid: '2C',
        correct: true,
        attemptNumber: 1,
        timeTakenMs: 3000,
        skillPath: 'bidding_conventions/stayman'
      })

      expect(obs.result.correct).toBe(true)
      expect(obs.result.student_bid).toBe('2C')
    })

    it('should include assignment tag when provided', () => {
      const assignment = {
        id: 'assign-123',
        name: 'Week 5 Homework',
        teacherName: 'Rick',
        assignedAt: '2026-01-15T10:00:00Z'
      }

      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: mockDeal,
        promptIndex: 0,
        auctionSoFar: ['1NT', 'Pass'],
        expectedBid: '2C',
        studentBid: '2C',
        correct: true,
        attemptNumber: 1,
        timeTakenMs: 3000,
        skillPath: 'bidding_conventions/stayman',
        assignment
      })

      expect(obs.assignment).toEqual(assignment)
    })

    it('should handle deal with different hand formats', () => {
      const dealWithLowerKeys = {
        ...mockDeal,
        hands: {
          north: 'SAQ5 H74 DQ962 CAJT8',
          east: 'SKT HQJT982 D83 C652',
          south: 'S872 HK6 DAKJ4 CKQ74',
          west: 'SJ9643 HA53 DT75 C93'
        }
      }

      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: dealWithLowerKeys,
        promptIndex: 0,
        auctionSoFar: [],
        expectedBid: '1NT',
        studentBid: '1NT',
        correct: true,
        attemptNumber: 1,
        timeTakenMs: 1000,
        skillPath: 'basic_bidding/notrump_openings'
      })

      expect(obs.deal.hands.north).toBe('SAQ5 H74 DQ962 CAJT8')
      expect(obs.deal.hands.south).toBe('S872 HK6 DAKJ4 CKQ74')
    })

    it('should handle missing optional fields gracefully', () => {
      const minimalDeal = {
        dealer: 'S',
        studentSeat: 'N',
        hands: { N: 'xxx', S: 'yyy', E: '', W: '' }
      }

      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: minimalDeal,
        promptIndex: 0,
        auctionSoFar: [],
        expectedBid: 'Pass',
        studentBid: 'Pass',
        correct: true,
        attemptNumber: 1,
        timeTakenMs: 500,
        skillPath: 'unknown/unknown'
      })

      expect(obs.deal.subfolder).toBe('Unknown')
      expect(obs.deal.filename).toBeNull()
      expect(obs.deal.vulnerability).toBe('None')
      expect(obs.deal.contract).toBeNull()
    })
  })

  describe('extractMetadata', () => {
    it('should extract metadata for server-side queries', () => {
      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: mockDeal,
        promptIndex: 0,
        auctionSoFar: ['1NT', 'Pass'],
        expectedBid: '2C',
        studentBid: '2NT',
        correct: false,
        attemptNumber: 1,
        timeTakenMs: 5000,
        skillPath: 'bidding_conventions/stayman'
      })

      const metadata = extractMetadata(obs, 'tuesday-am')

      expect(metadata.observation_id).toBe(obs.observation_id)
      expect(metadata.user_id).toBe('user-123')
      expect(metadata.timestamp).toBe(obs.timestamp)
      expect(metadata.skill_path).toBe('bidding_conventions/stayman')
      expect(metadata.correct).toBe(false)
      expect(metadata.classroom).toBe('tuesday-am')
      expect(metadata.deal_subfolder).toBe('Stayman')
      expect(metadata.deal_number).toBe(5)
    })

    it('should handle null classroom', () => {
      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: mockDeal,
        promptIndex: 0,
        auctionSoFar: [],
        expectedBid: '2C',
        studentBid: '2C',
        correct: true,
        attemptNumber: 1,
        timeTakenMs: 1000,
        skillPath: 'bidding_conventions/stayman'
      })

      const metadata = extractMetadata(obs, null)

      expect(metadata.classroom).toBeNull()
    })
  })

  describe('validateObservation', () => {
    it('should validate a correct observation', () => {
      const obs = createObservation({
        userId: 'user-123',
        sessionId: 'session-456',
        deal: mockDeal,
        promptIndex: 0,
        auctionSoFar: ['1NT', 'Pass'],
        expectedBid: '2C',
        studentBid: '2C',
        correct: true,
        attemptNumber: 1,
        timeTakenMs: 1000,
        skillPath: 'bidding_conventions/stayman'
      })

      const result = validateObservation(obs)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect null observation', () => {
      const result = validateObservation(null)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Observation is null or undefined')
    })

    it('should detect missing required fields', () => {
      const invalidObs = {
        // Missing observation_id, timestamp, etc.
        user_id: 'user-123'
      }

      const result = validateObservation(invalidObs)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing observation_id')
      expect(result.errors).toContain('Missing timestamp')
      expect(result.errors).toContain('Missing session_id')
      expect(result.errors).toContain('Missing deal object')
      expect(result.errors).toContain('Missing bid_prompt object')
      expect(result.errors).toContain('Missing result object')
      expect(result.errors).toContain('Missing skill_path')
    })

    it('should validate nested deal fields', () => {
      const obsWithBadDeal = {
        observation_id: 'obs-1',
        timestamp: new Date().toISOString(),
        user_id: 'user-123',
        session_id: 'session-456',
        deal: {
          // Missing dealer, student_seat, hands
        },
        bid_prompt: {
          prompt_index: 0,
          expected_bid: '2C'
        },
        result: {
          student_bid: '2C',
          correct: true,
          attempt_number: 1
        },
        skill_path: 'test/path'
      }

      const result = validateObservation(obsWithBadDeal)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing deal.dealer')
      expect(result.errors).toContain('Missing deal.student_seat')
      expect(result.errors).toContain('Missing deal.hands')
    })
  })

  describe('generateSessionId', () => {
    it('should generate a UUID', () => {
      const sessionId = generateSessionId()

      expect(sessionId).toBe('test-uuid-1')
    })
  })
})

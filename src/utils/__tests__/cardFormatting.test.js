import { describe, it, expect } from 'vitest'
import {
  SUIT_SYMBOLS,
  SUIT_COLORS,
  SUIT_ORDER,
  formatCard,
  formatBid,
  getSuitClass,
  formatVulnerability,
  isVulnerable,
  getSeatName,
  countHCP,
  countCards,
  getDistribution,
  stripControlDirectives
} from '../cardFormatting.js'

describe('cardFormatting', () => {
  describe('SUIT_SYMBOLS', () => {
    it('should have correct symbols for full suit names', () => {
      expect(SUIT_SYMBOLS.spades).toBe('♠')
      expect(SUIT_SYMBOLS.hearts).toBe('♥')
      expect(SUIT_SYMBOLS.diamonds).toBe('♦')
      expect(SUIT_SYMBOLS.clubs).toBe('♣')
    })

    it('should have correct symbols for single letters', () => {
      expect(SUIT_SYMBOLS.S).toBe('♠')
      expect(SUIT_SYMBOLS.H).toBe('♥')
      expect(SUIT_SYMBOLS.D).toBe('♦')
      expect(SUIT_SYMBOLS.C).toBe('♣')
    })
  })

  describe('SUIT_COLORS', () => {
    it('should have correct colors', () => {
      expect(SUIT_COLORS.spades).toBe('black')
      expect(SUIT_COLORS.hearts).toBe('red')
      expect(SUIT_COLORS.diamonds).toBe('red')
      expect(SUIT_COLORS.clubs).toBe('black')
    })
  })

  describe('SUIT_ORDER', () => {
    it('should be in bridge order (spades first)', () => {
      expect(SUIT_ORDER).toEqual(['spades', 'hearts', 'diamonds', 'clubs'])
    })
  })

  describe('formatCard', () => {
    it('should convert T to 10', () => {
      expect(formatCard('T')).toBe('10')
    })

    it('should return other cards unchanged', () => {
      expect(formatCard('A')).toBe('A')
      expect(formatCard('K')).toBe('K')
      expect(formatCard('Q')).toBe('Q')
      expect(formatCard('J')).toBe('J')
      expect(formatCard('9')).toBe('9')
      expect(formatCard('2')).toBe('2')
    })
  })

  describe('formatBid', () => {
    it('should return empty for null/undefined bid', () => {
      expect(formatBid(null)).toEqual({ text: '', html: '' })
      expect(formatBid(undefined)).toEqual({ text: '', html: '' })
    })

    it('should format Pass correctly', () => {
      expect(formatBid('Pass')).toEqual({ text: 'Pass', html: 'Pass' })
      expect(formatBid('PASS')).toEqual({ text: 'Pass', html: 'Pass' })
      expect(formatBid('P')).toEqual({ text: 'Pass', html: 'Pass' })
    })

    it('should format Double correctly', () => {
      expect(formatBid('X')).toEqual({ text: 'X', html: '<span class="double">X</span>' })
    })

    it('should format Redouble correctly', () => {
      expect(formatBid('XX')).toEqual({ text: 'XX', html: '<span class="redouble">XX</span>' })
    })

    it('should format NT bids correctly', () => {
      expect(formatBid('1NT')).toEqual({ text: '1NT', html: '1NT' })
      expect(formatBid('3NT')).toEqual({ text: '3NT', html: '3NT' })
      expect(formatBid('1N')).toEqual({ text: '1NT', html: '1NT' })
    })

    it('should format suit bids with symbols and colors', () => {
      const spade = formatBid('1S')
      expect(spade.text).toBe('1♠')
      expect(spade.html).toContain('black')
      expect(spade.html).toContain('♠')

      const heart = formatBid('2H')
      expect(heart.text).toBe('2♥')
      expect(heart.html).toContain('red')
      expect(heart.html).toContain('♥')

      const diamond = formatBid('3D')
      expect(diamond.text).toBe('3♦')
      expect(diamond.html).toContain('red')

      const club = formatBid('4C')
      expect(club.text).toBe('4♣')
      expect(club.html).toContain('black')
    })

    it('should return unrecognized bids as-is', () => {
      expect(formatBid('unknown')).toEqual({ text: 'unknown', html: 'unknown' })
    })
  })

  describe('getSuitClass', () => {
    it('should return suit-red for hearts and diamonds', () => {
      expect(getSuitClass('hearts')).toBe('suit-red')
      expect(getSuitClass('diamonds')).toBe('suit-red')
    })

    it('should return suit-black for spades and clubs', () => {
      expect(getSuitClass('spades')).toBe('suit-black')
      expect(getSuitClass('clubs')).toBe('suit-black')
    })
  })

  describe('formatVulnerability', () => {
    it('should format None vulnerability', () => {
      expect(formatVulnerability('None')).toBe('None')
      expect(formatVulnerability('NONE')).toBe('None')
      expect(formatVulnerability('-')).toBe('None')
      expect(formatVulnerability('Love')).toBe('None')
      expect(formatVulnerability(null)).toBe('None')
    })

    it('should format NS vulnerability', () => {
      expect(formatVulnerability('NS')).toBe('N-S Vul')
      expect(formatVulnerability('N-S')).toBe('N-S Vul')
    })

    it('should format EW vulnerability', () => {
      expect(formatVulnerability('EW')).toBe('E-W Vul')
      expect(formatVulnerability('E-W')).toBe('E-W Vul')
    })

    it('should format Both vulnerability', () => {
      expect(formatVulnerability('Both')).toBe('Both Vul')
      expect(formatVulnerability('All')).toBe('Both Vul')
    })
  })

  describe('isVulnerable', () => {
    it('should return false for no vulnerability', () => {
      expect(isVulnerable('N', 'None')).toBe(false)
      expect(isVulnerable('S', '-')).toBe(false)
      expect(isVulnerable('E', null)).toBe(false)
    })

    it('should return true for all when Both', () => {
      expect(isVulnerable('N', 'Both')).toBe(true)
      expect(isVulnerable('E', 'Both')).toBe(true)
      expect(isVulnerable('S', 'All')).toBe(true)
      expect(isVulnerable('W', 'All')).toBe(true)
    })

    it('should return true only for NS when NS vulnerable', () => {
      expect(isVulnerable('N', 'NS')).toBe(true)
      expect(isVulnerable('S', 'NS')).toBe(true)
      expect(isVulnerable('E', 'NS')).toBe(false)
      expect(isVulnerable('W', 'NS')).toBe(false)
    })

    it('should return true only for EW when EW vulnerable', () => {
      expect(isVulnerable('E', 'EW')).toBe(true)
      expect(isVulnerable('W', 'EW')).toBe(true)
      expect(isVulnerable('N', 'EW')).toBe(false)
      expect(isVulnerable('S', 'EW')).toBe(false)
    })
  })

  describe('getSeatName', () => {
    it('should return full seat names', () => {
      expect(getSeatName('N')).toBe('North')
      expect(getSeatName('E')).toBe('East')
      expect(getSeatName('S')).toBe('South')
      expect(getSeatName('W')).toBe('West')
    })

    it('should return input for unknown seats', () => {
      expect(getSeatName('X')).toBe('X')
    })
  })

  describe('countHCP', () => {
    it('should return 0 for null/empty hand', () => {
      expect(countHCP(null)).toBe(0)
      expect(countHCP({})).toBe(0)
    })

    it('should count high card points correctly', () => {
      const hand = {
        spades: ['A', 'K', 'Q', 'J'],
        hearts: ['A'],
        diamonds: ['K', 'Q'],
        clubs: ['J', '5', '3']
      }
      // A=4, K=3, Q=2, J=1
      // Spades: 4+3+2+1 = 10, Hearts: 4, Diamonds: 3+2 = 5, Clubs: 1
      expect(countHCP(hand)).toBe(20)
    })

    it('should count 0 for hand with no honors', () => {
      const hand = {
        spades: ['T', '9', '8'],
        hearts: ['7', '6', '5'],
        diamonds: ['4', '3', '2'],
        clubs: ['T', '9', '8', '7']
      }
      expect(countHCP(hand)).toBe(0)
    })
  })

  describe('countCards', () => {
    it('should return 0 for null hand', () => {
      expect(countCards(null)).toBe(0)
    })

    it('should count total cards correctly', () => {
      const hand = {
        spades: ['A', 'K', 'Q'],
        hearts: ['J', 'T'],
        diamonds: ['9', '8', '7', '6'],
        clubs: ['5', '4', '3', '2']
      }
      expect(countCards(hand)).toBe(13)
    })
  })

  describe('getDistribution', () => {
    it('should return empty string for null hand', () => {
      expect(getDistribution(null)).toBe('')
    })

    it('should return sorted distribution', () => {
      const hand = {
        spades: ['A', 'K', 'Q', 'J', 'T'],  // 5
        hearts: ['9', '8', '7', '6'],        // 4
        diamonds: ['5', '4', '3'],           // 3
        clubs: ['2']                          // 1
      }
      expect(getDistribution(hand)).toBe('5-4-3-1')
    })

    it('should handle balanced distribution', () => {
      const hand = {
        spades: ['A', 'K', 'Q'],    // 3
        hearts: ['J', 'T', '9'],    // 3
        diamonds: ['8', '7', '6'],  // 3
        clubs: ['5', '4', '3', '2'] // 4
      }
      expect(getDistribution(hand)).toBe('4-3-3-3')
    })
  })

  describe('stripControlDirectives', () => {
    it('should return empty string for null/undefined', () => {
      expect(stripControlDirectives(null)).toBe('')
      expect(stripControlDirectives(undefined)).toBe('')
      expect(stripControlDirectives('')).toBe('')
    })

    it('should remove [BID xxx] markers', () => {
      const text = 'Some text [BID 1S] and more text'
      expect(stripControlDirectives(text)).toBe('Some text  and more text')
    })

    it('should remove multiple [BID] markers', () => {
      const text = 'Start [BID 1H] middle [BID 2H] end'
      expect(stripControlDirectives(text)).toBe('Start  middle  end')
    })

    it('should remove [BID] with suit symbols', () => {
      const text = 'Bid [BID 1\\S] with spades'
      expect(stripControlDirectives(text)).toBe('Bid  with spades')
    })

    it('should remove [NEXT] markers', () => {
      const text = 'Some text [NEXT] more text'
      expect(stripControlDirectives(text)).toBe('Some text  more text')
    })

    it('should be case insensitive', () => {
      const text = '[bid 1s] and [BID 2H] and [Bid 3D]'
      expect(stripControlDirectives(text)).toBe('and  and')
    })

    it('should collapse multiple newlines', () => {
      const text = 'Line 1\n\n\n\nLine 2'
      expect(stripControlDirectives(text)).toBe('Line 1\n\nLine 2')
    })

    it('should trim whitespace', () => {
      const text = '  Some text [BID 1S]  '
      expect(stripControlDirectives(text)).toBe('Some text')
    })
  })
})

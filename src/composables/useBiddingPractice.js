import { ref, computed, reactive } from 'vue'
import { getSeatForBid } from '../utils/pbnParser.js'

/**
 * Composable for managing bidding practice state
 */
export function useBiddingPractice() {
  // Current deal data
  const currentDeal = ref(null)

  // Practice state
  const state = reactive({
    // Bids shown so far (may be subset of full auction during practice)
    displayedBids: [],
    // Current position in the auction
    currentBidIndex: 0,
    // Which student prompt we're on (0-indexed into deal.prompts)
    currentPromptIndex: 0,
    // Whether the user made a wrong bid
    wrongBid: null,
    // The correct bid that was expected
    correctBid: null,
    // Index of the wrong bid (for highlighting)
    wrongBidIndex: -1,
    // Index of the correct bid (for highlighting)
    correctBidIndex: -1,
    // Whether auction is complete
    auctionComplete: false,
    // Session stats
    correctCount: 0,
    wrongCount: 0
  })

  // Computed: which seat is the student
  const studentSeat = computed(() => currentDeal.value?.studentSeat || 'S')

  // Computed: current turn seat
  const currentTurnSeat = computed(() => {
    if (!currentDeal.value) return null
    return getSeatForBid(state.currentBidIndex, currentDeal.value.dealer)
  })

  // Computed: is it the student's turn to bid?
  const isStudentTurn = computed(() => {
    return currentTurnSeat.value === studentSeat.value
  })

  // Computed: is auction complete?
  const isAuctionComplete = computed(() => {
    if (!currentDeal.value) return false
    return state.currentBidIndex >= currentDeal.value.auction.length
  })

  // Computed: seats that should be hidden (opponents during practice)
  const hiddenSeats = computed(() => {
    if (!currentDeal.value || state.auctionComplete) return []

    const student = studentSeat.value
    // Hide opponents - they can see partner's hand
    if (student === 'N' || student === 'S') {
      return ['E', 'W']
    } else {
      return ['N', 'S']
    }
  })

  // Computed: last contract bid (for bidding box validation)
  const lastContractBid = computed(() => {
    for (let i = state.displayedBids.length - 1; i >= 0; i--) {
      const bid = state.displayedBids[i]
      if (bid && bid !== 'Pass' && bid !== 'X' && bid !== 'XX') {
        return bid
      }
    }
    return null
  })

  // Computed: can double?
  const canDouble = computed(() => {
    if (state.displayedBids.length === 0) return false
    const last = state.displayedBids[state.displayedBids.length - 1]
    // Can double if last bid was a contract bid by opponent
    // Simplified: can double if not already doubled and there's a contract
    if (last === 'X' || last === 'XX') return false
    if (!lastContractBid.value) return false

    // Check if last contract bidder was opponent
    let lastContractIdx = -1
    for (let i = state.displayedBids.length - 1; i >= 0; i--) {
      const bid = state.displayedBids[i]
      if (bid && bid !== 'Pass' && bid !== 'X' && bid !== 'XX') {
        lastContractIdx = i
        break
      }
    }

    if (lastContractIdx === -1) return false

    const lastContractSeat = getSeatForBid(lastContractIdx, currentDeal.value.dealer)
    const currentSeat = currentTurnSeat.value

    // Can double if opponent made last contract bid
    const isOpponent = (
      (currentSeat === 'N' || currentSeat === 'S') &&
      (lastContractSeat === 'E' || lastContractSeat === 'W')
    ) || (
      (currentSeat === 'E' || currentSeat === 'W') &&
      (lastContractSeat === 'N' || lastContractSeat === 'S')
    )

    return isOpponent
  })

  // Computed: can redouble?
  const canRedouble = computed(() => {
    if (state.displayedBids.length === 0) return false
    // Find last non-pass bid
    for (let i = state.displayedBids.length - 1; i >= 0; i--) {
      const bid = state.displayedBids[i]
      if (bid === 'Pass') continue
      if (bid === 'XX') return false // Already redoubled
      if (bid === 'X') {
        // Can redouble if partner was doubled
        const doubleSeat = getSeatForBid(i, currentDeal.value.dealer)
        const currentSeat = currentTurnSeat.value
        const isPartner = (
          (currentSeat === 'N' && doubleSeat === 'S') ||
          (currentSeat === 'S' && doubleSeat === 'N') ||
          (currentSeat === 'E' && doubleSeat === 'W') ||
          (currentSeat === 'W' && doubleSeat === 'E')
        )
        // Actually, redouble if WE were doubled (opponent doubled us)
        const isOpponentDouble = !isPartner
        return isOpponentDouble
      }
      return false
    }
    return false
  })

  // Computed: current prompt text to display (only if this bid has a prompt)
  const currentPrompt = computed(() => {
    if (!currentDeal.value?.prompts) return null
    return currentDeal.value.prompts[state.currentPromptIndex] || null
  })

  // Computed: does the current student bid have a prompt requiring user input?
  const currentBidHasPrompt = computed(() => {
    if (!currentDeal.value?.prompts || !isStudentTurn.value) return false
    const prompt = currentDeal.value.prompts[state.currentPromptIndex]
    if (!prompt) return false

    // Check if this prompt's expected bid matches current auction position
    const expectedBid = currentDeal.value.auction[state.currentBidIndex]
    const promptBid = normalizeBidForComparison(prompt.bid)
    const auctionBid = normalizeBidForComparison(expectedBid)

    return promptBid === auctionBid
  })

  // Computed: explanation for the current/last bid (shown after wrong answer)
  const currentExplanation = computed(() => {
    if (!currentPrompt.value) return ''
    return currentPrompt.value.explanationText || ''
  })

  /**
   * Load a new deal for practice
   */
  function loadDeal(deal) {
    currentDeal.value = deal
    state.displayedBids = []
    state.currentBidIndex = 0
    state.currentPromptIndex = 0
    state.wrongBid = null
    state.correctBid = null
    state.wrongBidIndex = -1
    state.correctBidIndex = -1
    state.auctionComplete = false

    // Advance to first student turn, showing opponent/partner bids
    advanceToStudentTurn()
  }

  /**
   * Advance auction showing bids until we hit a student bid that has a prompt
   */
  function advanceToStudentTurn() {
    if (!currentDeal.value) return

    const auction = currentDeal.value.auction
    const prompts = currentDeal.value.prompts || []

    while (state.currentBidIndex < auction.length) {
      const seat = getSeatForBid(state.currentBidIndex, currentDeal.value.dealer)
      const currentBid = auction[state.currentBidIndex]

      if (seat === studentSeat.value) {
        // Student's turn - check if there's a prompt for this bid
        const prompt = prompts[state.currentPromptIndex]
        if (prompt) {
          const promptBid = normalizeBidForComparison(prompt.bid)
          const auctionBid = normalizeBidForComparison(currentBid)

          if (promptBid === auctionBid) {
            // This bid has a prompt - stop and wait for user input
            break
          }
        }

        // No prompt for this student bid - auto-play it
        state.displayedBids.push(currentBid)
        state.currentBidIndex++
        continue
      }

      // Show this bid (opponent or partner)
      state.displayedBids.push(currentBid)
      state.currentBidIndex++
    }

    // Check if auction is complete
    if (state.currentBidIndex >= auction.length) {
      state.auctionComplete = true
    }
  }

  /**
   * Handle student's bid
   * @param {string} bid The bid made by student
   * @returns {boolean} True if correct, false if wrong
   */
  function makeBid(bid) {
    if (!currentDeal.value || state.auctionComplete) return false

    const expectedBid = currentDeal.value.auction[state.currentBidIndex]
    const normalizedBid = normalizeBidForComparison(bid)
    const normalizedExpected = normalizeBidForComparison(expectedBid)

    if (normalizedBid === normalizedExpected) {
      // Correct!
      state.displayedBids.push(bid)
      state.currentBidIndex++
      state.currentPromptIndex++
      state.correctCount++
      state.wrongBid = null
      state.correctBid = null
      state.wrongBidIndex = -1
      state.correctBidIndex = -1

      // Advance to next student turn
      advanceToStudentTurn()

      return true
    } else {
      // Wrong bid
      state.wrongBid = bid
      state.correctBid = expectedBid
      state.wrongBidIndex = state.currentBidIndex
      state.correctBidIndex = state.currentBidIndex
      state.wrongCount++

      return false
    }
  }

  /**
   * Continue after wrong bid (accept the correct bid and move on)
   */
  function acceptCorrectBid() {
    if (!state.correctBid) return

    state.displayedBids.push(state.correctBid)
    state.currentBidIndex++
    state.currentPromptIndex++
    state.wrongBid = null
    state.correctBid = null
    state.wrongBidIndex = -1
    state.correctBidIndex = -1

    advanceToStudentTurn()
  }

  /**
   * Reset stats
   */
  function resetStats() {
    state.correctCount = 0
    state.wrongCount = 0
  }

  /**
   * Normalize bid for comparison
   */
  function normalizeBidForComparison(bid) {
    if (!bid) return ''

    // First convert suit symbols to letters
    let normalized = bid
      .replace(/♠/g, 'S')
      .replace(/♥/g, 'H')
      .replace(/♦/g, 'D')
      .replace(/♣/g, 'C')

    const upper = normalized.toUpperCase()
    if (upper === 'PASS' || upper === 'P') return 'PASS'
    if (upper === 'X' || upper === 'DBL' || upper === 'DOUBLE') return 'X'
    if (upper === 'XX' || upper === 'RDBL' || upper === 'REDOUBLE') return 'XX'
    // Normalize NT
    return upper.replace(/(\d)N$/, '$1NT')
  }

  return {
    // State
    currentDeal,
    state,
    // Computed
    studentSeat,
    currentTurnSeat,
    isStudentTurn,
    isAuctionComplete,
    hiddenSeats,
    lastContractBid,
    canDouble,
    canRedouble,
    currentPrompt,
    currentBidHasPrompt,
    currentExplanation,
    // Methods
    loadDeal,
    makeBid,
    acceptCorrectBid,
    resetStats
  }
}

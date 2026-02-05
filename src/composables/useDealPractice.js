import { ref, computed, reactive, watch } from 'vue'
import { getSeatForBid } from '../utils/pbnParser.js'
import { useObservationStore } from './useObservationStore.js'

/**
 * Unified composable for deal practice - tag-driven, no modes
 *
 * Control tags drive the UI:
 * - [SHOW ...] tags control hand visibility
 * - [BID ...] tags create bidding prompts
 * - [NEXT]/[ROTATE] tags create step navigation
 * - [PLAY ...] tags remove cards from hands
 */
export function useDealPractice() {
  const observationStore = useObservationStore()

  // Current deal
  const currentDeal = ref(null)

  // ==================== STEP/INSTRUCTION STATE ====================
  const stepState = reactive({
    currentStepIndex: 0,
    instructionComplete: false
  })

  // Track revealed seats (cumulative from [SHOW] tags)
  const revealedSeats = ref([])
  const showAllTriggered = ref(false)

  // Track played cards { N: [{suit, card}], E: [], S: [], W: [] }
  const playedCards = ref({ N: [], E: [], S: [], W: [] })

  // ==================== BIDDING STATE ====================
  const biddingState = reactive({
    displayedBids: [],
    currentBidIndex: 0,
    currentPromptIndex: 0,
    wrongBid: null,
    correctBid: null,
    wrongBidIndex: -1,
    correctBidIndex: -1,
    auctionComplete: false,
    correctCount: 0,
    wrongCount: 0
  })

  // Timing for observations
  const promptStartTime = ref(null)
  const currentAttemptNumber = ref(1)

  // ==================== COMPUTED: Steps (from [NEXT]/[ROTATE] tags) ====================
  const steps = computed(() => currentDeal.value?.instructionSteps || [])
  const hasSteps = computed(() => steps.value.length > 0)
  const currentStep = computed(() => {
    if (!hasSteps.value) return null
    return steps.value[stepState.currentStepIndex] || null
  })
  const currentStepText = computed(() => currentStep.value?.text || '')
  const currentStepAction = computed(() => currentStep.value?.action || 'end')
  const hasNextStep = computed(() => stepState.currentStepIndex < steps.value.length - 1)
  const totalSteps = computed(() => steps.value.length)

  // ==================== COMPUTED: Bidding (from [BID] tags) ====================
  const prompts = computed(() => currentDeal.value?.prompts || [])
  const hasPrompts = computed(() => prompts.value.length > 0)
  const studentSeat = computed(() => currentDeal.value?.studentSeat || 'S')

  const currentTurnSeat = computed(() => {
    if (!currentDeal.value) return null
    return getSeatForBid(biddingState.currentBidIndex, currentDeal.value.dealer)
  })

  const isStudentTurn = computed(() => currentTurnSeat.value === studentSeat.value)

  const currentPrompt = computed(() => {
    if (!hasPrompts.value) return null
    return prompts.value[biddingState.currentPromptIndex] || null
  })

  // Does current position have a [BID] prompt requiring input?
  const hasBidPrompt = computed(() => {
    if (!hasPrompts.value || !isStudentTurn.value) return false
    if (biddingState.auctionComplete) return false

    const prompt = prompts.value[biddingState.currentPromptIndex]
    if (!prompt) return false

    const expectedBid = currentDeal.value?.auction?.[biddingState.currentBidIndex]
    if (!expectedBid) return false

    return normalizeBid(prompt.bid) === normalizeBid(expectedBid)
  })

  // Last contract bid (for bidding box validation)
  const lastContractBid = computed(() => {
    for (let i = biddingState.displayedBids.length - 1; i >= 0; i--) {
      const bid = biddingState.displayedBids[i]
      if (bid && bid !== 'Pass' && bid !== 'X' && bid !== 'XX') {
        return bid
      }
    }
    return null
  })

  // Can double?
  const canDouble = computed(() => {
    if (!currentDeal.value || biddingState.displayedBids.length === 0) return false
    const last = biddingState.displayedBids[biddingState.displayedBids.length - 1]
    if (last === 'X' || last === 'XX') return false
    if (!lastContractBid.value) return false

    let lastContractIdx = -1
    for (let i = biddingState.displayedBids.length - 1; i >= 0; i--) {
      const bid = biddingState.displayedBids[i]
      if (bid && bid !== 'Pass' && bid !== 'X' && bid !== 'XX') {
        lastContractIdx = i
        break
      }
    }
    if (lastContractIdx === -1) return false

    const lastContractSeat = getSeatForBid(lastContractIdx, currentDeal.value.dealer)
    const currentSeat = currentTurnSeat.value
    const isOpponent = (
      (currentSeat === 'N' || currentSeat === 'S') && (lastContractSeat === 'E' || lastContractSeat === 'W')
    ) || (
      (currentSeat === 'E' || currentSeat === 'W') && (lastContractSeat === 'N' || lastContractSeat === 'S')
    )
    return isOpponent
  })

  // Can redouble?
  const canRedouble = computed(() => {
    if (!currentDeal.value || biddingState.displayedBids.length === 0) return false
    for (let i = biddingState.displayedBids.length - 1; i >= 0; i--) {
      const bid = biddingState.displayedBids[i]
      if (bid === 'Pass') continue
      if (bid === 'XX') return false
      if (bid === 'X') {
        const doubleSeat = getSeatForBid(i, currentDeal.value.dealer)
        const currentSeat = currentTurnSeat.value
        const isPartner = (
          (currentSeat === 'N' && doubleSeat === 'S') ||
          (currentSeat === 'S' && doubleSeat === 'N') ||
          (currentSeat === 'E' && doubleSeat === 'W') ||
          (currentSeat === 'W' && doubleSeat === 'E')
        )
        return !isPartner // Can redouble if opponent doubled
      }
      return false
    }
    return false
  })

  // ==================== COMPUTED: Hand Visibility ====================
  // Hidden seats driven by [SHOW] tags in PBN - app follows instructions
  const hiddenSeats = computed(() => {
    if (!currentDeal.value) return []
    const allSeats = ['N', 'E', 'S', 'W']

    // For step-based lessons, use cumulative [SHOW] tags from steps
    if (hasSteps.value) {
      if (showAllTriggered.value) return []
      return allSeats.filter(seat => !revealedSeats.value.includes(seat))
    }

    // For bidding lessons, compute visibility by walking through answered prompts
    // This supports the Back button - when currentPromptIndex decreases, visibility recalculates
    if (hasPrompts.value) {
      // Start with initial visibility
      let showSeats = currentDeal.value.initialShowSeats || []

      // Apply showSeatsAfter from each answered prompt
      const promptsList = prompts.value
      for (let i = 0; i < biddingState.currentPromptIndex; i++) {
        const prompt = promptsList[i]
        if (prompt?.showSeatsAfter) {
          showSeats = prompt.showSeatsAfter
        }
      }

      if (showSeats.length > 0) {
        return allSeats.filter(seat => !showSeats.includes(seat))
      }
    }

    // For display-only lessons, use initial [SHOW] directive from PBN
    const showSeats = currentDeal.value.initialShowSeats
    if (showSeats && showSeats.length > 0) {
      return allSeats.filter(seat => !showSeats.includes(seat))
    }

    // No [SHOW] directive - show all (fallback for legacy PBN files)
    return []
  })

  // Hands with played cards removed (unless current step has [RESET])
  const hands = computed(() => {
    if (!currentDeal.value?.hands) return {}

    // If current step has [RESET] flag, show original hands
    if (currentStep.value?.reset) {
      return currentDeal.value.hands
    }

    // If no played cards, return original hands
    const hasPlays = Object.values(playedCards.value).some(arr => arr.length > 0)
    if (!hasPlays) return currentDeal.value.hands

    const result = {}
    for (const seat of ['N', 'E', 'S', 'W']) {
      const hand = currentDeal.value.hands[seat]
      if (!hand) {
        result[seat] = null
        continue
      }
      result[seat] = {
        spades: [...(hand.spades || [])],
        hearts: [...(hand.hearts || [])],
        diamonds: [...(hand.diamonds || [])],
        clubs: [...(hand.clubs || [])]
      }
      for (const played of playedCards.value[seat]) {
        const suitName = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }[played.suit]
        if (suitName && result[seat][suitName]) {
          const idx = result[seat][suitName].indexOf(played.card)
          if (idx !== -1) result[seat][suitName].splice(idx, 1)
        }
      }
    }
    return result
  })

  // Show HCP?
  const showHcp = computed(() => {
    if (hasPrompts.value && !biddingState.auctionComplete) return false
    return true
  })

  // ==================== COMPUTED: Auction & Lead Visibility ====================
  // Track auction visibility based on [AUCTION off/on] directives
  // Scans through steps up to current to determine state
  const showAuctionTable = computed(() => {
    if (!hasSteps.value) return true  // Default: show auction for bidding/display modes

    // Scan through steps to find latest [AUCTION off/on] directive
    let visible = true  // Default: show auction
    for (let i = 0; i <= stepState.currentStepIndex; i++) {
      const step = currentDeal.value?.instructionSteps?.[i]
      if (step?.showAuction !== null && step?.showAuction !== undefined) {
        visible = step.showAuction
      }
    }
    return visible
  })

  // Track whether to show opening lead based on [SHOW_LEAD] directive
  const showOpeningLead = computed(() => {
    if (!hasSteps.value) return false  // Only relevant for instruction mode

    // Scan through steps to find if [SHOW_LEAD] has been triggered
    for (let i = 0; i <= stepState.currentStepIndex; i++) {
      const step = currentDeal.value?.instructionSteps?.[i]
      if (step?.showLead) return true
    }
    return false
  })

  // Opening lead info from deal
  const openingLead = computed(() => {
    if (!currentDeal.value?.openingLead) return null
    return {
      leader: currentDeal.value.openingLeader,
      card: currentDeal.value.openingLead
    }
  })

  // ==================== COMPUTED: Completion State ====================
  const isComplete = computed(() => {
    if (hasSteps.value) {
      return stepState.instructionComplete || (!hasNextStep.value && stepState.currentStepIndex === steps.value.length - 1)
    }
    if (hasPrompts.value) {
      return biddingState.auctionComplete
    }
    return true // Display mode is always "complete"
  })

  // ==================== METHODS: Step Navigation ====================
  function calculateRevealedSeats() {
    const revealed = []
    let showAll = false
    if (!currentDeal.value?.instructionSteps) return { revealed, showAll }

    for (let i = 0; i <= stepState.currentStepIndex; i++) {
      const step = currentDeal.value.instructionSteps[i]
      if (step?.showSeats) {
        for (const seat of step.showSeats) {
          if (!revealed.includes(seat)) revealed.push(seat)
        }
        if (step.showSeats.length === 4) showAll = true
      }
    }
    return { revealed, showAll }
  }

  function processPlaysForStep(stepIndex) {
    if (!currentDeal.value?.instructionSteps) return
    const step = currentDeal.value.instructionSteps[stepIndex]
    if (!step?.plays?.length) return

    for (const playStr of step.plays) {
      const plays = playStr.split(/[,\s]+/)
      for (const play of plays) {
        if (!play) continue
        const match = play.trim().match(/^([NESW]):([SHDC])(.+)$/i)
        if (match) {
          const seat = match[1].toUpperCase()
          const suit = match[2].toUpperCase()
          let card = match[3].toUpperCase()
          if (card === '10') card = 'T'
          playedCards.value[seat].push({ suit, card })
        }
      }
    }
  }

  function updateStepState() {
    const { revealed, showAll } = calculateRevealedSeats()
    revealedSeats.value = revealed
    showAllTriggered.value = showAll

    // Process plays
    playedCards.value = { N: [], E: [], S: [], W: [] }
    for (let i = 0; i <= stepState.currentStepIndex; i++) {
      processPlaysForStep(i)
    }
  }

  function nextStep() {
    if (stepState.currentStepIndex < steps.value.length - 1) {
      stepState.currentStepIndex++
      updateStepState()
      return true
    }
    stepState.instructionComplete = true
    return false
  }

  function prevStep() {
    if (stepState.currentStepIndex > 0) {
      stepState.currentStepIndex--
      stepState.instructionComplete = false
      updateStepState()
      return true
    }
    return false
  }

  // ==================== METHODS: Bidding ====================
  // Simple approach: advance through auction, stop when we hit a prompt position
  function advanceAuction() {
    if (!currentDeal.value) return
    const auction = currentDeal.value.auction || []
    const promptsList = prompts.value

    // If no more prompts, play out the rest of the auction
    if (biddingState.currentPromptIndex >= promptsList.length) {
      while (biddingState.currentBidIndex < auction.length) {
        biddingState.displayedBids.push(auction[biddingState.currentBidIndex])
        biddingState.currentBidIndex++
      }
      biddingState.auctionComplete = true
      promptStartTime.value = null
      return
    }

    // Get the current prompt's expected bid
    const currentPrompt = promptsList[biddingState.currentPromptIndex]
    const expectedBid = normalizeBid(currentPrompt.bid)

    // Advance through auction until we find the position with this expected bid
    while (biddingState.currentBidIndex < auction.length) {
      const auctionBid = normalizeBid(auction[biddingState.currentBidIndex])

      // Is this the prompt position?
      if (auctionBid === expectedBid) {
        // Stop here - wait for user input
        promptStartTime.value = Date.now()
        currentAttemptNumber.value = 1
        return
      }

      // Not the prompt position - display this bid and continue
      biddingState.displayedBids.push(auction[biddingState.currentBidIndex])
      biddingState.currentBidIndex++
    }

    // Reached end of auction
    biddingState.auctionComplete = true
    promptStartTime.value = null
  }

  function makeBid(bid) {
    if (!currentDeal.value || biddingState.auctionComplete) return false

    const expectedBid = currentDeal.value.auction[biddingState.currentBidIndex]
    const isCorrect = normalizeBid(bid) === normalizeBid(expectedBid)
    const timeTakenMs = promptStartTime.value ? Date.now() - promptStartTime.value : 0

    recordBidObservation(bid, expectedBid, isCorrect, timeTakenMs)

    // Always advance the auction after any bid
    biddingState.displayedBids.push(currentDeal.value.auction[biddingState.currentBidIndex])
    biddingState.currentBidIndex++
    biddingState.currentPromptIndex++
    promptStartTime.value = null
    currentAttemptNumber.value = 1

    if (isCorrect) {
      biddingState.correctCount++
      biddingState.wrongBid = null
      biddingState.correctBid = null
    } else {
      // Show feedback for wrong bid (but still advance)
      biddingState.wrongBid = bid
      biddingState.correctBid = expectedBid
      biddingState.wrongCount++
    }

    advanceAuction()
    return isCorrect
  }

  function clearFeedback() {
    biddingState.wrongBid = null
    biddingState.correctBid = null
  }

  // Can we go back? True if we've made progress (answered a bid or advanced a step)
  const canGoBack = computed(() => {
    // Can go back in bidding if we've answered at least one prompt
    if (hasPrompts.value && biddingState.currentPromptIndex > 0) return true
    // Can go back in steps if we're past the first step
    if (hasSteps.value && stepState.currentStepIndex > 0) return true
    return false
  })

  // Go back to the previous state (previous bid prompt or previous step)
  function goBack() {
    // Clear any feedback first
    clearFeedback()

    // If we have prompts and have answered at least one, go back to previous prompt
    if (hasPrompts.value && biddingState.currentPromptIndex > 0) {
      // Decrement prompt index
      biddingState.currentPromptIndex--
      biddingState.auctionComplete = false

      // Find where the previous prompt was in the auction
      const promptsList = prompts.value
      const targetPrompt = promptsList[biddingState.currentPromptIndex]
      const targetBid = normalizeBid(targetPrompt.bid)

      // Scan auction to find the position of this prompt
      const auction = currentDeal.value.auction || []
      let targetBidIndex = 0
      for (let i = 0; i < auction.length; i++) {
        if (normalizeBid(auction[i]) === targetBid) {
          targetBidIndex = i
          break
        }
      }

      // Reset state to that position
      biddingState.currentBidIndex = targetBidIndex
      biddingState.displayedBids = auction.slice(0, targetBidIndex)
      promptStartTime.value = Date.now()
      currentAttemptNumber.value = 1
      return true
    }

    // If we have steps and are past the first, go back a step
    if (hasSteps.value && stepState.currentStepIndex > 0) {
      return prevStep()
    }

    return false
  }

  async function recordBidObservation(studentBid, expectedBid, correct, timeTakenMs) {
    if (!currentDeal.value) return
    try {
      await observationStore.recordObservation({
        deal: currentDeal.value,
        promptIndex: biddingState.currentPromptIndex,
        auctionSoFar: [...biddingState.displayedBids],
        expectedBid,
        studentBid,
        correct,
        attemptNumber: currentAttemptNumber.value,
        timeTakenMs
      })
    } catch (err) {
      console.error('Failed to record observation:', err)
    }
  }

  // ==================== METHODS: General ====================
  function loadDeal(deal) {
    currentDeal.value = deal

    // Reset step state
    stepState.currentStepIndex = 0
    stepState.instructionComplete = false
    revealedSeats.value = []
    showAllTriggered.value = false
    playedCards.value = { N: [], E: [], S: [], W: [] }

    // Reset bidding state
    biddingState.displayedBids = []
    biddingState.currentBidIndex = 0
    biddingState.currentPromptIndex = 0
    biddingState.wrongBid = null
    biddingState.correctBid = null
    biddingState.wrongBidIndex = -1
    biddingState.correctBidIndex = -1
    biddingState.auctionComplete = false
    promptStartTime.value = null
    currentAttemptNumber.value = 1

    // Initialize based on what tags are present
    if (deal?.instructionSteps?.length) {
      updateStepState()
    }
    if (deal?.prompts?.length) {
      advanceAuction()
    }
  }

  function resetStats() {
    biddingState.correctCount = 0
    biddingState.wrongCount = 0
  }

  function normalizeBid(bid) {
    if (!bid) return ''
    let normalized = bid
      .replace(/♠/g, 'S').replace(/♥/g, 'H').replace(/♦/g, 'D').replace(/♣/g, 'C')
    const upper = normalized.toUpperCase()
    if (upper === 'PASS' || upper === 'P') return 'PASS'
    if (upper === 'X' || upper === 'DBL' || upper === 'DOUBLE') return 'X'
    if (upper === 'XX' || upper === 'RDBL' || upper === 'REDOUBLE') return 'XX'
    return upper.replace(/(\d)N$/, '$1NT')
  }

  return {
    // State
    currentDeal,
    stepState,
    biddingState,

    // Computed: Steps
    steps,
    hasSteps,
    currentStep,
    currentStepText,
    currentStepAction,
    hasNextStep,
    totalSteps,

    // Computed: Bidding
    prompts,
    hasPrompts,
    studentSeat,
    currentTurnSeat,
    isStudentTurn,
    currentPrompt,
    hasBidPrompt,
    lastContractBid,
    canDouble,
    canRedouble,
    canGoBack,

    // Computed: Display
    hiddenSeats,
    hands,
    showHcp,
    isComplete,

    // Computed: Auction & Lead
    showAuctionTable,
    showOpeningLead,
    openingLead,

    // Methods: Steps
    nextStep,
    prevStep,

    // Methods: Bidding
    makeBid,
    clearFeedback,
    goBack,

    // Methods: General
    loadDeal,
    resetStats,
    observationStore
  }
}

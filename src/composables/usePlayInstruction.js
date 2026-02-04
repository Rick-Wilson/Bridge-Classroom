import { ref, computed, reactive } from 'vue'

/**
 * Composable for managing play instruction state
 * Handles [NEXT] and [ROTATE] control tags for step-by-step play tutorials
 */
export function usePlayInstruction() {
  // Current deal data
  const currentDeal = ref(null)

  // Instruction state
  const state = reactive({
    // Current step index
    currentStepIndex: 0,
    // Whether instruction is complete
    instructionComplete: false
  })

  // Computed: all instruction steps
  const steps = computed(() => {
    return currentDeal.value?.instructionSteps || []
  })

  // Computed: current step
  const currentStep = computed(() => {
    if (!steps.value.length) return null
    return steps.value[state.currentStepIndex] || null
  })

  // Computed: current step text
  const currentText = computed(() => {
    return currentStep.value?.text || ''
  })

  // Computed: current step action
  const currentAction = computed(() => {
    return currentStep.value?.action || 'end'
  })

  // Computed: is there a next step?
  const hasNextStep = computed(() => {
    return state.currentStepIndex < steps.value.length - 1
  })

  // Computed: total steps
  const totalSteps = computed(() => {
    return steps.value.length
  })

  // Computed: progress (0-100)
  const progress = computed(() => {
    if (!steps.value.length) return 100
    return Math.round(((state.currentStepIndex + 1) / steps.value.length) * 100)
  })

  // Computed: which seat is the student (for hand visibility)
  const studentSeat = computed(() => currentDeal.value?.studentSeat || 'S')

  // Track which seats have been revealed (accumulates through steps)
  const revealedSeats = ref([])
  // Track if "show all" was triggered (cumulative)
  const showAllTriggered = ref(false)

  // Track played cards for each seat: { N: [{suit, card}, ...], E: [...], ... }
  const playedCards = ref({ N: [], E: [], S: [], W: [] })
  // Current trick (up to 4 cards)
  const currentTrick = ref([])

  /**
   * Calculate which seats should be revealed based on all steps up to current
   * This scans steps 0 through currentStepIndex for [SHOW ...] tags only
   */
  function calculateRevealedSeats() {
    const revealed = []
    let showAll = false
    if (!currentDeal.value?.instructionSteps) return { revealed, showAll }

    // Scan all steps up to and including current step
    for (let i = 0; i <= state.currentStepIndex; i++) {
      const step = currentDeal.value.instructionSteps[i]
      if (step?.showSeats) {
        for (const seat of step.showSeats) {
          if (!revealed.includes(seat)) {
            revealed.push(seat)
          }
        }
        // Check if showing all seats ([SHOW ALL])
        if (step.showSeats.length === 4) {
          showAll = true
        }
      }
    }
    return { revealed, showAll }
  }

  /**
   * Process plays for current step - extract cards that should be played
   */
  function processPlaysForStep(stepIndex) {
    if (!currentDeal.value?.instructionSteps) return

    const step = currentDeal.value.instructionSteps[stepIndex]
    if (!step?.plays?.length) return

    // Process each [PLAY ...] tag in this step
    for (const playStr of step.plays) {
      console.log(`Processing play string: "${playStr}"`)
      // Format: "N:SK S:S3" (space-separated) or "N:H4,E:S2" (comma-separated)
      // Split on comma or space
      const plays = playStr.split(/[,\s]+/)
      for (const play of plays) {
        if (!play) continue
        const match = play.trim().match(/^([NESW]):([SHDC])(.+)$/i)
        if (match) {
          const seat = match[1].toUpperCase()
          const suit = match[2].toUpperCase()
          let card = match[3].toUpperCase()

          // Normalize 10 to T (PBN standard)
          if (card === '10') card = 'T'

          console.log(`  Parsed: seat=${seat}, suit=${suit}, card=${card}`)

          // Add to played cards for this seat
          playedCards.value[seat].push({ suit, card })

          // Add to current trick
          currentTrick.value.push({ seat, suit, card })
        } else {
          console.log(`  Failed to parse: "${play}"`)
        }
      }
    }
  }

  /**
   * Update revealedSeats based on current step position
   */
  function updateRevealedSeats() {
    const { revealed, showAll } = calculateRevealedSeats()
    revealedSeats.value = revealed
    showAllTriggered.value = showAll
    console.log(`Step ${state.currentStepIndex + 1}: revealedSeats=${JSON.stringify(revealed)}, showAll=${showAll}`)
  }

  /**
   * Process all plays up to and including current step
   */
  function updatePlayedCards() {
    // Reset played cards
    playedCards.value = { N: [], E: [], S: [], W: [] }
    currentTrick.value = []

    // Process plays for all steps up to current
    for (let i = 0; i <= state.currentStepIndex; i++) {
      processPlaysForStep(i)
    }

    // Debug: show accumulated played cards
    const hasPlays = Object.values(playedCards.value).some(arr => arr.length > 0)
    if (hasPlays) {
      console.log('Played cards accumulated:', JSON.stringify(playedCards.value))
    }
  }

  // Computed: seats that should be hidden
  // ALL seats are hidden by default - only explicit [SHOW] tags reveal them
  const hiddenSeats = computed(() => {
    if (!currentDeal.value) return []

    // If "show all" was triggered at any point, show all hands
    if (showAllTriggered.value) return []

    // All seats hidden by default
    const allSeats = ['N', 'E', 'S', 'W']

    // Return all seats minus any that have been revealed by explicit [SHOW] tags
    return allSeats.filter(seat => !revealedSeats.value.includes(seat))
  })

  // Computed: hands with played cards removed
  const handsWithPlaysRemoved = computed(() => {
    if (!currentDeal.value?.hands) return {}

    const result = {}
    for (const seat of ['N', 'E', 'S', 'W']) {
      const hand = currentDeal.value.hands[seat]
      if (!hand) {
        result[seat] = null
        continue
      }

      // Clone the hand
      result[seat] = {
        spades: [...(hand.spades || [])],
        hearts: [...(hand.hearts || [])],
        diamonds: [...(hand.diamonds || [])],
        clubs: [...(hand.clubs || [])]
      }

      // Remove played cards
      for (const played of playedCards.value[seat]) {
        const suitName = {
          'S': 'spades',
          'H': 'hearts',
          'D': 'diamonds',
          'C': 'clubs'
        }[played.suit]

        if (suitName && result[seat][suitName]) {
          const idx = result[seat][suitName].indexOf(played.card)
          if (idx !== -1) {
            result[seat][suitName].splice(idx, 1)
          }
        }
      }
    }
    return result
  })

  /**
   * Load a new deal for instruction
   */
  function loadDeal(deal) {
    currentDeal.value = deal
    state.currentStepIndex = 0
    state.instructionComplete = false
    revealedSeats.value = []  // Reset revealed seats for new deal
    showAllTriggered.value = false
    playedCards.value = { N: [], E: [], S: [], W: [] }
    currentTrick.value = []

    // Debug: log parsed steps to help identify [SHOW] tag placement
    if (deal?.instructionSteps?.length) {
      console.log('Instruction steps parsed:')
      deal.instructionSteps.forEach((step, idx) => {
        console.log(`  Step ${idx + 1}: showSeats=${JSON.stringify(step.showSeats)}, plays=${step.plays?.length || 0}`)
      })
    }

    // Check if step 0 has any showSeats or plays
    updateRevealedSeats()
    updatePlayedCards()
  }

  /**
   * Advance to next step
   * @returns {boolean} True if advanced, false if at end
   */
  function nextStep() {
    if (state.currentStepIndex < steps.value.length - 1) {
      state.currentStepIndex++
      updateRevealedSeats()
      updatePlayedCards()
      return true
    } else {
      state.instructionComplete = true
      return false
    }
  }

  /**
   * Go to previous step
   * @returns {boolean} True if went back, false if at start
   */
  function prevStep() {
    if (state.currentStepIndex > 0) {
      state.currentStepIndex--
      state.instructionComplete = false
      updateRevealedSeats()
      updatePlayedCards()
      return true
    }
    return false
  }

  /**
   * Go to specific step
   */
  function goToStep(index) {
    if (index >= 0 && index < steps.value.length) {
      state.currentStepIndex = index
      state.instructionComplete = index === steps.value.length - 1
      updateRevealedSeats()
      updatePlayedCards()
    }
  }

  /**
   * Reset to beginning
   */
  function reset() {
    state.currentStepIndex = 0
    state.instructionComplete = false
    updateRevealedSeats()
    updatePlayedCards()
  }

  return {
    // State
    currentDeal,
    state,
    // Computed
    steps,
    currentStep,
    currentText,
    currentAction,
    hasNextStep,
    totalSteps,
    progress,
    studentSeat,
    hiddenSeats,
    handsWithPlaysRemoved,
    playedCards,
    currentTrick,
    // Methods
    loadDeal,
    nextStep,
    prevStep,
    goToStep,
    reset
  }
}

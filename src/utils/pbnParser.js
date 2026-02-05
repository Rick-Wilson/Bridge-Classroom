/**
 * PBN (Portable Bridge Notation) Parser
 * Parses PBN 2.1 format files into structured deal objects
 */

/**
 * Parse a PBN file content into an array of deals
 * @param {string} pbnContent - Raw PBN file content
 * @returns {Array} Array of parsed deal objects
 */
export function parsePbn(pbnContent) {
  const deals = []
  const lines = pbnContent.split('\n')

  let currentDeal = null
  let currentCommentary = []
  let inCommentary = false
  let commentaryBuffer = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip header lines (start with %)
    if (line.startsWith('%')) continue

    // Handle commentary blocks {...}
    if (inCommentary) {
      if (line.includes('}')) {
        commentaryBuffer += line.substring(0, line.indexOf('}'))
        currentCommentary.push(commentaryBuffer.trim())
        commentaryBuffer = ''
        inCommentary = false
      } else {
        commentaryBuffer += line + '\n'
      }
      continue
    }

    if (line.includes('{')) {
      const startIdx = line.indexOf('{')
      if (line.includes('}')) {
        // Single line commentary
        const endIdx = line.indexOf('}')
        currentCommentary.push(line.substring(startIdx + 1, endIdx).trim())
      } else {
        // Multi-line commentary starts
        commentaryBuffer = line.substring(startIdx + 1) + '\n'
        inCommentary = true
      }
      continue
    }

    // Parse [Play "X"]card format (opening lead)
    const playMatch = line.match(/\[Play\s+"([NESW])"\](\w+)/)
    if (playMatch && currentDeal) {
      currentDeal.openingLeader = playMatch[1]
      currentDeal.openingLead = playMatch[2]
      continue
    }

    // Parse tag lines [TagName "value"]
    const tagMatch = line.match(/\[(\w+)\s+"([^"]*)"\]/)
    if (tagMatch) {
      const [, tagName, tagValue] = tagMatch

      if (tagName === 'Board') {
        // Save previous deal if exists
        if (currentDeal) {
          currentDeal.commentary = formatCommentary(currentCommentary)
          currentDeal.prompts = parsePromptsInternal(currentCommentary)
          currentDeal.instructionSteps = parseInstructionSteps(currentCommentary)
          currentDeal.mode = detectDealMode(currentCommentary)
          deals.push(currentDeal)
        }
        // Start new deal
        currentDeal = createEmptyDeal()
        currentDeal.boardNumber = parseInt(tagValue, 10)
        currentCommentary = []
      } else if (currentDeal) {
        switch (tagName) {
          case 'Dealer':
            currentDeal.dealer = tagValue
            break
          case 'Vulnerable':
            currentDeal.vulnerable = tagValue
            break
          case 'Contract':
            currentDeal.contract = tagValue
            break
          case 'Declarer':
            currentDeal.declarer = tagValue
            break
          case 'Student':
            currentDeal.studentSeat = tagValue
            break
          case 'Deal':
            currentDeal.hands = parseDealString(tagValue)
            break
          case 'Auction':
            currentDeal.auctionDealer = tagValue
            break
          case 'Result':
            currentDeal.result = tagValue
            break
          // Metadata tags (embedded by lesson builder)
          case 'Event':
            currentDeal.event = tagValue
            break
          case 'SkillPath':
            currentDeal.skillPath = tagValue
            break
          case 'Category':
            currentDeal.category = tagValue
            break
          case 'Difficulty':
            currentDeal.difficulty = tagValue
            break
        }
      }
      continue
    }

    // Parse auction line (bids after [Auction "X"])
    if (currentDeal && currentDeal.auctionDealer && !currentDeal.auction.length) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('[')) {
        currentDeal.auction = parseAuctionString(trimmed)
      }
    }
  }

  // Don't forget the last deal
  if (currentDeal) {
    currentDeal.commentary = formatCommentary(currentCommentary)
    currentDeal.prompts = parsePromptsInternal(currentCommentary)
    currentDeal.instructionSteps = parseInstructionSteps(currentCommentary)
    currentDeal.mode = detectDealMode(currentCommentary)
    deals.push(currentDeal)
  }

  return deals
}

/**
 * Internal function to parse prompts (to avoid circular dependency with export)
 */
function parsePromptsInternal(commentaryParts) {
  if (!commentaryParts.length) return []

  const fullText = commentaryParts.join('\n\n')
  const prompts = []

  // Match [BID xxx] markers
  const bidPattern = /\[BID\s+([^\]]+)\]/gi
  const parts = fullText.split(bidPattern)

  // parts will be: [textBefore, bid1, textAfter1, bid2, textAfter2, ...]
  for (let i = 0; i < parts.length - 1; i += 2) {
    const textBefore = parts[i]
    const bid = parts[i + 1]
    const textAfter = parts[i + 2] || ''

    // Clean up the bid (remove suit escapes)
    const cleanBid = replaceSuitSymbols(bid).trim()

    // The prompt text is what comes before this [BID] marker
    let promptText = ''
    if (i === 0) {
      // First bid - use text before it (skip title line)
      const lines = textBefore.trim().split('\n')
      // Skip the title line (e.g., "Baker Cue-bid 1")
      promptText = lines.slice(1).join('\n').trim()
    } else {
      // Subsequent bids - the prompt is the explanation from previous section
      promptText = textBefore.trim()
    }

    // The explanation is the text after this [BID] until the next [BID] or end
    let explanationText = textAfter.split(/\[BID|\[NEXT/i)[0].trim()

    // Strip [SHOW ...] tags from display text
    promptText = promptText.replace(/\[SHOW\s+[^\]]*\]/gi, '').trim()
    explanationText = explanationText.replace(/\[SHOW\s+[^\]]*\]/gi, '').trim()

    prompts.push({
      bid: cleanBid,
      promptText: replaceSuitSymbols(promptText),
      explanationText: replaceSuitSymbols(explanationText)
    })
  }

  return prompts
}

/**
 * Detect the deal mode based on control tags in commentary
 * @param {Array} commentaryParts Array of commentary strings
 * @returns {string} 'bidding' | 'instruction' | 'display'
 */
function detectDealMode(commentaryParts) {
  if (!commentaryParts.length) return 'display'

  const fullText = commentaryParts.join('\n\n')

  // Check for [BID xxx] tags - bidding practice mode
  if (/\[BID\s+[^\]]+\]/i.test(fullText)) {
    return 'bidding'
  }

  // Check for [NEXT] or [ROTATE] tags - play instruction mode
  if (/\[NEXT\]|\[ROTATE\]/i.test(fullText)) {
    return 'instruction'
  }

  return 'display'
}

/**
 * Parse instruction steps from commentary for play instruction mode
 * Splits on [NEXT] and [ROTATE] tags, extracts [SHOW ...] and [PLAY ...] tags
 *
 * NOTE: [SHOW ...] and [PLAY ...] tags should be placed AFTER the [NEXT] tag
 * in the PBN file, so they appear in the step where they take effect.
 *
 * @param {Array} commentaryParts Array of commentary strings
 * @returns {Array} Array of {text, action, showSeats, plays} objects
 */
function parseInstructionSteps(commentaryParts) {
  if (!commentaryParts.length) return []

  const fullText = commentaryParts.join('\n\n')

  // Check if this is instruction mode (has [NEXT] or [ROTATE])
  if (!/\[NEXT\]|\[ROTATE\]/i.test(fullText)) {
    return []
  }

  const steps = []

  // Split by control tags, keeping the tags
  const pattern = /(\[NEXT\]|\[ROTATE\])/gi
  const parts = fullText.split(pattern)

  let currentText = ''

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    if (/^\[NEXT\]$/i.test(part)) {
      // Found [NEXT] - save current text as a step
      if (currentText.trim()) {
        steps.push(parseStepContent(currentText.trim(), 'next'))
      }
      currentText = ''
    } else if (/^\[ROTATE\]$/i.test(part)) {
      // Found [ROTATE] - save current text as a step with rotate action
      if (currentText.trim()) {
        steps.push(parseStepContent(currentText.trim(), 'rotate'))
      }
      currentText = ''
    } else {
      currentText += part
    }
  }

  // Don't forget remaining text after last control tag
  if (currentText.trim()) {
    steps.push(parseStepContent(currentText.trim(), 'end'))
  }

  return steps
}

/**
 * Parse content of a single instruction step
 * Extracts [SHOW ...] and [PLAY ...] tags
 * @param {string} text Raw step text
 * @param {string} action Step action (next, rotate, end)
 * @returns {Object} Step object with text, action, showSeats, plays
 */
function parseStepContent(text, action) {
  // Extract [SHOW ...] tags
  let showSeats = null
  const showMatch = text.match(/\[SHOW\s+([^\]]+)\]/i)
  if (showMatch) {
    const showValue = showMatch[1].toUpperCase().trim()
    if (showValue === 'ALL') {
      showSeats = ['N', 'E', 'S', 'W']
    } else {
      // Parse any combination of seat letters: W, NS, EW, NES, NESW, etc.
      const seats = []
      if (showValue.includes('N')) seats.push('N')
      if (showValue.includes('E')) seats.push('E')
      if (showValue.includes('S')) seats.push('S')
      if (showValue.includes('W')) seats.push('W')
      if (seats.length > 0) showSeats = seats
    }
  }

  // Extract [PLAY ...] tags
  const plays = []
  const playPattern = /\[PLAY\s+([^\]]+)\]/gi
  let playMatch
  while ((playMatch = playPattern.exec(text)) !== null) {
    plays.push(playMatch[1])
  }

  // Check for [RESET] tag - resets played cards to show original deal
  const reset = /\[RESET\]/i.test(text)

  // Check for [AUCTION off/on] - controls auction table visibility
  let showAuction = null  // null = no change, true = show, false = hide
  const auctionOffMatch = /\[AUCTION\s+off\]/i.test(text)
  const auctionOnMatch = /\[AUCTION\s+on\]/i.test(text)
  if (auctionOffMatch) showAuction = false
  if (auctionOnMatch) showAuction = true

  // Check for [SHOW_LEAD] - display the opening lead
  const showLead = /\[SHOW_LEAD\]/i.test(text)

  // Strip control tags from display text
  let displayText = text
    .replace(/\[SHOW\s+[^\]]*\]/gi, '')
    .replace(/\[PLAY\s+[^\]]*\]/gi, '')
    .replace(/\[RESET\]/gi, '')
    .replace(/\[AUCTION\s+(?:on|off)\]/gi, '')
    .replace(/\[SHOW_LEAD\]/gi, '')
    // Strip Baker title lines (e.g., "Baker Entries 1", "Baker Establishment 2")
    .replace(/^Baker\s+\w+\s+\d+\s*/gim, '')
    .trim()

  return {
    text: replaceSuitSymbols(displayText),
    action,
    showSeats,    // null means no change, array means show these seats
    plays,        // Array of play sequences
    reset,        // true if [RESET] tag present - show original hands
    showAuction,  // null = no change, true = show, false = hide
    showLead      // true if [SHOW_LEAD] tag present
  }
}

/**
 * Create an empty deal object with default values
 */
function createEmptyDeal() {
  return {
    boardNumber: 0,
    dealer: 'N',
    vulnerable: 'None',
    contract: '',
    declarer: '',
    studentSeat: 'S',
    hands: { N: null, E: null, S: null, W: null },
    auction: [],
    auctionDealer: '',
    result: '',
    commentary: '',
    prompts: [],  // Array of {bid, promptText, explanationText} for bidding practice
    instructionSteps: [],  // Array of {text, action} for play instruction mode
    mode: 'display',  // 'bidding' | 'instruction' | 'display'
    openingLeader: null,  // Position of opening leader (N/E/S/W)
    openingLead: null,    // Opening lead card (e.g., "SJ" for spade jack)
    // Metadata embedded in PBN by lesson builder
    event: '',            // Event name (e.g., "Baker Bridge - Stayman")
    skillPath: null,      // Skill path (e.g., "bidding_conventions/stayman")
    category: null,       // Category (e.g., "Bidding Conventions")
    difficulty: null      // Difficulty level (beginner, intermediate, advanced, mixed)
  }
}

/**
 * Parse the Deal string into hands for each seat
 * Format: "W:spades.hearts.diamonds.clubs N:... E:... S:..."
 * @param {string} dealString
 * @returns {Object} Hands object with N, E, S, W keys
 */
function parseDealString(dealString) {
  const hands = { N: null, E: null, S: null, W: null }

  // Split by space and get the 4 hands
  // First seat is indicated by prefix (e.g., "W:")
  const parts = dealString.split(' ')
  if (parts.length !== 4) return hands

  // Determine starting seat from first part
  const seatOrder = ['W', 'N', 'E', 'S']
  let startIdx = 0

  const firstPart = parts[0]
  const colonIdx = firstPart.indexOf(':')
  if (colonIdx !== -1) {
    const startSeat = firstPart.charAt(0).toUpperCase()
    startIdx = seatOrder.indexOf(startSeat)
    parts[0] = firstPart.substring(colonIdx + 1)
  }

  // Parse each hand
  for (let i = 0; i < 4; i++) {
    const seatIdx = (startIdx + i) % 4
    const seat = seatOrder[seatIdx]
    hands[seat] = parseHandString(parts[i])
  }

  return hands
}

/**
 * Parse a single hand string into suit arrays
 * Format: "AKQ.JT9.8765.432" (spades.hearts.diamonds.clubs)
 * @param {string} handString
 * @returns {Object} Hand object with spades, hearts, diamonds, clubs arrays
 */
function parseHandString(handString) {
  const suits = handString.split('.')
  if (suits.length !== 4) return null

  return {
    spades: parseCards(suits[0]),
    hearts: parseCards(suits[1]),
    diamonds: parseCards(suits[2]),
    clubs: parseCards(suits[3])
  }
}

/**
 * Parse a card string into an array of card values
 * @param {string} cardString e.g., "AKQ" or "JT9" or ""
 * @returns {Array} Array of card characters
 */
function parseCards(cardString) {
  if (!cardString) return []
  return cardString.split('')
}

/**
 * Parse the auction string into an array of bids
 * @param {string} auctionString e.g., "1S 2H 3H pass 4S pass pass pass"
 * @returns {Array} Array of bid strings
 */
function parseAuctionString(auctionString) {
  return auctionString
    .split(/\s+/)
    .filter(bid => bid.length > 0)
    .map(bid => normalizeBid(bid))
}

/**
 * Normalize a bid string to consistent format
 * @param {string} bid
 * @returns {string} Normalized bid
 */
function normalizeBid(bid) {
  const upper = bid.toUpperCase()
  if (upper === 'PASS' || upper === 'P') return 'Pass'
  if (upper === 'X' || upper === 'DBL' || upper === 'DOUBLE') return 'X'
  if (upper === 'XX' || upper === 'RDBL' || upper === 'REDOUBLE') return 'XX'
  return upper // e.g., "1S", "2NT", "3H"
}

/**
 * Format commentary text, converting suit symbols
 * @param {Array} commentaryParts Array of commentary strings
 * @returns {string} Formatted commentary
 */
function formatCommentary(commentaryParts) {
  if (!commentaryParts.length) return ''

  return replaceSuitSymbols(commentaryParts.join('\n\n'))
}

/**
 * Replace suit escape sequences with symbols
 * @param {string} text
 * @returns {string}
 */
function replaceSuitSymbols(text) {
  return text
    .replace(/\\S/g, '♠')
    .replace(/\\H/g, '♥')
    .replace(/\\D/g, '♦')
    .replace(/\\C/g, '♣')
    .replace(/\\s/g, '♠')
    .replace(/\\h/g, '♥')
    .replace(/\\d/g, '♦')
    .replace(/\\c/g, '♣')
}

/**
 * Parse commentary to extract prompts for each student bid
 * Format: "...text... [BID 3\H] ...explanation..."
 * @param {Array} commentaryParts Array of commentary strings
 * @returns {Array} Array of {bid, promptText, explanationText} objects
 */
export function parsePrompts(commentaryParts) {
  if (!commentaryParts.length) return []

  const fullText = commentaryParts.join('\n\n')
  const prompts = []

  // Match [BID xxx] or [NEXT] markers
  const bidPattern = /\[BID\s+([^\]]+)\]/gi
  const parts = fullText.split(bidPattern)

  // parts will be: [textBefore, bid1, textAfter1, bid2, textAfter2, ...]
  for (let i = 0; i < parts.length - 1; i += 2) {
    const textBefore = i === 0 ? parts[i] : parts[i]
    const bid = parts[i + 1]
    const textAfter = parts[i + 2] || ''

    // Clean up the bid (remove suit escapes)
    const cleanBid = replaceSuitSymbols(bid).trim()

    // The prompt text is what comes before this [BID] marker
    // For the first bid, it's parts[0]. For subsequent bids, we need the text after previous bid.
    let promptText = ''
    if (i === 0) {
      // First bid - use text before it (skip title line)
      const lines = textBefore.trim().split('\n')
      // Skip the title line (e.g., "Baker Cue-bid 1")
      promptText = lines.slice(1).join('\n').trim()
    } else {
      // Subsequent bids - the prompt is the explanation from previous section
      promptText = textBefore.trim()
    }

    // The explanation is the text after this [BID] until the next [BID] or end
    // We'll extract just until a double newline or next section
    let explanationText = textAfter.split(/\[BID|\[NEXT/i)[0].trim()

    prompts.push({
      bid: cleanBid,
      promptText: replaceSuitSymbols(promptText),
      explanationText: replaceSuitSymbols(explanationText)
    })
  }

  return prompts
}

/**
 * Extract the title from the first commentary block (usually "Baker Cue-bid 1")
 * @param {Object} deal
 * @returns {string} Title or empty string
 */
export function getDealTitle(deal) {
  if (!deal.commentary) return ''
  const lines = deal.commentary.split('\n')
  if (lines.length > 0 && lines[0].startsWith('Baker ')) {
    return lines[0]
  }
  return `Board ${deal.boardNumber}`
}

/**
 * Get the seat order starting from dealer
 * @param {string} dealer N/E/S/W
 * @returns {Array} Array of seats in bidding order
 */
export function getSeatOrder(dealer) {
  const seats = ['N', 'E', 'S', 'W']
  const startIdx = seats.indexOf(dealer)
  return [...seats.slice(startIdx), ...seats.slice(0, startIdx)]
}

/**
 * Get the seat for a specific bid index in the auction
 * @param {number} bidIndex 0-based index
 * @param {string} dealer Dealer seat
 * @returns {string} Seat (N/E/S/W)
 */
export function getSeatForBid(bidIndex, dealer) {
  const order = getSeatOrder(dealer)
  return order[bidIndex % 4]
}

<template>
  <div class="auction-table">
    <div class="header">
      <div class="header-cell">W</div>
      <div class="header-cell">N</div>
      <div class="header-cell">E</div>
      <div class="header-cell">S</div>
    </div>
    <div class="rounds">
      <div v-for="(round, roundIdx) in rounds" :key="roundIdx" class="round">
        <div
          v-for="(bid, bidIdx) in round"
          :key="bidIdx"
          class="bid-cell"
          :class="{
            'current-turn': isCurrentTurn(roundIdx, bidIdx),
            'wrong-bid': isWrongBid(roundIdx, bidIdx),
            'correct-bid': isCorrectBid(roundIdx, bidIdx)
          }"
        >
          <span v-if="bid" v-html="formatBidHtml(bid)"></span>
          <span v-else-if="showTurnIndicator && isCurrentTurn(roundIdx, bidIdx)" class="turn-indicator">?</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatBid } from '../utils/cardFormatting.js'
import { getSeatOrder } from '../utils/pbnParser.js'

const props = defineProps({
  bids: {
    type: Array,
    default: () => []
  },
  dealer: {
    type: String,
    default: 'N'
  },
  currentBidIndex: {
    type: Number,
    default: -1
  },
  wrongBidIndex: {
    type: Number,
    default: -1
  },
  correctBidIndex: {
    type: Number,
    default: -1
  },
  showTurnIndicator: {
    type: Boolean,
    default: false
  }
})

const seatOrder = computed(() => getSeatOrder(props.dealer))

// Figure out which column the dealer is in (0-3 for W-N-E-S display order)
const dealerColumn = computed(() => {
  const displayOrder = ['W', 'N', 'E', 'S']
  return displayOrder.indexOf(props.dealer)
})

const rounds = computed(() => {
  const result = []
  const bids = props.bids

  // First round might not have all 4 bids if dealer isn't West
  let bidIdx = 0
  let roundNum = 0

  while (bidIdx < bids.length || (roundNum === 0 && bids.length > 0)) {
    const round = [null, null, null, null]

    // Determine starting column for this round
    const startCol = roundNum === 0 ? dealerColumn.value : 0

    for (let col = startCol; col < 4 && bidIdx < bids.length; col++) {
      round[col] = bids[bidIdx]
      bidIdx++
    }

    // Only add round if it has any bids
    if (round.some(b => b !== null)) {
      result.push(round)
    }

    roundNum++

    // Safety break
    if (roundNum > 20) break
  }

  // Add an empty round for current turn indicator if needed
  if (props.currentBidIndex >= bids.length) {
    const lastRound = result[result.length - 1]
    const filledCount = lastRound ? lastRound.filter(b => b !== null).length : 0
    const startCol = result.length === 1 ? dealerColumn.value : 0
    const expectedNextCol = (startCol + filledCount) % 4

    if (filledCount === 4 || (result.length > 1 && filledCount === 4)) {
      // Need a new round
      const newRound = [null, null, null, null]
      result.push(newRound)
    }
  }

  return result
})

function getBidIndexFromPosition(roundIdx, colIdx) {
  if (roundIdx === 0) {
    return colIdx - dealerColumn.value
  }
  // First round has (4 - dealerColumn) bids
  const firstRoundBids = 4 - dealerColumn.value
  return firstRoundBids + (roundIdx - 1) * 4 + colIdx
}

function isCurrentTurn(roundIdx, colIdx) {
  const bidIdx = getBidIndexFromPosition(roundIdx, colIdx)
  return bidIdx === props.currentBidIndex && bidIdx >= props.bids.length
}

function isWrongBid(roundIdx, colIdx) {
  if (props.wrongBidIndex < 0) return false
  const bidIdx = getBidIndexFromPosition(roundIdx, colIdx)
  return bidIdx === props.wrongBidIndex
}

function isCorrectBid(roundIdx, colIdx) {
  if (props.correctBidIndex < 0) return false
  const bidIdx = getBidIndexFromPosition(roundIdx, colIdx)
  return bidIdx === props.correctBidIndex
}

function formatBidHtml(bid) {
  return formatBid(bid).html
}
</script>

<style scoped>
.auction-table {
  background: #fff;
  border: 2px solid #333;
  border-radius: 4px;
  overflow: hidden;
  min-width: 200px;
}

.header {
  display: flex;
  background: #333;
  color: white;
}

.header-cell {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  font-weight: bold;
  font-size: 14px;
}

.rounds {
  display: flex;
  flex-direction: column;
}

.round {
  display: flex;
  border-bottom: 1px solid #ddd;
}

.round:last-child {
  border-bottom: none;
}

.bid-cell {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  font-size: 16px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #eee;
}

.bid-cell:last-child {
  border-right: none;
}

.bid-cell :deep(.red) {
  color: #d32f2f;
}

.bid-cell :deep(.double) {
  color: #ff5722;
  font-weight: bold;
}

.bid-cell :deep(.redouble) {
  color: #2196f3;
  font-weight: bold;
}

.turn-indicator {
  color: #007bff;
  font-weight: bold;
  font-size: 20px;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.current-turn {
  background: #e3f2fd;
}

.wrong-bid {
  background: #ffcdd2;
  box-shadow: inset 0 0 0 2px #ef5350;
}

.correct-bid {
  background: #c8e6c9;
}
</style>

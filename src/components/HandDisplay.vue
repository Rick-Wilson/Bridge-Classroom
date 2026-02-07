<template>
  <div class="hand" :class="{ hidden: hidden, compact: compact, minimal: minimal }">
    <!-- Minimal mode: just suit symbols in a row (for hidden E/W on desktop) -->
    <template v-if="minimal && hidden">
      <div class="minimal-hand">
        <span class="seat-label-inline">{{ seat }}</span>
        <span v-for="suit in suits" :key="suit" class="suit-symbol-inline" :class="suitClass(suit)">{{ suitSymbol(suit) }}</span>
      </div>
    </template>

    <!-- Normal/compact mode -->
    <template v-else>
      <div class="seat-label">{{ seatName }}</div>
      <div v-if="!hidden && hand" class="suits">
        <!-- For partial hands (showcards), only show suits that have cards -->
        <template v-for="suit in suits" :key="suit">
          <div v-if="!isPartialHand || hasSuitCards(suit)" class="suit-row">
            <span class="suit-symbol" :class="suitClass(suit)">{{ suitSymbol(suit) }}</span>
            <span class="cards">{{ formatSuitCards(suit) }}</span>
          </div>
        </template>
      </div>
      <div v-else-if="hidden" class="hidden-hand">
        <div class="card-back"></div>
      </div>
      <div v-if="showHcp && hand && !hidden && !isPartialHand" class="hcp">
        {{ hcp }} HCP
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  SUIT_SYMBOLS,
  SUIT_ORDER,
  getSuitClass,
  formatCard,
  countHCP,
  getSeatName
} from '../utils/cardFormatting.js'

const props = defineProps({
  hand: {
    type: Object,
    default: null
  },
  seat: {
    type: String,
    required: true,
    validator: (v) => ['N', 'E', 'S', 'W'].includes(v)
  },
  hidden: {
    type: Boolean,
    default: false
  },
  showHcp: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  },
  minimal: {
    type: Boolean,
    default: false
  }
})

const suits = SUIT_ORDER

const seatName = computed(() => getSeatName(props.seat))

const hcp = computed(() => countHCP(props.hand))

// Count total cards in hand - partial hands (showcards) have fewer than 5 cards
const totalCards = computed(() => {
  if (!props.hand) return 0
  return suits.reduce((sum, suit) => sum + (props.hand[suit]?.length || 0), 0)
})

// A partial hand shows only played cards (from showcards directive)
// Don't show empty suits for partial hands - dashes would imply voids
const isPartialHand = computed(() => totalCards.value > 0 && totalCards.value < 5)

function hasSuitCards(suit) {
  return props.hand && props.hand[suit] && props.hand[suit].length > 0
}

function suitSymbol(suit) {
  return SUIT_SYMBOLS[suit]
}

function suitClass(suit) {
  return getSuitClass(suit)
}

function formatSuitCards(suit) {
  if (!props.hand || !props.hand[suit]) return '—'
  const cards = props.hand[suit]
  if (cards.length === 0) return '—'
  return cards.map(formatCard).join(' ')
}
</script>

<style scoped>
.hand {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  min-width: 220px;  /* Wide enough to align N/S hands consistently */
}

.seat-label {
  font-weight: bold;
  font-size: 21px;
  color: #333;
  margin-bottom: 8px;
  text-align: center;
}

.suits {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.suit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 24px;
}

.suit-symbol {
  font-size: 27px;
  width: 28px;
  text-align: center;
}

.suit-red {
  color: #d32f2f;
}

.suit-black {
  color: #1a1a1a;
}

.cards {
  font-weight: 500;
  letter-spacing: 1px;
}

.hidden-hand {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80px;
}

.card-back {
  width: 50px;
  height: 70px;
  background: linear-gradient(135deg, #1565c0, #0d47a1);
  border-radius: 4px;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.hcp {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #666;
}

.hand.hidden {
  opacity: 0.7;
}

/* Compact mode - smaller padding and fonts */
.hand.compact {
  padding: 8px;
  min-width: 180px;
}

.hand.compact .seat-label {
  font-size: 18px;
  margin-bottom: 4px;
}

.hand.compact .suit-row {
  font-size: 21px;
  gap: 6px;
}

.hand.compact .suit-symbol {
  font-size: 24px;
  width: 24px;
}

/* Minimal mode - just suit symbols in a row (for hidden E/W) */
.hand.minimal {
  background: transparent;
  padding: 4px 8px;
  min-width: auto;
}

.minimal-hand {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 24px;
}

.seat-label-inline {
  font-weight: bold;
  color: #666;
  margin-right: 4px;
}

.suit-symbol-inline {
  font-size: 27px;
}
</style>

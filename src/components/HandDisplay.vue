<template>
  <div class="hand" :class="{ hidden: hidden }">
    <div class="seat-label">{{ seatName }}</div>
    <div v-if="!hidden && hand" class="suits">
      <div v-for="suit in suits" :key="suit" class="suit-row">
        <span class="suit-symbol" :class="suitClass(suit)">{{ suitSymbol(suit) }}</span>
        <span class="cards">{{ formatSuitCards(suit) }}</span>
      </div>
    </div>
    <div v-else-if="hidden" class="hidden-hand">
      <div class="card-back"></div>
    </div>
    <div v-if="showHcp && hand && !hidden" class="hcp">
      {{ hcp }} HCP
    </div>
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
  }
})

const suits = SUIT_ORDER

const seatName = computed(() => getSeatName(props.seat))

const hcp = computed(() => countHCP(props.hand))

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
  min-width: 120px;
}

.seat-label {
  font-weight: bold;
  font-size: 14px;
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
  font-size: 16px;
}

.suit-symbol {
  font-size: 18px;
  width: 20px;
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
</style>

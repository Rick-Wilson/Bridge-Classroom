<template>
  <div class="deal-info">
    <div class="board-number">Board {{ boardNumber }}</div>

    <div class="info-row">
      <div class="info-item">
        <span class="label">Dealer:</span>
        <span class="value">{{ dealerName }}</span>
      </div>
      <div class="info-item">
        <span class="label">Vul:</span>
        <span class="value" :class="vulClass">{{ vulDisplay }}</span>
      </div>
    </div>

    <div v-if="showContract && contract" class="contract-row">
      <div class="info-item">
        <span class="label">Contract:</span>
        <span class="value contract" v-html="contractHtml"></span>
      </div>
      <div v-if="declarer" class="info-item">
        <span class="label">By:</span>
        <span class="value">{{ declarerName }}</span>
      </div>
    </div>

    <div v-if="title" class="title">{{ title }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getSeatName, formatBid, formatVulnerability } from '../utils/cardFormatting.js'

const props = defineProps({
  boardNumber: {
    type: Number,
    default: 0
  },
  dealer: {
    type: String,
    default: 'N'
  },
  vulnerable: {
    type: String,
    default: 'None'
  },
  contract: {
    type: String,
    default: ''
  },
  declarer: {
    type: String,
    default: ''
  },
  showContract: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  }
})

const dealerName = computed(() => getSeatName(props.dealer))
const declarerName = computed(() => getSeatName(props.declarer))
const vulDisplay = computed(() => formatVulnerability(props.vulnerable))

const vulClass = computed(() => {
  const vul = props.vulnerable?.toUpperCase()
  if (vul === 'BOTH' || vul === 'ALL') return 'vul-both'
  if (vul === 'NS' || vul === 'EW') return 'vul-partial'
  return 'vul-none'
})

const contractHtml = computed(() => {
  if (!props.contract) return ''
  return formatBid(props.contract).html
})
</script>

<style scoped>
.deal-info {
  background: #f0f0f0;
  border-radius: 8px;
  padding: 12px 16px;
  text-align: center;
}

.board-number {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.info-row,
.contract-row {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 4px;
}

.info-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.label {
  font-size: 12px;
  color: #666;
}

.value {
  font-size: 14px;
  font-weight: 500;
}

.vul-both {
  color: #d32f2f;
  font-weight: bold;
}

.vul-partial {
  color: #f57c00;
}

.vul-none {
  color: #4caf50;
}

.contract {
  font-size: 16px;
}

.contract :deep(.red) {
  color: #d32f2f;
}

.title {
  margin-top: 8px;
  font-style: italic;
  color: #555;
  font-size: 13px;
}
</style>

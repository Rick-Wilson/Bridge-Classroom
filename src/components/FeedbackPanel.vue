<template>
  <div v-if="visible" class="feedback-panel" :class="type">
    <div class="feedback-header">
      <span v-if="type === 'wrong'" class="icon">✗</span>
      <span v-else-if="type === 'correct'" class="icon">✓</span>
      <span class="title">{{ title }}</span>
    </div>

    <div v-if="wrongBid" class="feedback-content">
      <div class="bid-comparison">
        <div class="bid-item your-bid">
          <span class="label">Your bid:</span>
          <span class="bid" v-html="formatBidHtml(wrongBid)"></span>
        </div>
        <div class="bid-item correct-bid">
          <span class="label">Correct bid:</span>
          <span class="bid" v-html="formatBidHtml(correctBid)"></span>
        </div>
      </div>
    </div>

    <div v-if="commentary" class="commentary">
      {{ commentary }}
    </div>

    <div class="actions">
      <button v-if="showContinue" class="btn continue" @click="$emit('continue')">
        Continue
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatBid } from '../utils/cardFormatting.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'wrong', // 'wrong', 'correct', 'info'
    validator: (v) => ['wrong', 'correct', 'info'].includes(v)
  },
  wrongBid: {
    type: String,
    default: ''
  },
  correctBid: {
    type: String,
    default: ''
  },
  commentary: {
    type: String,
    default: ''
  },
  showContinue: {
    type: Boolean,
    default: true
  }
})

defineEmits(['continue'])

const title = computed(() => {
  if (props.type === 'wrong') return 'Incorrect'
  if (props.type === 'correct') return 'Correct!'
  return 'Information'
})

function formatBidHtml(bid) {
  return formatBid(bid).html
}
</script>

<style scoped>
.feedback-panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  max-width: 400px;
}

.feedback-panel.wrong {
  border-left: 4px solid #d32f2f;
}

.feedback-panel.correct {
  border-left: 4px solid #4caf50;
}

.feedback-panel.info {
  border-left: 4px solid #2196f3;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.icon {
  font-size: 20px;
  font-weight: bold;
}

.wrong .icon {
  color: #d32f2f;
}

.correct .icon {
  color: #4caf50;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.feedback-content {
  margin-bottom: 12px;
}

.bid-comparison {
  display: flex;
  gap: 20px;
}

.bid-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bid-item .label {
  font-size: 12px;
  color: #666;
}

.bid-item .bid {
  font-size: 24px;
  font-weight: bold;
}

.bid-item .bid :deep(.red) {
  color: #d32f2f;
}

.your-bid .bid {
  color: #d32f2f;
  text-decoration: line-through;
}

.correct-bid .bid {
  color: #4caf50;
}

.commentary {
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn.continue {
  background: #007bff;
  color: white;
}

.btn.continue:hover {
  background: #0056b3;
}
</style>

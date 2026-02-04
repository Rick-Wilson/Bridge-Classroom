<template>
  <div class="deal-navigator">
    <button
      class="nav-btn"
      :disabled="currentIndex <= 0"
      @click="$emit('prev')"
    >
      &larr; Previous
    </button>

    <!-- Assignment mode: simple deal counter without dropdown -->
    <div v-if="assignmentMode" class="deal-counter">
      <span class="deal-number">Deal {{ currentIndex + 1 }} of {{ deals.length }}</span>
    </div>

    <!-- Normal mode: full dropdown with deal info -->
    <div v-else class="deal-selector">
      <select v-model="selectedIndex" @change="onSelectDeal">
        <option
          v-for="(deal, idx) in deals"
          :key="idx"
          :value="idx"
        >
          {{ getDealLabel(deal, idx) }}
        </option>
      </select>
      <span class="deal-count">{{ currentIndex + 1 }} / {{ deals.length }}</span>
    </div>

    <button
      class="nav-btn"
      :disabled="currentIndex >= deals.length - 1"
      @click="$emit('next')"
    >
      Next &rarr;
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getDealTitle } from '../utils/pbnParser.js'

const props = defineProps({
  deals: {
    type: Array,
    default: () => []
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  assignmentMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['prev', 'next', 'goto'])

const selectedIndex = ref(props.currentIndex)

watch(() => props.currentIndex, (newVal) => {
  selectedIndex.value = newVal
})

function onSelectDeal() {
  emit('goto', selectedIndex.value)
}

function getDealLabel(deal, idx) {
  const title = getDealTitle(deal)
  if (title && !title.startsWith('Board ')) {
    return title
  }
  return `Board ${deal.boardNumber || idx + 1}`
}
</script>

<style scoped>
.deal-navigator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.nav-btn {
  padding: 10px 20px;
  border: none;
  background: #007bff;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.nav-btn:hover:not(:disabled) {
  background: #0056b3;
}

.nav-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.deal-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.deal-number {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.deal-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.deal-selector select {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  min-width: 150px;
}

.deal-count {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

@media (max-width: 500px) {
  .deal-navigator {
    flex-wrap: wrap;
    gap: 8px;
  }

  .nav-btn {
    padding: 8px 16px;
    font-size: 13px;
  }

  .deal-selector {
    order: -1;
    width: 100%;
    justify-content: center;
  }
}
</style>

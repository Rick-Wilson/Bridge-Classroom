<template>
  <div class="accomplishments-table">
    <!-- Empty state -->
    <div v-if="items.length === 0" class="empty-state">
      <p>No data to display</p>
      <p class="hint" v-if="showFilterHint">Try turning off the "Only with observations" filter</p>
    </div>

    <!-- Table -->
    <table v-else>
      <thead>
        <tr>
          <th class="name-col" @click="toggleSort('name')">
            {{ nameColumnLabel }}
            <span v-if="sortBy === 'name'" class="sort-indicator">
              {{ sortDirection === 'asc' ? '&#9650;' : '&#9660;' }}
            </span>
          </th>
          <th v-if="showCategory" class="category-col" @click="toggleSort('category')">
            Category
            <span v-if="sortBy === 'category'" class="sort-indicator">
              {{ sortDirection === 'asc' ? '&#9650;' : '&#9660;' }}
            </span>
          </th>
          <th class="total-col" @click="toggleSort('total')">
            Total
            <span v-if="sortBy === 'total'" class="sort-indicator">
              {{ sortDirection === 'asc' ? '&#9650;' : '&#9660;' }}
            </span>
          </th>
          <th class="correct-col">Correct</th>
          <th class="incorrect-col">Incorrect</th>
          <th class="rate-col" @click="toggleSort('rate')">
            Success Rate
            <span v-if="sortBy === 'rate'" class="sort-indicator">
              {{ sortDirection === 'asc' ? '&#9650;' : '&#9660;' }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedItems" :key="item.id" @click="$emit('select', item)">
          <td class="name-col">
            <span class="name">{{ item.displayName || item.skillName }}</span>
          </td>
          <td v-if="showCategory" class="category-col">
            {{ item.categoryName }}
          </td>
          <td class="total-col">{{ item.total }}</td>
          <td class="correct-col">{{ item.correct }}</td>
          <td class="incorrect-col">{{ item.incorrect }}</td>
          <td class="rate-col">
            <div class="rate-cell">
              <div class="rate-bar-container">
                <div
                  class="rate-bar"
                  :style="{ width: item.successRate + '%' }"
                  :class="getRateClass(item.successRate)"
                ></div>
              </div>
              <span class="rate-value">{{ item.successRate }}%</span>
            </div>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="showTotals && items.length > 0">
        <tr class="totals-row">
          <td class="name-col"><strong>Total</strong></td>
          <td v-if="showCategory" class="category-col"></td>
          <td class="total-col"><strong>{{ totals.total }}</strong></td>
          <td class="correct-col"><strong>{{ totals.correct }}</strong></td>
          <td class="incorrect-col"><strong>{{ totals.incorrect }}</strong></td>
          <td class="rate-col">
            <div class="rate-cell">
              <div class="rate-bar-container">
                <div
                  class="rate-bar"
                  :style="{ width: totals.successRate + '%' }"
                  :class="getRateClass(totals.successRate)"
                ></div>
              </div>
              <span class="rate-value"><strong>{{ totals.successRate }}%</strong></span>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  nameColumnLabel: {
    type: String,
    default: 'Name'
  },
  showCategory: {
    type: Boolean,
    default: false
  },
  showTotals: {
    type: Boolean,
    default: true
  },
  showFilterHint: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select'])

// Sorting state
const sortBy = ref('name')
const sortDirection = ref('asc')

/**
 * Toggle sort column and direction
 */
function toggleSort(column) {
  if (sortBy.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortDirection.value = column === 'name' || column === 'category' ? 'asc' : 'desc'
  }
}

/**
 * Sorted items based on current sort settings
 */
const sortedItems = computed(() => {
  const sorted = [...props.items]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortBy.value) {
      case 'name':
        comparison = (a.displayName || a.skillName || '').localeCompare(b.displayName || b.skillName || '')
        break
      case 'category':
        comparison = (a.categoryName || '').localeCompare(b.categoryName || '')
        break
      case 'total':
        comparison = a.total - b.total
        break
      case 'rate':
        comparison = a.successRate - b.successRate
        break
      default:
        comparison = 0
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })

  return sorted
})

/**
 * Calculate totals for footer
 */
const totals = computed(() => {
  const total = props.items.reduce((sum, item) => sum + item.total, 0)
  const correct = props.items.reduce((sum, item) => sum + item.correct, 0)
  const incorrect = props.items.reduce((sum, item) => sum + item.incorrect, 0)
  const successRate = total > 0 ? Math.round((correct / total) * 100) : 0

  return { total, correct, incorrect, successRate }
})

/**
 * Get CSS class for rate bar based on success rate
 */
function getRateClass(rate) {
  if (rate >= 80) return 'rate-excellent'
  if (rate >= 60) return 'rate-good'
  if (rate >= 40) return 'rate-fair'
  return 'rate-needs-work'
}
</script>

<style scoped>
.accomplishments-table {
  width: 100%;
  overflow-x: auto;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-state .hint {
  font-size: 13px;
  color: #999;
  margin-top: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

thead {
  position: sticky;
  top: 0;
  background: #f8f8f8;
  z-index: 1;
}

th {
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #444;
  border-bottom: 2px solid #ddd;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

th:hover {
  background: #f0f0f0;
}

.sort-indicator {
  margin-left: 4px;
  font-size: 10px;
  color: #667eea;
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

tr:hover td {
  background: #f9f9f9;
}

.name-col {
  min-width: 180px;
}

.name {
  font-weight: 500;
}

.category-col {
  min-width: 120px;
  color: #666;
}

.total-col,
.correct-col,
.incorrect-col {
  width: 80px;
  text-align: center;
}

.correct-col {
  color: #4caf50;
}

.incorrect-col {
  color: #d32f2f;
}

.rate-col {
  min-width: 150px;
}

.rate-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rate-bar-container {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.rate-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.rate-excellent {
  background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
}

.rate-good {
  background: linear-gradient(135deg, #8bc34a 0%, #7cb342 100%);
}

.rate-fair {
  background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
}

.rate-needs-work {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
}

.rate-value {
  min-width: 40px;
  font-weight: 500;
  color: #333;
}

.totals-row {
  background: #f5f5f5;
}

.totals-row td {
  border-top: 2px solid #ddd;
  padding-top: 14px;
  padding-bottom: 14px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  th, td {
    padding: 8px 4px;
    font-size: 13px;
  }

  .name-col {
    min-width: 120px;
  }

  .category-col {
    min-width: 80px;
  }

  .rate-bar-container {
    display: none;
  }
}
</style>

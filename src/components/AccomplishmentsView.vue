<template>
  <div class="accomplishments-view">
    <header class="view-header">
      <h2>Accomplishments</h2>
      <button class="close-btn" @click="$emit('close')">&times;</button>
    </header>

    <!-- User selector (if can view other users) -->
    <div v-if="accomplishments.canViewOtherUsers.value" class="user-selector">
      <label for="user-select">Viewing:</label>
      <select
        id="user-select"
        :value="accomplishments.selectedUserId.value"
        @change="onUserChange($event.target.value)"
      >
        <option
          v-for="user in accomplishments.accessibleUsers.value"
          :key="user.id"
          :value="user.id"
        >
          {{ user.name }}{{ user.isSelf ? ' (You)' : '' }}
        </option>
      </select>
    </div>

    <!-- Loading state -->
    <div v-if="accomplishments.loading.value" class="loading-state">
      <div class="spinner"></div>
      <p>Loading accomplishments...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="accomplishments.error.value" class="error-state">
      <p>Failed to load: {{ accomplishments.error.value }}</p>
      <button @click="refresh">Try Again</button>
    </div>

    <!-- No data state -->
    <div v-else-if="!accomplishments.hasData.value" class="empty-state">
      <h3>No Practice Data Yet</h3>
      <p>Complete some practice deals to see your accomplishments here!</p>
      <button class="primary-btn" @click="$emit('close')">Start Practicing</button>
    </div>

    <!-- Main content -->
    <div v-else class="view-content">
      <!-- Summary stats -->
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">{{ accomplishments.totalObservations.value }}</div>
          <div class="stat-label">Total Bids</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ accomplishments.overallSuccessRate.value }}%</div>
          <div class="stat-label">Overall Success</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ uniqueItemCount }}</div>
          <div class="stat-label">{{ accomplishments.activeTab.value === 'lessons' ? 'Lessons' : 'Skills' }}</div>
        </div>
      </div>

      <!-- Controls row -->
      <div class="controls-row">
        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: accomplishments.activeTab.value === 'lessons' }"
            @click="accomplishments.activeTab.value = 'lessons'"
          >
            Baker Bridge
          </button>
          <button
            class="tab-btn"
            :class="{ active: accomplishments.activeTab.value === 'taxons' }"
            @click="accomplishments.activeTab.value = 'taxons'"
          >
            Taxons
          </button>
        </div>

        <!-- Filter -->
        <label class="filter-checkbox">
          <input
            type="checkbox"
            v-model="accomplishments.onlyWithObservations.value"
          />
          Only with observations
        </label>
      </div>

      <!-- Table content -->
      <div class="table-container">
        <AccomplishmentsTable
          v-if="accomplishments.activeTab.value === 'lessons'"
          :items="accomplishments.filteredLessonStats.value"
          name-column-label="Lesson"
          :show-category="false"
          :show-filter-hint="!accomplishments.onlyWithObservations.value"
          @select="onItemSelect"
        />
        <AccomplishmentsTable
          v-else
          :items="accomplishments.filteredTaxonStats.value"
          name-column-label="Skill"
          :show-category="true"
          :show-filter-hint="!accomplishments.onlyWithObservations.value"
          @select="onItemSelect"
        />

        <!-- Board mastery drill-down (shown when a lesson is selected) -->
        <div v-if="selectedLesson" class="board-drill-down">
          <div class="drill-down-header">
            <h3>{{ selectedLesson.displayName }} - Board Mastery</h3>
            <button class="close-drill-down" @click="selectedLesson = null">&times;</button>
          </div>
          <BoardMasteryGrid
            :lessonSubfolder="selectedLesson.lesson"
            :observations="selectedLesson.observations"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="view-actions">
        <button class="secondary-btn" @click="refresh">
          Refresh
        </button>
        <button class="primary-btn" @click="$emit('close')">
          Done
        </button>
      </div>
    </div>

    <!-- Test mode indicator -->
    <div v-if="accomplishments.useTestData.value" class="test-mode-banner">
      Test Mode - Using Generated Data
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAccomplishments } from '../composables/useAccomplishments.js'
import { generateLessonFocusedObservations, generateTaxonFocusedObservations } from '../utils/accomplishmentsTestData.js'
import { generateBoardMasteryTestData } from '../utils/boardMasteryTestData.js'
import AccomplishmentsTable from './AccomplishmentsTable.vue'
import BoardMasteryGrid from './BoardMasteryGrid.vue'

const emit = defineEmits(['close', 'select-item'])

const accomplishments = useAccomplishments()

// Check URL for test mode flag (e.g., ?test=accomplishments or ?test=mastery)
const urlParams = new URLSearchParams(window.location.search)
const testParam = urlParams.get('test')
const useTestMode = testParam === 'accomplishments' || testParam === 'mastery'

onMounted(async () => {
  if (testParam === 'mastery') {
    accomplishments.enableTestMode(generateBoardMasteryTestData())
  } else if (testParam === 'accomplishments') {
    const testData = [
      ...generateLessonFocusedObservations(),
      ...generateTaxonFocusedObservations()
    ]
    accomplishments.enableTestMode(testData)
  } else {
    await accomplishments.initialize()
  }
})

/**
 * Refresh data
 */
async function refresh() {
  await accomplishments.loadAccomplishments(true)
}

/**
 * Handle user selection change
 */
async function onUserChange(userId) {
  await accomplishments.selectUser(userId)
}

/**
 * Handle item selection - toggle board mastery drill-down for lessons
 */
const selectedLesson = ref(null)

function onItemSelect(item) {
  // Only drill-down for lessons tab (lessons have .lesson property)
  if (accomplishments.activeTab.value === 'lessons' && item.lesson) {
    if (selectedLesson.value?.lesson === item.lesson) {
      selectedLesson.value = null
    } else {
      selectedLesson.value = item
    }
  }
}

/**
 * Count of unique items in current view
 */
const uniqueItemCount = computed(() => {
  return accomplishments.activeTab.value === 'lessons'
    ? accomplishments.filteredLessonStats.value.length
    : accomplishments.filteredTaxonStats.value.length
})
</script>

<style scoped>
.accomplishments-view {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.view-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.user-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #f8f8f8;
  border-bottom: 1px solid #eee;
}

.user-selector label {
  font-size: 14px;
  color: #666;
}

.user-selector select {
  flex: 1;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.loading-state,
.error-state,
.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  color: #d32f2f;
}

.error-state button {
  margin-top: 16px;
  padding: 8px 16px;
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state h3 {
  color: #666;
  margin-bottom: 8px;
}

.empty-state p {
  color: #999;
  margin-bottom: 20px;
}

.view-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.summary-stats {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.stat-card {
  flex: 1;
  background: #f5f5f5;
  padding: 12px 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  flex-shrink: 0;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: #667eea;
  color: white;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.filter-checkbox input {
  cursor: pointer;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.view-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}

.primary-btn,
.secondary-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.secondary-btn {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.secondary-btn:hover {
  background: #f5f7ff;
}

.test-mode-banner {
  position: absolute;
  top: 50px;
  left: 0;
  right: 0;
  background: #ff9800;
  color: white;
  text-align: center;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
}

/* Board mastery drill-down */
.board-drill-down {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.drill-down-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.drill-down-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-drill-down {
  background: none;
  border: none;
  font-size: 22px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-drill-down:hover {
  color: #333;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .accomplishments-view {
    max-height: 100vh;
    border-radius: 0;
  }

  .summary-stats {
    flex-direction: column;
    gap: 8px;
  }

  .stat-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;
  }

  .stat-value {
    font-size: 20px;
  }

  .controls-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .tabs {
    justify-content: center;
  }
}
</style>

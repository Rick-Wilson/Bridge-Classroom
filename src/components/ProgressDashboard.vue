<template>
  <div class="progress-dashboard">
    <header class="dashboard-header">
      <h2>Your Progress</h2>
      <button class="close-btn" @click="$emit('close')">&times;</button>
    </header>

    <!-- Loading state -->
    <div v-if="progress.isLoading.value" class="loading">
      <div class="spinner"></div>
      <p>Loading your progress...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="progress.hasError.value" class="error-state">
      <p>Failed to load progress: {{ progress.error.value }}</p>
      <button @click="refresh">Try Again</button>
    </div>

    <!-- No data state -->
    <div v-else-if="!progress.hasData.value" class="empty-state">
      <h3>No Practice Data Yet</h3>
      <p>Complete some practice deals to see your progress here!</p>
      <button class="primary-btn" @click="$emit('close')">Start Practicing</button>
    </div>

    <!-- Dashboard content -->
    <div v-else class="dashboard-content">
      <!-- Overall Stats -->
      <section class="stats-section">
        <h3>Overall Stats</h3>
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-value">{{ progress.totalObservations.value }}</div>
            <div class="stat-label">Total Bids</div>
          </div>
          <div class="stat-card accuracy">
            <div class="stat-value">{{ progress.overallAccuracy.value }}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
          <div class="stat-card streak">
            <div class="stat-value">{{ progress.streak.value }}</div>
            <div class="stat-label">Day Streak</div>
          </div>
        </div>
      </section>

      <!-- Today's Progress -->
      <section class="stats-section">
        <h3>Today</h3>
        <div class="period-stats">
          <div class="period-stat">
            <span class="value">{{ progress.todayStats.value.total }}</span>
            <span class="label">bids</span>
          </div>
          <div class="period-stat correct">
            <span class="value">{{ progress.todayStats.value.correct }}</span>
            <span class="label">correct</span>
          </div>
          <div class="period-stat incorrect">
            <span class="value">{{ progress.todayStats.value.incorrect }}</span>
            <span class="label">wrong</span>
          </div>
          <div class="period-stat" v-if="progress.todayStats.value.total > 0">
            <span class="value">{{ progress.todayStats.value.accuracy }}%</span>
            <span class="label">accuracy</span>
          </div>
        </div>
      </section>

      <!-- This Week -->
      <section class="stats-section">
        <h3>This Week</h3>
        <div class="period-stats">
          <div class="period-stat">
            <span class="value">{{ progress.weekStats.value.total }}</span>
            <span class="label">bids</span>
          </div>
          <div class="period-stat correct">
            <span class="value">{{ progress.weekStats.value.correct }}</span>
            <span class="label">correct</span>
          </div>
          <div class="period-stat incorrect">
            <span class="value">{{ progress.weekStats.value.incorrect }}</span>
            <span class="label">wrong</span>
          </div>
          <div class="period-stat" v-if="progress.weekStats.value.total > 0">
            <span class="value">{{ progress.weekStats.value.accuracy }}%</span>
            <span class="label">accuracy</span>
          </div>
        </div>
      </section>

      <!-- Skill Breakdown -->
      <section class="stats-section" v-if="Object.keys(progress.skillStats.value).length > 0">
        <h3>Skills</h3>
        <SkillChart :stats="progress.skillStats.value" />
      </section>

      <!-- Recent Practice -->
      <section class="stats-section" v-if="progress.sessions.value.length > 0">
        <h3>Recent Sessions</h3>
        <PracticeHistory
          :sessions="progress.sessions.value.slice(0, 5)"
          :observations="progress.recentObservations.value"
        />
      </section>

      <!-- Actions -->
      <div class="dashboard-actions">
        <button class="secondary-btn" @click="refresh">
          Refresh Data
        </button>
        <button class="primary-btn" @click="$emit('close')">
          Continue Practicing
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useStudentProgress } from '../composables/useStudentProgress.js'
import SkillChart from './SkillChart.vue'
import PracticeHistory from './PracticeHistory.vue'

const emit = defineEmits(['close'])

const progress = useStudentProgress()

onMounted(async () => {
  await progress.fetchProgress()
})

async function refresh() {
  await progress.fetchProgress(true) // Force refresh
}
</script>

<style scoped>
.progress-dashboard {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.dashboard-header h2 {
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

.dashboard-content {
  padding: 20px;
}

.loading,
.error-state,
.empty-state {
  padding: 40px 20px;
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

.stats-section {
  margin-bottom: 24px;
}

.stats-section h3 {
  font-size: 14px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.stat-cards {
  display: flex;
  gap: 12px;
}

.stat-card {
  flex: 1;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-card.accuracy {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.stat-card.streak {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.period-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.period-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.period-stat .value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.period-stat .label {
  font-size: 13px;
  color: #666;
}

.period-stat.correct .value {
  color: #4caf50;
}

.period-stat.incorrect .value {
  color: #d32f2f;
}

.dashboard-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
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
</style>

<template>
  <div class="skill-chart">
    <div
      v-for="(data, skill) in sortedStats"
      :key="skill"
      class="skill-row"
    >
      <div class="skill-info">
        <span class="skill-name">{{ formatSkillName(skill) }}</span>
        <span class="skill-count">{{ data.total }} bids</span>
      </div>
      <div class="skill-bar-container">
        <div
          class="skill-bar"
          :style="{ width: data.accuracy + '%' }"
          :class="getAccuracyClass(data.accuracy)"
        ></div>
        <span class="skill-accuracy">{{ data.accuracy }}%</span>
      </div>
      <div class="skill-details">
        <span class="correct">{{ data.correct }}</span>
        <span class="separator">/</span>
        <span class="incorrect">{{ data.incorrect }}</span>
      </div>
    </div>

    <div v-if="Object.keys(stats).length === 0" class="no-skills">
      No skill data available yet.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    required: true
  }
})

// Sort by total attempts, descending
const sortedStats = computed(() => {
  const entries = Object.entries(props.stats)
  entries.sort((a, b) => b[1].total - a[1].total)
  return Object.fromEntries(entries)
})

function formatSkillName(skill) {
  // Convert 'bidding/stayman' to 'Stayman'
  // or 'unknown/unknown' to 'General Practice'
  if (skill === 'unknown/unknown' || skill === 'unknown') {
    return 'General Practice'
  }

  const parts = skill.split('/')
  const name = parts[parts.length - 1]

  // Convert snake_case to Title Case
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getAccuracyClass(accuracy) {
  if (accuracy >= 80) return 'excellent'
  if (accuracy >= 60) return 'good'
  if (accuracy >= 40) return 'fair'
  return 'needs-work'
}
</script>

<style scoped>
.skill-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skill-info {
  flex: 0 0 140px;
  display: flex;
  flex-direction: column;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-count {
  font-size: 11px;
  color: #999;
}

.skill-bar-container {
  flex: 1;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  min-width: 100px;
}

.skill-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease;
}

.skill-bar.excellent {
  background: linear-gradient(90deg, #4caf50 0%, #81c784 100%);
}

.skill-bar.good {
  background: linear-gradient(90deg, #8bc34a 0%, #aed581 100%);
}

.skill-bar.fair {
  background: linear-gradient(90deg, #ffc107 0%, #ffca28 100%);
}

.skill-bar.needs-work {
  background: linear-gradient(90deg, #ff9800 0%, #ffb74d 100%);
}

.skill-accuracy {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.skill-details {
  flex: 0 0 60px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  font-size: 12px;
}

.skill-details .correct {
  color: #4caf50;
  font-weight: 500;
}

.skill-details .separator {
  color: #ccc;
}

.skill-details .incorrect {
  color: #d32f2f;
  font-weight: 500;
}

.no-skills {
  text-align: center;
  color: #999;
  padding: 20px;
  font-size: 14px;
}

@media (max-width: 500px) {
  .skill-row {
    flex-wrap: wrap;
  }

  .skill-info {
    flex: 0 0 100%;
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .skill-bar-container {
    flex: 1;
  }

  .skill-details {
    flex: 0 0 50px;
  }
}
</style>

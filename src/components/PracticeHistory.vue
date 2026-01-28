<template>
  <div class="practice-history">
    <div
      v-for="session in sessions"
      :key="session.id"
      class="session-card"
      :class="{ expanded: expandedSession === session.id }"
      @click="toggleSession(session.id)"
    >
      <div class="session-header">
        <div class="session-date">
          <span class="date">{{ formatDate(session.startTime) }}</span>
          <span class="time">{{ formatTime(session.startTime) }}</span>
        </div>
        <div class="session-stats">
          <span class="stat correct">{{ session.correct }}</span>
          <span class="stat incorrect">{{ session.incorrect }}</span>
          <span class="stat accuracy">{{ session.accuracy }}%</span>
        </div>
        <span class="expand-icon">{{ expandedSession === session.id ? '−' : '+' }}</span>
      </div>

      <div v-if="expandedSession === session.id" class="session-details">
        <div
          v-for="obs in getSessionObservations(session)"
          :key="obs.id"
          class="observation-row"
          :class="{ correct: obs.correct, incorrect: !obs.correct }"
        >
          <span class="obs-indicator">{{ obs.correct ? '✓' : '✗' }}</span>
          <span class="obs-deal">Deal #{{ obs.deal_number || '?' }}</span>
          <span class="obs-skill">{{ formatSkillName(obs.skill_path) }}</span>
          <div v-if="obs.expected_bid && obs.student_bid" class="obs-bids">
            <span v-if="!obs.correct" class="bid wrong">{{ obs.student_bid }}</span>
            <span class="bid expected">{{ obs.expected_bid }}</span>
          </div>
        </div>

        <div v-if="getSessionObservations(session).length === 0" class="no-details">
          No detailed bid information available.
        </div>
      </div>
    </div>

    <div v-if="sessions.length === 0" class="no-sessions">
      No practice sessions recorded yet.
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getSkillFromPath } from '../utils/bakerBridgeTaxonomy.js'

const props = defineProps({
  sessions: {
    type: Array,
    required: true
  },
  observations: {
    type: Array,
    default: () => []
  }
})

const expandedSession = ref(null)

function toggleSession(sessionId) {
  if (expandedSession.value === sessionId) {
    expandedSession.value = null
  } else {
    expandedSession.value = sessionId
  }
}

function getSessionObservations(session) {
  return props.observations.filter(obs => obs.session_id === session.id)
}

function formatDate(isoString) {
  const date = new Date(isoString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

function formatTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatSkillName(skill) {
  if (!skill || skill === 'unknown/unknown' || skill === 'unknown') {
    return ''
  }

  // Use taxonomy for proper skill names
  const skillInfo = getSkillFromPath(skill)
  return skillInfo.name
}
</script>

<style scoped>
.practice-history {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-card {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.session-card:hover {
  background: #f0f1f3;
}

.session-card.expanded {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.session-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
}

.session-date {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.session-date .date {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.session-date .time {
  font-size: 12px;
  color: #999;
}

.session-stats {
  display: flex;
  gap: 12px;
}

.session-stats .stat {
  font-size: 14px;
  font-weight: 500;
}

.session-stats .stat.correct {
  color: #4caf50;
}

.session-stats .stat.correct::before {
  content: '✓ ';
}

.session-stats .stat.incorrect {
  color: #d32f2f;
}

.session-stats .stat.incorrect::before {
  content: '✗ ';
}

.session-stats .stat.accuracy {
  color: #666;
  min-width: 40px;
  text-align: right;
}

.expand-icon {
  font-size: 18px;
  color: #999;
  width: 20px;
  text-align: center;
}

.session-details {
  border-top: 1px solid #eee;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.observation-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 13px;
}

.observation-row.correct {
  border-left: 3px solid #4caf50;
}

.observation-row.incorrect {
  border-left: 3px solid #d32f2f;
}

.obs-indicator {
  font-size: 14px;
  width: 20px;
}

.observation-row.correct .obs-indicator {
  color: #4caf50;
}

.observation-row.incorrect .obs-indicator {
  color: #d32f2f;
}

.obs-deal {
  color: #666;
  min-width: 60px;
}

.obs-skill {
  flex: 1;
  color: #333;
}

.obs-bids {
  display: flex;
  gap: 8px;
}

.bid {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.bid.wrong {
  background: #ffebee;
  color: #c62828;
  text-decoration: line-through;
}

.bid.expected {
  background: #e8f5e9;
  color: #2e7d32;
}

.no-details,
.no-sessions {
  text-align: center;
  color: #999;
  padding: 16px;
  font-size: 13px;
}
</style>

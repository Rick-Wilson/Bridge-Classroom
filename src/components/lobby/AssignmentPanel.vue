<template>
  <div class="assignment-panel">
    <h3 class="section-title">My Assignments</h3>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading assignments...</p>
    </div>

    <div v-else-if="assignments.length === 0" class="empty-state">
      <p class="empty-title">No assignments yet</p>
      <p class="empty-desc">Your teacher will assign exercises here.</p>
    </div>

    <div v-else class="assignment-cards">
      <div
        v-for="a in assignments"
        :key="a.id"
        class="assignment-card"
        :class="statusClass(a)"
        @click="$emit('select-assignment', a)"
      >
        <div class="card-header">
          <span class="exercise-name">{{ a.exercise_name }}</span>
          <span class="status-badge" :class="statusClass(a)">{{ statusLabel(a) }}</span>
        </div>

        <div class="card-meta">
          <span v-if="a.classroom_name" class="meta-item">{{ a.classroom_name }}</span>
          <span v-if="a.due_at" class="meta-item" :class="dueClass(a)">{{ dueText(a) }}</span>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: progressPercent(a) + '%' }"
              :class="statusClass(a)"
            ></div>
          </div>
          <span class="progress-label">
            {{ a.attempted_boards }} / {{ a.total_boards }} boards
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  assignments: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select-assignment'])

function progressPercent(assignment) {
  if (!assignment.total_boards) return 0
  return Math.round((assignment.attempted_boards / assignment.total_boards) * 100)
}

function statusClass(assignment) {
  if (assignment.attempted_boards >= assignment.total_boards && assignment.total_boards > 0) {
    return 'complete'
  }
  if (assignment.due_at && new Date(assignment.due_at) < new Date() && assignment.attempted_boards < assignment.total_boards) {
    return 'overdue'
  }
  if (assignment.attempted_boards > 0) {
    return 'in-progress'
  }
  return 'new'
}

function statusLabel(assignment) {
  const cls = statusClass(assignment)
  if (cls === 'complete') return 'Complete'
  if (cls === 'overdue') return 'Overdue'
  if (cls === 'in-progress') return 'In Progress'
  return 'New'
}

function isComplete(assignment) {
  return assignment.attempted_boards >= assignment.total_boards && assignment.total_boards > 0
}

function dueText(assignment) {
  if (!assignment.due_at) return null
  const due = new Date(assignment.due_at)
  const now = new Date()
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return isComplete(assignment) ? 'Completed' : 'Overdue'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  return `Due in ${diffDays} days`
}

function dueClass(assignment) {
  if (!assignment.due_at) return ''
  if (isComplete(assignment)) return ''
  const due = new Date(assignment.due_at)
  const now = new Date()
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 1) return 'urgent'
  if (diffDays <= 3) return 'soon'
  return ''
}
</script>

<style scoped>
.assignment-panel {
  margin-bottom: 32px;
}

.section-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 20px;
  color: var(--green-dark, #2d6a4f);
  margin: 0 0 16px 0;
}

.loading-state,
.empty-state {
  padding: 32px 20px;
  text-align: center;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-title {
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 4px;
}

.empty-desc {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
}

.assignment-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assignment-card {
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.assignment-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.exercise-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary, #1a1a1a);
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-badge.new {
  background: #e3f2fd;
  color: #1565c0;
}

.status-badge.in-progress {
  background: #fff8e1;
  color: #f57f17;
}

.status-badge.complete {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.overdue {
  background: #ffebee;
  color: #c62828;
}

.card-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 10px;
}

.meta-item.overdue {
  color: #c62828;
  font-weight: 500;
}

.meta-item.urgent {
  color: #e65100;
  font-weight: 500;
}

.meta-item.soon {
  color: #f57f17;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.new {
  background: #90caf9;
}

.progress-fill.in-progress {
  background: #ffb74d;
}

.progress-fill.complete {
  background: #66bb6a;
}

.progress-fill.overdue {
  background: #ef5350;
}

.progress-label {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
}
</style>

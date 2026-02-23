<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-body">
        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading assignment details...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="error-state">
          <p class="error-text">{{ error }}</p>
          <button class="btn btn-secondary" @click="$emit('close')">Close</button>
        </div>

        <!-- Content -->
        <template v-else-if="assignment">
          <div class="modal-header">
            <h2>{{ assignment.exercise_name }}</h2>
            <button class="close-btn" @click="$emit('close')" aria-label="Close">&times;</button>
          </div>

          <div class="assignment-meta">
            <span class="meta-item">{{ assignment.total_boards }} {{ assignment.total_boards === 1 ? 'board' : 'boards' }}</span>
            <span v-if="assignment.due_at" class="meta-item">Due {{ formatDate(assignment.due_at) }}</span>
            <span v-if="assignment.classroom_name" class="meta-item">{{ assignment.classroom_name }}</span>
          </div>

          <!-- Student progress table -->
          <div v-if="assignment.student_progress && assignment.student_progress.length" class="progress-table-wrapper">
            <table class="progress-table">
              <thead>
                <tr>
                  <th class="col-name">Student</th>
                  <th class="col-progress">Progress</th>
                  <th class="col-correct">Correct</th>
                  <th class="col-accuracy">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in assignment.student_progress" :key="s.student_id">
                  <td class="col-name">{{ s.first_name }} {{ s.last_name }}</td>
                  <td class="col-progress">
                    <div class="progress-cell">
                      <div class="progress-bar-track">
                        <div class="progress-bar-fill" :style="{ width: progressPct(s) }" :class="progressClass(s)"></div>
                      </div>
                      <span class="progress-label">{{ s.attempted_boards }}/{{ s.total_boards }}</span>
                    </div>
                  </td>
                  <td class="col-correct">{{ s.correct_boards }}/{{ s.total_boards }}</td>
                  <td class="col-accuracy" :class="accuracyClass(s)">{{ accuracyPct(s) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- No students -->
          <div v-else class="empty-state">
            <p>No students assigned yet.</p>
          </div>

          <!-- Summary -->
          <div v-if="summary" class="summary-row">
            <span>{{ summary.completed }}/{{ summary.total }} students completed</span>
            <span v-if="summary.avgAccuracy !== null">{{ summary.avgAccuracy }}% avg accuracy</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAssignments } from '../../composables/useAssignments.js'

const props = defineProps({
  assignmentId: { type: String, required: true }
})

defineEmits(['close'])

const assignments = useAssignments()
const loading = ref(true)
const error = ref(null)

const assignment = computed(() => assignments.currentAssignment.value)

const summary = computed(() => {
  const progress = assignment.value?.student_progress
  if (!progress || progress.length === 0) return null

  const total = progress.length
  const completed = progress.filter(s => s.attempted_boards >= s.total_boards).length
  const studentsWithAttempts = progress.filter(s => s.attempted_boards > 0)
  let avgAccuracy = null
  if (studentsWithAttempts.length > 0) {
    const sum = studentsWithAttempts.reduce((acc, s) => {
      return acc + (s.correct_boards / s.attempted_boards) * 100
    }, 0)
    avgAccuracy = Math.round(sum / studentsWithAttempts.length)
  }

  return { total, completed, avgAccuracy }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function progressPct(student) {
  if (!student.total_boards) return '0%'
  return Math.round((student.attempted_boards / student.total_boards) * 100) + '%'
}

function progressClass(student) {
  if (student.attempted_boards >= student.total_boards) return 'complete'
  if (student.attempted_boards > 0) return 'partial'
  return ''
}

function accuracyPct(student) {
  if (student.attempted_boards === 0) return '\u2014'
  return Math.round((student.correct_boards / student.attempted_boards) * 100) + '%'
}

function accuracyClass(student) {
  if (student.attempted_boards === 0) return ''
  const pct = (student.correct_boards / student.attempted_boards) * 100
  if (pct >= 80) return 'accuracy-high'
  if (pct >= 50) return 'accuracy-mid'
  return 'accuracy-low'
}

onMounted(async () => {
  const result = await assignments.fetchAssignmentDetail(props.assignmentId)
  if (!result?.success) {
    error.value = assignments.error.value || 'Failed to load assignment details'
  }
  loading.value = false
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: var(--radius-card, 10px);
  max-width: 600px;
  width: 100%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.modal-body {
  padding: 32px;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.modal-header h2 {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 22px;
  color: var(--green-dark, #2d6a4f);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary, #1a1a1a);
}

.assignment-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
}

.meta-item {
  white-space: nowrap;
}

/* Progress table */
.progress-table-wrapper {
  overflow-x: auto;
}

.progress-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.progress-table th {
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #9ca3af);
  padding: 0 12px 8px 0;
  border-bottom: 1px solid var(--card-border, #e0ddd7);
}

.progress-table td {
  padding: 10px 12px 10px 0;
  border-bottom: 1px solid #f3f4f6;
  color: var(--text-primary, #1a1a1a);
}

.col-name {
  min-width: 140px;
}

.col-progress {
  min-width: 150px;
}

.col-correct,
.col-accuracy {
  white-space: nowrap;
  text-align: center;
}

.progress-table th.col-correct,
.progress-table th.col-accuracy {
  text-align: center;
}

/* Progress bar within table cell */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-track {
  flex: 1;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: #d1d5db;
  transition: width 0.3s ease;
}

.progress-bar-fill.partial {
  background: #fbbf24;
}

.progress-bar-fill.complete {
  background: var(--green-mid, #40916c);
}

.progress-label {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  white-space: nowrap;
  min-width: 30px;
}

/* Accuracy colors */
.accuracy-high {
  color: var(--green-mid, #40916c);
  font-weight: 500;
}

.accuracy-mid {
  color: #d97706;
  font-weight: 500;
}

.accuracy-low {
  color: var(--red, #ef4444);
  font-weight: 500;
}

/* Summary */
.summary-row {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--card-border, #e0ddd7);
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}

/* States */
.loading-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #2d6a4f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--text-muted, #9ca3af);
}

.error-state {
  text-align: center;
  padding: 24px;
}

.error-text {
  color: var(--red, #ef4444);
  margin-bottom: 16px;
}

.btn {
  padding: 10px 20px;
  border-radius: var(--radius-button, 6px);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.btn-secondary {
  background: #f3f4f6;
  color: var(--text-primary, #1a1a1a);
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>

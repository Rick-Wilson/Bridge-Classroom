<template>
  <div class="assignments-tab">
    <div class="actions-row">
      <button class="action-btn assign" @click="showAssignModal = true">
        + New Assignment
      </button>
    </div>

    <div v-if="loading && !assignments.length" class="loading-state">
      <div class="spinner"></div>
      <p>Loading assignments...</p>
    </div>

    <div v-else-if="!assignments.length" class="empty-state">
      <p class="empty-title">No open assignments</p>
      <p class="empty-desc">Click <strong>+ New Assignment</strong> to assign an exercise to a classroom.</p>
    </div>

    <div v-else class="assignment-list">
      <div
        v-for="a in assignments"
        :key="a.id"
        class="assignment-row"
        @click="selectedAssignmentId = a.id"
      >
        <div class="assignment-main">
          <span class="assignment-name">{{ a.exercise_name }}</span>
          <span v-if="a.classroom_name" class="assignment-classroom">{{ a.classroom_name }}</span>
        </div>
        <div class="assignment-meta">
          <span class="assignment-boards">{{ a.total_boards }} {{ a.total_boards === 1 ? 'board' : 'boards' }}</span>
          <span v-if="a.due_at" class="assignment-due" :class="{ overdue: isOverdue(a) }">
            Due {{ formatDate(a.due_at) }}
          </span>
          <span v-else class="assignment-due no-due">No due date</span>
        </div>
        <span class="view-arrow">&#x203A;</span>
      </div>
    </div>

    <AssignmentCreateModal
      v-if="showAssignModal"
      @close="showAssignModal = false"
      @assignment-created="handleAssignmentCreated"
    />

    <AssignmentDetailModal
      v-if="selectedAssignmentId"
      :assignment-id="selectedAssignmentId"
      @close="selectedAssignmentId = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../../composables/useUserStore.js'
import { useAssignments } from '../../../composables/useAssignments.js'
import AssignmentCreateModal from '../AssignmentCreateModal.vue'
import AssignmentDetailModal from '../AssignmentDetailModal.vue'

const userStore = useUserStore()
const assignmentStore = useAssignments()

const showAssignModal = ref(false)
const selectedAssignmentId = ref(null)

const assignments = computed(() => assignmentStore.teacherAssignments.value)
const loading = computed(() => assignmentStore.loading.value)

function isOverdue(a) {
  if (!a.due_at) return false
  return new Date(a.due_at) < new Date()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function loadAssignments() {
  const user = userStore.currentUser.value
  if (user) {
    assignmentStore.fetchTeacherAssignments(user.id)
  }
}

function handleAssignmentCreated() {
  showAssignModal.value = false
  loadAssignments()
}

onMounted(loadAssignments)
</script>

<style scoped>
.assignments-tab {
  padding: 8px 0;
}

.actions-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 20px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.action-btn.assign {
  background: #e3f2fd;
  color: #1565c0;
}

.action-btn.assign:hover {
  background: #bbdefb;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 36px;
  height: 36px;
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
  padding: 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px dashed var(--card-border, #e0ddd7);
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

.assignment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assignment-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: white;
  border: 1px solid var(--card-border, #e0ddd7);
  border-radius: var(--radius-card, 10px);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.assignment-row:hover {
  background: #f9fafb;
  border-color: var(--green-mid, #40916c);
}

.assignment-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.assignment-name {
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
}

.assignment-classroom {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}

.assignment-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
}

.assignment-due.overdue {
  color: #c62828;
  font-weight: 500;
}

.assignment-due.no-due {
  color: #9ca3af;
  font-style: italic;
}

.view-arrow {
  font-size: 20px;
  color: #c0c5cc;
}
</style>

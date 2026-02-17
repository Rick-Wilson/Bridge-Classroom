<template>
  <div class="teacher-student-list">
    <header class="teacher-header">
      <h2>My Students</h2>
      <div class="header-actions">
        <button class="anon-btn" :class="{ active: anon.isAnonymized.value }" @click="anon.toggleAnonymize()">
          {{ anon.isAnonymized.value ? 'Clear' : 'Anon' }}
        </button>
        <button class="secondary-btn" @click="refresh">Refresh</button>
        <button class="secondary-btn" @click="$emit('close')">Back</button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="teacherRole.loading.value" class="loading-state">
      <div class="spinner"></div>
      <p>Loading student data...</p>
    </div>

    <!-- Error -->
    <div v-else-if="teacherRole.error.value" class="error-state">
      <p>Failed to load: {{ teacherRole.error.value }}</p>
      <button @click="refresh">Try Again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="teacherRole.students.value.length === 0" class="empty-state">
      <h3>No Students Yet</h3>
      <p>Students will appear here once they register and grant you access.</p>
    </div>

    <!-- Student table -->
    <div v-else class="student-table-wrap">
      <table class="student-table">
        <thead>
          <tr>
            <th class="col-name">Student</th>
            <th class="col-mastery">Mastery</th>
            <th class="col-active">Last Active</th>
            <th class="col-lessons">Recent Lessons</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="student in sortedStudents"
            :key="student.id"
            class="student-row"
            @click="$emit('select-student', student.id, studentName(student))"
          >
            <td class="col-name">
              <div class="student-name-cell">
                <div class="avatar">{{ initials(student) }}</div>
                <span>{{ studentName(student) }}</span>
              </div>
            </td>
            <td class="col-mastery">
              <div class="mastery-pills">
                <span v-if="summaries[student.id]?.green" class="pill pill-green">{{ summaries[student.id].green }}</span>
                <span v-if="summaries[student.id]?.orange" class="pill pill-orange">{{ summaries[student.id].orange }}</span>
                <span v-if="summaries[student.id]?.yellow" class="pill pill-yellow">{{ summaries[student.id].yellow }}</span>
                <span v-if="summaries[student.id]?.red" class="pill pill-red">{{ summaries[student.id].red }}</span>
                <span v-if="!summaries[student.id]?.total" class="no-data-label">No data</span>
              </div>
            </td>
            <td class="col-active">
              {{ teacherRole.formatTimeSince(summaries[student.id]?.lastObservationTime) }}
            </td>
            <td class="col-lessons">
              <div class="recent-lessons">
                <span
                  v-for="(lesson, i) in recentLessons[student.id]"
                  :key="i"
                  class="lesson-tag"
                >{{ lesson }}</span>
                <span v-if="!recentLessons[student.id]?.length" class="no-data-label">-</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useTeacherRole } from '../composables/useTeacherRole.js'
import { useAnonymizer } from '../composables/useAnonymizer.js'

const emit = defineEmits(['close', 'select-student'])

const teacherRole = useTeacherRole()
const anon = useAnonymizer()

onMounted(async () => {
  await teacherRole.loadAllStudentSummaries()
})

async function refresh() {
  // Clear cache timestamps to force refetch
  teacherRole.studentObservations.value = {}
  await teacherRole.loadAllStudentSummaries()
}

const sortedStudents = computed(() => {
  return [...teacherRole.students.value].sort((a, b) => {
    // Sort by most recent activity (most recent first), then alphabetically
    const aTime = summaries.value[a.id]?.lastObservationTime || ''
    const bTime = summaries.value[b.id]?.lastObservationTime || ''
    if (bTime !== aTime) return bTime.localeCompare(aTime)
    return studentName(a).localeCompare(studentName(b))
  })
})

const summaries = computed(() => {
  const result = {}
  for (const student of teacherRole.students.value) {
    result[student.id] = teacherRole.getStudentMasterySummary(student.id)
  }
  return result
})

const recentLessons = computed(() => {
  const result = {}
  for (const student of teacherRole.students.value) {
    result[student.id] = teacherRole.getStudentRecentLessons(student.id)
  }
  return result
})

function studentName(student) {
  return anon.displayFullName(student)
}

function initials(student) {
  return anon.displayInitials(student)
}
</script>

<style scoped>
.teacher-student-list {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.teacher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.teacher-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
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
  to { transform: rotate(360deg); }
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
}

/* Table */
.student-table-wrap {
  overflow-x: auto;
}

.student-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.student-table thead th {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 2px solid #eee;
  font-size: 12px;
  text-transform: uppercase;
  color: #999;
  letter-spacing: 0.3px;
  font-weight: 600;
}

.student-row {
  cursor: pointer;
  transition: background 0.15s;
}

.student-row:hover {
  background: #f5f7ff;
}

.student-row td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.col-name { min-width: 160px; }
.col-mastery { min-width: 140px; }
.col-active { min-width: 100px; white-space: nowrap; color: #666; font-size: 13px; }
.col-lessons { min-width: 180px; }

/* Student name cell */
.student-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

/* Mastery pills */
.mastery-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.pill-green { background: #4caf50; }
.pill-orange { background: #ff9800; }
.pill-yellow { background: #ffeb3b; color: #333; }
.pill-red { background: #ef5350; }

.no-data-label {
  font-size: 12px;
  color: #ccc;
}

/* Recent lessons */
.recent-lessons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.lesson-tag {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 10px;
  font-size: 12px;
  color: #555;
  white-space: nowrap;
}

/* Buttons */
.anon-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: white;
  color: #666;
  border: 1px solid #ddd;
  transition: all 0.2s;
}

.anon-btn.active {
  background: #fff3e0;
  color: #e65100;
  border-color: #ffcc80;
}

.anon-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.anon-btn.active:hover {
  background: #ffe0b2;
}

.secondary-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
  transition: all 0.2s;
}

.secondary-btn:hover {
  background: #f5f7ff;
}

/* Responsive */
@media (max-width: 600px) {
  .teacher-student-list {
    padding: 0 12px;
  }

  .teacher-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .col-lessons {
    display: none;
  }
}
</style>

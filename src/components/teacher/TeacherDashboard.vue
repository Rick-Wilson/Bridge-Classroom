<template>
  <div class="teacher-dashboard">
    <!-- Login view -->
    <TeacherLogin
      v-if="!teacherAuth.isAuthenticated.value"
      @authenticated="handleAuthenticated"
      @back="$emit('close')"
    />

    <!-- Dashboard views -->
    <template v-else>
      <!-- Classroom list (main view) -->
      <ClassroomList
        v-if="currentView === 'classrooms'"
        @selectClassroom="handleSelectClassroom"
        @selectStudent="handleSelectStudent"
        @logout="handleLogout"
      />

      <!-- Classroom detail -->
      <ClassroomDetail
        v-else-if="currentView === 'classroom'"
        :classroomId="selectedClassroomId"
        @back="currentView = 'classrooms'"
        @selectStudent="handleSelectStudent"
      />

      <!-- Student detail -->
      <StudentDetail
        v-else-if="currentView === 'student'"
        :studentId="selectedStudentId"
        @back="handleBackFromStudent"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTeacherAuth } from '../../composables/useTeacherAuth.js'
import { useTeacherDashboard } from '../../composables/useTeacherDashboard.js'
import TeacherLogin from './TeacherLogin.vue'
import ClassroomList from './ClassroomList.vue'
import ClassroomDetail from './ClassroomDetail.vue'
import StudentDetail from './StudentDetail.vue'

defineEmits(['close'])

const teacherAuth = useTeacherAuth()
const dashboard = useTeacherDashboard()

// Navigation state
const currentView = ref('classrooms') // 'classrooms' | 'classroom' | 'student'
const selectedClassroomId = ref(null)
const selectedStudentId = ref(null)
const previousView = ref(null)

onMounted(async () => {
  await teacherAuth.initialize()
})

function handleAuthenticated() {
  currentView.value = 'classrooms'
  dashboard.loadDashboard()
}

function handleLogout() {
  currentView.value = 'classrooms'
  selectedClassroomId.value = null
  selectedStudentId.value = null
}

function handleSelectClassroom(classroomId) {
  selectedClassroomId.value = classroomId
  previousView.value = 'classrooms'
  currentView.value = 'classroom'
}

function handleSelectStudent(studentId) {
  selectedStudentId.value = studentId
  previousView.value = currentView.value
  currentView.value = 'student'
}

function handleBackFromStudent() {
  if (previousView.value === 'classroom') {
    currentView.value = 'classroom'
  } else {
    currentView.value = 'classrooms'
  }
}
</script>

<style scoped>
.teacher-dashboard {
  min-height: 100vh;
  background: #f5f7fa;
}
</style>

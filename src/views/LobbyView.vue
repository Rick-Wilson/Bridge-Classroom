<template>
  <div class="lobby-view">
    <!-- Admin sees teacher dashboard by default, with toggle to admin panel -->
    <AdminLobby v-if="showAdminPanel" @back="showAdminPanel = false" />
    <TeacherLobby v-else-if="userRole === 'admin' || userRole === 'teacher'"
      :is-admin="userRole === 'admin'"
      @select-collection="$emit('select-collection', $event)"
      @show-admin="showAdminPanel = true"
      @load-file="$emit('load-file', $event)"
    />
    <StudentLobby v-else-if="hasAssignments || hasClassrooms"
      @select-collection="$emit('select-collection', $event)"
      @select-assignment="$emit('select-assignment', $event)"
      @load-file="$emit('load-file', $event)"
    />
    <CasualLobby v-else
      @select-collection="$emit('select-collection', $event)"
      @show-become-teacher="$emit('show-become-teacher')"
      @load-file="$emit('load-file', $event)"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../composables/useUserStore.js'
import { useAssignments } from '../composables/useAssignments.js'
import CasualLobby from '../components/lobby/CasualLobby.vue'
import StudentLobby from '../components/lobby/StudentLobby.vue'
import TeacherLobby from '../components/lobby/TeacherLobby.vue'
import AdminLobby from '../components/lobby/AdminLobby.vue'

defineEmits(['select-collection', 'select-assignment', 'show-become-teacher', 'load-file'])

const userStore = useUserStore()
const assignmentStore = useAssignments()
const showAdminPanel = ref(false)

const userRole = computed(() => {
  const user = userStore.currentUser.value
  return user?.role || 'student'
})

const hasAssignments = computed(() => {
  return assignmentStore.studentAssignments.value.length > 0
})
const hasClassrooms = computed(() => {
  const user = userStore.currentUser.value
  return Array.isArray(user?.classrooms) && user.classrooms.length > 0
})

// Pre-fetch student assignments to determine lobby view
onMounted(() => {
  const user = userStore.currentUser.value
  if (user && userRole.value === 'student') {
    assignmentStore.fetchStudentAssignments(user.id)
  }
})
</script>

<style scoped>
.lobby-view {
  flex: 1;
}
</style>

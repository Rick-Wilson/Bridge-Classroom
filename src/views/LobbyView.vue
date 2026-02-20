<template>
  <div class="lobby-view">
    <!-- Role-based lobby content -->
    <AdminLobby v-if="userRole === 'admin'" />
    <TeacherLobby v-else-if="userRole === 'teacher'"
      @select-collection="$emit('select-collection', $event)"
    />
    <StudentLobby v-else-if="hasAssignments || hasClassrooms"
      @select-collection="$emit('select-collection', $event)"
    />
    <CasualLobby v-else
      @select-collection="$emit('select-collection', $event)"
      @show-become-teacher="$emit('show-become-teacher')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../composables/useUserStore.js'
import CasualLobby from '../components/lobby/CasualLobby.vue'
import StudentLobby from '../components/lobby/StudentLobby.vue'
import TeacherLobby from '../components/lobby/TeacherLobby.vue'
import AdminLobby from '../components/lobby/AdminLobby.vue'

defineEmits(['select-collection', 'show-become-teacher'])

const userStore = useUserStore()

const userRole = computed(() => {
  const user = userStore.currentUser.value
  return user?.role || 'student'
})

// TODO Phase 3: check for assignments
const hasAssignments = computed(() => false)
const hasClassrooms = computed(() => {
  const user = userStore.currentUser.value
  return Array.isArray(user?.classrooms) && user.classrooms.length > 0
})
</script>

<style scoped>
.lobby-view {
  flex: 1;
}
</style>

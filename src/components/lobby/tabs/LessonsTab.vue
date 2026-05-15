<template>
  <div class="lessons-tab">
    <AssignmentPanel
      v-if="isStudent && (hasAssignments || assignmentsLoading)"
      :assignments="assignmentStore.studentAssignments.value"
      :loading="assignmentsLoading"
      @select-assignment="$emit('select-assignment', $event)"
    />
    <RecentLessons
      v-if="isStudent"
      @resume-lesson="$emit('resume-lesson', $event)"
      @show-progress="$emit('show-progress')"
    />
    <CollectionGrid
      @select-collection="$emit('select-collection', $event)"
      @load-file="$emit('load-file', $event)"
    />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useUserStore } from '../../../composables/useUserStore.js'
import { useAssignments } from '../../../composables/useAssignments.js'
import AssignmentPanel from '../AssignmentPanel.vue'
import RecentLessons from '../RecentLessons.vue'
import CollectionGrid from '../CollectionGrid.vue'

defineEmits(['select-collection', 'select-assignment', 'resume-lesson', 'show-progress', 'load-file'])

const userStore = useUserStore()
const assignmentStore = useAssignments()

const isStudent = computed(() => (userStore.currentUser.value?.role || 'student') === 'student')
const hasAssignments = computed(() => assignmentStore.studentAssignments.value.length > 0)
const assignmentsLoading = computed(() => assignmentStore.loading.value)

onMounted(() => {
  const user = userStore.currentUser.value
  if (user && isStudent.value) {
    assignmentStore.fetchStudentAssignments(user.id)
  }
})
</script>

<style scoped>
.lessons-tab {
  padding: 8px 0;
}
</style>

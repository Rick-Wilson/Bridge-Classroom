<template>
  <div class="student-lobby">
    <AssignmentPanel
      v-if="hasAssignments || assignmentsLoading"
      :assignments="assignmentStore.studentAssignments.value"
      :loading="assignmentsLoading"
      @select-assignment="handleSelectAssignment"
    />
    <CollectionGrid @select-collection="$emit('select-collection', $event)" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useUserStore } from '../../composables/useUserStore.js'
import { useAssignments } from '../../composables/useAssignments.js'
import CollectionGrid from './CollectionGrid.vue'
import AssignmentPanel from './AssignmentPanel.vue'

const emit = defineEmits(['select-collection'])

const userStore = useUserStore()
const assignmentStore = useAssignments()

const hasAssignments = computed(() => assignmentStore.studentAssignments.value.length > 0)
const assignmentsLoading = computed(() => assignmentStore.loading.value)

function handleSelectAssignment(assignment) {
  // TODO: navigate to practice the assigned exercise boards
  console.log('Selected assignment:', assignment)
}

onMounted(() => {
  const user = userStore.currentUser.value
  if (user) {
    assignmentStore.fetchStudentAssignments(user.id)
  }
})
</script>

<style scoped>
.student-lobby {
  padding: 20px 0;
}
</style>

<template>
  <div class="students-tab">
    <TeacherStudentList
      v-if="!selectedStudentId"
      embedded
      @select-student="onSelectStudent"
    />
    <TeacherStudentDetail
      v-else
      :studentId="selectedStudentId"
      :studentName="selectedStudentName"
      @back="clearSelection"
      @navigate-to-lesson="(subfolder, boardNumber) => $emit('navigate-to-lesson', subfolder, boardNumber)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TeacherStudentList from '../../TeacherStudentList.vue'
import TeacherStudentDetail from '../../TeacherStudentDetail.vue'

defineEmits(['navigate-to-lesson'])

const selectedStudentId = ref(null)
const selectedStudentName = ref('')

function onSelectStudent(id, name) {
  selectedStudentId.value = id
  selectedStudentName.value = name
}

function clearSelection() {
  selectedStudentId.value = null
  selectedStudentName.value = ''
}
</script>

<style scoped>
.students-tab {
  padding: 8px 0;
}
</style>

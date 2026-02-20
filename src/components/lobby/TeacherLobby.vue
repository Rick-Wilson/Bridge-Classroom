<template>
  <div class="teacher-lobby">
    <div class="welcome-section">
      <h2 class="welcome-title">Welcome back, {{ userName }}</h2>
      <p class="welcome-subtitle">{{ classroomSummary }}</p>
    </div>

    <div class="quick-actions">
      <button class="action-btn create" @click="showCreateModal = true">
        + New Classroom
      </button>
      <a v-if="hasLegacyDashboard" :href="legacyDashboardUrl" class="action-btn legacy">
        Legacy Dashboard
      </a>
    </div>

    <!-- Classroom cards -->
    <div v-if="classroomStore.teacherClassrooms.value.length" class="classrooms-section">
      <h3 class="section-title">My Classrooms</h3>
      <div class="classroom-cards">
        <ClassroomCard
          v-for="classroom in classroomStore.teacherClassrooms.value"
          :key="classroom.id"
          :classroom="classroom"
          :expanded="expandedId === classroom.id"
          @toggle="toggleExpand(classroom.id)"
          @member-removed="refreshClassrooms"
        />
      </div>
    </div>

    <div v-else-if="!classroomStore.loading.value" class="empty-state">
      <p class="empty-title">No classrooms yet</p>
      <p class="empty-desc">Create a classroom and share the invite link with your students.</p>
    </div>

    <!-- Lesson collections (teachers keep student features) -->
    <div class="collections-section">
      <h3 class="section-title">Lesson Collections</h3>
      <CollectionGrid @select-collection="$emit('select-collection', $event)" />
    </div>

    <!-- Create classroom modal -->
    <ClassroomCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @classroom-created="handleClassroomCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../composables/useUserStore.js'
import { useClassrooms } from '../../composables/useClassrooms.js'
import CollectionGrid from './CollectionGrid.vue'
import ClassroomCard from './ClassroomCard.vue'
import ClassroomCreateModal from './ClassroomCreateModal.vue'

defineEmits(['select-collection'])

const userStore = useUserStore()
const classroomStore = useClassrooms()

const showCreateModal = ref(false)
const expandedId = ref(null)

const userName = computed(() => {
  const user = userStore.currentUser.value
  return user ? user.firstName : ''
})

const classroomSummary = computed(() => {
  const count = classroomStore.teacherClassrooms.value.length
  if (count === 0) return 'Get started by creating your first classroom.'
  if (count === 1) return 'You have 1 active classroom.'
  return `You have ${count} active classrooms.`
})

// Legacy teacher dashboard
const hasLegacyDashboard = true
const legacyDashboardUrl = computed(() => {
  return `${window.location.origin}${window.location.pathname}?mode=teacher`
})

function toggleExpand(classroomId) {
  expandedId.value = expandedId.value === classroomId ? null : classroomId
}

function handleClassroomCreated(classroom) {
  showCreateModal.value = false
  // Auto-expand the newly created classroom
  expandedId.value = classroom.id
}

function refreshClassrooms() {
  const user = userStore.currentUser.value
  if (user) {
    classroomStore.fetchTeacherClassrooms(user.id)
  }
}

onMounted(() => {
  const user = userStore.currentUser.value
  if (user) {
    classroomStore.fetchTeacherClassrooms(user.id)
  }
})
</script>

<style scoped>
.teacher-lobby {
  padding: 20px 0;
}

.welcome-section {
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  margin-bottom: 24px;
}

.welcome-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 28px;
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 8px;
}

.welcome-subtitle {
  color: var(--text-secondary, #6b7280);
  max-width: 500px;
  margin: 0 auto;
}

.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.action-btn.create {
  background: var(--green-mid, #40916c);
  color: white;
}

.action-btn.create:hover {
  background: var(--green-dark, #2d6a4f);
}

.action-btn.legacy {
  background: var(--green-pale, #d8f3dc);
  color: var(--green-dark, #2d6a4f);
}

.action-btn.legacy:hover {
  background: var(--green-light, #b7e4c7);
}

.section-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 20px;
  color: var(--green-dark, #2d6a4f);
  margin: 0 0 16px 0;
}

.classrooms-section {
  margin-bottom: 32px;
}

.classroom-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.collections-section {
  margin-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px dashed var(--card-border, #e0ddd7);
  margin-bottom: 32px;
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
</style>

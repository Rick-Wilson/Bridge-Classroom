<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../composables/useUserStore.js'
import { useAppConfig } from '../composables/useAppConfig.js'
import { useAssignmentStore } from '../composables/useAssignmentStore.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'switchUser', 'logout'])

const userStore = useUserStore()
const appConfig = useAppConfig()
const assignmentStore = useAssignmentStore()

// Edit mode state
const isEditing = ref(false)
const editFirstName = ref('')
const editLastName = ref('')
const editConsent = ref(true)

// Computed
const user = computed(() => userStore.currentUser.value)

const classroomNames = computed(() => {
  if (!user.value || !user.value.classrooms.length) {
    return 'No classroom assigned'
  }

  return user.value.classrooms
    .map(id => {
      const classroom = appConfig.availableClassrooms.value.find(c => c.id === id)
      return classroom ? classroom.name : id
    })
    .join(', ')
})

const activeAssignments = computed(() => {
  return assignmentStore.getAllAssignments().filter(a => a.completionPercent < 100)
})

const completedAssignments = computed(() => {
  return assignmentStore.getAllAssignments().filter(a => a.completionPercent >= 100)
})

// Methods
function startEditing() {
  if (user.value) {
    editFirstName.value = user.value.firstName
    editLastName.value = user.value.lastName
    editConsent.value = user.value.dataConsent
    isEditing.value = true
  }
}

function cancelEditing() {
  isEditing.value = false
}

function saveChanges() {
  if (!user.value) return

  userStore.updateUser(user.value.id, {
    firstName: editFirstName.value,
    lastName: editLastName.value,
    dataConsent: editConsent.value
  })

  isEditing.value = false
}

function handleSwitchUser() {
  emit('switchUser')
}

function handleClose() {
  isEditing.value = false
  emit('close')
}

function formatDate(isoString) {
  if (!isoString) return 'N/A'
  return new Date(isoString).toLocaleDateString()
}
</script>

<template>
  <div v-if="visible" class="settings-overlay" @click.self="handleClose">
    <div class="settings-panel">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="handleClose" aria-label="Close">
          &times;
        </button>
      </div>

      <div class="settings-body">
        <!-- User Info Section -->
        <section class="settings-section">
          <h3>Your Profile</h3>

          <template v-if="!isEditing">
            <div class="info-row">
              <span class="info-label">Name</span>
              <span class="info-value">
                {{ user?.firstName }} {{ user?.lastName }}
              </span>
            </div>

            <div class="info-row">
              <span class="info-label">Class</span>
              <span class="info-value">{{ classroomNames }}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Data Sharing</span>
              <span class="info-value" :class="user?.dataConsent ? 'enabled' : 'disabled'">
                {{ user?.dataConsent ? 'Enabled' : 'Disabled' }}
              </span>
            </div>

            <div class="info-row">
              <span class="info-label">Member Since</span>
              <span class="info-value">{{ formatDate(user?.createdAt) }}</span>
            </div>

            <div class="button-row">
              <button class="secondary-btn" @click="startEditing">
                Edit Profile
              </button>
              <button class="secondary-btn" @click="handleSwitchUser">
                Switch User
              </button>
            </div>
          </template>

          <template v-else>
            <div class="edit-form">
              <div class="form-group">
                <label for="editFirstName">First Name</label>
                <input
                  id="editFirstName"
                  v-model="editFirstName"
                  type="text"
                />
              </div>

              <div class="form-group">
                <label for="editLastName">Last Name</label>
                <input
                  id="editLastName"
                  v-model="editLastName"
                  type="text"
                />
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="editConsent"
                  />
                  <span>Share practice results with {{ appConfig.teacherName.value || 'teacher' }}</span>
                </label>
              </div>

              <div class="button-row">
                <button class="primary-btn" @click="saveChanges">
                  Save Changes
                </button>
                <button class="secondary-btn" @click="cancelEditing">
                  Cancel
                </button>
              </div>
            </div>
          </template>
        </section>

        <!-- Assignments Section -->
        <section v-if="activeAssignments.length || completedAssignments.length" class="settings-section">
          <h3>Assignments</h3>

          <template v-if="activeAssignments.length">
            <h4>Active</h4>
            <div class="assignment-list">
              <div
                v-for="assignment in activeAssignments"
                :key="assignment.id"
                class="assignment-item"
              >
                <div class="assignment-header">
                  <span class="assignment-name">{{ assignment.name }}</span>
                  <span class="assignment-progress">{{ assignment.completionPercent }}%</span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: `${assignment.completionPercent}%` }"
                  ></div>
                </div>
                <div class="assignment-meta">
                  <span v-if="assignment.dueDate">
                    Due: {{ formatDate(assignment.dueDate) }}
                  </span>
                  <span>
                    {{ assignment.completedDeals }}/{{ assignment.totalDeals }} deals
                  </span>
                </div>
              </div>
            </div>
          </template>

          <template v-if="completedAssignments.length">
            <h4>Completed</h4>
            <div class="assignment-list">
              <div
                v-for="assignment in completedAssignments"
                :key="assignment.id"
                class="assignment-item completed"
              >
                <div class="assignment-header">
                  <span class="assignment-name">{{ assignment.name }}</span>
                  <span class="assignment-check">&#10003;</span>
                </div>
                <div class="assignment-meta">
                  Completed {{ formatDate(assignment.lastPracticedAt) }}
                </div>
              </div>
            </div>
          </template>
        </section>

        <!-- Display Options -->
        <section class="settings-section">
          <h3>Display Options</h3>
          <div class="toggle-row">
            <label class="toggle-label">
              <input
                type="checkbox"
                :checked="appConfig.showLoadPbnOption.value"
                @change="appConfig.setUIPref('showLoadPbnOption', $event.target.checked)"
              />
              <span>Show "Load your own PBN" option in lobby</span>
            </label>
          </div>
        </section>

        <!-- Key Backup Section (Placeholder for Stage 2) -->
        <section class="settings-section">
          <h3>Data & Privacy</h3>
          <p class="section-note">
            Key backup and data export options will be available in a future update.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.settings-panel {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.settings-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #666;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.settings-body {
  padding: 24px;
}

.settings-section {
  margin-bottom: 28px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  font-size: 16px;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #667eea;
}

.settings-section h4 {
  font-size: 13px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 16px 0 8px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-label {
  color: #666;
  font-size: 14px;
}

.info-value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.info-value.enabled {
  color: #4caf50;
}

.info-value.disabled {
  color: #999;
}

.button-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.primary-btn,
.secondary-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background: #667eea;
  color: white;
  border: none;
}

.primary-btn:hover {
  background: #5a6fd6;
}

.secondary-btn {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.secondary-btn:hover {
  background: #f0f4ff;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  color: #444;
}

.form-group input[type="text"] {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: #667eea;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

.assignment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assignment-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.assignment-item.completed {
  background: #e8f5e9;
}

.assignment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.assignment-name {
  font-weight: 500;
  color: #333;
}

.assignment-progress {
  font-size: 14px;
  color: #667eea;
  font-weight: 600;
}

.assignment-check {
  color: #4caf50;
  font-weight: bold;
}

.progress-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.assignment-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.section-note {
  font-size: 14px;
  color: #666;
  font-style: italic;
}

.toggle-row {
  padding: 10px 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #444;
}

.toggle-label input {
  width: 16px;
  height: 16px;
}

@media (max-width: 480px) {
  .settings-panel {
    max-height: 100vh;
    border-radius: 0;
  }

  .button-row {
    flex-direction: column;
  }
}
</style>

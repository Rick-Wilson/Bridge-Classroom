<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppConfig } from '../composables/useAppConfig.js'
import { useUserStore } from '../composables/useUserStore.js'

const emit = defineEmits(['userReady'])

const appConfig = useAppConfig()
const userStore = useUserStore()

// View state: 'form' | 'returning' | 'switcher'
const viewState = ref('form')

// Form data
const firstName = ref('')
const lastName = ref('')
const selectedClassrooms = ref([])
const dataConsent = ref(true)

// Form validation errors
const errors = ref({
  firstName: '',
  lastName: '',
  classrooms: ''
})

// UI state
const showConsentDetails = ref(false)

// Initialize
onMounted(() => {
  userStore.initialize()
  appConfig.initializeFromUrl()

  // Determine initial view
  if (userStore.hasUsers.value && userStore.currentUser.value) {
    viewState.value = 'returning'
  } else {
    viewState.value = 'form'
  }

  // If single classroom, auto-select it
  if (appConfig.hasSingleClassroom.value) {
    selectedClassrooms.value = [appConfig.singleClassroom.value.id]
  }
})

// Computed
const isFormValid = computed(() => {
  return (
    firstName.value.trim().length > 0 &&
    lastName.value.trim().length > 0
  )
})

const displayName = computed(() => {
  if (userStore.currentUser.value) {
    return userStore.currentUser.value.firstName
  }
  return ''
})

const teacherDisplay = computed(() => {
  if (appConfig.teacherName.value) {
    return `${appConfig.teacherName.value}'s Bridge Classroom`
  }
  return 'Bridge Bidding Practice'
})

// Methods
function validateForm() {
  errors.value = { firstName: '', lastName: '', classrooms: '' }
  let valid = true

  if (!firstName.value.trim()) {
    errors.value.firstName = 'First name is required'
    valid = false
  }

  if (!lastName.value.trim()) {
    errors.value.lastName = 'Last name is required'
    valid = false
  }

  return valid
}

function handleSubmit() {
  if (!validateForm()) return

  // Determine classrooms
  let classrooms = []
  if (appConfig.hasSingleClassroom.value) {
    classrooms = [appConfig.singleClassroom.value.id]
  } else if (appConfig.hasMultipleClassrooms.value) {
    classrooms = [...selectedClassrooms.value]
  }
  // If ad-hoc, classrooms stays empty

  // Create user
  const user = userStore.createUser({
    firstName: firstName.value,
    lastName: lastName.value,
    classrooms,
    dataConsent: dataConsent.value
  })

  emit('userReady', user)
}

function handleContinue() {
  emit('userReady', userStore.currentUser.value)
}

function handleSwitchUser() {
  viewState.value = 'switcher'
}

function handleSelectUser(userId) {
  userStore.switchUser(userId)
  emit('userReady', userStore.currentUser.value)
}

function handleAddNewUser() {
  // Clear form
  firstName.value = ''
  lastName.value = ''
  selectedClassrooms.value = appConfig.hasSingleClassroom.value
    ? [appConfig.singleClassroom.value.id]
    : []
  dataConsent.value = true
  errors.value = { firstName: '', lastName: '', classrooms: '' }

  viewState.value = 'form'
}

function handleBackToReturning() {
  if (userStore.currentUser.value) {
    viewState.value = 'returning'
  }
}

function toggleClassroom(classroomId) {
  const index = selectedClassrooms.value.indexOf(classroomId)
  if (index === -1) {
    selectedClassrooms.value.push(classroomId)
  } else {
    selectedClassrooms.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="welcome-screen">
    <div class="welcome-card">
      <!-- Header -->
      <div class="welcome-header">
        <h1>{{ teacherDisplay }}</h1>
      </div>

      <!-- First-time user form -->
      <template v-if="viewState === 'form'">
        <div class="welcome-body">
          <h2>Welcome!</h2>
          <p class="subtitle">Please enter your name to get started.</p>

          <form @submit.prevent="handleSubmit" class="user-form">
            <!-- First name -->
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                v-model="firstName"
                type="text"
                placeholder="Enter your first name"
                :class="{ 'has-error': errors.firstName }"
                autocomplete="given-name"
              />
              <span v-if="errors.firstName" class="error-message">
                {{ errors.firstName }}
              </span>
            </div>

            <!-- Last name -->
            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                v-model="lastName"
                type="text"
                placeholder="Enter your last name"
                :class="{ 'has-error': errors.lastName }"
                autocomplete="family-name"
              />
              <span v-if="errors.lastName" class="error-message">
                {{ errors.lastName }}
              </span>
            </div>

            <!-- Classroom selection (only if multiple available) -->
            <div v-if="appConfig.hasMultipleClassrooms.value" class="form-group">
              <label>Select Your Class(es)</label>
              <div class="checkbox-group">
                <label
                  v-for="classroom in appConfig.availableClassrooms.value"
                  :key="classroom.id"
                  class="checkbox-label"
                >
                  <input
                    type="checkbox"
                    :value="classroom.id"
                    :checked="selectedClassrooms.includes(classroom.id)"
                    @change="toggleClassroom(classroom.id)"
                  />
                  <span>{{ classroom.name }}</span>
                </label>
              </div>
            </div>

            <!-- Single classroom info (if only one) -->
            <div v-else-if="appConfig.hasSingleClassroom.value" class="form-group">
              <label>Class</label>
              <div class="single-classroom">
                {{ appConfig.singleClassroom.value.name }}
              </div>
            </div>

            <!-- Data consent -->
            <div class="form-group consent-group">
              <label class="checkbox-label consent-label">
                <input
                  type="checkbox"
                  v-model="dataConsent"
                />
                <span>
                  Share my practice results with {{ appConfig.teacherName.value || 'my teacher' }}
                </span>
              </label>

              <button
                type="button"
                class="details-toggle"
                @click="showConsentDetails = !showConsentDetails"
              >
                {{ showConsentDetails ? 'Hide details' : 'What data is shared?' }}
              </button>

              <div v-if="showConsentDetails" class="consent-details">
                <p>This helps your teacher understand your progress and tailor lessons to your needs.</p>
                <p><strong>We share:</strong></p>
                <ul>
                  <li>Your name and class</li>
                  <li>Which hands you practiced</li>
                  <li>Your bidding choices (correct and incorrect)</li>
                  <li>When you practiced</li>
                </ul>
                <p><strong>We never share:</strong></p>
                <ul>
                  <li>Your data with other students</li>
                  <li>Any data if you uncheck this box</li>
                </ul>
                <p class="consent-note">You can change this setting anytime in Settings.</p>
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              class="submit-btn"
              :disabled="!isFormValid"
            >
              Start Practicing
            </button>
          </form>

          <!-- Back to returning user (if switching from switcher) -->
          <button
            v-if="userStore.hasUsers.value"
            class="back-link"
            @click="handleBackToReturning"
          >
            Back to user selection
          </button>
        </div>
      </template>

      <!-- Returning user -->
      <template v-else-if="viewState === 'returning'">
        <div class="welcome-body returning">
          <h2>Welcome back, {{ displayName }}!</h2>
          <p class="subtitle">Ready to continue practicing?</p>

          <button class="submit-btn" @click="handleContinue">
            Continue
          </button>

          <button class="switch-link" @click="handleSwitchUser">
            Not {{ displayName }}? Switch user
          </button>
        </div>
      </template>

      <!-- User switcher -->
      <template v-else-if="viewState === 'switcher'">
        <div class="welcome-body switcher">
          <h2>Select User</h2>
          <p class="subtitle">Choose who's practicing today:</p>

          <div class="user-list">
            <button
              v-for="user in userStore.allUsers.value"
              :key="user.id"
              class="user-item"
              :class="{ 'is-current': user.id === userStore.currentUserId.value }"
              @click="handleSelectUser(user.id)"
            >
              <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
              <span v-if="user.classrooms.length" class="user-class">
                {{ user.classrooms.join(', ') }}
              </span>
            </button>
          </div>

          <button class="add-user-btn" @click="handleAddNewUser">
            + Add New User
          </button>

          <button
            v-if="userStore.currentUser.value"
            class="back-link"
            @click="handleBackToReturning"
          >
            Cancel
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.welcome-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.welcome-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 450px;
  width: 100%;
  overflow: hidden;
}

.welcome-header {
  background: #1a237e;
  color: white;
  padding: 24px;
  text-align: center;
}

.welcome-header h1 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.welcome-body {
  padding: 32px;
}

.welcome-body h2 {
  font-size: 24px;
  color: #333;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #666;
  margin: 0 0 24px 0;
  font-size: 15px;
}

.user-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #444;
}

.form-group input[type="text"] {
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input.has-error {
  border-color: #d32f2f;
}

.error-message {
  color: #d32f2f;
  font-size: 13px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 15px;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.single-classroom {
  padding: 12px 14px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 15px;
  color: #333;
}

.consent-group {
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.consent-label {
  font-weight: normal;
}

.consent-label span {
  font-size: 14px;
  color: #555;
}

.details-toggle {
  background: none;
  border: none;
  color: #667eea;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  text-align: left;
}

.details-toggle:hover {
  text-decoration: underline;
}

.consent-details {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}

.consent-details p {
  margin: 0 0 8px 0;
}

.consent-details ul {
  margin: 0 0 12px 0;
  padding-left: 20px;
}

.consent-details li {
  margin-bottom: 4px;
}

.consent-note {
  font-style: italic;
  color: #777;
}

.submit-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-link,
.back-link {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 10px;
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  text-align: center;
}

.switch-link:hover,
.back-link:hover {
  text-decoration: underline;
}

/* Returning user styles */
.returning {
  text-align: center;
}

.returning .submit-btn {
  width: 100%;
}

/* Switcher styles */
.switcher {
  text-align: center;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-item:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.user-item.is-current {
  border-color: #667eea;
  background: #e8efff;
}

.user-name {
  font-weight: 500;
  color: #333;
}

.user-class {
  font-size: 13px;
  color: #777;
}

.add-user-btn {
  width: 100%;
  padding: 14px;
  background: white;
  border: 2px dashed #ccc;
  border-radius: 8px;
  color: #666;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-user-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

@media (max-width: 480px) {
  .welcome-body {
    padding: 24px;
  }

  .welcome-header h1 {
    font-size: 18px;
  }

  .welcome-body h2 {
    font-size: 20px;
  }
}
</style>

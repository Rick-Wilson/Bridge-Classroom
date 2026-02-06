<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppConfig } from '../composables/useAppConfig.js'
import { useUserStore } from '../composables/useUserStore.js'

const emit = defineEmits(['userReady'])

const appConfig = useAppConfig()
const userStore = useUserStore()

// API URL for admin key and registration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// View state: 'form' | 'returning' | 'switcher' | 'recovery-sent' | 'recovery-claiming'
const viewState = ref('form')

// Form data
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const selectedClassrooms = ref([])
const dataConsent = ref(true)

// Form validation errors
const errors = ref({
  firstName: '',
  lastName: '',
  email: '',
  classrooms: ''
})

// UI state
const showConsentDetails = ref(false)
const isLoading = ref(false)
const loadingMessage = ref('')

// Recovery state
const recoveryEmail = ref('')
const recoveryError = ref('')
const recoveryMessage = ref('')

// Initialize
onMounted(async () => {
  userStore.initialize()
  appConfig.initializeFromUrl()

  // Check for recovery URL parameters
  const urlParams = new URLSearchParams(window.location.search)
  const recoverToken = urlParams.get('recover')
  const recoverUserId = urlParams.get('user_id')

  if (recoverToken && recoverUserId) {
    // Handle account recovery from magic link
    await handleRecoveryClaim(recoverUserId, recoverToken)
    // Clean URL after processing
    window.history.replaceState({}, document.title, window.location.pathname)
    return
  }

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

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Computed
const isFormValid = computed(() => {
  return (
    firstName.value.trim().length > 0 &&
    lastName.value.trim().length > 0 &&
    email.value.trim().length > 0 &&
    emailRegex.test(email.value.trim())
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
  errors.value = { firstName: '', lastName: '', email: '', classrooms: '' }
  let valid = true

  if (!firstName.value.trim()) {
    errors.value.firstName = 'First name is required'
    valid = false
  }

  if (!lastName.value.trim()) {
    errors.value.lastName = 'Last name is required'
    valid = false
  }

  if (!email.value.trim()) {
    errors.value.email = 'Email is required'
    valid = false
  } else if (!emailRegex.test(email.value.trim())) {
    errors.value.email = 'Please enter a valid email address'
    valid = false
  }

  // Check if email already in use locally
  const existingUser = userStore.findUserByEmail(email.value)
  if (existingUser) {
    errors.value.email = 'This email is already registered on this device.'
    valid = false
  }

  return valid
}

/**
 * Check if email exists on server and offer recovery if so
 * @returns {Promise<boolean>} True if should proceed with registration
 */
async function checkEmailOnServer() {
  const emailToCheck = email.value.trim().toLowerCase()

  try {
    // Try to request recovery - if successful, account exists
    const result = await userStore.requestRecovery(emailToCheck, API_URL)

    if (result.success) {
      // Account exists - recovery link sent
      recoveryEmail.value = emailToCheck
      recoveryMessage.value = result.message
      viewState.value = 'recovery-sent'
      return false
    } else if (result.message && result.message.includes('No account found')) {
      // No account found - proceed with registration
      return true
    } else {
      // Some other error
      console.warn('Recovery check returned:', result)
      return true // Proceed anyway
    }
  } catch (err) {
    console.warn('Failed to check email on server:', err)
    // If we can't reach server, proceed with registration
    return true
  }
}

/**
 * Handle recovery claim from magic link
 */
async function handleRecoveryClaim(userId, token) {
  viewState.value = 'recovery-claiming'
  isLoading.value = true
  loadingMessage.value = 'Recovering your account...'
  recoveryError.value = ''

  try {
    const result = await userStore.claimRecovery(userId, token, API_URL)

    if (result.success && result.user) {
      // Success! User is logged in
      emit('userReady', result.user)
    } else {
      recoveryError.value = result.error || 'Recovery failed. Please try again.'
      viewState.value = 'form'
    }
  } catch (err) {
    console.error('Recovery claim failed:', err)
    recoveryError.value = 'Unable to complete recovery. Please try again.'
    viewState.value = 'form'
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

/**
 * Handle "Send recovery link" button click
 */
async function handleRequestRecovery() {
  if (!recoveryEmail.value.trim()) {
    recoveryError.value = 'Please enter your email address'
    return
  }

  isLoading.value = true
  loadingMessage.value = 'Sending recovery link...'
  recoveryError.value = ''

  try {
    const result = await userStore.requestRecovery(recoveryEmail.value.trim(), API_URL)

    if (result.success) {
      recoveryMessage.value = result.message
      viewState.value = 'recovery-sent'
    } else {
      recoveryError.value = result.message || 'Failed to send recovery link'
    }
  } catch (err) {
    console.error('Recovery request failed:', err)
    recoveryError.value = 'Unable to connect to server. Please try again.'
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

async function handleSubmit() {
  if (!validateForm()) return

  // Show loading state while checking server
  isLoading.value = true
  loadingMessage.value = 'Checking account...'

  // Check if email already exists on server
  const shouldProceed = await checkEmailOnServer()
  if (!shouldProceed) {
    // Recovery flow was triggered
    isLoading.value = false
    loadingMessage.value = ''
    return
  }

  // Determine classrooms
  let classrooms = []
  if (appConfig.hasSingleClassroom.value) {
    classrooms = [appConfig.singleClassroom.value.id]
  } else if (appConfig.hasMultipleClassrooms.value) {
    classrooms = [...selectedClassrooms.value]
  }
  // If ad-hoc, classrooms stays empty

  // Continue with user creation
  loadingMessage.value = 'Creating your secure encryption key...'

  try {
    // Create user with AES secret key and admin sharing grant
    const user = await userStore.createUser({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      classrooms,
      dataConsent: dataConsent.value,
      apiUrl: API_URL
    })

    emit('userReady', user)
  } catch (err) {
    console.error('Failed to create user:', err)
    errors.value.email = 'Failed to create account. Please try again.'
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
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
  email.value = ''
  selectedClassrooms.value = appConfig.hasSingleClassroom.value
    ? [appConfig.singleClassroom.value.id]
    : []
  dataConsent.value = true
  errors.value = { firstName: '', lastName: '', email: '', classrooms: '' }

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

            <!-- Email -->
            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="Enter your email address"
                :class="{ 'has-error': errors.email }"
                autocomplete="email"
              />
              <span v-if="errors.email" class="error-message">
                {{ errors.email }}
              </span>
              <span class="field-hint">Used for account recovery and sharing with your teacher</span>
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

            <!-- Data preservation -->
            <div class="form-group consent-group">
              <label class="checkbox-label consent-label">
                <input
                  type="checkbox"
                  v-model="dataConsent"
                />
                <span>
                  Preserve my practice history
                </span>
              </label>

              <button
                type="button"
                class="details-toggle"
                @click="showConsentDetails = !showConsentDetails"
              >
                {{ showConsentDetails ? 'Hide details' : 'What data is preserved?' }}
              </button>

              <div v-if="showConsentDetails" class="consent-details">
                <p>Your practice history is saved online so you can track your progress over time.</p>
                <p><strong>How it works:</strong></p>
                <ul>
                  <li>Your data is encrypted with your personal key</li>
                  <li>Only you and people you authorize can view it</li>
                  <li>The site administrator can also access your data</li>
                </ul>
                <p><strong>What's preserved:</strong></p>
                <ul>
                  <li>Which hands you practiced</li>
                  <li>Your bidding choices (correct and incorrect)</li>
                  <li>When you practiced</li>
                </ul>
                <p class="consent-note">You can change this setting anytime in Settings.</p>
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              class="submit-btn"
              :disabled="!isFormValid || isLoading"
            >
              <span v-if="isLoading">{{ loadingMessage }}</span>
              <span v-else>Start Practicing</span>
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

      <!-- Recovery link sent -->
      <template v-else-if="viewState === 'recovery-sent'">
        <div class="welcome-body recovery-sent">
          <h2>Check Your Email</h2>
          <p class="subtitle">
            We found an existing account for <strong>{{ recoveryEmail }}</strong>.
          </p>

          <div class="recovery-info">
            <p>{{ recoveryMessage }}</p>
            <p class="recovery-note">
              Click the link in the email to restore your account on this device.
            </p>
          </div>

          <button class="back-link" @click="viewState = 'form'">
            Use a different email
          </button>
        </div>
      </template>

      <!-- Recovery claiming (loading state) -->
      <template v-else-if="viewState === 'recovery-claiming'">
        <div class="welcome-body recovery-claiming">
          <h2>Restoring Your Account</h2>
          <p class="subtitle">{{ loadingMessage }}</p>

          <div v-if="recoveryError" class="recovery-error-panel">
            <p class="error-message">{{ recoveryError }}</p>
            <button class="back-link" @click="viewState = 'form'">
              Try again
            </button>
          </div>

          <div v-else class="loading-spinner">
            <div class="spinner"></div>
          </div>
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

.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input[type="email"] {
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.field-hint {
  font-size: 12px;
  color: #888;
  font-style: italic;
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

/* Recovery sent styles */
.recovery-sent,
.recovery-claiming {
  text-align: center;
}

.recovery-info {
  margin: 24px 0;
  padding: 20px;
  background: #e8f5e9;
  border-radius: 8px;
  color: #2e7d32;
}

.recovery-info p {
  margin: 0 0 12px 0;
  font-size: 15px;
}

.recovery-info p:last-child {
  margin-bottom: 0;
}

.recovery-note {
  font-size: 14px;
  color: #558b2f;
  font-style: italic;
}

.recovery-error-panel {
  margin: 24px 0;
  padding: 20px;
  background: #ffebee;
  border-radius: 8px;
}

.recovery-error-panel .error-message {
  margin-bottom: 16px;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

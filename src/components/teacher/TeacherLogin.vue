<template>
  <div class="teacher-login">
    <div class="login-card">
      <h1>Teacher Dashboard</h1>
      <p class="subtitle">Enter your credentials to view student progress</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <!-- Password -->
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="Enter teacher password"
            required
            autocomplete="current-password"
          />
        </div>

        <!-- Private Key Entry -->
        <div class="form-group">
          <label>Private Key</label>
          <div class="key-options">
            <button
              type="button"
              class="key-option"
              :class="{ active: keyMethod === 'paste' }"
              @click="keyMethod = 'paste'"
            >
              Paste Key
            </button>
            <button
              type="button"
              class="key-option"
              :class="{ active: keyMethod === 'file' }"
              @click="keyMethod = 'file'"
            >
              Upload File
            </button>
          </div>

          <!-- Paste key textarea -->
          <textarea
            v-if="keyMethod === 'paste'"
            v-model="privateKeyPem"
            placeholder="Paste your private key here (PEM format or base64)"
            rows="6"
            class="key-textarea"
          ></textarea>

          <!-- File upload -->
          <div v-else class="file-upload">
            <input
              type="file"
              id="keyFile"
              accept=".pem,.key,.txt"
              @change="handleFileUpload"
              class="file-input"
            />
            <label for="keyFile" class="file-label">
              <span v-if="!fileName">Choose key file...</span>
              <span v-else class="file-name">{{ fileName }}</span>
            </label>
          </div>
        </div>

        <!-- Remember checkbox -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="rememberKey" />
            <span>Remember my key on this device (encrypted)</span>
          </label>
        </div>

        <!-- Error message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- Submit button -->
        <button type="submit" class="login-btn" :disabled="isLoading">
          <span v-if="isLoading">Authenticating...</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <div class="login-footer">
        <a href="#" @click.prevent="$emit('back')">← Back to Practice</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTeacherAuth } from '../../composables/useTeacherAuth.js'

const emit = defineEmits(['authenticated', 'back'])

const teacherAuth = useTeacherAuth()

const password = ref('')
const privateKeyPem = ref('')
const keyMethod = ref('paste')
const fileName = ref('')
const rememberKey = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    privateKeyPem.value = e.target.result
  }
  reader.readAsText(file)
}

async function handleLogin() {
  errorMessage.value = ''

  if (!password.value) {
    errorMessage.value = 'Please enter the password'
    return
  }

  if (!privateKeyPem.value.trim()) {
    errorMessage.value = 'Please provide your private key'
    return
  }

  isLoading.value = true

  try {
    const result = await teacherAuth.login(
      password.value,
      privateKeyPem.value.trim(),
      rememberKey.value
    )

    if (result.success) {
      emit('authenticated')
    } else {
      errorMessage.value = result.error || 'Authentication failed'
    }
  } catch (err) {
    console.error('Login error:', err)
    errorMessage.value = err.message || 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.teacher-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-card h1 {
  font-size: 28px;
  color: #1e3a5f;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  margin-bottom: 32px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-group input[type="password"],
.form-group input[type="text"] {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #1e3a5f;
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
}

.key-options {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.key-option {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f8f9fa;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.key-option:hover {
  background: #e9ecef;
}

.key-option.active {
  background: #1e3a5f;
  color: white;
  border-color: #1e3a5f;
}

.key-textarea {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
  min-height: 120px;
}

.key-textarea:focus {
  outline: none;
  border-color: #1e3a5f;
  box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
}

.file-upload {
  position: relative;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.file-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}

.file-label:hover {
  border-color: #1e3a5f;
  background: #f8f9fa;
}

.file-name {
  color: #1e3a5f;
  font-weight: 500;
}

.checkbox-group {
  flex-direction: row;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.error-message {
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c00;
  font-size: 14px;
}

.login-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 58, 95, 0.4);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.login-footer a {
  color: #666;
  text-decoration: none;
  font-size: 14px;
}

.login-footer a:hover {
  color: #1e3a5f;
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px;
  }

  .login-card h1 {
    font-size: 24px;
  }
}
</style>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../composables/useUserStore.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const userStore = useUserStore()

// State
const downloaded = ref(false)

// Computed
const userName = computed(() => {
  const user = userStore.currentUser.value
  return user ? `${user.firstName} ${user.lastName}` : ''
})

// Methods
function downloadBackup() {
  const backup = userStore.getKeyBackup()
  if (!backup) {
    console.error('No backup data available')
    return
  }

  // Create downloadable file
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  // Create download link
  const a = document.createElement('a')
  a.href = url
  a.download = `bridge-practice-backup-${backup.user_id.slice(0, 8)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  downloaded.value = true
}

function handleContinue() {
  userStore.dismissKeyBackupModal()
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <div class="key-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 7a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
            <path d="M17 2a5 5 0 0 0-4.172 7.757L5 17.586V21a1 1 0 0 0 1 1h2v-2h2v-2h2l2.172-2.172A5 5 0 1 0 17 2z" />
          </svg>
        </div>
        <h2>Your Personal Key</h2>
      </div>

      <div class="modal-body">
        <p class="intro">
          We've created a personal encryption key for <strong>{{ userName }}</strong>.
          This key protects your practice data so only you can see your detailed results.
        </p>

        <div class="warning-box">
          <span class="warning-icon">&#9888;</span>
          <p>
            If you clear your browser data or use a new device, you'll need this key
            to see your practice history.
          </p>
        </div>

        <div class="actions">
          <button
            class="download-btn"
            @click="downloadBackup"
            :class="{ downloaded }"
          >
            <span v-if="!downloaded">Download Key Backup</span>
            <span v-else>&#10003; Downloaded</span>
          </button>

          <button
            class="continue-btn"
            @click="handleContinue"
          >
            {{ downloaded ? 'Continue' : 'I understand, continue without backup' }}
          </button>
        </div>

        <div class="tip">
          <strong>Tip:</strong> Save the backup file somewhere safe, like your email
          or a folder on your computer.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px 24px;
  text-align: center;
}

.key-icon {
  margin-bottom: 12px;
  opacity: 0.9;
}

.key-icon svg {
  stroke: currentColor;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.modal-body {
  padding: 28px 24px;
}

.intro {
  font-size: 15px;
  line-height: 1.6;
  color: #444;
  margin: 0 0 20px 0;
}

.warning-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 24px;
}

.warning-icon {
  font-size: 24px;
  color: #856404;
  flex-shrink: 0;
}

.warning-box p {
  margin: 0;
  font-size: 14px;
  color: #856404;
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.download-btn {
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

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.download-btn.downloaded {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
}

.continue-btn {
  padding: 12px 24px;
  background: white;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.continue-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.tip {
  font-size: 13px;
  color: #666;
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 8px;
  line-height: 1.5;
}

.tip strong {
  color: #444;
}

@media (max-width: 480px) {
  .modal-content {
    border-radius: 12px;
  }

  .modal-header {
    padding: 24px 20px;
  }

  .modal-body {
    padding: 20px;
  }
}
</style>

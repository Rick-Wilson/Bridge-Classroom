<template>
  <div v-if="visible" class="rp-overlay" @click.self="close" @keydown.esc="close">
    <div class="rp-modal" role="dialog" aria-modal="true" aria-labelledby="rp-title">
      <h2 id="rp-title" class="rp-title">Report a Problem</h2>

      <!-- Idle / editing -->
      <template v-if="state === 'idle' || state === 'submitting'">
        <p class="rp-sub">
          Spotted something wrong with this board? Tell us in a sentence — it
          goes straight to the people who maintain the lessons.
        </p>
        <textarea
          ref="noteInput"
          v-model="note"
          class="rp-textarea"
          rows="4"
          placeholder="e.g. The recommended bid here looks wrong…"
          :disabled="state === 'submitting'"
          @keydown.enter.exact.prevent="submit"
        ></textarea>
        <div class="rp-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line</div>
        <div class="rp-actions">
          <button class="rp-btn rp-btn-secondary" @click="close" :disabled="state === 'submitting'">Cancel</button>
          <button class="rp-btn rp-btn-primary" @click="submit" :disabled="!note.trim() || state === 'submitting'">
            {{ state === 'submitting' ? 'Sending…' : 'Send report' }}
          </button>
        </div>
      </template>

      <!-- Success -->
      <template v-else-if="state === 'done'">
        <p class="rp-done">✓ Thanks — reported.</p>
        <p class="rp-sub">We’ll take a look. You can keep practicing.</p>
        <div class="rp-actions">
          <button class="rp-btn rp-btn-primary" @click="close">Close</button>
        </div>
      </template>

      <!-- Error / not configured -->
      <template v-else-if="state === 'error'">
        <p class="rp-error">{{ errorMessage }}</p>
        <div class="rp-actions">
          <button class="rp-btn rp-btn-secondary" @click="close">Close</button>
          <button v-if="canRetry" class="rp-btn rp-btn-primary" @click="retry">Try again</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useReportProblem } from '../composables/useReportProblem.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // Snapshot of lesson/board state captured when the modal was opened.
  context: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['close'])

const { submitReport } = useReportProblem()

const note = ref('')
const state = ref('idle')  // idle | submitting | done | error
const errorMessage = ref('')
const canRetry = ref(false)
const noteInput = ref(null)

let autoCloseTimer = null

// Reset and focus whenever the modal opens.
watch(() => props.visible, (open) => {
  if (open) {
    note.value = ''
    state.value = 'idle'
    errorMessage.value = ''
    canRetry.value = false
    nextTick(() => noteInput.value?.focus())
  } else if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
})

async function submit() {
  const trimmed = note.value.trim()
  if (!trimmed || state.value === 'submitting') return
  state.value = 'submitting'

  const result = await submitReport({ ...props.context, note: trimmed })

  if (result.ok) {
    state.value = 'done'
    // Auto-dismiss after a few seconds; Close also works.
    autoCloseTimer = setTimeout(() => close(), 3000)
  } else {
    state.value = 'error'
    if (result.reason === 'not_configured') {
      errorMessage.value = 'Reporting isn’t set up on this server yet — please let your teacher know.'
      canRetry.value = false
    } else {
      errorMessage.value = 'Sorry, the report didn’t go through. Please try again in a moment.'
      canRetry.value = true
    }
  }
}

function retry() {
  state.value = 'idle'
  errorMessage.value = ''
  nextTick(() => noteInput.value?.focus())
}

function close() {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
  emit('close')
}
</script>

<style scoped>
.rp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.rp-modal {
  background: #fff;
  border-radius: var(--radius-card, 8px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  padding: 24px;
  width: 100%;
  max-width: 480px;
}

.rp-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 22px;
  color: var(--green-dark, #2d6a4f);
  margin-bottom: 8px;
}

.rp-sub {
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-secondary, #555);
  margin-bottom: 14px;
}

.rp-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.5;
  padding: 12px;
  border: 1px solid var(--card-border, #ccc);
  border-radius: var(--radius-button, 6px);
  resize: vertical;
}

.rp-textarea:focus {
  outline: none;
  border-color: var(--green-mid, #2d6a4f);
  box-shadow: 0 0 0 2px rgba(45, 106, 79, 0.15);
}

.rp-hint {
  font-size: 12px;
  color: #888;
  margin-top: 6px;
}

.rp-hint kbd {
  font-family: monospace;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 0 4px;
}

.rp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.rp-btn {
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-button, 6px);
  cursor: pointer;
  transition: background 0.2s;
}

.rp-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.rp-btn-primary {
  background: var(--green-dark, #2d6a4f);
  color: #fff;
}

.rp-btn-primary:not(:disabled):hover {
  background: var(--green-darker, #1b4332);
}

.rp-btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.rp-btn-secondary:not(:disabled):hover {
  background: #d0d0d0;
}

.rp-done {
  font-size: 18px;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 8px;
}

.rp-error {
  font-size: 15px;
  line-height: 1.5;
  color: #c62828;
  margin-bottom: 4px;
}
</style>

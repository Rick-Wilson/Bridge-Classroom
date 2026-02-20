<template>
  <div class="classroom-card" :class="{ expanded }">
    <!-- Card header (always visible) -->
    <div class="card-header" @click="$emit('toggle')">
      <div class="header-left">
        <h3 class="classroom-name">{{ classroom.name }}</h3>
        <div class="header-meta">
          <span class="join-badge">JOIN: {{ classroom.join_code }}</span>
          <span class="member-count">{{ classroom.member_count }} {{ classroom.member_count === 1 ? 'student' : 'students' }}</span>
        </div>
      </div>
      <button class="expand-btn" :aria-label="expanded ? 'Collapse' : 'Expand'">
        <span class="chevron" :class="{ rotated: expanded }">&#x25BC;</span>
      </button>
    </div>

    <!-- Expanded content -->
    <div v-if="expanded" class="card-body">
      <!-- Description -->
      <p v-if="classroom.description" class="classroom-desc">{{ classroom.description }}</p>

      <!-- Invite link -->
      <div class="invite-section">
        <h4>Invite Link</h4>
        <p class="invite-desc">Share this link with your students to let them join.</p>
        <div class="invite-field">
          <input
            type="text"
            :value="inviteUrl"
            readonly
            class="invite-input"
            @click="$event.target.select()"
          />
          <button class="copy-btn" @click="copyInviteLink">
            {{ linkCopied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </div>

      <!-- Email template -->
      <div class="email-section">
        <div class="email-header">
          <h4>Email Template</h4>
          <button class="copy-btn copy-btn-small" @click="copyEmailTemplate">
            {{ emailCopied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <div class="email-template">
          <p><strong>Subject:</strong> Join our Bridge Classroom for practice exercises</p>
          <div class="email-body">
Hi everyone,

I've set up an online practice tool for our bridge class. You can work through bidding exercises at your own pace, and I'll be able to see your progress to help guide our lessons.

To join, click this link:
{{ inviteUrl }}

You'll need to create a free account (just your name and email). Once you've joined, you'll see any exercises I assign in your lobby.

The tool works on any device — computer, tablet, or phone — and you can practice offline too.

See you in class!</div>
        </div>
      </div>

      <!-- Roster -->
      <ClassroomRoster
        v-if="detail"
        :members="detail.members"
        @remove-member="handleRemoveMember"
      />
      <div v-else-if="loadingDetail" class="loading-roster">
        Loading roster...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useClassrooms } from '../../composables/useClassrooms.js'
import ClassroomRoster from './ClassroomRoster.vue'

const props = defineProps({
  classroom: { type: Object, required: true },
  expanded: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle', 'member-removed'])

const classrooms = useClassrooms()
const detail = ref(null)
const loadingDetail = ref(false)
const linkCopied = ref(false)
const emailCopied = ref(false)

const inviteUrl = computed(() => {
  return `https://bridge-classroom.com/#/join/${props.classroom.join_code}`
})

// Fetch detail when expanded
watch(() => props.expanded, async (isExpanded) => {
  if (isExpanded && !detail.value) {
    loadingDetail.value = true
    const result = await classrooms.fetchClassroomDetail(props.classroom.id)
    if (result?.success) {
      detail.value = result.classroom
    }
    loadingDetail.value = false
  }
})

async function copyInviteLink() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch {
    // Fallback: select the input text
  }
}

async function copyEmailTemplate() {
  const template = `Subject: Join our Bridge Classroom for practice exercises

Hi everyone,

I've set up an online practice tool for our bridge class. You can work through bidding exercises at your own pace, and I'll be able to see your progress to help guide our lessons.

To join, click this link:
${inviteUrl.value}

You'll need to create a free account (just your name and email). Once you've joined, you'll see any exercises I assign in your lobby.

The tool works on any device — computer, tablet, or phone — and you can practice offline too.

See you in class!`

  try {
    await navigator.clipboard.writeText(template)
    emailCopied.value = true
    setTimeout(() => { emailCopied.value = false }, 2000)
  } catch {
    // Fallback
  }
}

async function handleRemoveMember(studentId) {
  const result = await classrooms.removeMember(props.classroom.id, studentId)
  if (result?.success) {
    // Update local detail
    if (detail.value) {
      detail.value.members = detail.value.members.filter(m => m.student_id !== studentId)
    }
    emit('member-removed')
  }
}
</script>

<style scoped>
.classroom-card {
  background: white;
  border-radius: var(--radius-card, 10px);
  border: 1px solid var(--card-border, #e0ddd7);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.classroom-card:hover {
  box-shadow: 0 4px 12px var(--card-shadow, rgba(0, 0, 0, 0.06));
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--green-dark, #2d6a4f), #1d4e89);
  color: white;
}

.classroom-name {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 18px;
  margin: 0 0 6px 0;
  font-weight: 600;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.join-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-family: monospace;
  font-size: 12px;
  letter-spacing: 0.03em;
}

.member-count {
  opacity: 0.85;
}

.expand-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
}

.chevron {
  display: inline-block;
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.card-body {
  padding: 20px;
}

.classroom-desc {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  margin: 0 0 16px 0;
}

/* Invite section */
.invite-section {
  margin-bottom: 20px;
}

.invite-section h4,
.email-section h4 {
  font-size: 15px;
  color: var(--text-primary, #1a1a1a);
  margin: 0 0 4px 0;
}

.invite-desc {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  margin: 0 0 8px 0;
}

.invite-field {
  display: flex;
  gap: 8px;
}

.invite-input {
  flex: 1;
  padding: 8px 12px;
  background: #e8f5ee;
  border: 1px solid var(--green-light, #b7e4c7);
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  color: var(--green-dark, #2d6a4f);
  font-family: monospace;
}

.invite-input:focus {
  outline: none;
}

.copy-btn {
  padding: 8px 16px;
  background: var(--green-mid, #40916c);
  color: white;
  border: none;
  border-radius: var(--radius-button, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  font-family: var(--font-body, 'DM Sans', sans-serif);
}

.copy-btn:hover {
  background: var(--green-dark, #2d6a4f);
}

/* Email template */
.email-section {
  margin-bottom: 16px;
}

.email-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.copy-btn-small {
  padding: 4px 12px;
  font-size: 12px;
}

.email-template {
  border: 1px solid var(--card-border, #e0ddd7);
  border-radius: var(--radius-button, 6px);
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary, #1a1a1a);
  background: #fafafa;
}

.email-template strong {
  color: var(--green-dark, #2d6a4f);
}

.email-body {
  white-space: pre-wrap;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}

.loading-roster {
  text-align: center;
  padding: 20px;
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
}
</style>

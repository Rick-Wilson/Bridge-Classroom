<template>
  <!-- Teacher Dashboard (shown when mode=teacher in URL) -->
  <TeacherDashboard
    v-if="isTeacherMode"
    @close="exitTeacherMode"
  />

  <!-- Welcome Screen (shown when no authenticated user) -->
  <WelcomeScreen
    v-else-if="!isAuthenticated"
    @userReady="handleUserReady"
  />

  <!-- Main App (shown when user is authenticated) -->
  <div v-else class="app">
    <header class="app-header">
      <h1>{{ appTitle }}</h1>
      <div class="header-right">
        <SyncStatus />
        <button class="progress-btn" @click="showProgress = true" title="View Progress">
          Progress
        </button>
        <button v-if="deals.length" class="lobby-btn" @click="returnToLobby" title="Return to lesson selection">
          Lobby
        </button>
        <div class="stats" v-if="practice.biddingState.correctCount + practice.biddingState.wrongCount > 0">
          <span class="correct">{{ practice.biddingState.correctCount }}</span>
          <span class="wrong">{{ practice.biddingState.wrongCount }}</span>
        </div>
        <button class="user-btn" @click="showSettings = true" :title="userName">
          {{ userInitials }}
        </button>
      </div>
    </header>

    <main class="app-main">
      <!-- Assignment Banner -->
      <AssignmentBanner />
      <!-- File loader when no deals -->
      <div v-if="!deals.length" class="no-deals">
        <h2>Start Practicing</h2>
        <p>Browse available lessons to begin:</p>
        <button class="browse-lessons-btn" @click="showLessonBrowser = true">
          Browse Lessons
        </button>
        <div class="load-file-section">
          <p>Or load your own PBN file:</p>
          <input
            type="file"
            accept=".pbn"
            @change="onFileSelect"
            ref="fileInput"
          />
        </div>
      </div>

      <!-- Practice interface -->
      <template v-else>
        <!-- Two-column layout for desktop -->
        <div class="practice-layout">
          <!-- Left column: Deal info + Bridge table -->
          <div class="practice-left">
            <DealInfo
              :boardNumber="currentDeal?.boardNumber"
              :dealer="currentDeal?.dealer"
              :vulnerable="currentDeal?.vulnerable"
              :contract="currentDeal?.contract"
              :declarer="currentDeal?.declarer"
              :showContract="practice.biddingState.auctionComplete"
              :title="dealTitle"
              :totalDeals="deals.length"
              :currentIndex="currentDealIndex"
              :dealBoardNumbers="deals.map(d => d.boardNumber)"
              @goto="gotoDeal"
            />

            <BridgeTable
              :hands="practice.hands.value"
              :hiddenSeats="practice.hiddenSeats.value"
              :showHcp="practice.showHcp.value"
              :compact="true"
            />
          </div>

          <!-- Right column: Tag-driven content -->
          <div class="practice-right">
            <!-- Auction table - shown if deal has auction or bidding prompts -->
            <AuctionTable
              :bids="practice.hasPrompts.value ? practice.biddingState.displayedBids : (currentDeal?.auction || [])"
              :dealer="currentDeal?.dealer || 'N'"
              :currentBidIndex="practice.hasPrompts.value ? practice.biddingState.currentBidIndex : -1"
              :wrongBidIndex="practice.biddingState.wrongBidIndex"
              :correctBidIndex="practice.biddingState.correctBidIndex"
              :showTurnIndicator="practice.hasBidPrompt.value"
            />

            <!-- Bidding box - shown when there's a [BID] prompt requiring input -->
            <div v-if="practice.hasBidPrompt.value" class="bidding-box-container">
              <div v-if="practice.currentPrompt.value?.promptText" class="prompt-text" v-html="colorizeSuits(practice.currentPrompt.value.promptText)">
              </div>
              <BiddingBox
                :lastBid="practice.lastContractBid.value"
                :canDouble="practice.canDouble.value"
                :canRedouble="practice.canRedouble.value"
                @bid="onBid"
              />
            </div>

            <!-- Feedback panel - shown after wrong bid -->
            <FeedbackPanel
              :visible="!!practice.biddingState.wrongBid"
              type="wrong"
              :wrongBid="practice.biddingState.wrongBid"
              :correctBid="practice.biddingState.correctBid"
              :commentary="practice.currentExplanation.value"
              @continue="onContinue"
            />

            <!-- Instruction panel - shown if deal has [NEXT]/[ROTATE] steps -->
            <div v-if="practice.hasSteps.value" class="instruction-panel">
              <div class="instruction-progress">
                Step {{ practice.stepState.currentStepIndex + 1 }} of {{ practice.totalSteps.value }}
              </div>
              <div class="instruction-text-container" ref="instructionContainer">
                <!-- Previous steps (greyed out) -->
                <template v-for="(step, idx) in practice.steps.value.slice(0, practice.stepState.currentStepIndex)" :key="idx">
                  <div class="instruction-text previous" v-html="colorizeSuits(step.text)"></div>
                </template>
                <!-- Current step (active) -->
                <div class="instruction-text current" v-html="colorizeSuits(practice.currentStepText.value)"></div>
              </div>
              <div class="instruction-controls">
                <button
                  v-if="practice.stepState.currentStepIndex > 0"
                  class="instruction-btn secondary"
                  @click="practice.prevStep()"
                >
                  ← Back
                </button>
                <button
                  v-if="practice.hasNextStep.value"
                  class="instruction-btn primary"
                  @click="practice.nextStep()"
                >
                  {{ practice.currentStepAction.value === 'rotate' ? 'Rotate' : 'Next' }} →
                </button>
              </div>
            </div>

            <!-- Completion panel - shown when deal is complete -->
            <div v-if="practice.isComplete.value" class="auction-complete">
              <h3 v-if="practice.hasPrompts.value">Auction Complete</h3>
              <div v-if="currentDeal?.commentary && !practice.hasSteps.value" class="full-commentary" v-html="colorizeSuits(stripControlDirectives(currentDeal.commentary))">
              </div>
              <button class="next-deal-btn" @click="nextDeal">
                Next Deal →
              </button>
            </div>

          </div>
        </div>
      </template>
    </main>

    <!-- Settings Panel -->
    <SettingsPanel
      :visible="showSettings"
      @close="showSettings = false"
      @switchUser="handleSwitchUser"
    />

    <!-- Key Backup Modal (shown after new user registration) -->
    <KeyBackupModal
      :visible="userStore.showKeyBackupModal.value"
      @close="userStore.dismissKeyBackupModal()"
    />

    <!-- Progress Dashboard Modal -->
    <div v-if="showProgress" class="modal-overlay" @click.self="showProgress = false">
      <ProgressDashboard @close="showProgress = false" />
    </div>

    <!-- Lesson Browser Modal -->
    <LessonBrowser
      :visible="showLessonBrowser"
      @close="showLessonBrowser = false"
      @load="handleLessonLoad"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { parsePbn, getDealTitle } from './utils/pbnParser.js'
import { stripControlDirectives, colorizeSuits } from './utils/cardFormatting.js'
import { useDealPractice } from './composables/useDealPractice.js'
import { useAppConfig } from './composables/useAppConfig.js'
import { useUserStore } from './composables/useUserStore.js'
import { useAssignmentStore } from './composables/useAssignmentStore.js'
import { useDataSync } from './composables/useDataSync.js'

import BridgeTable from './components/BridgeTable.vue'
import BiddingBox from './components/BiddingBox.vue'
import AuctionTable from './components/AuctionTable.vue'
import DealInfo from './components/DealInfo.vue'
import DealNavigator from './components/DealNavigator.vue'
import FeedbackPanel from './components/FeedbackPanel.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import AssignmentBanner from './components/AssignmentBanner.vue'
import KeyBackupModal from './components/KeyBackupModal.vue'
import SyncStatus from './components/SyncStatus.vue'
import ProgressDashboard from './components/ProgressDashboard.vue'
import TeacherDashboard from './components/teacher/TeacherDashboard.vue'
import LessonBrowser from './components/LessonBrowser.vue'

// Composables
const appConfig = useAppConfig()
const userStore = useUserStore()
const assignmentStore = useAssignmentStore()
const dataSync = useDataSync()

// Unified practice state - tag-driven, no modes
const practice = useDealPractice()

// UI state
const showSettings = ref(false)
const showProgress = ref(false)
const showLessonBrowser = ref(false)
const isTeacherMode = ref(false)
const instructionContainer = ref(null)

// Auto-scroll instruction text when step changes
watch(() => practice.stepState.currentStepIndex, () => {
  nextTick(() => {
    if (instructionContainer.value) {
      instructionContainer.value.scrollTop = instructionContainer.value.scrollHeight
    }
  })
})

// Check for teacher mode from URL
function checkTeacherMode() {
  const urlParams = new URLSearchParams(window.location.search)
  isTeacherMode.value = urlParams.get('mode') === 'teacher'
}

function exitTeacherMode() {
  isTeacherMode.value = false
  // Remove mode param from URL without reload
  const url = new URL(window.location.href)
  url.searchParams.delete('mode')
  window.history.replaceState({}, '', url.toString())
}

// User state
const isAuthenticated = computed(() => userStore.isAuthenticated.value)

const userName = computed(() => {
  const user = userStore.currentUser.value
  return user ? `${user.firstName} ${user.lastName}` : ''
})

const userInitials = computed(() => {
  const user = userStore.currentUser.value
  if (!user) return '?'
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
})

const appTitle = computed(() => {
  if (appConfig.teacherName.value) {
    return `${appConfig.teacherName.value}'s Bridge Classroom`
  }
  return 'Bridge Bidding Practice'
})

// Initialize on mount
onMounted(async () => {
  // Check if entering teacher mode
  checkTeacherMode()

  // If teacher mode, skip student initialization
  if (isTeacherMode.value) {
    return
  }

  appConfig.initializeFromUrl()
  userStore.initialize()
  assignmentStore.initializeFromUrl()
  practice.observationStore.initialize()

  // Initialize data sync (fetches teacher key, registers user, syncs pending data)
  if (userStore.isAuthenticated.value) {
    await dataSync.initialize()
  }
})

// User flow handlers
async function handleUserReady(user) {
  // User is now authenticated, app will show main content
  console.log('User ready:', user.firstName, user.lastName)

  // Initialize data sync for the new user (register with server, fetch teacher key)
  await dataSync.initialize()
}

function handleSwitchUser() {
  // Clear current user to show welcome screen
  userStore.currentUserId.value = null
  showSettings.value = false
}

// Deals data
const deals = ref([])
const currentDealIndex = ref(0)

// Bundled files (we'll add these later)
const baseUrl = import.meta.env.BASE_URL
const bundledFiles = ref([
  { name: 'Cue-bid', url: `${baseUrl}data/Cue-bid.pbn` },
  { name: 'Drury', url: `${baseUrl}data/Drury.pbn` }
])

// Current deal
const currentDeal = computed(() => deals.value[currentDealIndex.value] || null)

const dealTitle = computed(() => {
  if (!currentDeal.value) return ''
  // Show lesson name with "Baker " prefix
  const name = currentDeal.value.subfolder || currentDeal.value.category || ''
  return name ? `Baker ${name}` : ''
})

// Load deal when index changes
watch(currentDealIndex, () => {
  if (currentDeal.value) {
    practice.loadDeal(currentDeal.value)
  }
})

// Trigger sync when new observations are recorded
watch(() => practice.observationStore.pendingCount.value, (newCount, oldCount) => {
  if (newCount > oldCount) {
    // New observation was recorded, trigger debounced sync
    dataSync.triggerSync()
  }
})

// File handling
async function onFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const content = await file.text()
    const parsed = parsePbn(content)
    if (parsed.length > 0) {
      // Extract category from filename (e.g., 'Cue-bid.pbn' -> 'Cue-bid')
      const category = file.name.replace(/\.pbn$/i, '')
      const dealsWithCategory = parsed.map(deal => ({
        ...deal,
        subfolder: deal.subfolder || category,
        category: deal.category || category
      }))
      deals.value = dealsWithCategory
      currentDealIndex.value = 0
      practice.loadDeal(dealsWithCategory[0])
      practice.resetStats()
    } else {
      alert('No deals found in the PBN file')
    }
  } catch (err) {
    console.error('Error loading PBN file:', err)
    alert('Error loading PBN file: ' + err.message)
  }
}

async function loadBundledFile(file) {
  try {
    const response = await fetch(file.url)
    if (!response.ok) throw new Error('Failed to fetch file')
    const content = await response.text()
    const parsed = parsePbn(content)
    if (parsed.length > 0) {
      // Set the subfolder/category on each deal for skill tracking
      const dealsWithCategory = parsed.map(deal => ({
        ...deal,
        subfolder: file.name,
        category: file.name
      }))
      deals.value = dealsWithCategory
      currentDealIndex.value = 0
      practice.loadDeal(dealsWithCategory[0])
      practice.resetStats()
    }
  } catch (err) {
    console.error('Error loading bundled file:', err)
    alert('Error loading file: ' + err.message)
  }
}

// Handle lesson loaded from LessonBrowser
function handleLessonLoad({ subfolder, name, category, content }) {
  const parsed = parsePbn(content)
  if (parsed.length > 0) {
    const dealsWithCategory = parsed.map(deal => ({
      ...deal,
      subfolder: deal.subfolder || subfolder,
      category: deal.category || category
    }))
    deals.value = dealsWithCategory
    currentDealIndex.value = 0
    practice.loadDeal(dealsWithCategory[0])
    practice.resetStats()
  } else {
    alert('No deals found in the lesson file')
  }
}

// Bidding
function onBid(bid) {
  const correct = practice.makeBid(bid)
  // Feedback is handled via reactive state
}

function onContinue() {
  practice.acceptCorrectBid()
}

// Navigation
function prevDeal() {
  if (currentDealIndex.value > 0) {
    currentDealIndex.value--
  }
}

function nextDeal() {
  if (currentDealIndex.value < deals.value.length - 1) {
    currentDealIndex.value++
  }
}

function gotoDeal(index) {
  if (index >= 0 && index < deals.value.length) {
    currentDealIndex.value = index
  }
}

// Return to lobby (lesson selection)
function returnToLobby() {
  deals.value = []
  currentDealIndex.value = 0
  practice.resetStats()
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #ddd;
}

.app-header h1 {
  font-size: 24px;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats {
  display: flex;
  gap: 12px;
  font-size: 16px;
  font-weight: bold;
}

.stats .correct {
  color: #4caf50;
}

.stats .correct::before {
  content: '✓ ';
}

.stats .wrong {
  color: #d32f2f;
}

.stats .wrong::before {
  content: '✗ ';
}

.user-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.progress-btn {
  padding: 6px 12px;
  border-radius: 16px;
  background: #f0f0f0;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.progress-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.lobby-btn {
  padding: 6px 12px;
  border-radius: 16px;
  background: #fff3e0;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #e65100;
  cursor: pointer;
  transition: all 0.2s;
}

.lobby-btn:hover {
  background: #ffe0b2;
  color: #bf360c;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Two-column practice layout for desktop */
.practice-layout {
  display: grid;
  grid-template-columns: auto auto;
  gap: 32px;
  align-items: start;
  justify-content: center;
}

.practice-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.practice-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.no-deals {
  text-align: center;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
}

.no-deals h2 {
  margin-bottom: 16px;
}

.no-deals p {
  margin-bottom: 12px;
  color: #666;
}

.browse-lessons-btn {
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-bottom: 24px;
}

.browse-lessons-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.load-file-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.load-file-section p {
  margin-bottom: 8px;
  font-size: 13px;
  color: #888;
}

/* Legacy bidding-area - now integrated into practice-right */

.bidding-box-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.turn-indicator {
  font-size: 16px;
  font-weight: 500;
  color: #007bff;
}

.prompt-text {
  max-width: 400px;
  padding: 12px 16px;
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  text-align: left;
  white-space: pre-wrap;
}

.auction-complete {
  text-align: center;
  padding: 20px;
  background: #e8f5e9;
  border-radius: 8px;
  max-width: 500px;
}

.auction-complete h3 {
  color: #4caf50;
  margin-bottom: 12px;
}

.full-commentary {
  text-align: left;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.next-deal-btn {
  padding: 12px 24px;
  border: none;
  background: #4caf50;
  color: white;
  font-size: 16px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
}

.next-deal-btn:hover {
  background: #388e3c;
}

/* Instruction mode styles */
.instruction-panel {
  max-width: 500px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.instruction-progress {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.instruction-text-container {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 8px;
}

.instruction-text {
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 12px;
}

.instruction-text.previous {
  color: #999;
  border-left: 2px solid #ddd;
  padding-left: 12px;
  margin-left: 4px;
}

.instruction-text.current {
  color: #333;
}

/* Suit symbol colors */
.suit-red {
  color: #d32f2f;
}

.suit-black {
  color: #000;
}

.instruction-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.instruction-btn {
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.instruction-btn.primary {
  background: #2196f3;
  color: white;
}

.instruction-btn.primary:hover {
  background: #1976d2;
}

.instruction-btn.secondary {
  background: #e0e0e0;
  color: #333;
}

.instruction-btn.secondary:hover {
  background: #d0d0d0;
}

/* Display mode styles */
.display-commentary {
  max-width: 500px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

.load-another {
  text-align: center;
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.load-link {
  color: #666;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  background: none;
  border: none;
  padding: 0;
}

.load-link:hover {
  color: #007bff;
}

.separator {
  color: #ccc;
  font-size: 13px;
}

/* Tablet breakpoint - stack layout vertically */
@media (max-width: 900px) {
  .practice-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .practice-right {
    align-items: stretch;
  }
}

@media (max-width: 600px) {
  .app-header {
    flex-direction: column;
    gap: 8px;
  }

  .app-header h1 {
    font-size: 20px;
  }
}
</style>

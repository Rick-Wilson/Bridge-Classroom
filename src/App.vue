<template>
  <!-- Welcome Screen (shown when no authenticated user) -->
  <WelcomeScreen
    v-if="!isAuthenticated"
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
        <div class="stats" v-if="practice.state.correctCount + practice.state.wrongCount > 0">
          <span class="correct">{{ practice.state.correctCount }}</span>
          <span class="wrong">{{ practice.state.wrongCount }}</span>
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
        <h2>Load Practice Deals</h2>
        <p>Select a PBN file to start practicing:</p>
        <input
          type="file"
          accept=".pbn"
          @change="onFileSelect"
          ref="fileInput"
        />
        <div v-if="bundledFiles.length" class="bundled-files">
          <p>Or choose a bundled set:</p>
          <button
            v-for="file in bundledFiles"
            :key="file.name"
            class="bundled-btn"
            @click="loadBundledFile(file)"
          >
            {{ file.name }}
          </button>
        </div>
      </div>

      <!-- Practice interface -->
      <template v-else>
        <!-- Deal info -->
        <DealInfo
          :boardNumber="currentDeal?.boardNumber"
          :dealer="currentDeal?.dealer"
          :vulnerable="currentDeal?.vulnerable"
          :contract="currentDeal?.contract"
          :declarer="currentDeal?.declarer"
          :showContract="practice.state.auctionComplete"
          :title="dealTitle"
        />

        <!-- Bridge table with hands -->
        <BridgeTable
          :hands="currentDeal?.hands || {}"
          :hiddenSeats="practice.state.auctionComplete ? [] : practice.hiddenSeats.value"
          :showHcp="practice.state.auctionComplete"
        />

        <!-- Auction and bidding area -->
        <div class="bidding-area">
          <AuctionTable
            :bids="practice.state.displayedBids"
            :dealer="currentDeal?.dealer || 'N'"
            :currentBidIndex="practice.state.currentBidIndex"
            :wrongBidIndex="practice.state.wrongBidIndex"
            :correctBidIndex="practice.state.correctBidIndex"
            :showTurnIndicator="practice.currentBidHasPrompt.value"
          />

          <!-- Bidding box (only show when there's a prompt requiring user input) -->
          <div v-if="!practice.state.auctionComplete && !practice.state.wrongBid && practice.currentBidHasPrompt.value" class="bidding-box-container">
            <!-- Prompt text from PBN commentary -->
            <div v-if="practice.currentPrompt.value?.promptText" class="prompt-text">
              {{ practice.currentPrompt.value.promptText }}
            </div>
            <BiddingBox
              :lastBid="practice.lastContractBid.value"
              :canDouble="practice.canDouble.value"
              :canRedouble="practice.canRedouble.value"
              @bid="onBid"
            />
          </div>

          <!-- Feedback panel for wrong bids -->
          <FeedbackPanel
            :visible="!!practice.state.wrongBid"
            type="wrong"
            :wrongBid="practice.state.wrongBid"
            :correctBid="practice.state.correctBid"
            :commentary="practice.currentExplanation.value"
            @continue="onContinue"
          />

          <!-- Auction complete panel -->
          <div v-if="practice.state.auctionComplete" class="auction-complete">
            <h3>Auction Complete</h3>
            <div v-if="currentDeal?.commentary" class="full-commentary">
              {{ stripControlDirectives(currentDeal.commentary) }}
            </div>
            <button class="next-deal-btn" @click="nextDeal">
              Next Deal →
            </button>
          </div>
        </div>

        <!-- Navigation -->
        <DealNavigator
          :deals="deals"
          :currentIndex="currentDealIndex"
          @prev="prevDeal"
          @next="nextDeal"
          @goto="gotoDeal"
        />

        <!-- Load different file -->
        <div class="load-another">
          <input
            type="file"
            accept=".pbn"
            @change="onFileSelect"
            id="loadAnother"
            style="display: none"
          />
          <label for="loadAnother" class="load-link">Load different PBN file</label>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { parsePbn, getDealTitle } from './utils/pbnParser.js'
import { stripControlDirectives } from './utils/cardFormatting.js'
import { useBiddingPractice } from './composables/useBiddingPractice.js'
import { useAppConfig } from './composables/useAppConfig.js'
import { useUserStore } from './composables/useUserStore.js'
import { useAssignmentStore } from './composables/useAssignmentStore.js'
import { useDataSync } from './composables/useDataSync.js'
import { useObservationStore } from './composables/useObservationStore.js'

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

// Composables
const appConfig = useAppConfig()
const userStore = useUserStore()
const assignmentStore = useAssignmentStore()
const dataSync = useDataSync()
const observationStore = useObservationStore()

// Practice state
const practice = useBiddingPractice()

// UI state
const showSettings = ref(false)
const showProgress = ref(false)

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
  appConfig.initializeFromUrl()
  userStore.initialize()
  assignmentStore.initializeFromUrl()
  observationStore.initialize()

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
  return getDealTitle(currentDeal.value)
})

// Load deal when index changes
watch(currentDealIndex, () => {
  if (currentDeal.value) {
    practice.loadDeal(currentDeal.value)
  }
})

// Trigger sync when new observations are recorded
watch(() => observationStore.pendingCount.value, (newCount, oldCount) => {
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
      deals.value = parsed
      currentDealIndex.value = 0
      practice.loadDeal(parsed[0])
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
      deals.value = parsed
      currentDealIndex.value = 0
      practice.loadDeal(parsed[0])
      practice.resetStats()
    }
  } catch (err) {
    console.error('Error loading bundled file:', err)
    alert('Error loading file: ' + err.message)
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
  max-width: 800px;
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

.no-deals input[type="file"] {
  margin-bottom: 20px;
}

.bundled-files {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.bundled-btn {
  margin: 4px;
  padding: 10px 20px;
  border: 1px solid #007bff;
  background: #fff;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.bundled-btn:hover {
  background: #007bff;
  color: #fff;
}

.bidding-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

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

.load-another {
  text-align: center;
  margin-top: 8px;
}

.load-link {
  color: #666;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.load-link:hover {
  color: #007bff;
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

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
      <h1>{{ deals.length ? dealTitle : appTitle }}</h1>
      <div class="header-right">
        <SyncStatus />
        <button class="progress-btn" @click="showProgress = true" title="View Progress">
          Progress
        </button>
        <button class="accomplishments-btn" @click="showAccomplishments = true" title="View Accomplishments">
          Accomplishments
        </button>
        <button v-if="teacherRole.isTeacher.value" class="teacher-btn" @click="showTeacherView = true; selectedStudentId = null; selectedStudentName = ''" title="View Students">
          Students
        </button>
        <button v-if="deals.length && currentCollection" class="lessons-btn" @click="returnToLessons" :title="'Back to ' + getCollection(currentCollection)?.name">
          {{ getCollection(currentCollection)?.name }}
        </button>
        <button v-if="currentCollection" class="lobby-btn" @click="returnToLobby" title="Return to lobby">
          Lobby
        </button>
        <div class="stats" v-if="totalCorrect + totalWrong > 0">
          <span class="correct">{{ totalCorrect }}</span>
          <span class="wrong">{{ totalWrong }}</span>
        </div>
        <button class="user-btn" @click="showSettings = true" :title="userName">
          {{ userInitials }}
        </button>
      </div>
    </header>

    <main class="app-main">
      <!-- Assignment Banner -->
      <AssignmentBanner />
      <!-- Teacher student view -->
      <TeacherStudentList
        v-if="showTeacherView && !selectedStudentId"
        @close="showTeacherView = false"
        @select-student="(id, name) => { selectedStudentId = id; selectedStudentName = name }"
      />
      <TeacherStudentDetail
        v-else-if="showTeacherView && selectedStudentId"
        :studentId="selectedStudentId"
        :studentName="selectedStudentName"
        @back="selectedStudentId = null"
        @navigate-to-lesson="handleTeacherNavigateToLesson"
      />
      <!-- Lobby when no deals and no collection selected -->
      <div v-else-if="!deals.length && !currentCollection" class="lobby">
        <h2>Choose a Lesson Collection</h2>
        <p>Select a collection to browse lessons:</p>
        <div class="collection-cards">
          <button
            v-for="collection in appConfig.COLLECTIONS"
            :key="collection.id"
            class="collection-card"
            @click="selectCollection(collection.id)"
          >
            <span class="collection-icon">{{ collection.icon }}</span>
            <span class="collection-name">{{ collection.name }}</span>
            <span class="collection-desc">{{ collection.description }}</span>
          </button>
        </div>
        <div v-if="appConfig.showLoadPbnOption.value" class="load-file-section">
          <p>Or load your own PBN file:</p>
          <input
            type="file"
            accept=".pbn"
            @change="onFileSelect"
            ref="fileInput"
          />
        </div>
      </div>

      <!-- Collection selected but no lesson loaded yet - show lesson browser inline -->
      <div v-else-if="!deals.length && currentCollection" class="collection-view">
        <h2>{{ getCollection(currentCollection)?.name || currentCollection }}</h2>
        <p class="collection-subtitle">Select a lesson to begin practicing:</p>
        <LessonBrowser
          :visible="true"
          :inline="true"
          :collection="getCollection(currentCollection)"
          @load="handleLessonLoad"
        />
      </div>

      <!-- Practice interface -->
      <template v-else>
        <!-- Two-column layout for desktop -->
        <div class="practice-layout">
          <!-- Left column: Deal info + Bridge table -->
          <div class="practice-left">
            <BoardMasteryStrip
              v-if="deals.length > 1"
              :boardNumbers="deals.map(d => d.boardNumber)"
              :lessonSubfolder="currentDeal?.subfolder || currentDeal?.category || ''"
              :currentIndex="currentDealIndex"
              :forceRedBoard="forceRedBoard"
              :introUrl="introUrl"
              @goto="gotoDeal"
              @open-intro="handleOpenIntro"
            />

            <DealInfo
              :boardNumber="currentDeal?.boardNumber"
              :dealer="currentDeal?.dealer"
              :vulnerable="currentDeal?.vulnerable"
              :contract="currentDeal?.contract"
              :declarer="currentDeal?.declarer"
              :showContract="practice.auctionState.auctionComplete || practice.showOpeningLead.value || (practice.hasSteps.value && !practice.hasBidSteps.value)"
              :openingLead="practice.showOpeningLead.value ? currentDeal?.openingLead : ''"
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
              :clickableSeat="practice.hasCardChoice.value ? practice.studentSeat.value : null"
              @card-click="onCardClick"
            />
          </div>

          <!-- Right column: Tag-driven content -->
          <div class="practice-right">
            <!-- Auction table - shown if deal has auction and [AUCTION off] not triggered -->
            <AuctionTable
              v-if="practice.showAuctionTable.value"
              :bids="practice.hasBidSteps.value ? practice.auctionState.displayedBids : (currentDeal?.auction || [])"
              :dealer="currentDeal?.dealer || 'N'"
              :currentBidIndex="practice.hasBidSteps.value ? practice.auctionState.currentBidIndex : -1"
              :wrongBidIndex="practice.auctionState.wrongBidIndex"
              :correctBidIndex="practice.auctionState.correctBidIndex"
              :showTurnIndicator="practice.hasBidPrompt.value"
            />

            <!-- Feedback panel - shown after wrong bid (between auction and narrative) -->
            <FeedbackPanel
              :visible="!!practice.auctionState.wrongBid"
              type="wrong"
              :wrongBid="practice.auctionState.wrongBid"
              :correctBid="practice.auctionState.correctBid"
              :showContinue="false"
            />

            <!-- Card choice feedback panel - shown after wrong card selection -->
            <FeedbackPanel
              :visible="!!practice.cardChoiceState.wrongCard"
              type="wrong"
              :wrongCardCode="practice.cardChoiceState.wrongCard"
              :correctCardCode="practice.cardChoiceState.correctCard"
              :showContinue="false"
            />

            <!-- Unified commentary panel - shown when deal has interactive steps -->
            <div v-if="practice.hasSteps.value" class="commentary-panel">
              <div class="commentary-text-container" ref="commentaryContainer">
                <!-- Previous steps (greyed out, except last step's explanation which is current context) -->
                <template v-for="(step, idx) in practice.steps.value.slice(0, practice.currentStepIndex.value)" :key="'prev-' + idx">
                  <template v-if="idx >= practice.commentaryStartIndex.value">
                    <span class="narrative-text previous" v-html="colorizeSuits(flowText(step.text))"></span>
                    <span v-if="step.type === 'bid' && step.explanationText"
                      :class="['narrative-text', idx === practice.currentStepIndex.value - 1 && practice.isBidStep.value && !practice.bidAnswered.value ? 'current' : 'previous']"
                      v-html="colorizeSuits(flowText(step.explanationText))"></span>
                  </template>
                </template>
                <!-- Current step text (black) -->
                <span v-if="practice.currentStep.value" class="narrative-text current" v-html="colorizeSuits(flowText(practice.currentStep.value.text))"></span>
                <!-- Bid explanation shown after bid is answered -->
                <span v-if="practice.bidAnswered.value && practice.currentStep.value?.explanationText" class="narrative-text current" v-html="colorizeSuits(flowText(practice.currentStep.value.explanationText))"></span>
              </div>

              <!-- Controls based on current step type -->
              <div class="commentary-controls">
                <!-- Bidding box for bid steps -->
                <div v-if="practice.hasBidPrompt.value" class="bidding-box-wrapper">
                  <BiddingBox
                    :lastBid="practice.lastContractBid.value"
                    :canDouble="practice.canDouble.value"
                    :canRedouble="practice.canRedouble.value"
                    @bid="onBid"
                  />
                </div>
                <!-- Card choice prompt -->
                <div v-else-if="practice.hasCardChoice.value" class="card-choice-prompt">
                  Click on the card you would choose
                </div>
                <!-- Back button (left of Next) -->
                <button
                  v-if="practice.canGoBack.value"
                  class="instruction-btn secondary"
                  @click="onStepBack"
                >
                  ← Back
                </button>
                <!-- Next/Rotate button for non-bid, non-card-choice steps (including bid explanation dismissal) -->
                <button
                  v-if="!practice.isComplete.value && (practice.bidAnswered.value || (!practice.hasBidPrompt.value && !practice.hasCardChoice.value && practice.currentStep.value && practice.currentStep.value.type !== 'end'))"
                  class="instruction-btn primary"
                  @click="practice.advance()"
                >
                  {{ practice.currentStep.value?.type === 'rotate' ? 'Rotate' : 'Next' }} →
                </button>
                <!-- Next Deal button when complete -->
                <button v-if="practice.isComplete.value && currentDealIndex < deals.length - 1" class="next-deal-btn" @click="nextDeal">
                  Next Deal →
                </button>
              </div>
            </div>

            <!-- Display-only commentary (no interactive steps) -->
            <div v-else-if="currentDeal?.commentary" class="display-commentary" v-html="colorizeSuits(flowText(stripControlDirectives(currentDeal.commentary)))">
            </div>
            <!-- Display-only completion: Next Deal button -->
            <div v-if="!practice.hasSteps.value && practice.isComplete.value && currentDealIndex < deals.length - 1" class="completion-controls">
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

    <!-- Registration toast (brief confirmation after new user creation) -->
    <div v-if="showRegistrationToast" class="registration-toast">
      Account created — your data is encrypted and linked to your email for recovery.
    </div>

    <!-- Progress Dashboard Modal -->
    <div v-if="showProgress" class="modal-overlay" @click.self="showProgress = false">
      <ProgressDashboard @close="showProgress = false" />
    </div>

    <!-- Accomplishments Modal -->
    <div v-if="showAccomplishments" class="modal-overlay" @click.self="showAccomplishments = false">
      <AccomplishmentsView @close="showAccomplishments = false" @navigate-to-deal="handleNavigateToDeal" />
    </div>

    <!-- Floating Intro PDF Viewer (non-modal) -->
    <IntroPdfViewer
      :visible="showIntroPdf"
      :url="introPdfUrl || ''"
      @close="showIntroPdf = false"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { parsePbn, getDealTitle } from './utils/pbnParser.js'
import { stripControlDirectives, colorizeSuits, flowText } from './utils/cardFormatting.js'
import { useDealPractice } from './composables/useDealPractice.js'
import { useAppConfig } from './composables/useAppConfig.js'
import { useUserStore } from './composables/useUserStore.js'
import { useAssignmentStore } from './composables/useAssignmentStore.js'
import { useDataSync } from './composables/useDataSync.js'
import { useAccomplishments } from './composables/useAccomplishments.js'
import { useStudentProgress } from './composables/useStudentProgress.js'
import { useObservationStore } from './composables/useObservationStore.js'
import { useBoardMastery } from './composables/useBoardMastery.js'
import { useTeacherRole } from './composables/useTeacherRole.js'

import BridgeTable from './components/BridgeTable.vue'
import BiddingBox from './components/BiddingBox.vue'
import AuctionTable from './components/AuctionTable.vue'
import DealInfo from './components/DealInfo.vue'
import DealNavigator from './components/DealNavigator.vue'
import FeedbackPanel from './components/FeedbackPanel.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import AssignmentBanner from './components/AssignmentBanner.vue'
import SyncStatus from './components/SyncStatus.vue'
import ProgressDashboard from './components/ProgressDashboard.vue'
import AccomplishmentsView from './components/AccomplishmentsView.vue'
import TeacherDashboard from './components/teacher/TeacherDashboard.vue'
import TeacherStudentList from './components/TeacherStudentList.vue'
import TeacherStudentDetail from './components/TeacherStudentDetail.vue'
import LessonBrowser from './components/LessonBrowser.vue'
import BoardMasteryStrip from './components/BoardMasteryStrip.vue'
import IntroPdfViewer from './components/IntroPdfViewer.vue'

// Composables
const appConfig = useAppConfig()
const userStore = useUserStore()
const assignmentStore = useAssignmentStore()
const dataSync = useDataSync()
const teacherRole = useTeacherRole()

// Unified practice state - tag-driven, no modes
const practice = useDealPractice()

// UI state
const showSettings = ref(false)
const showProgress = ref(false)
const showAccomplishments = ref(false)
const isTeacherMode = ref(false)
const showTeacherView = ref(false)
const selectedStudentId = ref(null)
const selectedStudentName = ref('')
const commentaryContainer = ref(null)
const currentCollection = ref(null)
const currentLesson = ref(null)  // { id, name, category }

// Local mastery override: force a board circle to red during mid-board wrong bid
const forceRedBoard = ref(null)

// Intro PDF state
const introUrl = ref(null)
const showIntroPdf = ref(false)
const showRegistrationToast = ref(false)
const introPdfUrl = ref(null)

// Auto-scroll to show current element (keep its first line visible)
function scrollToCurrentElement(container, selector = '.current') {
  if (!container) return
  const currentEl = container.querySelector(selector)
  if (currentEl) {
    // Scroll so the current element's top is at the top of the visible area
    container.scrollTop = currentEl.offsetTop - container.offsetTop
  }
}

// Auto-scroll commentary when step changes
watch(() => practice.currentStepIndex.value, () => {
  nextTick(() => {
    scrollToCurrentElement(commentaryContainer.value, '.narrative-text.current')
  })
})

// Auto-scroll commentary when deal completes
watch(() => practice.isComplete.value, (isComplete) => {
  if (isComplete) {
    nextTick(() => {
      scrollToCurrentElement(commentaryContainer.value, '.narrative-text.current')
    })
  }
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

  // If a recovery link was clicked while another user is logged in,
  // clear current user so WelcomeScreen renders and handles the claim
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('recover') && urlParams.get('user_id') && userStore.isAuthenticated.value) {
    userStore.currentUserId.value = null
  }

  assignmentStore.initializeFromUrl()
  practice.observationStore.initialize()

  // Check for collection and lesson in URL
  const collectionFromUrl = appConfig.getCollectionFromUrl()
  const lessonFromUrl = appConfig.getLessonFromUrl()

  if (collectionFromUrl) {
    currentCollection.value = collectionFromUrl

    // If lesson is also specified, auto-load it
    if (lessonFromUrl) {
      await loadLessonFromUrl(collectionFromUrl, lessonFromUrl)
    }
  }

  // Initialize data sync (fetches teacher key, registers user, syncs pending data)
  if (userStore.isAuthenticated.value) {
    await dataSync.initialize()
    // Load accomplishments data so board mastery strip can show prior observations
    const accomplishments = useAccomplishments()
    accomplishments.initialize()
    // Check if this user is a teacher
    teacherRole.checkTeacherStatus()
  }
})

// User flow handlers
async function handleUserReady(user) {
  // User is now authenticated, app will show main content
  console.log('User ready:', user.firstName, user.lastName)

  // Show brief registration toast if this is a new user (key backup modal was triggered)
  if (userStore.showKeyBackupModal.value) {
    userStore.dismissKeyBackupModal()
    showRegistrationToast.value = true
    setTimeout(() => { showRegistrationToast.value = false }, 4000)
  }

  // Initialize data sync for the new user (register with server, fetch teacher key)
  await dataSync.initialize()
  // Load accomplishments data for board mastery strip
  const accomplishments = useAccomplishments()
  accomplishments.initialize()
  // Check if this user is a teacher
  teacherRole.checkTeacherStatus()
}

function handleSwitchUser() {
  // Clear all cached per-user data before switching
  useAccomplishments().reset()
  useStudentProgress().clearCache()
  useObservationStore().reset()
  teacherRole.reset()

  // Clear current user to show welcome screen
  userStore.currentUserId.value = null
  showSettings.value = false
  showTeacherView.value = false
  selectedStudentId.value = null
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
  const collection = getCollection(currentCollection.value)
  const prefix = collection?.name ? `${collection.name} - ` : ''
  // Use the TOC lesson name if available (e.g., "Negative Doubles")
  if (currentLesson.value?.name) return prefix + currentLesson.value.name
  if (!currentDeal.value) return ''
  const name = currentDeal.value.subfolder || currentDeal.value.category || ''
  return name ? prefix + name : ''
})

// Load deal when index changes (safety net - primary calls are in nextDeal/gotoDeal)
watch(currentDealIndex, () => {
  if (currentDeal.value) {
    practice.loadDeal(currentDeal.value)
    appConfig.setDealInUrl(currentDeal.value.boardNumber)
  }
}, { flush: 'sync' })

// Trigger sync when new observations are recorded
watch(() => practice.observationStore.pendingCount.value, (newCount, oldCount) => {
  if (newCount > oldCount) {
    // New observation was recorded, trigger debounced sync
    dataSync.triggerSync()
  }
})

// Clear force-red override when deal completes (real computed status takes over)
watch(() => practice.isComplete.value, (isComplete) => {
  if (isComplete) {
    forceRedBoard.value = null
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

    // Cache board numbers for progress/accomplishments views
    const boardMastery = useBoardMastery()
    boardMastery.saveLessonBoardNumbers(subfolder, dealsWithCategory.map(d => d.boardNumber))

    // Store lesson metadata and update URL
    currentLesson.value = { id: subfolder, name, category }
    appConfig.setLessonInUrl(subfolder)
    showIntroPdf.value = false
    checkIntroAvailability()
  } else {
    alert('No deals found in the lesson file')
  }
}

// Board-level stats
const totalCorrect = computed(() => practice.boardState.correctCount)
const totalWrong = computed(() => practice.boardState.wrongCount)

// Bidding
function onBid(bid) {
  const correct = practice.makeBid(bid)
  if (!correct && currentDeal.value) {
    forceRedBoard.value = currentDeal.value.boardNumber
  }
}

// Card choice
function onCardClick({ seat, suit, rank }) {
  const correct = practice.makeCardChoice(suit, rank)
  if (!correct && currentDeal.value) {
    forceRedBoard.value = currentDeal.value.boardNumber
  }
}

// Step back (clears card feedback before going back)
function onStepBack() {
  practice.clearCardFeedback()
  practice.goBack()
}

// Navigation
function prevDeal() {
  if (currentDealIndex.value > 0) {
    currentDealIndex.value--
  }
}

function nextDeal() {
  if (currentDealIndex.value < deals.value.length - 1) {
    forceRedBoard.value = null
    currentDealIndex.value++
    practice.loadDeal(deals.value[currentDealIndex.value])
  }
}

function gotoDeal(index) {
  if (index >= 0 && index < deals.value.length) {
    forceRedBoard.value = null
    currentDealIndex.value = index
    practice.loadDeal(deals.value[index])
  }
}

// Navigate to a specific deal from a modal view
async function navigateToDeal({ subfolder, dealNumber }) {
  // If the current lesson matches, just navigate to the deal
  if (currentLesson.value?.id === subfolder && deals.value.length > 0) {
    const index = deals.value.findIndex(d => d.boardNumber === dealNumber)
    if (index >= 0) {
      gotoDeal(index)
      return
    }
  }

  // Otherwise, try to load the lesson from known collections
  for (const collection of appConfig.COLLECTIONS) {
    try {
      const filename = subfolder.includes('/') ? subfolder.split('/').pop() : subfolder
      const url = `${collection.baseUrl}/${filename}.pbn`
      const response = await fetch(url)
      if (!response.ok) continue

      const content = await response.text()
      currentCollection.value = collection.id
      appConfig.setCollectionInUrl(collection.id)
      handleLessonLoad({ subfolder, name: subfolder, category: '', content })

      // Navigate to the specific deal
      const index = deals.value.findIndex(d => d.boardNumber === dealNumber)
      if (index >= 0) {
        gotoDeal(index)
      }
      return
    } catch {
      // Try next collection
    }
  }
}

function handleNavigateToDeal(payload) {
  showAccomplishments.value = false
  showTeacherView.value = false
  selectedStudentId.value = null
  navigateToDeal(payload)
}

function handleTeacherNavigateToLesson(subfolder, boardNumber) {
  showTeacherView.value = false
  selectedStudentId.value = null
  navigateToDeal({ subfolder, dealNumber: boardNumber || 1 })
}

// Return to lesson browser (keep collection, clear deals)
function returnToLessons() {
  currentLesson.value = null
  appConfig.setLessonInUrl(null)
  deals.value = []
  currentDealIndex.value = 0
  practice.resetStats()
  showIntroPdf.value = false
  introUrl.value = null
  showTeacherView.value = false
  selectedStudentId.value = null
}

// Return to lobby (exit collection and clear deals)
function returnToLobby() {
  currentCollection.value = null
  currentLesson.value = null
  appConfig.setCollectionInUrl(null)
  appConfig.setLessonInUrl(null)
  deals.value = []
  currentDealIndex.value = 0
  practice.resetStats()
  showIntroPdf.value = false
  introUrl.value = null
  showTeacherView.value = false
  selectedStudentId.value = null
}

// Check if an intro PDF exists for the current lesson
async function checkIntroAvailability() {
  introUrl.value = null
  if (!currentCollection.value || !currentLesson.value) return

  const collection = getCollection(currentCollection.value)
  if (!collection) return

  const lessonId = currentLesson.value.id
  const filename = lessonId.includes('/') ? lessonId.split('/').pop() : lessonId
  const url = `${collection.baseUrl}/${filename}_Intro.pdf`

  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (response.ok) {
      introUrl.value = url
    }
  } catch {
    // Network error or CORS issue - silently hide button
  }
}

// Open intro PDF (floating viewer on desktop, new tab on mobile)
function handleOpenIntro(url) {
  if (window.innerWidth < 600) {
    window.open(url, '_blank')
  } else {
    introPdfUrl.value = url
    showIntroPdf.value = true
  }
}

// Select a lesson collection (updates URL and shows inline lesson browser)
function selectCollection(collectionId) {
  currentCollection.value = collectionId
  appConfig.setCollectionInUrl(collectionId)
}

// Get collection info by ID
function getCollection(collectionId) {
  return appConfig.COLLECTIONS.find(c => c.id === collectionId)
}

/**
 * Auto-load lesson from URL parameters
 * Fetches TOC, finds lesson, loads PBN file
 */
async function loadLessonFromUrl(collectionId, lessonId) {
  const collection = getCollection(collectionId)
  if (!collection) {
    console.error('Collection not found:', collectionId)
    return false
  }

  try {
    // Fetch the table of contents
    const tocResponse = await fetch(collection.tocUrl)
    if (!tocResponse.ok) {
      throw new Error(`Failed to load TOC: ${tocResponse.statusText}`)
    }
    const toc = await tocResponse.json()

    // Find the lesson in the TOC
    let foundLesson = null
    let foundCategory = null
    for (const category of toc.categories || []) {
      const lesson = category.lessons?.find(l => l.id === lessonId)
      if (lesson) {
        foundLesson = lesson
        foundCategory = category
        break
      }
    }

    if (!foundLesson) {
      console.error('Lesson not found in TOC:', lessonId)
      return false
    }

    // Build the lesson URL (extract filename from lesson ID)
    const filename = lessonId.includes('/') ? lessonId.split('/').pop() : lessonId
    const lessonUrl = `${collection.baseUrl}/${filename}.pbn`

    // Fetch the lesson PBN file
    const pbnResponse = await fetch(lessonUrl)
    if (!pbnResponse.ok) {
      throw new Error(`Failed to load lesson: ${pbnResponse.statusText}`)
    }
    const content = await pbnResponse.text()

    // Parse and load the deals
    const parsed = parsePbn(content)
    if (parsed.length > 0) {
      const dealsWithCategory = parsed.map(deal => ({
        ...deal,
        subfolder: deal.subfolder || lessonId,
        category: deal.category || foundCategory.name
      }))
      deals.value = dealsWithCategory

      // Restore deal number from URL if present
      const dealNum = appConfig.getDealFromUrl()
      const dealIdx = dealNum ? dealsWithCategory.findIndex(d => d.boardNumber === dealNum) : -1
      currentDealIndex.value = dealIdx >= 0 ? dealIdx : 0
      practice.loadDeal(dealsWithCategory[currentDealIndex.value])
      practice.resetStats()

      // Store lesson metadata (URL already has the params)
      currentLesson.value = {
        id: lessonId,
        name: foundLesson.name,
        category: foundCategory.name
      }
      checkIntroAvailability()
      return true
    }
    return false
  } catch (err) {
    console.error('Error loading lesson from URL:', err)
    return false
  }
}
</script>

<style>
.registration-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #2e7d32;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 3000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: toast-fade 4s ease-in-out;
  pointer-events: none;
}

@keyframes toast-fade {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

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

.accomplishments-btn {
  padding: 6px 12px;
  border-radius: 16px;
  background: #e8f5e9;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #388e3c;
  cursor: pointer;
  transition: all 0.2s;
}

.accomplishments-btn:hover {
  background: #c8e6c9;
  color: #2e7d32;
}

.teacher-btn {
  padding: 6px 12px;
  border-radius: 16px;
  background: #e8eaf6;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #3949ab;
  cursor: pointer;
  transition: all 0.2s;
}

.teacher-btn:hover {
  background: #c5cae9;
  color: #283593;
}

.lessons-btn {
  padding: 6px 12px;
  border-radius: 16px;
  background: #e3f2fd;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #1976d2;
  cursor: pointer;
  transition: all 0.2s;
}

.lessons-btn:hover {
  background: #bbdefb;
  color: #1565c0;
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
  grid-template-columns: minmax(0, 1fr) 500px;
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

/* Lobby and Collection views */
.lobby, .collection-view {
  text-align: center;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
}

.lobby h2, .collection-view h2 {
  margin-bottom: 8px;
  color: #333;
}

.lobby > p, .collection-view > p {
  margin-bottom: 24px;
  color: #666;
}

.collection-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  margin-bottom: 32px;
}

.collection-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 200px;
}

.collection-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.collection-icon {
  font-size: 48px;
  line-height: 1;
}

.collection-name {
  font-size: 20px;
  font-weight: 600;
}

.collection-desc {
  font-size: 13px;
  opacity: 0.9;
  max-width: 180px;
}

.collection-subtitle {
  margin-bottom: 16px;
  color: #666;
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

.back-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  background: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}

.back-btn:hover {
  background: #d0d0d0;
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

.full-narrative {
  text-align: left;
  font-size: 14px;
  line-height: 1.6;
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  max-height: 350px;
  overflow-y: auto;
}

.completion-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  align-items: center;
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

/* Bidding narrative styles - accumulating text */
.bidding-narrative-container {
  max-width: 500px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bidding-narrative {
  max-height: 250px;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 8px;
  font-size: 15px;
  line-height: 1.6;
}

.narrative-text {
  display: block;
  white-space: pre-wrap;
  margin-bottom: 8px;
}

.narrative-text.previous {
  color: #999;
}

.narrative-text.current {
  color: #333;
}

.bidding-box-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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

.commentary-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.commentary-controls .bidding-box-wrapper,
.commentary-controls .card-choice-prompt {
  width: 100%;
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

.card-choice-prompt {
  font-size: 15px;
  font-weight: 500;
  color: #1976d2;
  padding: 10px 20px;
  background: #e3f2fd;
  border-radius: 4px;
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

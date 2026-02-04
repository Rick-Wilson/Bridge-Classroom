<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="lesson-browser">
      <div class="browser-header">
        <h2>Browse Lessons</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="browser-content">
        <!-- Category accordion -->
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-section"
        >
          <button
            class="category-header"
            :class="{ expanded: expandedCategories.includes(category.id) }"
            @click="toggleCategory(category.id)"
          >
            <span class="expand-icon">{{ expandedCategories.includes(category.id) ? '▼' : '▶' }}</span>
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ category.count }} lessons</span>
          </button>

          <div v-if="expandedCategories.includes(category.id)" class="lesson-list">
            <button
              v-for="subfolder in category.subfolders"
              :key="subfolder"
              class="lesson-item"
              :class="{ loading: loadingLesson === subfolder }"
              @click="selectLesson(subfolder)"
            >
              <span class="lesson-name">{{ getLessonName(subfolder) }}</span>
              <span class="lesson-description">{{ getLessonDescription(subfolder) }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { CATEGORIES, BAKER_BRIDGE_TAXONOMY } from '../utils/bakerBridgeTaxonomy.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'load'])

const categories = CATEGORIES
const expandedCategories = ref([])
const loadingLesson = ref(null)
const error = ref(null)

function toggleCategory(categoryId) {
  const idx = expandedCategories.value.indexOf(categoryId)
  if (idx >= 0) {
    expandedCategories.value.splice(idx, 1)
  } else {
    expandedCategories.value.push(categoryId)
  }
}

function getLessonName(subfolder) {
  const info = BAKER_BRIDGE_TAXONOMY[subfolder]
  return info ? info.name : subfolder
}

function getLessonDescription(subfolder) {
  const info = BAKER_BRIDGE_TAXONOMY[subfolder]
  return info ? info.description : ''
}

// GitHub raw URL for Baker Bridge PBN files
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/Rick-Wilson/Baker-Bridge/main/Package'

/**
 * Convert taxonomy subfolder to actual filename
 * e.g., 'Bidpractice/Set1' -> 'Set1'
 */
function getFilename(subfolder) {
  // Handle Bidpractice subfolders - extract just the Set name
  if (subfolder.includes('/')) {
    return subfolder.split('/').pop()
  }
  return subfolder
}

async function selectLesson(subfolder) {
  error.value = null
  loadingLesson.value = subfolder

  try {
    // Construct the GitHub raw URL for the PBN file
    const filename = getFilename(subfolder)
    const url = `${GITHUB_BASE_URL}/${filename}.pbn`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load lesson: ${response.statusText}`)
    }

    const content = await response.text()
    const lessonInfo = BAKER_BRIDGE_TAXONOMY[subfolder] || { name: subfolder }

    // Emit the loaded content along with metadata
    emit('load', {
      subfolder,
      name: lessonInfo.name,
      category: lessonInfo.category,
      content
    })

    emit('close')
  } catch (err) {
    console.error('Error loading lesson:', err)
    error.value = `Could not load "${getLessonName(subfolder)}". The lesson may not be available yet.`
  } finally {
    loadingLesson.value = null
  }
}
</script>

<style scoped>
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

.lesson-browser {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.browser-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.browser-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.category-section {
  border-bottom: 1px solid #f0f0f0;
}

.category-section:last-child {
  border-bottom: none;
}

.category-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 15px;
  transition: background 0.15s;
}

.category-header:hover {
  background: #f8f8f8;
}

.category-header.expanded {
  background: #f5f5f5;
}

.expand-icon {
  font-size: 10px;
  color: #666;
  width: 12px;
}

.category-name {
  flex: 1;
  font-weight: 600;
  color: #333;
}

.category-count {
  font-size: 13px;
  color: #888;
}

.lesson-list {
  background: #fafafa;
  padding: 4px 0;
}

.lesson-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 20px 10px 44px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.lesson-item:hover {
  background: #e8f4fd;
}

.lesson-item.loading {
  opacity: 0.6;
  cursor: wait;
}

.lesson-name {
  font-size: 14px;
  font-weight: 500;
  color: #1976d2;
}

.lesson-description {
  font-size: 12px;
  color: #666;
}

.error-message {
  padding: 12px 20px;
  background: #fff3f3;
  color: #d32f2f;
  font-size: 13px;
  border-top: 1px solid #ffcdd2;
}

@media (max-width: 600px) {
  .lesson-browser {
    max-height: 90vh;
  }

  .browser-header {
    padding: 12px 16px;
  }

  .browser-header h2 {
    font-size: 18px;
  }

  .category-header {
    padding: 12px 16px;
    font-size: 14px;
  }

  .lesson-item {
    padding: 8px 16px 8px 36px;
  }
}
</style>

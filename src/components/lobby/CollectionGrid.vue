<template>
  <div class="collection-grid">
    <h2 class="grid-title">Lesson Collections</h2>
    <p class="grid-subtitle">Select a collection to browse lessons:</p>
    <div class="collection-cards">
      <CollectionCard
        v-for="collection in collections"
        :key="collection.id"
        :collection="collection"
        @click="$emit('select-collection', collection.id)"
      />
    </div>
    <div v-if="appConfig.showLoadPbnOption.value" class="load-file-section">
      <p>Or load your own PBN file:</p>
      <input type="file" accept=".pbn" @change="$emit('load-file', $event)" />
    </div>
  </div>
</template>

<script setup>
import { useAppConfig } from '../../composables/useAppConfig.js'
import CollectionCard from './CollectionCard.vue'

defineEmits(['select-collection', 'load-file'])

const appConfig = useAppConfig()
const collections = appConfig.COLLECTIONS
</script>

<style scoped>
.collection-grid {
  text-align: center;
  padding: 32px 0;
}

.grid-title {
  font-family: var(--font-heading, 'Source Serif 4', serif);
  font-size: 24px;
  color: var(--text-primary, #333);
  margin-bottom: 8px;
}

.grid-subtitle {
  color: var(--text-secondary, #666);
  margin-bottom: 24px;
}

.collection-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
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
</style>

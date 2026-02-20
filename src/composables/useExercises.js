import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Singleton reactive state
const exercises = ref([])
const currentExercise = ref(null)
const loading = ref(false)
const error = ref(null)

export function useExercises() {
  /** Fetch exercises with optional filters */
  async function fetchExercises(filters = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (filters.created_by) params.set('created_by', filters.created_by)
      if (filters.curriculum_path) params.set('curriculum_path', filters.curriculum_path)
      if (filters.visibility) params.set('visibility', filters.visibility)

      const qs = params.toString()
      const url = `${API_URL}/exercises${qs ? '?' + qs : ''}`

      const response = await fetch(url, {
        headers: { 'x-api-key': API_KEY }
      })
      if (!response.ok) {
        const text = await response.text()
        error.value = text || `Server error (${response.status})`
        return null
      }
      const data = await response.json()
      if (data.success) {
        exercises.value = data.exercises
      } else {
        error.value = data.error || 'Failed to fetch exercises'
      }
      return data
    } catch (err) {
      console.error('Failed to fetch exercises:', err)
      error.value = 'Unable to connect to server'
      return null
    } finally {
      loading.value = false
    }
  }

  /** Fetch exercise detail with board list */
  async function fetchExerciseDetail(exerciseId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(
        `${API_URL}/exercises/${encodeURIComponent(exerciseId)}`,
        { headers: { 'x-api-key': API_KEY } }
      )
      if (!response.ok) {
        const text = await response.text()
        error.value = text || `Server error (${response.status})`
        return null
      }
      const data = await response.json()
      if (data.success) {
        currentExercise.value = data.exercise
      } else {
        error.value = data.error || 'Failed to fetch exercise'
      }
      return data
    } catch (err) {
      console.error('Failed to fetch exercise detail:', err)
      error.value = 'Unable to connect to server'
      return null
    } finally {
      loading.value = false
    }
  }

  /** Create a new exercise with boards */
  async function createExercise({ name, description, created_by, curriculum_path, visibility, boards }) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_URL}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          name,
          description: description || null,
          created_by: created_by || null,
          curriculum_path: curriculum_path || null,
          visibility: visibility || 'public',
          boards
        })
      })
      if (!response.ok) {
        const text = await response.text()
        error.value = text || `Server error (${response.status})`
        return { success: false, error: error.value }
      }
      const data = await response.json()
      if (data.success) {
        exercises.value = [data.exercise, ...exercises.value]
      } else {
        error.value = data.error || 'Failed to create exercise'
      }
      return data
    } catch (err) {
      console.error('Failed to create exercise:', err)
      error.value = 'Unable to connect to server'
      return { success: false, error: 'Unable to connect to server' }
    } finally {
      loading.value = false
    }
  }

  /** Update an existing exercise */
  async function updateExercise(exerciseId, updates) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(
        `${API_URL}/exercises/${encodeURIComponent(exerciseId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify(updates)
        }
      )
      if (!response.ok) {
        const text = await response.text()
        error.value = text || `Server error (${response.status})`
        return { success: false, error: error.value }
      }
      const data = await response.json()
      if (!data.success) {
        error.value = data.error || 'Failed to update exercise'
      }
      return data
    } catch (err) {
      console.error('Failed to update exercise:', err)
      error.value = 'Unable to connect to server'
      return { success: false, error: 'Unable to connect to server' }
    } finally {
      loading.value = false
    }
  }

  /** Delete an exercise */
  async function deleteExercise(exerciseId) {
    try {
      const response = await fetch(
        `${API_URL}/exercises/${encodeURIComponent(exerciseId)}`,
        {
          method: 'DELETE',
          headers: { 'x-api-key': API_KEY }
        }
      )
      if (!response.ok) {
        const text = await response.text()
        error.value = text || `Server error (${response.status})`
        return { success: false, error: error.value }
      }
      const data = await response.json()
      if (data.success) {
        exercises.value = exercises.value.filter(e => e.id !== exerciseId)
      }
      return data
    } catch (err) {
      console.error('Failed to delete exercise:', err)
      return { success: false, error: 'Unable to connect to server' }
    }
  }

  /** Reset all state */
  function reset() {
    exercises.value = []
    currentExercise.value = null
    loading.value = false
    error.value = null
  }

  return {
    exercises,
    currentExercise,
    loading,
    error,
    fetchExercises,
    fetchExerciseDetail,
    createExercise,
    updateExercise,
    deleteExercise,
    reset
  }
}

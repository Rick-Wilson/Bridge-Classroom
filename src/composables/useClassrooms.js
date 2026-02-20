import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const API_KEY = import.meta.env.VITE_API_KEY || ''

// Singleton reactive state
const teacherClassrooms = ref([])
const currentClassroom = ref(null)
const loading = ref(false)
const error = ref(null)

export function useClassrooms() {
  // ---- Teacher methods ----

  /** Fetch all classrooms for a teacher (with member counts) */
  async function fetchTeacherClassrooms(teacherId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(
        `${API_URL}/classrooms?teacher_id=${encodeURIComponent(teacherId)}`,
        { headers: { 'x-api-key': API_KEY } }
      )
      const data = await response.json()
      if (data.success) {
        teacherClassrooms.value = data.classrooms
      } else {
        error.value = data.error || 'Failed to fetch classrooms'
      }
      return data
    } catch (err) {
      console.error('Failed to fetch classrooms:', err)
      error.value = 'Unable to connect to server'
      return null
    } finally {
      loading.value = false
    }
  }

  /** Create a new classroom */
  async function createClassroom(teacherId, name, description) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_URL}/classrooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          teacher_id: teacherId,
          name,
          description: description || null
        })
      })
      if (!response.ok) {
        const text = await response.text()
        error.value = text || `Server error (${response.status})`
        return { success: false, error: error.value }
      }
      const data = await response.json()
      if (data.success) {
        teacherClassrooms.value = [data.classroom, ...teacherClassrooms.value]
      } else {
        error.value = data.error || 'Failed to create classroom'
      }
      return data
    } catch (err) {
      console.error('Failed to create classroom:', err)
      error.value = 'Unable to connect to server'
      return { success: false, error: 'Unable to connect to server' }
    } finally {
      loading.value = false
    }
  }

  /** Fetch classroom detail with member roster */
  async function fetchClassroomDetail(classroomId) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(
        `${API_URL}/classrooms/${encodeURIComponent(classroomId)}`,
        { headers: { 'x-api-key': API_KEY } }
      )
      const data = await response.json()
      if (data.success) {
        currentClassroom.value = data.classroom
      } else {
        error.value = data.error || 'Failed to fetch classroom'
      }
      return data
    } catch (err) {
      console.error('Failed to fetch classroom detail:', err)
      error.value = 'Unable to connect to server'
      return null
    } finally {
      loading.value = false
    }
  }

  /** Remove a member from a classroom (teacher action) */
  async function removeMember(classroomId, studentId) {
    try {
      const response = await fetch(
        `${API_URL}/classrooms/${encodeURIComponent(classroomId)}/members/${encodeURIComponent(studentId)}`,
        {
          method: 'DELETE',
          headers: { 'x-api-key': API_KEY }
        }
      )
      const data = await response.json()
      if (data.success && currentClassroom.value) {
        // Update local state
        currentClassroom.value.members = currentClassroom.value.members.filter(
          m => m.student_id !== studentId
        )
        // Update member count in list
        const idx = teacherClassrooms.value.findIndex(c => c.id === classroomId)
        if (idx !== -1) {
          teacherClassrooms.value[idx].member_count--
        }
      }
      return data
    } catch (err) {
      console.error('Failed to remove member:', err)
      return { success: false, error: 'Unable to connect to server' }
    }
  }

  // ---- Student methods ----

  /** Fetch public join info for a classroom (no auth required) */
  async function fetchJoinInfo(joinCode) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(
        `${API_URL}/join/${encodeURIComponent(joinCode)}`
        // No API key — public endpoint
      )
      if (response.status === 404) {
        error.value = 'Classroom not found'
        return null
      }
      const data = await response.json()
      return data
    } catch (err) {
      console.error('Failed to fetch join info:', err)
      error.value = 'Unable to connect to server'
      return null
    } finally {
      loading.value = false
    }
  }

  /** Join a classroom (creates membership + sharing grant) */
  async function joinClassroom(joinCode, studentId, encryptedGrantPayload) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(
        `${API_URL}/join/${encodeURIComponent(joinCode)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify({
            student_id: studentId,
            encrypted_grant_payload: encryptedGrantPayload
          })
        }
      )
      const data = await response.json()
      if (!data.success) {
        error.value = data.error || 'Failed to join classroom'
      }
      return data
    } catch (err) {
      console.error('Failed to join classroom:', err)
      error.value = 'Unable to connect to server'
      return { success: false, error: 'Unable to connect to server' }
    } finally {
      loading.value = false
    }
  }

  /** Student leaves a classroom */
  async function leaveClassroom(classroomId, studentId) {
    try {
      const response = await fetch(
        `${API_URL}/classrooms/${encodeURIComponent(classroomId)}/members/leave`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify({ student_id: studentId })
        }
      )
      return await response.json()
    } catch (err) {
      console.error('Failed to leave classroom:', err)
      return { success: false, error: 'Unable to connect to server' }
    }
  }

  /** Reset all state */
  function reset() {
    teacherClassrooms.value = []
    currentClassroom.value = null
    loading.value = false
    error.value = null
  }

  return {
    teacherClassrooms,
    currentClassroom,
    loading,
    error,
    fetchTeacherClassrooms,
    createClassroom,
    fetchClassroomDetail,
    removeMember,
    fetchJoinInfo,
    joinClassroom,
    leaveClassroom,
    reset
  }
}

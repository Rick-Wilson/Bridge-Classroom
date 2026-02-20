import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'

const JoinClassroomView = () => import('../views/JoinClassroomView.vue')

const routes = [
  {
    path: '/join/:joinCode',
    name: 'join',
    component: JoinClassroomView
  },
  {
    // Catch-all: the main app layout handles lobby/collection/practice
    path: '/:pathMatch(.*)*',
    name: 'app',
    component: MainLayout
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

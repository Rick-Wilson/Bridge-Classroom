import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import ConventionCardView from '../views/ConventionCardView.vue'

const JoinClassroomView = () => import('../views/JoinClassroomView.vue')
const BiddingPracticeView = () => import('../views/BiddingPracticeView.vue')
const TableView = () => import('../views/TableView.vue')

const routes = [
  {
    path: '/join/:joinCode',
    name: 'join',
    component: JoinClassroomView
  },
  {
    path: '/bidding-practice',
    name: 'bidding-practice',
    component: BiddingPracticeView
  },
  {
    path: '/convention-card',
    name: 'convention-card',
    component: ConventionCardView
  },
  {
    // Multiplayer table (bridge-table-service). Guests join with just a
    // name; logged-in users are seated under their account.
    path: '/table/:sessionId?',
    name: 'table',
    component: TableView
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

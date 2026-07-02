import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import ConventionCardView from '../views/ConventionCardView.vue'

const JoinClassroomView = () => import('../views/JoinClassroomView.vue')
const BiddingPracticeView = () => import('../views/BiddingPracticeView.vue')
const TableLobbyView = () => import('../views/TableLobbyView.vue')
const TableSessionNewView = () => import('../views/TableSessionNewView.vue')
const TeacherConsoleView = () => import('../views/TeacherConsoleView.vue')

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
    // Multiplayer tables: teacher's evergreen class URL. Bare /play shows
    // the remembered-tables picker (auto-connects if exactly one is live).
    path: '/play/:hostCode?',
    name: 'play',
    component: TableLobbyView
  },
  {
    // Multiplayer tables: player's evergreen social URL. Unknown codes fall
    // back to a direct session-id join (keeps #/table/demo working).
    path: '/table/:inviteCode?',
    name: 'table',
    component: TableLobbyView
  },
  {
    // Teacher: create a table session (paste PBN, tables, seat policy).
    path: '/tables/new',
    name: 'tables-new',
    component: TableSessionNewView
  },
  {
    // Teacher: live console for an open session (grid, seating, rounds).
    path: '/tables/console/:sessionId',
    name: 'tables-console',
    component: TeacherConsoleView
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

import { createRouter, createWebHistory } from 'vue-router'
import BacklogView from '../views/BacklogView.vue'

const base = new URL(import.meta.env.BASE_URL, window.location.href).pathname

const router = createRouter({
  history: createWebHistory(base),
  routes: [
    {
      path: '/',
      name: 'backlog',
      component: BacklogView,
    },
  ],
})

export default router

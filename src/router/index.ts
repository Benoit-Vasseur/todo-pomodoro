import { createRouter, createWebHistory } from 'vue-router'
import BacklogView from '../views/BacklogView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'backlog',
      component: BacklogView,
    },
  ],
})

export default router

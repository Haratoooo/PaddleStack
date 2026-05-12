import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BookNowView from '../views/BookNowView.vue'
import AdminLoginView from '../views/AdminLoginView.vue'
import AdminDashboardView from '../views/AdminDashboardView.vue' 
import AdminSlotDetailView from '../views/AdminSlotDetailView.vue'
import BookingConfirmedView from '../views/BookingConfirmedView.vue'
import { supabase } from '@/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/book',
      name: 'book-now',
      component: BookNowView
    },

    {
      path: '/admin',
      name: 'admin-login',
      component: AdminLoginView
    },
    
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: AdminDashboardView,
      meta: { requiresAuth: true } 
    }, 

    {
      path: '/booking-confirmed',
      name: 'booking-confirmed',
      component: BookingConfirmedView
    },

    {
      path: '/admin/slot',
      name: 'admin-slot-detail',
      component: AdminSlotDetailView,
      meta: { requiresAuth: true }
    }
    
  ]
})


router.beforeEach(async (to, from) => {

  if (to.meta.requiresAuth) {

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { name: 'admin-login' }
    }

  }
})

export default router
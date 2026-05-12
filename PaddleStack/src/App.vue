<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'
import AppFooter from './components/AppFooter.vue'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-gray-800 flex flex-col">
    
    <AppNavbar v-if="route.name !== 'book-now' && route.name !== 'booking-confirmed' && !route.path.startsWith('/admin')" />
    
    <main class="flex-grow">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <AppFooter v-if="route.name !== 'book-now' && !route.path.startsWith('/admin')" />
    
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}
</style>
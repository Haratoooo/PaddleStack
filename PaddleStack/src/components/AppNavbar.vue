<script setup lang="ts">
import { RouterLink } from 'vue-router'
import navbarLogo from '@/assets/images/navbarlogo.svg'
</script>

<template>
  <nav class="absolute top-0 w-full z-50 flex items-center justify-between px-6 md:px-12 py-6 text-white">
    <RouterLink to="/" class="flex items-center">
      <img :src="navbarLogo" alt="PaddleStack" class="h-5 md:h-7" />
    </RouterLink>

    <div class="hidden md:flex gap-8 text-sm font-medium">
      <RouterLink to="/book" class="hover:text-[#A9FC24] transition-colors">Book Now</RouterLink>
      <a href="#schedules" class="hover:text-[#A9FC24] transition-colors">Schedules</a>
      <a href="#facility" class="hover:text-[#A9FC24] transition-colors">Facility</a>
    </div>

    <RouterLink 
      to="/book" 
      class="border border-[#A9FC24] text-[#A9FC24] px-6 py-2 rounded-md text-sm font-semibold hover:bg-[#A9FC24] hover:text-black transition-all">
      Book Now
    </RouterLink>
  </nav>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import heroImage from '@/assets/images/hero.svg'
import mainLogo from '@/assets/images/logo.svg' 
</script>

<template>
  <section class="relative w-full h-[85vh] bg-gray-900 bg-cover bg-center rounded-b-[3rem] md:rounded-b-[5rem] flex flex-col items-center justify-center text-white overflow-hidden shadow-2xl"
           :style="{ backgroundImage: `url(${heroImage})` }">

    <div class="relative z-10 flex flex-col items-center text-center px-4 mt-12">
      
      <div class="flex flex-col items-center">
        <img :src="mainLogo" alt="PaddleStack Logo" class="w-64 md:w-80 lg:w-96 -mb-8 md:-mb-14" />
      </div>
      
      <div class="flex gap-4 mt-1">
        <RouterLink to="/book" class="bg-[#A9FC24] text-black font-bold px-8 py-3 rounded-md hover:bg-[#88c91e] transition-colors">
          Book Now
        </RouterLink>
        <a href="#facility" class="border border-[#A9FC24] text-[#A9FC24] font-bold px-8 py-3 rounded-md hover:bg-[#A9FC24] hover:text-black transition-colors">
          Facilities
        </a>
      </div>
    </div>
    
  </section>
</template>
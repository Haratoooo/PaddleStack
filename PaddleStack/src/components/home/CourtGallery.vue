<script setup lang="ts">
import { RouterLink } from 'vue-router'
import carousel1 from '@/assets/images/carouselimg1.jpeg' 
</script>

<template>
  <section id="facility" 
           class="relative w-full h-[600px] bg-gray-900 bg-cover bg-center flex flex-col justify-center transition-all duration-500"
           :style="{ backgroundImage: `url(${carousel1})` }">
    
    <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>

    <div class="relative z-10 px-6 md:px-16 max-w-7xl mx-auto w-full">
      
      <h2 class="text-white text-5xl md:text-6xl font-black italic tracking-tight drop-shadow-lg mb-1">
        OUR COURTS
      </h2>
      
      <p class="text-white text-lg md:text-xl font-normal leading-snug drop-shadow-md mb-6">
        Four professional courts for <br/> every skill level.
      </p>
      
      <RouterLink 
        to="/book" 
        class="inline-block border-2 border-[#A9FC24] text-[#A9FC24] px-5 py-2 rounded-lg text-sm md:text-base font-bold hover:bg-[#A9FC24] hover:text-black transition-all">
        Reserve A Court
      </RouterLink>

    </div>

    <div class="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-3 z-10 text-white/70">
      <button class="hover:text-white px-2 text-xl">&larr;</button>
      
      <div class="w-2 h-2 rounded-full bg-white"></div>
      <div class="w-2 h-2 rounded-full bg-white/30"></div>
      <div class="w-2 h-2 rounded-full bg-white/30"></div>
      
      <button class="hover:text-white px-2 text-xl">&rarr;</button>
    </div>
  </section>
</template>
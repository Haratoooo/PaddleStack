<script setup lang="ts">
</script>

<template>
  <section class="py-24 px-6 md:px-16 max-w-7xl mx-auto">
    <div class="flex flex-col lg:flex-row gap-12 items-center">
      

      <div class="w-full lg:w-3/5">
        <div class="w-full h-80 md:h-[400px] bg-gray-200 rounded-2xl overflow-hidden shadow-lg">
          <img src="@/assets/images/location.png" alt="Map Location" class="w-full h-full object-cover" />
        </div>
      </div>

      <div class="w-full lg:w-2/5">
        <h2 class="text-4xl font-bold text-gray-900 mb-2">Find Us</h2>
        <p class="text-gray-600 mb-8 text-lg">Locate PaddleStack</p>

        <div class="flex flex-col gap-6">
          <div class="flex gap-4 items-start">
            <svg class="w-6 h-6 text-gray-700 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <p class="text-gray-600 text-sm md:text-base">
              Lahug-Guadalupe Road, A. Villalon Drv,<br />
              Cebu City, 6000 Cebu
            </p>
          </div>

          <div class="flex gap-4 items-start">
            <svg class="w-6 h-6 text-gray-700 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-gray-600 text-sm md:text-base">
              Open from 8am - 12am
            </p>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>
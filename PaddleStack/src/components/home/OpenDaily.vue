<script setup lang="ts">
import { ref } from 'vue'

interface Feature {
  id: number
  title: string
  description: string
  iconPath: string
}

const features = ref<Feature[]>([
  {
    id: 1,
    title: 'Rally',
    description: 'Enjoy our grade facilities. Great for beginners and competitive athletes.',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    id: 2,
    title: 'Relax',
    description: 'Become part of our community. Enjoy the company of like-minded athletes.',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    id: 3,
    title: 'Repeat',
    description: 'The game never stops. Our facilities are open every day of the week from 8am to 12 am.',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    id: 4,
    title: 'Find Us',
    description: 'Find us at Lahug-Guadalupe Road, A. Villalon Drv, Cebu City, 6000 Cebu.',
    iconPath: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
  },
  {
    id: 5,
    title: 'Follow Us',
    description: 'Follow us on all social media platforms for updates and announcements.',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
])
</script>

<template>
  <section id="schedules" class="py-24 px-6 md:px-16 max-w-7xl mx-auto">
    <div class="mb-14">
      <h2 class="text-3xl md:text-4xl font-bold mb-2 text-gray-900">Open Daily</h2>
      <p class="text-gray-500 text-lg">8am - 12am</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
      <div v-for="feature in features" :key="feature.id" class="flex gap-4">
        <div class="pt-1 text-gray-800 flex-shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="feature.iconPath"></path>
          </svg>
        </div>
        <div>
          <h3 class="font-bold text-lg mb-2 text-gray-900">{{ feature.title }}</h3>
          <p class="text-gray-500 text-sm leading-relaxed">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
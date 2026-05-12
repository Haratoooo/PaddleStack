<script setup lang="ts">
import HeroSection from '@/components/home/HeroSection.vue'
import OpenDaily from '@/components/home/OpenDaily.vue'
import CourtGallery from '@/components/home/CourtGallery.vue'
import LocationMap from '@/components/home/LocationMap.vue'
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <HeroSection />
    <OpenDaily />
    <CourtGallery />
    <LocationMap />
  </div>
</template>
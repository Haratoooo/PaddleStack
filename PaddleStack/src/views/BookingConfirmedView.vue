<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import darkLogo from '@/assets/images/footerlogo.svg'

const route = useRoute()

const referenceCode = route.query.ref || 'ERROR-NO-REF'
</script>

<template>
  <div class="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
    
    <header class="flex justify-between items-center px-6 md:px-16 py-4 border-b border-gray-200 bg-white">
      <RouterLink to="/">
        <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
      </RouterLink>
      <RouterLink to="/" class="text-gray-700 hover:text-black font-medium transition-colors">
        Home
      </RouterLink>
    </header>

    <main class="flex-grow flex items-center justify-center px-4 py-12 mt-4 md:mt-10 pb-20">
      <div class="bg-white border border-gray-100 p-10 md:p-14 rounded-[40px] shadow-xl max-w-xl w-full text-center">
        
        <div class="w-28 h-28 bg-[#A9FC24] rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <svg class="w-14 h-14 text-[#2A2A2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h2 class="text-4xl md:text-5xl font-bold text-[#4A4A4A] mb-4 tracking-tight">Booking Submitted!</h2>
        <p class="text-gray-500 text-lg mb-10 leading-relaxed px-4">
          Your reservation and receipt have been successfully sent and are awaiting admin approval.
        </p>

        <div class="bg-[#EBEBEB] rounded-[24px] p-8 mb-10">
          <p class="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Reference Code</p>
          <p class="text-4xl font-black text-[#4A4A4A] tracking-wider">{{ referenceCode }}</p>
          <p class="text-xs text-gray-400 mt-3 font-medium">Please save this code for your records.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink 
            to="/book" 
            class="bg-[#1C1C1C] text-white px-8 py-4 rounded-xl font-bold flex-1 hover:bg-black transition-colors shadow-lg"
          >
            Book Another Court
          </RouterLink>
          <RouterLink 
            to="/" 
            class="bg-gray-100 text-[#4A4A4A] px-8 py-4 rounded-xl font-bold flex-1 hover:bg-gray-200 transition-colors"
          >
            Return to Home
          </RouterLink>
        </div>
        
      </div>
    </main>
  </div>
</template>
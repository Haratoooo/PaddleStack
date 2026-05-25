<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg'

const route = useRoute()
const router = useRouter()
const receipts = ref<any[]>([])
const isLoading = ref(true)
const selectedImage = ref<string | null>(null)

const fetchReceipts = async () => {
  isLoading.value = true
  
  let query = supabase
    .from('bookings')
    .select('full_name, receipt_url, booking_date, booking_reference')
    .not('receipt_url', 'is', null) 
    .neq('status', 'Declined')
    .order('created_at', { ascending: false })

  if (route.query.date) {
    query = query.eq('booking_date', route.query.date)
  } else if (route.query.month && route.query.year) {
    const y = parseInt(route.query.year as string)
    const m = parseInt(route.query.month as string)
    const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`
    const endOfMonth = new Date(y, m, 0).toISOString().split('T')[0]
    
    query = query.gte('booking_date', startOfMonth).lte('booking_date', endOfMonth)
  }

  const { data, error } = await query
  
  if (!error && data) {
    const uniqueRefs = new Set()
    const uniqueReceipts = []
    
    for (const item of data) {
      if (!uniqueRefs.has(item.booking_reference)) {
        uniqueRefs.add(item.booking_reference)
        uniqueReceipts.push(item)
      }
    }
    receipts.value = uniqueReceipts
  }
  
  isLoading.value = false
}

const pageTitle = computed(() => {
  if (route.query.date) {
    const [y, m, d] = (route.query.date as string).split('-') as [string, string, string]
    
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
    return `Receipts for ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  } else if (route.query.month && route.query.year) {
    const dateObj = new Date(parseInt(route.query.year as string, 10), parseInt(route.query.month as string, 10) - 1)
    return `Receipts for ${dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })}`
  }
  return 'All Receipts'
})

onMounted(fetchReceipts)
</script>

<template>
  <div class="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 pb-20 relative">
    
    <div v-if="selectedImage" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" @click="selectedImage = null">
      <div class="relative max-w-3xl max-h-[90vh] w-full flex justify-center">
        <button @click="selectedImage = null" class="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <img :src="selectedImage" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" @click.stop />
      </div>
    </div>

    <header class="flex justify-between items-center px-6 md:px-16 py-4 bg-white border-b border-gray-200 sticky top-0 z-30">
      <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
      <button @click="router.push('/admin/monthly')" class="text-gray-600 hover:text-black font-semibold transition-colors flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7-7h18"></path></svg>
        Back to Summary
      </button>
    </header>

    <main class="max-w-7xl mx-auto px-4 md:px-8 mt-8">
      <div class="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 min-h-[600px]">
        
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight">{{ pageTitle }}</h1>
            <p class="text-gray-500 font-medium mt-1">{{ receipts.length }} total receipts found</p>
          </div>
        </div>

        <div v-if="isLoading" class="flex flex-col items-center justify-center py-32 text-gray-400">
          <svg class="animate-spin h-10 w-10 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span class="font-medium text-lg">Loading receipts...</span>
        </div>

        <div v-else-if="receipts.length === 0" class="flex flex-col items-center justify-center py-32 text-gray-400 text-center">
          <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span class="font-bold text-xl text-gray-600 mb-1">No receipts found</span>
          <span class="font-medium">There are no uploaded receipts for this time period.</span>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div v-for="receipt in receipts" :key="receipt.booking_reference" class="bg-[#F8F9FA] rounded-2xl p-4 border border-gray-200 group relative flex flex-col h-full">
            
            <div class="mb-3">
              <p class="font-bold text-gray-900 truncate">{{ receipt.full_name }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-gray-500 font-medium">{{ receipt.booking_date }}</span>
                <span class="text-gray-300">•</span>
                <span class="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">{{ receipt.booking_reference }}</span>
              </div>
            </div>

            <div 
              class="w-full aspect-[3/4] bg-[#EBEBEB] rounded-xl overflow-hidden cursor-pointer relative border border-gray-200"
              @click="selectedImage = receipt.receipt_url"
            >
              <img :src="receipt.receipt_url" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span class="bg-white/90 text-gray-900 px-4 py-2 rounded-lg font-bold text-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                  Click to Expand
                </span>
              </div>
            </div>

            <a :href="receipt.receipt_url" target="_blank" download class="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors w-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Download Original
            </a>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
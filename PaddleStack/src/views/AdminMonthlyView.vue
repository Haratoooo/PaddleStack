<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg'

const router = useRouter()

const savedStateStr = sessionStorage.getItem('paddleMonthlyState')
const savedState = savedStateStr ? JSON.parse(savedStateStr) : null

const currentMonth = ref(savedState?.month ?? new Date().getMonth())
const currentYear = ref(savedState?.year ?? new Date().getFullYear())
const selectedDailyDate = ref<string | null>(savedState?.daily ?? null)

watch([currentMonth, currentYear, selectedDailyDate], ([m, y, d]) => {
  sessionStorage.setItem('paddleMonthlyState', JSON.stringify({ month: m, year: y, daily: d }))
})

const monthlyBookings = ref<any[]>([])
const isLoading = ref(true)

const monthlyStats = computed(() => {
  const approvedBookings = monthlyBookings.value.filter(b => b.status === 'Approved')
  const uniqueRefs = new Set(approvedBookings.map(b => b.booking_reference))

  const stats = {
    totalOrders: uniqueRefs.size, 
    totalSlots: approvedBookings.length, 
    grossRevenue: approvedBookings.reduce((sum, b) => sum + (b.price || 0), 0),
    courts: { 'COURT 1': 0, 'COURT 2': 0, 'COURT 3': 0, 'COURT 4': 0 }
  }
  
  approvedBookings.forEach(b => {
    if (stats.courts[b.court as keyof typeof stats.courts] !== undefined) {
      stats.courts[b.court as keyof typeof stats.courts]++
    }
  })
  
  return stats
})

const dailyStats = computed(() => {
  if (!selectedDailyDate.value) return null
  
  const dailyApprovedBookings = monthlyBookings.value.filter(b => 
    b.booking_date === selectedDailyDate.value && b.status === 'Approved'
  )
  
  const uniqueRefs = new Set(dailyApprovedBookings.map(b => b.booking_reference))
  
  const stats = {
    totalOrders: uniqueRefs.size,
    totalSlots: dailyApprovedBookings.length, 
    grossRevenue: dailyApprovedBookings.reduce((sum, b) => sum + (b.price || 0), 0),
    courts: { 'COURT 1': 0, 'COURT 2': 0, 'COURT 3': 0, 'COURT 4': 0 }
  }
  
  dailyApprovedBookings.forEach(b => {
    if (stats.courts[b.court as keyof typeof stats.courts] !== undefined) {
      stats.courts[b.court as keyof typeof stats.courts]++
    }
  })
  
  return stats
})

const fetchMonthlyData = async () => {
  isLoading.value = true
  const startOfMonth = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-01`
  const endOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0).toISOString().split('T')[0]

  const { data } = await supabase
    .from('bookings')
    .select('court, price, booking_date, booking_reference, status')
    .gte('booking_date', startOfMonth)
    .lte('booking_date', endOfMonth)
    .neq('status', 'Declined')
  
  monthlyBookings.value = data || []
  isLoading.value = false
}

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate())
const firstDayOfMonth = computed(() => new Date(currentYear.value, currentMonth.value, 1).getDay())

const navigateToDate = (day: number) => {
  const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  selectedDailyDate.value = dateStr
}

const clearDailySelection = () => {
  selectedDailyDate.value = null
}

const changeMonth = (delta: number) => {
  let newMonth = currentMonth.value + delta
  if (newMonth < 0) { currentMonth.value = 11; currentYear.value-- }
  else if (newMonth > 11) { currentMonth.value = 0; currentYear.value++ }
  else { currentMonth.value = newMonth }
  
  selectedDailyDate.value = null 
  fetchMonthlyData()
}

const formatDisplayDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-') as [string, string, string]
  
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const viewMonthlyReceipts = () => {
  router.push({
    path: '/admin/receipts',
    query: { month: currentMonth.value + 1, year: currentYear.value }
  })
}

const viewDailyReceipts = () => {
  router.push({
    path: '/admin/receipts',
    query: { date: selectedDailyDate.value }
  })
}

onMounted(fetchMonthlyData)
</script>

<template>
  <div class="min-h-screen bg-[#F8F9FA] p-4 md:p-8 font-sans text-gray-900">
    
    <header class="flex justify-between items-center mb-8">
      <RouterLink to="/admin"><img :src="darkLogo" class="h-8" /></RouterLink>
      <button @click="router.push('/admin/dashboard')" class="text-gray-500 hover:text-black font-semibold transition-colors">← Back to Dashboard</button>
    </header>

    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <div class="bg-[#E2E2E2] p-8 rounded-3xl shadow-sm border border-gray-200 min-h-[580px] relative overflow-hidden flex flex-col">
        
        <transition name="fade-slide" mode="out-in">
          
          <div v-if="!selectedDailyDate" :key="`monthly-${currentYear}-${currentMonth}`" class="w-full flex-grow flex flex-col">
            <h2 class="text-3xl font-semibold mb-1 tracking-tight">Monthly Summary</h2>
            <p class="text-gray-500 font-medium mb-8">For {{ new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) }}</p>
            
            <div class="space-y-8 flex-grow">
              <div class="border-b border-gray-400 pb-6">
                <p class="text-gray-500 font-semibold text-lg mb-4">Total Bookings</p>
                <div class="space-y-3">
                  <div v-for="(count, court) in monthlyStats.courts" :key="court" class="flex items-center gap-3">
                    <span class="text-sm font-semibold text-gray-600 w-16">{{ court }}</span>
                    <div class="flex-grow h-7 bg-transparent rounded-sm flex items-center">
                      <div class="h-full bg-[#1C1C1C] flex items-center px-2 min-w-[2rem] transition-all duration-300" :style="{ width: `${Math.max((count / (monthlyStats.totalSlots || 1)) * 100, 5)}%` }">
                        <span class="text-white text-xs font-semibold">{{ count }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="mt-6 pt-4 border-t border-gray-300 flex justify-between items-center">
                  <div>
                    <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Total Slots</p>
                    <p class="text-xl font-bold">{{ monthlyStats.totalSlots }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Unique Orders</p>
                    <p class="text-xl font-bold">{{ monthlyStats.totalOrders }}</p>
                  </div>
                </div>
              </div>

              <div>
                <p class="text-gray-500 font-semibold text-lg mb-2 border-b border-gray-400 pb-2">Gross Revenue</p>
                <p class="text-sm text-gray-500 font-medium mt-4">Total:</p>
                <p class="text-2xl font-semibold tracking-tight mb-6">PHP {{ monthlyStats.grossRevenue.toLocaleString() }}</p>
                
                <button @click="viewMonthlyReceipts" class="bg-[#1C1C1C] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-black transition-colors w-full sm:w-auto">
                  View Receipts
                </button>
              </div>
            </div>
          </div>

          <div v-else :key="`daily-${selectedDailyDate}`" class="w-full flex-grow flex flex-col relative">
            <button @click="clearDailySelection" class="absolute top-0 right-0 text-gray-400 hover:text-black transition-colors z-10 bg-[#E2E2E2] rounded-full p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <h2 class="text-3xl font-semibold mb-1 tracking-tight pr-8">Daily Summary</h2>
            <p class="text-gray-500 font-medium mb-8">For {{ formatDisplayDate(selectedDailyDate) }}</p>
            
            <div class="space-y-8 flex-grow" v-if="dailyStats">
              <div class="border-b border-gray-400 pb-6">
                <p class="text-gray-500 font-semibold text-lg mb-4">Total Bookings</p>
                <div class="space-y-3">
                  <div v-for="(count, court) in dailyStats.courts" :key="court" class="flex items-center gap-3">
                    <span class="text-sm font-semibold text-gray-600 w-16">{{ court }}</span>
                    <div class="flex-grow h-7 bg-transparent rounded-sm flex items-center">
                      <div class="h-full bg-[#1C1C1C] flex items-center px-2 min-w-[2rem] transition-all duration-300" :style="{ width: `${Math.max((count / (dailyStats.totalSlots || 1)) * 100, 5)}%` }">
                        <span class="text-white text-xs font-semibold">{{ count }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-6 pt-4 border-t border-gray-300 flex justify-between items-center">
                  <div>
                    <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Total Slots</p>
                    <p class="text-xl font-bold">{{ dailyStats.totalSlots }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Unique Orders</p>
                    <p class="text-xl font-bold">{{ dailyStats.totalOrders }}</p>
                  </div>
                </div>
              </div>

              <div>
                <p class="text-gray-500 font-semibold text-lg mb-2 border-b border-gray-400 pb-2">Gross Revenue</p>
                <p class="text-sm text-gray-500 font-medium mt-4">Total:</p>
                <p class="text-2xl font-semibold tracking-tight mb-6">PHP {{ dailyStats.grossRevenue.toLocaleString() }}</p>
                
                <div class="flex flex-col sm:flex-row items-center gap-3">
                  <button @click="viewDailyReceipts" class="bg-[#1C1C1C] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-black transition-colors shadow-sm w-full sm:w-auto">
                    View Receipts
                  </button>
                  <button @click="clearDailySelection" class="bg-white text-gray-800 border border-gray-300 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto">
                    ← Back to Monthly
                  </button>
                </div>
              </div>
            </div>
          </div>
          
        </transition>
      </div>

      <div class="lg:col-span-2 bg-[#E2E2E2] p-8 rounded-3xl shadow-sm border border-gray-200">
        <div class="flex justify-center items-center mb-8 gap-4">
          <button @click="changeMonth(-1)" class="p-2 hover:bg-gray-300 rounded-full transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div class="bg-gray-300/50 px-6 py-2 rounded-lg font-semibold text-gray-800 flex items-center gap-2 min-w-[140px] justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            {{ new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) }}
          </div>
          <button @click="changeMonth(1)" class="p-2 hover:bg-gray-300 rounded-full transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        <div class="grid grid-cols-7 gap-[1px] bg-gray-300 border border-gray-300 rounded-xl overflow-hidden shadow-sm">
          <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="bg-[#EBEBEB] text-center text-xs font-bold tracking-widest text-gray-500 uppercase py-3">
            {{ day }}
          </div>
          
          <div v-for="n in firstDayOfMonth" :key="'empty-'+n" class="h-28 bg-[#EBEBEB]"></div>

          <button 
            v-for="day in daysInMonth" 
            :key="day" 
            @click="navigateToDate(day)"
            class="h-28 bg-[#EBEBEB] hover:bg-white transition-all flex flex-col items-center justify-center relative group"
            :class="{ 'bg-white shadow-inner z-10': selectedDailyDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }"
          >
            <span class="font-semibold text-xl text-gray-800 transition-transform group-hover:scale-110 group-hover:text-black"
                  :class="{ 'scale-110 text-black': selectedDailyDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }">
              {{ day }}
            </span>
            <div v-if="selectedDailyDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`" 
                 class="w-1.5 h-1.5 bg-[#A9FC24] rounded-full absolute bottom-4"></div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
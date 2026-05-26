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

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate())
const firstDayOfMonth = computed(() => new Date(currentYear.value, currentMonth.value, 1).getDay())

const eveningSlots = [
  '3:00 - 4:00 pm', '4:00 - 5:00 pm', '5:00 - 6:00 pm', '6:00 - 7:00 pm',
  '7:00 - 8:00 pm', '8:00 - 9:00 pm', '9:00 - 10:00 pm', '10:00 - 11:00 pm', '11:00 pm - 12:00 am'
]

const calculateAnalytics = (bookings: any[], daysCount: number) => {
  const approvedBookings = bookings.filter(b => b.status === 'Approved')
  const uniqueRefs = new Set(approvedBookings.map(b => b.booking_reference))

  const financial = {
    gross: 0,
    morning: 0,
    evening: 0
  }
  
  approvedBookings.forEach(b => {
    const price = b.price || 0
    financial.gross += price
    if (eveningSlots.includes(b.time_slot)) {
      financial.evening += price
    } else {
      financial.morning += price
    }
  })

  const courtHours = 4 * 16 * daysCount 
  
  const blockedHours = new Set(
    bookings.filter(b => b.status === 'Blocked').map(b => `${b.booking_date}-${b.court}-${b.time_slot}`)
  ).size
  
  const bookedHours = new Set(
    bookings.filter(b => b.status === 'Approved' || b.status === 'Pending').map(b => `${b.booking_date}-${b.court}-${b.time_slot}`)
  ).size

  const availableHours = courtHours - blockedHours
  const unbookedHours = Math.max(0, availableHours - bookedHours) 
  
  const utilRate = availableHours > 0 ? ((bookedHours / availableHours) * 100).toFixed(1) : '0.0'
  const vacRate = availableHours > 0 ? ((unbookedHours / availableHours) * 100).toFixed(1) : '0.0'

  const courts = { 'COURT 1': 0, 'COURT 2': 0, 'COURT 3': 0, 'COURT 4': 0 }
  
  const uniqueApprovedSlots = Array.from(new Set(
    approvedBookings.map(b => `${b.court}-${b.time_slot}`)
  )).map(str => str.split('-')[0])

  uniqueApprovedSlots.forEach(courtName => {
    if (courts[courtName as keyof typeof courts] !== undefined) courts[courtName as keyof typeof courts]++
  })

  return {
    uniqueOrders: uniqueRefs.size,
    financial,
    utilization: {
      courtHours, blockedHours, availableHours, bookedHours, unbookedHours, utilRate, vacRate
    },
    courts
  }
}

const monthlyStats = computed(() => calculateAnalytics(monthlyBookings.value, daysInMonth.value))

const dailyStats = computed(() => {
  if (!selectedDailyDate.value) return null
  const dailyBookings = monthlyBookings.value.filter(b => b.booking_date === selectedDailyDate.value)
  return calculateAnalytics(dailyBookings, 1) // 1 day
})

const fetchMonthlyData = async () => {
  isLoading.value = true
  const startOfMonth = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-01`
  const endOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0).toISOString().split('T')[0]

  const { data } = await supabase
    .from('bookings')
    .select('court, price, booking_date, booking_reference, status, time_slot')
    .gte('booking_date', startOfMonth)
    .lte('booking_date', endOfMonth)
    .neq('status', 'Declined')
  
  monthlyBookings.value = data || []
  isLoading.value = false
}

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
  router.push({ path: '/admin/receipts', query: { month: currentMonth.value + 1, year: currentYear.value } })
}

const viewDailyReceipts = () => {
  router.push({ path: '/admin/receipts', query: { date: selectedDailyDate.value } })
}

onMounted(fetchMonthlyData)
</script>

<template>
  <div class="min-h-screen bg-[#F8F9FA] p-4 md:p-8 font-sans text-gray-900">
    
    <header class="flex justify-between items-center mb-8">
      <RouterLink to="/admin"><img :src="darkLogo" class="h-8" /></RouterLink>
      <button @click="router.push('/admin/dashboard')" class="text-gray-500 hover:text-black font-semibold transition-colors">← Back to Dashboard</button>
    </header>

    <div class="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <div class="lg:col-span-5 bg-[#E2E2E2] p-8 rounded-3xl shadow-sm border border-gray-200 h-[750px] flex flex-col relative overflow-hidden">
        
        <transition name="fade-slide" mode="out-in">
          
          <div :key="selectedDailyDate ? `daily-${selectedDailyDate}` : `monthly-${currentYear}-${currentMonth}`" class="w-full h-full flex flex-col">
            
            <div class="shrink-0 mb-6 relative">
              <button v-if="selectedDailyDate" @click="clearDailySelection" class="absolute top-0 right-0 text-gray-400 hover:text-black transition-colors z-10 bg-white/50 rounded-full p-1">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <h2 class="text-3xl font-semibold mb-1 tracking-tight pr-8">{{ selectedDailyDate ? 'Daily Analytics' : 'Monthly Analytics' }}</h2>
              <p class="text-gray-500 font-medium">For {{ selectedDailyDate ? formatDisplayDate(selectedDailyDate) : new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) }}</p>
            </div>

            <div class="flex-grow overflow-y-auto custom-scrollbar pr-3 space-y-8 pb-6" v-if="selectedDailyDate ? dailyStats : monthlyStats">
              
              <div>
                <h3 class="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Financial Overview
                </h3>
                
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Gross Revenue</p>
                  <p class="text-2xl font-bold text-[#A9FC24] bg-[#1C1C1C] px-3 py-1.5 rounded-lg inline-block mb-4">
                    ₱{{ (selectedDailyDate ? dailyStats : monthlyStats)!.financial.gross.toLocaleString() }}
                  </p>
                  
                  <div class="flex flex-col gap-3 pt-4 border-t border-gray-100">
                    <div class="flex justify-between items-center">
                      <span class="text-sm font-semibold text-gray-500">Morning (8AM-3PM)</span>
                      <span class="text-sm font-bold text-gray-900">₱{{ (selectedDailyDate ? dailyStats : monthlyStats)!.financial.morning.toLocaleString() }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                      <span class="text-sm font-semibold text-gray-500">Evening (3PM-12AM)</span>
                      <span class="text-sm font-bold text-gray-900">₱{{ (selectedDailyDate ? dailyStats : monthlyStats)!.financial.evening.toLocaleString() }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  Court Utilization
                </h3>
                
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
                  <div class="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div>
                      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Physical Hours</p>
                      <p class="text-lg font-black text-gray-800">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.utilization.courtHours }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Available Hours</p>
                      <p class="text-lg font-black text-gray-800">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.utilization.availableHours }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Booked Hours</p>
                      <p class="text-lg font-black text-blue-600">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.utilization.bookedHours }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Unbooked Hours</p>
                      <p class="text-lg font-black text-green-600">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.utilization.unbookedHours }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Admin Blocked</p>
                      <p class="text-lg font-black text-red-500">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.utilization.blockedHours }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Unique Orders</p>
                      <p class="text-lg font-black text-gray-800">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.uniqueOrders }}</p>
                    </div>
                  </div>
                </div>

                <div class="flex gap-4">
                  <div class="flex-1 bg-gray-900 rounded-2xl p-4 shadow-sm text-center">
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Utilization</p>
                    <p class="text-2xl font-bold text-white">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.utilization.utilRate }}%</p>
                  </div>
                  <div class="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Vacancy</p>
                    <p class="text-2xl font-bold text-gray-900">{{ (selectedDailyDate ? dailyStats : monthlyStats)!.utilization.vacRate }}%</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-gray-900 font-bold text-sm mb-4 uppercase tracking-wider border-b border-gray-300 pb-2">Court Breakdown</h3>
                <div class="space-y-3">
                  <div v-for="(count, court) in (selectedDailyDate ? dailyStats : monthlyStats)!.courts" :key="court" class="flex items-center gap-3">
                    <span class="text-xs font-semibold text-gray-600 w-16 shrink-0">{{ court }}</span>
                    <div class="flex-grow h-6 bg-transparent rounded-sm flex items-center">
                      <div class="h-full bg-[#1C1C1C] flex items-center justify-center px-2 min-w-[3.5rem] transition-all duration-300 rounded-md shadow-sm" :style="{ width: `${Math.max((count / ((selectedDailyDate ? dailyStats : monthlyStats)!.utilization.bookedHours || 1)) * 100, 5)}%` }">
                        <span class="text-white text-[10px] font-bold whitespace-nowrap">{{ count }} hrs</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div class="shrink-0 pt-4 border-t border-gray-300 mt-2 flex flex-col gap-2">
              <button @click="selectedDailyDate ? viewDailyReceipts() : viewMonthlyReceipts()" class="bg-[#1C1C1C] text-[#A9FC24] w-full py-3.5 rounded-xl text-sm font-bold hover:bg-black transition-colors shadow-sm flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                View Approved Receipts
              </button>
              <button v-if="selectedDailyDate" @click="clearDailySelection" class="bg-white text-gray-800 border border-gray-300 w-full py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                ← Back to Monthly Analytics
              </button>
            </div>
          </div>
          
        </transition>
      </div>

      <div class="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[750px]">
        
        <div class="flex justify-center items-center mb-6 gap-4 shrink-0">
          <button @click="changeMonth(-1)" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div class="bg-gray-50 border border-gray-100 px-6 py-2 rounded-lg font-semibold text-gray-800 flex items-center gap-2 min-w-[140px] justify-center shadow-sm">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            {{ new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) }}
          </div>
          <button @click="changeMonth(1)" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        <div class="grid grid-cols-7 gap-2 flex-grow">
          <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="text-center text-[11px] font-bold tracking-widest text-gray-400 uppercase py-2 flex items-end justify-center">
            {{ day }}
          </div>
          
          <div v-for="n in firstDayOfMonth" :key="'empty-'+n" class="bg-transparent rounded-xl"></div>

          <button 
            v-for="day in daysInMonth" 
            :key="day" 
            @click="navigateToDate(day)"
            class="bg-[#F8F9FA] hover:bg-gray-100 border border-gray-100 transition-all rounded-xl flex flex-col items-center justify-center relative group shadow-sm"
            :class="{ 'ring-2 ring-gray-900 bg-white z-10 shadow-md': selectedDailyDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }"
          >
            <span class="font-medium text-lg text-gray-700 transition-transform group-hover:scale-110 group-hover:text-black"
                  :class="{ 'scale-110 font-bold text-black': selectedDailyDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }">
              {{ day }}
            </span>
            <div v-if="selectedDailyDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`" 
                 class="w-1.5 h-1.5 bg-[#A9FC24] rounded-full absolute bottom-3 shadow-sm"></div>
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

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #BDBDBD;
  border-radius: 10px;
}
</style>
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg'

const router = useRouter()

const bookings = ref<any[]>([])
const globalPendingList = ref<any[]>([]) 
const isLoading = ref(true)

const getLocalDateString = (d = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today = getLocalDateString()

const getMaxDateString = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 2)
  return getLocalDateString(d)
}
const maxDate = getMaxDateString()

const selectedDate = ref(today)

const displayDate = computed(() => {
  if (selectedDate.value === today) return 'TODAY'
  const parts = selectedDate.value.split('-') as [string, string, string]
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
})


const fetchGlobalPending = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'Pending')
    .order('created_at', { ascending: true }) 

  if (!error && data) {
    globalPendingList.value = data
  }
}

const fetchDailyBookings = async () => {
  isLoading.value = true
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', selectedDate.value)
    .neq('status', 'Declined')

  if (error) {
    console.error('Error fetching bookings:', error)
  } else {
    bookings.value = data || []
  }
  isLoading.value = false
}

const formatPendingDate = (dateStr: string) => {
  const parts = dateStr.split('-') as [string, string, string]
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

watch(selectedDate, fetchDailyBookings)

onMounted(() => {
  fetchGlobalPending()
  fetchDailyBookings()
})

const courts = ['COURT 1', 'COURT 2', 'COURT 3', 'COURT 4']
const times = [
  '8:00 - 9:00 am', '9:00 - 10:00 am', '10:00 - 11:00 am', '11:00 am - 12:00 pm',
  '12:00 - 1:00 pm', '1:00 - 2:00 pm', '2:00 - 3:00 pm', '3:00 - 4:00 pm',
  '4:00 - 5:00 pm', '5:00 - 6:00 pm', '6:00 - 7:00 pm', '7:00 - 8:00 pm',
  '8:00 - 9:00 pm', '9:00 - 10:00 pm', '10:00 - 11:00 pm', '11:00 pm - 12:00 am'
]

const getSlotData = (court: string, time: string) => {
  const booking = bookings.value.find(b => b.court === court && b.time_slot === time)
  if (booking) {
    const capStatus = booking.status.charAt(0).toUpperCase() + booking.status.slice(1).toLowerCase()
    return { ...booking, status: capStatus }
  }
  return { status: 'Available', court: court, time_slot: time }
}

const handleSlotClick = (slotData: any, forceDate?: string) => {

  const targetDate = forceDate || selectedDate.value
  router.push({
    path: '/admin/slot', 
    query: {
      court: slotData.court || slotData, 
      time: slotData.time_slot || slotData.time,
      date: targetDate
    }
  })
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/admin')
}
</script>

<template>
  <div class="min-h-screen bg-[#F8F9FA] font-sans text-gray-800 pb-20">
    
    <header class="flex justify-between items-center px-6 md:px-16 py-4 bg-white border-b border-gray-200 sticky top-0 z-50">
      <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
      <button @click="handleLogout" class="text-gray-600 hover:text-black font-medium transition-colors">
        Logout
      </button>
    </header>

    <main class="max-w-[1600px] mx-auto px-4 mt-8">
      
      <div class="flex flex-col xl:flex-row gap-8 items-start">

        <div class="w-full xl:w-[400px] shrink-0 flex flex-col gap-4">
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px] sticky top-24">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold text-gray-900 tracking-tight">Recent Requests</h2>
              <span v-if="globalPendingList.length > 0" class="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {{ globalPendingList.length }} New
              </span>
            </div>

            <div v-if="globalPendingList.length === 0" class="flex-grow flex flex-col items-center justify-center text-center opacity-50">
              <svg class="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p class="font-bold text-lg">All caught up!</p>
              <p class="text-sm">No pending bookings.</p>
            </div>

            <div v-else class="flex-grow overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
              <div 
                v-for="req in globalPendingList" 
                :key="req.id"
                @click="handleSlotClick(req, req.booking_date)"
                class="bg-[#F8F9FA] hover:bg-gray-100 transition-colors p-4 rounded-2xl cursor-pointer border border-gray-200 group"
              >
                <div class="flex justify-between items-start mb-2">
                  <p class="font-bold text-gray-900 text-sm truncate pr-2">{{ req.full_name }}</p>
                  <span class="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-wider">Pending</span>
                </div>
                <div class="text-xs text-gray-500 flex flex-col gap-1 font-medium">
                  <p class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {{ formatPendingDate(req.booking_date) }}</p>
                  <p class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> {{ req.time_slot }}</p>
                  <p class="flex items-center gap-1.5 text-gray-700 font-bold mt-1.5">📍 {{ req.court }}</p>
                </div>
                <div class="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                  <span class="text-xs font-bold text-[#1C1C1C] group-hover:text-[#A9FC24] transition-colors flex items-center gap-1">
                    Review Request <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div class="w-full flex-grow bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
            <h2 class="text-xl font-bold text-gray-900 tracking-tight">Daily Schedule</h2>
            
            <div class="relative group inline-block">
              <button type="button" class="bg-[#1C1C1C] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-colors shadow-sm relative">
                <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="min-w-[90px] text-center tracking-wide">{{ displayDate }}</span>
                <svg class="w-4 h-4 text-gray-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>

                <div v-if="globalPendingList.length > 0" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-[#1C1C1C] animate-pulse"></div>
              </button>
              
              <input 
                type="date" 
                v-model="selectedDate" 
                :min="today"
                :max="maxDate"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                @click="(e) => (e.target as any).showPicker?.()"
              />
            </div>
          </div>

          <div v-if="isLoading" class="text-center text-gray-500 py-32 font-medium flex flex-col items-center justify-center gap-4">
            <svg class="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Loading grid...
          </div>

          <div v-else class="w-full overflow-x-auto pb-6">
            <div class="min-w-[700px] grid grid-cols-[160px_repeat(4,_minmax(120px,_1fr))] gap-x-4 gap-y-3 items-center">
              
              <div class="text-left font-bold text-xs text-gray-400 tracking-widest pl-2">TIME</div>
              <div v-for="court in courts" :key="court" class="text-center font-bold text-sm text-gray-800 uppercase">
                {{ court }}
              </div>

              <template v-for="time in times" :key="time">
                <div class="text-left pl-2 text-sm font-semibold text-gray-600">
                  {{ time }}
                </div>

                <div v-for="court in courts" :key="court" class="w-full">
                  <button 
                    @click="handleSlotClick(getSlotData(court, time))"
                    class="w-full py-3.5 rounded-xl font-bold text-xs tracking-tight transition-transform active:scale-95 uppercase relative overflow-hidden"
                    :class="{
                      'bg-[#F8F9FA] text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-600': getSlotData(court, time).status === 'Available',
                      'bg-[#2A2A2A] text-white hover:bg-black shadow-md': getSlotData(court, time).status === 'Pending',
                      'bg-[#A9FC24] text-[#2A2A2A] hover:bg-[#97e31e] shadow-sm': getSlotData(court, time).status === 'Approved',
                      'bg-gray-200 text-gray-400 cursor-not-allowed': getSlotData(court, time).status === 'Blocked'
                    }"
                  >
                    <!-- Red corner for pending slots shown in the grid -->
                    <div v-if="getSlotData(court, time).status === 'Pending'" class="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg shadow-sm"></div>
                    {{ getSlotData(court, time).status }}
                  </button>
                </div>
              </template>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #E5E7EB;
  border-radius: 20px;
}
</style>
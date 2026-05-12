<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg'

const router = useRouter()

// --- STATE ---
const bookings = ref<any[]>([])
const isLoading = ref(true)

// --- DATE LOGIC ---
const getLocalDateString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const selectedDate = ref(getLocalDateString())
const dateInputRef = ref<HTMLInputElement | null>(null)

const displayDate = computed(() => {
  if (selectedDate.value === getLocalDateString()) return 'TODAY'
  const parts = selectedDate.value.split('-') as [string, string, string]
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
})

const openDatePicker = () => {
  const el = dateInputRef.value as any;
  if (el) {
    if (el.showPicker) el.showPicker();
    else el.click();
  }
}

// --- DATABASE FETCHING ---
const fetchBookings = async () => {
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

watch(selectedDate, fetchBookings)
onMounted(fetchBookings)

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

const handleSlotClick = (slotData: any) => {
  router.push({
    path: '/admin/slot', 
    query: {
      court: slotData.court,
      time: slotData.time_slot,
      date: selectedDate.value
    }
  })
}

// --- LOGOUT LOGIC ---
const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/admin')
}
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-gray-800 pb-20">
    
    <header class="flex justify-between items-center px-6 md:px-16 py-4 border-b border-gray-200">
      <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
      <button @click="handleLogout" class="text-gray-600 hover:text-black font-medium transition-colors">
        Logout
      </button>
    </header>

    <main class="max-w-[1200px] mx-auto px-4 mt-10">
      
       <div class="flex justify-center w-full mb-8">
            <button 
              @click="openDatePicker"
              class="bg-[#EBEBEB] text-gray-800 px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors shadow-sm relative group"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span class="min-w-[90px] text-center tracking-wide">{{ displayDate }}</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>

              <input 
                type="date" 
                ref="dateInputRef" 
                v-model="selectedDate" 
                class="absolute inset-0 opacity-0 pointer-events-none w-full h-full" 
                tabindex="-1"
                aria-hidden="true"
              />
            </button>
          </div>

      <div v-if="isLoading" class="text-center text-gray-500 py-20 font-medium">
        Loading schedule...
      </div>

      <div v-else class="hidden md:grid grid-cols-5 gap-x-6 gap-y-4 items-center">
        
        <div class="text-center font-bold text-sm text-gray-800">TIME</div>
        <div v-for="court in courts" :key="court" class="text-center font-bold text-sm text-gray-800">
          {{ court }}
        </div>

        <template v-for="time in times" :key="time">
          <div class="text-center text-sm font-medium text-gray-600">
            {{ time }}
          </div>

          <div v-for="court in courts" :key="court" class="w-full">
            <button 
              @click="handleSlotClick(getSlotData(court, time))"
              class="w-full py-3.5 rounded-xl font-semibold text-sm transition-transform active:scale-95 shadow-sm"
              :class="{
                'bg-[#EBEBEB] text-[#4A4A4A] hover:bg-gray-200': getSlotData(court, time).status === 'Available',
                'bg-[#2A2A2A] text-white hover:bg-black': getSlotData(court, time).status === 'Pending',
                'bg-[#A9FC24] text-[#2A2A2A] hover:bg-[#97e31e]': getSlotData(court, time).status === 'Approved',
                'bg-gray-400 text-white hover:bg-gray-500': getSlotData(court, time).status === 'Blocked'
              }"
            >
              {{ getSlotData(court, time).status.toUpperCase() }}
            </button>
          </div>
        </template>
      </div>

      <div class="md:hidden text-center text-gray-500 py-20">
        Please view the Admin Dashboard on a desktop or tablet screen for the full grid experience.
      </div>

    </main>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg'

const router = useRouter()

const bookings = ref<any[]>([])
const globalPendingGroups = ref<any[]>([]) 
const isLoading = ref(true)

const selectedForBlocking = ref<any[]>([])
const isBlocking = ref(false)

const showManualModal = ref(false)
const isManualBooking = ref(false)
const manualForm = ref({ name: '', email: '', phone: '', price: 0 })
const manualFile = ref<File | null>(null)
const manualPreview = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const getLocalDateString = (d = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today = getLocalDateString()

const savedDate = sessionStorage.getItem('paddleAdminDate')
const selectedDate = ref(savedDate || today)

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
    const groups: Record<string, any> = {}
    data.forEach(req => {
      const refCode = req.booking_reference || req.id 
      if (!groups[refCode]) {
        groups[refCode] = {
          reference: refCode,
          full_name: req.full_name,
          created_at: req.created_at,
          slots: [],
          totalPrice: 0
        }
      }
      groups[refCode].slots.push(req)
      groups[refCode].totalPrice += req.price || 0
    })
    globalPendingGroups.value = Object.values(groups).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }
}

const fetchDailyBookings = async () => {
  isLoading.value = true
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', selectedDate.value)
    .neq('status', 'Declined')

  if (error) console.error('Error fetching bookings:', error)
  else bookings.value = data || []
  isLoading.value = false
}

const formatPendingDate = (dateStr: string) => {
  const parts = dateStr.split('-') as [string, string, string]
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

watch(selectedDate, (newDate) => {
  sessionStorage.setItem('paddleAdminDate', newDate)
  fetchDailyBookings()
})

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

const calculateSlotPrice = (dateStr: string, court: string, timeSlot: string) => {
  const timeIdx = times.indexOf(timeSlot)
  const isLate = timeIdx >= 7 
  let price = 0
  
  if (dateStr >= '2026-06-03') {
    price = isLate ? 550 : 500
  } else if (dateStr >= '2026-05-28' && dateStr <= '2026-06-02') {
    if (court === 'COURT 3' || court === 'COURT 4') {
      price = isLate ? 550 : 500
    } else {
      price = isLate ? 500 : 450
    }
  } else {
    price = isLate ? 400 : 300
  }
  return price
}

const selectedSlotsDetails = computed(() => {
  return selectedForBlocking.value.map(slot => ({
    ...slot,
    price: calculateSlotPrice(slot.date, slot.court, slot.time_slot)
  }))
})

const autoComputedTotal = computed(() => {
  return selectedSlotsDetails.value.reduce((sum, slot) => sum + slot.price, 0)
})

watch(showManualModal, (newVal) => {
  if (newVal) {
    manualForm.value.price = autoComputedTotal.value
  }
})

const getSlotData = (court: string, time: string) => {
  const booking = bookings.value.find(b => b.court === court && b.time_slot === time)
  if (booking) {
    const capStatus = booking.status.charAt(0).toUpperCase() + booking.status.slice(1).toLowerCase()
    return { ...booking, status: capStatus, court, time_slot: time }
  }
  return { status: 'Available', court, time_slot: time }
}

const gridItems = computed(() => {
  const items: any[] = []
  
  courts.forEach((court, courtIdx) => {
    const col = courtIdx + 2 
    let i = 0
    
    while (i < times.length) {
      const time = times[i] as string 
      const slotData = getSlotData(court, time)
      let span = 1

      if (slotData.status !== 'Available') {
        for (let j = i + 1; j < times.length; j++) {
          const nextTime = times[j] as string 
          const nextSlotData = getSlotData(court, nextTime)

          if (nextSlotData.status === 'Available') break

          const isSameStatus = slotData.status === nextSlotData.status
          
          const isSameRef = slotData.booking_reference && slotData.booking_reference === nextSlotData.booking_reference

          if (isSameStatus && isSameRef) {
            span++
          } else {
            break
          }
        }
      }

      items.push({
        ...slotData,
        row: i + 2, 
        col: col,
        span: span
      })

      i += span
    }
  })
  
  return items
})

const isSelectedForBlocking = (court: string, time: string) => {
  return selectedForBlocking.value.some(s => s.court === court && s.time_slot === time && s.date === selectedDate.value)
}

const handleSlotClick = (slotData: any) => {
  if (slotData.status === 'Available' || slotData.status === undefined) {
    const idx = selectedForBlocking.value.findIndex(s => s.court === slotData.court && s.time_slot === slotData.time_slot && s.date === selectedDate.value)
    
    if (idx > -1) selectedForBlocking.value.splice(idx, 1)
    else selectedForBlocking.value.push({ court: slotData.court, time_slot: slotData.time_slot, date: selectedDate.value })
    return
  }

  router.push({
    path: '/admin/slot', 
    query: { court: slotData.court, time: slotData.time_slot, date: selectedDate.value }
  })
}

const confirmBlockMultiple = async () => {
  if (selectedForBlocking.value.length === 0) return
  isBlocking.value = true


  const { data: existingBookings, error: checkError } = await supabase
    .from('bookings')
    .select('booking_date, court, time_slot')
    .eq('booking_date', selectedDate.value)
    .neq('status', 'Declined')

  if (!checkError && existingBookings) {
    const conflictSlots = selectedForBlocking.value.filter(slot => 
      existingBookings.some(existing => 
        existing.court === slot.court && 
        existing.time_slot === slot.time_slot
      )
    )

    if (conflictSlots.length > 0) {
      alert("⚠️ Cannot block. One or more of these slots were just booked by a customer! Refreshing grid...")
      selectedForBlocking.value = []
      await fetchDailyBookings()
      isBlocking.value = false
      return 
    }
  }

  const rowsToInsert = selectedForBlocking.value.map(slot => ({
    booking_reference: 'ADMIN_BLOCK',
    full_name: 'Admin Blocked',
    email: 'N/A',
    phone: 'N/A',
    booking_date: slot.date,
    court: slot.court,
    time_slot: slot.time_slot,
    price: 0,
    status: 'Blocked'
  }))

  const { error } = await supabase.from('bookings').insert(rowsToInsert)
  
  if (!error) {
    selectedForBlocking.value = [] 
    await fetchDailyBookings() 
  } else {
    console.error("Error blocking slots:", error)
    alert("Failed to block slots.")
  }
  isBlocking.value = false
}

const handleManualFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (file) {
      manualFile.value = file
      manualPreview.value = URL.createObjectURL(file)
    }
  }
}

const submitManualBooking = async () => {
  if (!manualForm.value.name || !manualForm.value.email || selectedForBlocking.value.length === 0 || !manualFile.value) return
  isManualBooking.value = true

  try {

    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('booking_date, court, time_slot')
      .eq('booking_date', selectedDate.value)
      .neq('status', 'Declined')

    if (checkError) throw checkError

    const conflictSlots = selectedForBlocking.value.filter(slot => 
      existingBookings?.some(existing => 
        existing.court === slot.court && 
        existing.time_slot === slot.time_slot
      )
    )

    if (conflictSlots.length > 0) {
      alert("⚠️ Cannot complete manual booking. One or more of these slots were just booked by a customer online! Refreshing grid...")
      selectedForBlocking.value = []
      showManualModal.value = false
      await fetchDailyBookings()
      isManualBooking.value = false
      return 
    }

    let publicUrl = null

    const fileExt = manualFile.value.name.split('.').pop()
    const fileName = `manual_${Math.random().toString(36).substring(2, 10)}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('receipts').upload(`receipts/${fileName}`, manualFile.value)
    
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('receipts').getPublicUrl(`receipts/${fileName}`)
    publicUrl = data.publicUrl

    const refCode = 'ADMIN-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const perSlotPrice = Math.floor(manualForm.value.price / selectedForBlocking.value.length)

    const rowsToInsert = selectedSlotsDetails.value.map(slot => ({
      booking_reference: refCode,
      full_name: manualForm.value.name,
      email: manualForm.value.email, 
      phone: manualForm.value.phone || 'N/A',
      booking_date: slot.date,
      court: slot.court,
      time_slot: slot.time_slot,
      price: manualForm.value.price === autoComputedTotal.value ? slot.price : perSlotPrice,
      status: 'Approved', 
      receipt_url: publicUrl
    }))

    const { error: dbError } = await supabase.from('bookings').insert(rowsToInsert)
    if (dbError) throw dbError

    try {
      const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
        body: {
          customerName: manualForm.value.name,
          customerEmail: manualForm.value.email, 
          customerPhone: manualForm.value.phone || 'N/A',
          reference: refCode,
          total: manualForm.value.price, 
          slots: rowsToInsert 
        }
      })
      
      if (emailError) console.error("Email failed to send:", emailError)
    } catch (err) {
      console.error("Edge function error:", err)
    }

    showManualModal.value = false
    selectedForBlocking.value = []
    manualForm.value = { name: '', email: '', phone: '', price: 0 }
    manualFile.value = null
    manualPreview.value = null
    
    await fetchDailyBookings()

  } catch (error) {
    console.error("Manual booking failed:", error)
    alert("There was an error creating this booking.")
  } finally {
    isManualBooking.value = false
  }
}

const handleGroupClick = (group: any) => {
  router.push({
    path: '/admin/slot', 
    query: { ref: group.reference }
  })
}

const goToMonthlySummary = () => {
  router.push('/admin/monthly')
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/admin')
}
</script>

<template>
  <div class="min-h-screen bg-[#F8F9FA] font-sans text-gray-800 pb-20 relative">
    
    <transition name="slide-up">
      <div v-if="selectedForBlocking.length > 0" class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#1C1C1C] text-white px-6 py-4 rounded-full shadow-2xl z-40 flex items-center gap-6 border border-gray-700">
        <span class="font-bold whitespace-nowrap">{{ selectedForBlocking.length }} Slot(s) Selected</span>
        <div class="flex items-center gap-3">
          
          <button @click="showManualModal = true" class="bg-[#A9FC24] text-[#1C1C1C] px-6 py-2 rounded-full font-bold hover:bg-[#97e31e] transition-colors shadow-sm">
            Book Courts
          </button>
          
          <button @click="confirmBlockMultiple" :disabled="isBlocking" class="bg-[#FF4A4A] text-white px-6 py-2 rounded-full font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
            {{ isBlocking ? 'Blocking...' : 'Block Courts' }}
          </button>
          
          <button @click="selectedForBlocking = []" class="text-gray-400 hover:text-white font-medium p-2 rounded-full hover:bg-gray-800 transition-colors ml-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>
    </transition>

    <div v-if="showManualModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <button @click="showManualModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-800">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <h2 class="text-2xl font-bold text-gray-900 mb-1">Manual Booking</h2>
        <p class="text-sm text-gray-500 mb-6">Create an auto-approved booking for {{ selectedForBlocking.length }} slot(s).</p>

        <div class="mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-200">
          <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-200 pb-2">Selected Courts Summary</h3>
          
          <div class="flex flex-col gap-2.5 max-h-32 overflow-y-auto custom-scrollbar pr-2">
            <div v-for="slot in selectedSlotsDetails" :key="slot.court + slot.time_slot" class="flex justify-between items-center">
              <span class="text-sm font-bold text-gray-800">{{ slot.court }} <span class="text-gray-500 font-medium ml-1.5">{{ slot.time_slot }}</span></span>
              <span class="text-sm font-black text-gray-900">₱{{ slot.price }}</span>
            </div>
          </div>
          
          <div class="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
            <span class="text-xs font-bold text-gray-500 uppercase">Auto-Computed Total</span>
            <span class="text-lg font-black text-[#A9FC24] bg-[#1C1C1C] px-3 py-1 rounded-lg">₱{{ autoComputedTotal }}</span>
          </div>
        </div>

        <form @submit.prevent="submitManualBooking" class="flex flex-col gap-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Customer Name *</label>
              <input type="text" v-model="manualForm.name" required class="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#A9FC24] outline-none" placeholder="Enter name" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Customer Email *</label>
              <input type="email" v-model="manualForm.email" required class="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#A9FC24] outline-none" placeholder="Enter email" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Contact Number</label>
              <input type="tel" v-model="manualForm.phone" class="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#A9FC24] outline-none" placeholder="09XX..." />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Override Total (₱)</label>
              <input type="number" v-model="manualForm.price" required min="0" class="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#A9FC24] outline-none font-bold text-gray-900" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 pl-1">Attach Receipt / Proof *</label>
            <input type="file" ref="fileInputRef" @change="handleManualFileChange" accept="image/*" class="hidden" />
            
            <div @click="() => fileInputRef?.click()" class="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors" :class="manualPreview ? 'h-auto border-green-500 bg-green-50/50' : 'h-32'">
              <template v-if="!manualPreview">
                <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                <span class="text-sm font-bold text-gray-600">Tap to upload receipt</span>
                <span class="text-xs text-red-500 font-bold mt-1">Required</span>
              </template>
              <img v-else :src="manualPreview" class="max-h-48 rounded-lg object-contain shadow-sm" />
            </div>
          </div>

          <button type="submit" :disabled="isManualBooking || !manualFile" class="mt-4 w-full bg-[#1C1C1C] text-[#A9FC24] py-4 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 disabled:text-gray-500 flex justify-center items-center gap-2">
            {{ isManualBooking ? 'Saving Booking...' : 'Confirm Auto-Approved Booking' }}
            <svg v-if="!isManualBooking" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
          </button>
        </form>
      </div>
    </div>

    <header class="flex justify-between items-center px-6 md:px-16 py-4 bg-white border-b border-gray-200 sticky top-0 z-30">
      <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
      <button @click="handleLogout" class="text-gray-600 hover:text-black font-medium transition-colors">
        Logout
      </button>
    </header>

    <main class="max-w-[1600px] mx-auto px-4 mt-8 relative">
      <div class="flex flex-col xl:flex-row gap-8 items-start">

        <div class="w-full xl:w-[400px] shrink-0 flex flex-col gap-4">
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px] sticky top-24">
            
            <div class="flex justify-between items-center mb-6 shrink-0">
              <h2 class="text-xl font-bold text-gray-900 tracking-tight">Recent Orders</h2>
              <span v-if="globalPendingGroups.length > 0" class="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {{ globalPendingGroups.length }} New
              </span>
            </div>

            <div v-if="globalPendingGroups.length === 0" class="flex-grow flex flex-col items-center justify-center text-center opacity-50">
              <svg class="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p class="font-bold text-lg">All caught up!</p>
              <p class="text-sm">No pending bookings.</p>
            </div>

            <div v-else class="flex-grow overflow-y-auto min-h-0 pr-2 custom-scrollbar flex flex-col gap-3">
              <div 
                v-for="group in globalPendingGroups" 
                :key="group.reference"
                @click="handleGroupClick(group)"
                class="bg-[#F8F9FA] hover:bg-gray-100 transition-colors p-4 rounded-2xl cursor-pointer border border-gray-200 group relative overflow-hidden shrink-0"
              >
                <div class="absolute top-0 right-0 bg-[#A9FC24] text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                  {{ group.slots.length }} SLOT{{ group.slots.length > 1 ? 'S' : '' }}
                </div>
                <div class="flex flex-col items-start mb-3 mt-1">
                  <p class="font-bold text-gray-900 text-sm truncate pr-2">{{ group.full_name }}</p>
                  <p class="text-[10px] text-gray-400 font-mono mt-0.5">{{ group.reference }}</p>
                </div>
                
                <div class="text-xs text-gray-500 flex flex-col gap-1.5 font-medium border-l-2 border-gray-200 pl-2">
                  <p class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> 
                    {{ formatPendingDate(group.slots[0].booking_date) }} | {{ group.slots[0].time_slot }}
                  </p>
                  <p v-if="group.slots.length > 1" class="text-gray-400 italic text-xs mt-1">
                    + {{ group.slots.length - 1 }} more slot(s)...
                  </p>
                </div>
                
                <div class="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span class="font-bold text-gray-900 text-sm">₱{{ group.totalPrice }}</span>
                  <span class="text-xs font-bold text-[#1C1C1C] group-hover:text-[#A9FC24] transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-gray-200 group-hover:border-[#A9FC24]">
                    Review Order <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="w-full flex-grow bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
            <h2 class="text-xl font-bold text-gray-900 tracking-tight">Daily Schedule</h2>
            
            <div class="flex items-center gap-4 w-full md:w-auto">
              
              <div class="relative group inline-block flex-grow md:flex-grow-0">
                <button type="button" class="w-full bg-[#EBEBEB] text-gray-800 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors shadow-sm relative">
                  <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span class="min-w-[90px] text-center tracking-wide">{{ displayDate }}</span>
                  <svg class="w-4 h-4 text-gray-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                  <div v-if="globalPendingGroups.length > 0" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                </button>
                
                <input 
                  type="date" 
                  v-model="selectedDate" 
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  @click="(e) => (e.target as any).showPicker?.()"
                />
              </div>

              <button @click="goToMonthlySummary" class="bg-[#1C1C1C] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-sm whitespace-nowrap">
                Monthly Summary
              </button>

            </div>
          </div>

          <div v-if="isLoading" class="text-center text-gray-500 py-32 font-medium flex flex-col items-center justify-center gap-4">
            <svg class="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Loading grid...
          </div>

          <div v-else class="w-full overflow-x-auto pb-6">
            
            <div class="min-w-[700px] grid grid-cols-[160px_repeat(4,_minmax(120px,_1fr))] gap-x-4 gap-y-3">
              
              <div class="text-left font-bold text-xs text-gray-400 tracking-widest pl-2 flex items-center" style="grid-column: 1; grid-row: 1;">TIME</div>
              
              <div v-for="(court, idx) in courts" :key="court" class="text-center font-bold text-sm text-gray-800 uppercase" :style="{ gridColumn: idx + 2, gridRow: 1 }">
                {{ court }}
              </div>

              <div v-for="(time, idx) in times" :key="time" class="text-left pl-2 text-sm font-semibold text-gray-600 min-h-[48px] flex items-center" :style="{ gridColumn: 1, gridRow: idx + 2 }">
                {{ time }}
              </div>

              <div v-for="cell in gridItems" :key="cell.court + cell.time_slot"
                   class="w-full"
                   :style="{ gridColumn: cell.col, gridRow: `${cell.row} / span ${cell.span}` }">
                
                <button 
                  @click="handleSlotClick(cell)"
                  class="w-full h-full min-h-[48px] rounded-xl font-bold text-xs tracking-tight transition-all active:scale-95 uppercase relative overflow-hidden border flex flex-col items-center justify-center"
                  :class="{
                    'bg-red-500 text-white border-red-600 shadow-inner scale-[0.98]': isSelectedForBlocking(cell.court, cell.time_slot),
                    'bg-[#F8F9FA] text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600': cell.status === 'Available' && !isSelectedForBlocking(cell.court, cell.time_slot),
                    'bg-[#2A2A2A] text-white hover:bg-black border-transparent shadow-md': cell.status === 'Pending',
                    'bg-[#A9FC24] text-[#2A2A2A] hover:bg-[#97e31e] border-transparent shadow-sm': cell.status === 'Approved',
                    'bg-black text-white hover:bg-gray-800 border-transparent shadow-md': cell.status === 'Blocked'
                  }"
                >
                  <div v-if="cell.status === 'Pending'" class="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg shadow-sm"></div>
                  
                  <template v-if="isSelectedForBlocking(cell.court, cell.time_slot)">
                    SELECT
                  </template>
                  <template v-else>
                    <span>{{ cell.status }}</span>
                    
                    <span v-if="cell.status !== 'Available' && cell.full_name" 
                          class="text-[10px] font-medium normal-case tracking-normal mt-0.5 truncate w-full px-2"
                          :class="{
                            'text-gray-300': cell.status === 'Pending',
                            'text-[#4A4A4A]': cell.status === 'Approved',
                            'text-gray-400': cell.status === 'Blocked'
                          }">
                      {{ cell.full_name }}
                    </span>
                  </template>
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

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
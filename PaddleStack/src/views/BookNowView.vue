<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg' 
import gcashQR from '@/assets/payment/gcash.jpg'
import bpiQR from '@/assets/payment/bpi.jpg'
import imageCompression from 'browser-image-compression'


const router = useRouter()
const currentStep = ref(1)
const isSubmitting = ref(false)
const isCompressing = ref(false) 
const isReceiptModalOpen = ref(false)
const isVerifyingEmail = ref(false)

const formData = reactive({
  fullName: '',
  email: '',
  phone: ''
})

const formErrors = reactive({
  email: '',
  phone: ''
})

const handleNextStep = async () => {
  formErrors.email = ''
  formErrors.phone = ''
  let isValid = true

  const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!formData.email || !strictEmailRegex.test(formData.email)) {
    formErrors.email = 'Please enter a valid email address (e.g., name@gmail.com).'
    isValid = false
  }

  const phoneRegex = /^[\d+\-\s]{10,15}$/
  if (!phoneRegex.test(formData.phone)) {
    formErrors.phone = 'Please enter a valid phone number.'
    isValid = false
  }

  if (!isValid || !formData.fullName) return

const domain = formData.email.split('@')[1]?.toLowerCase() || ''
  const trustedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com']

  if (trustedDomains.includes(domain)) {
    currentStep.value = 2
    return
  }

  isVerifyingEmail.value = true
  
  try {
    const { data, error } = await supabase.functions.invoke('verify-email', {
      body: { email: formData.email }
    })
    
    if (error) throw error

    if (data?.email_deliverability?.status === 'undeliverable') {
      formErrors.email = 'This email domain does not exist or cannot receive mail.'
      isValid = false
    } else if (data?.email_quality?.is_disposable === true) {
      formErrors.email = 'Temporary or disposable emails are not allowed.'
      isValid = false
    }

  } catch (error) {
    console.warn("Email verification bypassed or failed:", error)
  } finally {
    isVerifyingEmail.value = false
  }

  if (isValid && formData.fullName) {
    currentStep.value = 2
  }
}
const goToReview = () => {
  if (selectedSlots.value.length > 0) currentStep.value = 3
}

// --- DATE PICKER LOGIC ---
const getLocalDateString = (dateObj = new Date()) => {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
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

const fullFormattedDate = computed(() => {
  const parts = selectedDate.value.split('-') as [string, string, string]
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
})

// --- SUPABASE FETCHING & MASKING LOGIC ---
const publicBookings = ref<any[]>([])

const fetchAvailability = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('court, time_slot')
    .eq('booking_date', selectedDate.value)
    .neq('status', 'Declined')

  if (!error) publicBookings.value = data || []
}

onMounted(fetchAvailability)
watch(selectedDate, fetchAvailability)

const courts = ['COURT 1', 'COURT 2', 'COURT 3', 'COURT 4']
const times = [
  '8:00 - 9:00 am', '9:00 - 10:00 am', '10:00 - 11:00 am', '11:00 am - 12:00 pm',
  '12:00 - 1:00 pm', '1:00 - 2:00 pm', '2:00 - 3:00 pm', '3:00 - 4:00 pm',
  '4:00 - 5:00 pm', '5:00 - 6:00 pm', '6:00 - 7:00 pm', '7:00 - 8:00 pm',
  '8:00 - 9:00 pm', '9:00 - 10:00 pm', '10:00 - 11:00 pm', '11:00 pm - 12:00 am'
]

const scheduleGrid = computed(() => {
  const currentHour = new Date().getHours() 
  const isToday = selectedDate.value === today
  const activeRows: any[] = []

  times.forEach((time, timeIdx) => {
    const startHour = 8 + timeIdx; 
    
    if (isToday && currentHour >= startHour) return;
    
    const slots = courts.map((court) => {
      let price = 0;
      const isLate = timeIdx >= 7; 
      
      if (selectedDate.value >= '2026-06-03') {
        price = isLate ? 550 : 500;
      } else if (selectedDate.value >= '2026-05-28' && selectedDate.value <= '2026-06-02') {
        if (court === 'COURT 3' || court === 'COURT 4') {
          price = isLate ? 550 : 500;
        } else {
          price = isLate ? 500 : 450;
        }
      } else {

        price = isLate ? 400 : 300;
      }

      const isTaken = publicBookings.value.some(b => b.court === court && b.time_slot === time)
      const status = isTaken ? 'booked' : 'available'
      const label = isTaken ? 'Booked' : ''
      const id = `${selectedDate.value}-${court}-${time}`
      
      return { 
        id, 
        date: selectedDate.value, 
        formattedDate: fullFormattedDate.value, 
        court, 
        time, 
        price, 
        status, 
        label 
      }
    })

    activeRows.push({ timeLabel: time, slots })
  })

  return activeRows
})

const selectedSlots = ref<any[]>([])

const toggleSlot = (slot: any) => {
  if (slot.status === 'booked') return
  const existingIdx = selectedSlots.value.findIndex(s => s.id === slot.id)
  if (existingIdx >= 0) selectedSlots.value.splice(existingIdx, 1)
  else selectedSlots.value.push(slot)
}

const isSelected = (slotId: string) => selectedSlots.value.some(s => s.id === slotId)
const removeSlot = (slotId: string) => {
  selectedSlots.value = selectedSlots.value.filter(s => s.id !== slotId)
  if (selectedSlots.value.length === 0 && currentStep.value === 3) currentStep.value = 2
}

const totalPrice = computed(() => selectedSlots.value.reduce((sum, slot) => sum + slot.price, 0))
const uniqueCourtsCount = computed(() => new Set(selectedSlots.value.map(s => s.court)).size)

const groupedSlots = computed(() => {
  const groups: Record<string, any[]> = {}
  selectedSlots.value.forEach(slot => {
    const dateKey = slot.formattedDate
    const group = groups[dateKey] || []
    group.push(slot)
    groups[dateKey] = group
  })
  return groups
})

const paymentMethods = [
  { name: 'GCash - Rico F.', number: '0935-***-4647', qr: gcashQR },
  { name: 'BPI - Rico F.', number: '0935-***-4647', qr: bpiQR }
]
const currentQrIndex = ref(0)
const nextQr = () => currentQrIndex.value = (currentQrIndex.value + 1) % paymentMethods.length
const prevQr = () => currentQrIndex.value = (currentQrIndex.value - 1 + paymentMethods.length) % paymentMethods.length

const receiptFile = ref<File | null>(null)
const receiptPreview = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => fileInputRef.value?.click()

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (!file) return

    isCompressing.value = true

    const options = {
      maxSizeMB: 0.2, 
      maxWidthOrHeight: 1200,
      useWebWorker: true
    }

    try {
      const compressedFile = await imageCompression(file, options)
      
      console.log(`Original Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
      console.log(`Compressed Size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`)
      
      receiptFile.value = compressedFile
      receiptPreview.value = URL.createObjectURL(compressedFile)
    } catch (error) {
      console.error("Error shrinking image:", error)
      alert("Failed to process image. Please try a different screenshot.")
    } finally {
      isCompressing.value = false
    }
  }
}

const handleConfirmBooking = async () => {
  const currentFile = receiptFile.value
  if (selectedSlots.value.length === 0 || !currentFile) return
  
  isSubmitting.value = true

  try {
    const fileExt = currentFile.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 10)}.${fileExt}`
    const filePath = `receipts/${fileName}`

    const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, currentFile)
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
    const publicUrl = data.publicUrl

    const referenceCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const rowsToInsert = selectedSlots.value.map(slot => ({
      booking_reference: referenceCode,
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      booking_date: slot.date, 
      court: slot.court,
      time_slot: slot.time,
      price: slot.price,
      status: 'Pending',
      receipt_url: publicUrl
    }))

    const { error: dbError } = await supabase.from('bookings').insert(rowsToInsert)
    if (dbError) throw dbError

    selectedSlots.value = []
    receiptFile.value = null
    receiptPreview.value = null
    await fetchAvailability()
    
    router.push({ path: '/booking-confirmed', query: { ref: referenceCode } })

  } catch (error) {
    console.error('Error saving booking:', error)
    alert("There was an error saving your booking. Please try again.")
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col font-sans relative">
    
    <div v-if="isReceiptModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" @click="isReceiptModalOpen = false">
      <div class="relative max-w-2xl max-h-[90vh] w-full flex justify-center">
        <button @click="isReceiptModalOpen = false" class="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <img v-if="receiptPreview" :src="receiptPreview" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" @click.stop />
      </div>
    </div>

    <header class="flex justify-between items-center px-6 md:px-16 py-4 border-b border-gray-200">
      <RouterLink to="/">
        <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
      </RouterLink>
      <RouterLink to="/" class="text-gray-700 hover:text-black font-medium transition-colors">
        Home
      </RouterLink>
    </header>

    <div class="w-full flex justify-center py-6 md:py-8 px-4 border-b border-gray-100">
      <div class="flex items-center gap-3 md:gap-6 text-xs md:text-base">
        <span class="font-medium whitespace-nowrap transition-colors" :class="currentStep === 1 ? 'text-gray-900' : 'text-gray-400'">Your Details</span>
        <div class="w-12 md:w-32 h-[2px]" :class="currentStep >= 2 ? 'bg-gray-900' : 'bg-gray-200'"></div>
        <span class="font-medium whitespace-nowrap transition-colors" :class="currentStep === 2 ? 'text-gray-900' : 'text-gray-400'">Courts & Schedules</span>
        <div class="w-12 md:w-32 h-[2px]" :class="currentStep === 3 ? 'bg-gray-900' : 'bg-gray-200'"></div>
        <span class="font-medium whitespace-nowrap transition-colors" :class="currentStep === 3 ? 'text-gray-900' : 'text-gray-400'">Review & Confirm</span>
      </div>
    </div>

    <main class="flex-grow px-4 md:px-8 py-8 w-full max-w-[1400px] mx-auto">
      
      <transition name="slide-step" mode="out-in">
        
        <div v-if="currentStep === 1" key="step1" class="flex justify-center">
          <div class="w-full max-w-4xl bg-[#EBEBEB] rounded-3xl p-6 md:p-10 shadow-sm flex flex-col h-fit">
            <h1 class="text-3xl md:text-4xl font-bold text-[#4A4A4A] mb-1 tracking-tight">Your Information</h1>
            <p class="text-lg text-[#6B6B6B] mb-6">No account needed!</p>

            <form @submit.prevent="handleNextStep" class="flex flex-col gap-5">
              
              <div>
                <label class="block text-[#6B6B6B] font-medium mb-1.5 pl-1 text-sm">Full Name</label>
                <input 
                  type="text" 
                  v-model="formData.fullName" 
                  required 
                  class="w-full md:max-w-[480px] px-4 py-3 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-[#A9FC24] outline-none text-gray-800 transition-all" 
                />
              </div>

              <div>
                <label class="block text-[#6B6B6B] font-medium mb-1.5 pl-1 text-sm">Email</label>
                <input 
                  type="email" 
                  v-model="formData.email" 
                  required 
                  :class="formErrors.email ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-[#A9FC24]'"
                  class="w-full md:max-w-[480px] px-4 py-3 bg-white rounded-xl border-none shadow-sm outline-none text-gray-800 transition-all" 
                />
                <span v-if="formErrors.email" class="text-red-500 text-xs font-bold mt-2 pl-1 block">
                  {{ formErrors.email }}
                </span>
              </div>

              <div>
                <label class="block text-[#6B6B6B] font-medium mb-1.5 pl-1 text-sm">Phone Number</label>
                <input 
                  type="tel" 
                  v-model="formData.phone" 
                  required 
                  :class="formErrors.phone ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-[#A9FC24]'"
                  class="w-full md:max-w-[480px] px-4 py-3 bg-white rounded-xl border-none shadow-sm outline-none text-gray-800 transition-all" 
                />
                <span v-if="formErrors.phone" class="text-red-500 text-xs font-bold mt-2 pl-1 block">
                  {{ formErrors.phone }}
                </span>
              </div>

              <div class="mt-6 flex justify-end">
                <button type="submit" class="bg-[#4A4A4A] text-white px-8 py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-md">
                  Next <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div v-else-if="currentStep === 2" key="step2" class="flex flex-col w-full">
          <div class="flex justify-center w-full mb-8">
            <div class="relative group">
              <button type="button" class="bg-[#EBEBEB] text-gray-800 px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 group-hover:bg-gray-200 transition-colors shadow-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="min-w-[90px] text-center tracking-wide">{{ displayDate }}</span>
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
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

          <div class="flex flex-col lg:flex-row gap-8 items-start w-full">
            <div class="flex-grow w-full overflow-hidden">
              
              <div v-if="scheduleGrid.length === 0" class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Courts Closed for Today</h3>
                <p class="text-gray-500 font-medium">All remaining time slots for today have already passed.<br/>Please select a date tomorrow or later.</p>
              </div>

              <div v-else class="overflow-x-auto w-full pb-6">
                <div class="min-w-[700px]">
                  <div class="grid grid-cols-[160px_repeat(4,_minmax(120px,_1fr))] gap-3 mb-4 pl-4">
                    <div class="text-left font-bold text-gray-800 pl-2">TIME</div>
                    <div v-for="court in courts" :key="court" class="text-center font-bold text-gray-800">{{ court }}</div>
                  </div>
                  <div class="flex flex-col gap-3 pl-4 pr-2">
                    <div v-for="(row, index) in scheduleGrid" :key="index" class="grid grid-cols-[160px_repeat(4,_minmax(120px,_1fr))] gap-3 items-center">
                      <div class="text-sm font-semibold text-gray-700 text-left pl-2 whitespace-nowrap">{{ row.timeLabel }}</div>
                      
                      <div v-for="slot in row.slots" :key="slot.id">
                        <div v-if="slot.status === 'booked'" class="w-full py-3.5 bg-[#E6E6E6] text-[#A3A3A3] rounded-xl font-bold flex items-center justify-center cursor-not-allowed text-sm shadow-inner">
                          {{ slot.label }}
                        </div>
                        <button v-else-if="isSelected(slot.id)" @click="toggleSlot(slot)" class="w-full py-3.5 bg-[#1C1C1C] text-white rounded-xl font-bold flex items-center justify-center cursor-pointer shadow-lg transform hover:scale-[1.02] transition-all">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button v-else @click="toggleSlot(slot)" class="w-full py-3.5 bg-[#A9FC24] text-black rounded-xl font-bold flex items-center justify-center cursor-pointer shadow-sm hover:brightness-95 transform hover:-translate-y-0.5 transition-all text-sm">
                          ₱{{ slot.price }}
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div class="w-full lg:w-[320px] xl:w-[350px] shrink-0 lg:sticky lg:top-8 mt-8 lg:mt-0">
              <div class="bg-[#1C1C1C] rounded-2xl p-6 shadow-xl flex flex-col mb-4 min-h-[300px]">
                <h3 class="text-white text-xl font-bold text-center mb-6">Selected Slots</h3>
                <div v-if="selectedSlots.length === 0" class="text-gray-400 text-center py-10 text-sm flex-grow">Tap an available court time<br/>to add it to your booking.</div>
                
                <div class="flex flex-col gap-5 mb-8 flex-grow">
                  <div v-for="slot in selectedSlots" :key="slot.id" class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <button @click="removeSlot(slot.id)" class="text-red-500 hover:text-red-400 font-bold transition-colors">X</button>
                      <div class="flex flex-col">
                        <span class="text-white font-bold text-sm tracking-wide">{{ slot.court }}</span>
                        <span class="text-gray-300 text-xs mt-0.5">{{ slot.formattedDate.split(',')[1] }} | {{ slot.time }}</span>
                      </div>
                    </div>
                    <span class="text-white font-bold text-sm">₱{{ slot.price }}</span>
                  </div>
                </div>
                
                <div class="bg-[#F5F5F5] rounded-xl px-5 py-4 flex justify-between items-center mt-auto">
                  <span class="text-black font-bold">Total:</span>
                  <span class="text-black font-bold">₱{{ totalPrice }}</span>
                </div>
              </div>
              <button @click="goToReview" :disabled="selectedSlots.length === 0" class="w-full bg-[#1C1C1C] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all" :class="selectedSlots.length > 0 ? 'hover:bg-black shadow-lg transform hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed'">
                Review Booking
                <svg class="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 3" key="step3" class="w-full max-w-5xl mx-auto pb-10">
          <button @click="currentStep = 2" class="mb-6 flex items-center gap-2 text-gray-500 hover:text-black font-medium transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7-7h18"></path></svg>
            Back to Schedule
          </button>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div class="flex flex-col gap-6 lg:gap-8">
              
              <div class="bg-[#1C1C1C] p-8 rounded-[32px] shadow-lg flex flex-col gap-6">
                <h3 class="text-white text-sm font-bold tracking-widest uppercase">Booking Summary</h3>
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                  <h4 class="text-gray-900 font-bold mb-3 uppercase tracking-wide text-sm">Contact Details</h4>
                  <p class="text-gray-900 font-medium text-lg">{{ formData.fullName }}</p>
                  <p class="text-gray-900 font-medium text-lg underline decoration-gray-400 underline-offset-4">{{ formData.email }}</p>
                  <p class="text-gray-900 font-medium text-lg mt-1">{{ formData.phone }}</p>
                </div>
                
                <div class="bg-white rounded-2xl p-6 shadow-sm">
                  <h4 class="text-gray-900 font-bold mb-5 uppercase tracking-wide text-sm border-b border-gray-100 pb-2">Itinerary</h4>
                  
                  <div class="flex flex-col gap-5">
                    <div v-for="(slots, dateStr) in groupedSlots" :key="dateStr" class="flex flex-col gap-3">
                      <p class="text-[#A9FC24] text-xs font-bold tracking-widest uppercase bg-[#1C1C1C] px-3 py-1 rounded-md self-start">{{ dateStr }}</p>
                      <div class="flex flex-col gap-2 pl-2 border-l-2 border-gray-100">
                        <div v-for="slot in slots" :key="slot.id" class="flex justify-between items-center">
                          <p class="text-gray-900 font-bold text-md">{{ slot.court }} <span class="text-gray-500 font-medium text-sm ml-2">{{ slot.time }}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-[#1C1C1C] p-8 rounded-[32px] shadow-lg flex flex-col min-h-[300px]">
                <h3 class="text-white text-sm font-bold tracking-widest uppercase mb-8">Payment Breakdown</h3>
                <div class="flex flex-col gap-6 flex-grow">
                  
                  <div v-for="(slots, dateStr) in groupedSlots" :key="'breakdown-'+dateStr" class="flex flex-col gap-4">
                    <p class="text-gray-400 text-xs font-bold tracking-widest uppercase border-b border-gray-700 pb-1">{{ dateStr }}</p>
                    <div v-for="slot in slots" :key="'p-'+slot.id" class="flex justify-between items-center">
                      <p class="text-white font-medium text-lg">{{ slot.court }} <span class="text-gray-400 text-sm ml-2">{{ slot.time }}</span></p>
                      <p class="text-white font-bold text-lg">₱{{ slot.price }}</p>
                    </div>
                  </div>

                </div>
                <div class="flex justify-between items-center pt-8 mt-4 border-t border-gray-700">
                  <p class="text-white font-medium">Total:</p>
                  <p class="text-[#A9FC24] font-bold text-2xl tracking-tight">₱{{ totalPrice }}</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-6 lg:gap-8">
              
              <div class="bg-[#1C1C1C] p-8 rounded-[32px] shadow-lg">
                <div class="flex justify-between items-end mb-8">
                  <div>
                    <h3 class="text-white text-sm font-bold tracking-widest uppercase">Payment</h3>
                    <p class="text-gray-400 text-sm mt-1">Scan to pay</p>
                  </div>
                  <p class="text-gray-400 text-sm">{{ paymentMethods[currentQrIndex]?.name?.split(' - ')[0] }}</p>
                </div>
                
                <div class="relative flex items-center justify-center bg-[#2A2A2A] rounded-2xl p-4 aspect-[3/4] min-h-[400px]">
                  <button @click="prevQr" class="absolute left-2 p-2 text-gray-500 hover:text-white transition-colors z-10">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                  
                  <img :src="paymentMethods[currentQrIndex]?.qr" class="w-full h-full object-contain max-h-[480px] rounded-xl shadow-md" />
                  
                  <button @click="nextQr" class="absolute right-2 p-2 text-gray-500 hover:text-white transition-colors z-10">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                </div>
              </div>

              <div class="bg-[#1C1C1C] p-8 rounded-[32px] shadow-lg">
                <h3 class="text-white text-sm font-bold tracking-widest uppercase mb-6">Upload Payment Receipt</h3>
                
                <input type="file" ref="fileInputRef" @change="handleFileChange" accept="image/*" class="hidden" />
                
                <div class="w-full bg-[#D9D9D9] rounded-2xl border-4 border-dashed border-gray-400 p-3 h-48 relative overflow-hidden transition-colors" :class="!receiptPreview && !isCompressing ? 'hover:bg-[#EBEBEB]' : ''">
                  
                  <template v-if="!receiptPreview">
                    <div @click="!isCompressing && triggerFileInput()" class="w-full h-full flex flex-col items-center justify-center" :class="isCompressing ? 'cursor-wait opacity-70' : 'cursor-pointer'">
                      <svg v-if="!isCompressing" class="w-10 h-10 text-gray-800 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      <svg v-else class="animate-spin w-10 h-10 text-gray-800 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      
                      <span class="text-gray-800 font-bold text-sm tracking-wide">
                        {{ isCompressing ? 'COMPRESSING IMAGE...' : 'TAP TO UPLOAD RECEIPT' }}
                      </span>
                    </div>
                  </template>

                  <template v-else>
                    <div class="w-full h-full flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-inner">
                      <img :src="receiptPreview" class="h-full w-28 object-cover rounded-lg border border-gray-300" />
                      
                      <div class="flex flex-col flex-grow gap-2 pr-2">
                        <span class="text-gray-800 font-bold text-sm flex items-center gap-1.5 mb-1">
                          <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                          Receipt Attached
                        </span>
                        
                        <button @click="isReceiptModalOpen = true" class="bg-[#1C1C1C] text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors w-full">
                          View Full Image
                        </button>
                        
                        <button @click="triggerFileInput" class="bg-gray-200 text-gray-800 py-2 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors w-full">
                          Change Receipt
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="flex flex-col items-center mt-6 mb-8 text-center">
                <p class="text-gray-800 font-bold text-lg">{{ selectedSlots.length }} Slots - {{ uniqueCourtsCount }} Courts</p>
                <button @click="handleConfirmBooking" :disabled="isSubmitting || !receiptFile || isCompressing" class="mt-4 bg-[#A9FC24] text-black px-12 py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all flex items-center gap-3" :class="receiptFile && !isSubmitting && !isCompressing ? 'hover:-translate-y-1 hover:shadow-xl' : 'opacity-50 cursor-not-allowed'">
                  {{ isSubmitting ? 'Processing...' : (isCompressing ? 'Compressing Image...' : 'Confirm Reservation') }}
                </button>
                <p class="text-gray-800 font-bold text-sm mt-6">Confirmation sent once approved by staff</p>
                <p v-if="!receiptFile" class="text-red-500 text-sm font-bold mt-2 animate-pulse">Please attach your receipt to confirm.</p>
              </div>
            </div>
          </div>
        </div>

      </transition>
    </main>
  </div>
</template>

<style scoped>
.slide-step-enter-active,
.slide-step-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-step-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-step-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
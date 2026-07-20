<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg'

const route = useRoute()
const router = useRouter()

const refCode = route.query.ref as string
const courtParam = route.query.court as string
const timeSlotParam = route.query.time as string
const dateParam = route.query.date as string

const orderSlots = ref<any[]>([])
const status = ref('AVAILABLE')
const isLoading = ref(true)
const searchQuery = ref((route.query.ref as string) || '')


const handleSearch = () => {
  const query = searchQuery.value.trim()
  if (!query) return
  

  window.location.href = `/admin/slot?ref=${query.toUpperCase()}`
}

const confirmModal = ref({
  show: false,
  type: '', 
  message: ''
})

// Alert State Management
const toast = ref({
  show: false,
  message: '',
  type: 'success' 
})

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message: msg, type }
}

const customerInfo = computed(() => orderSlots.value.length > 0 ? orderSlots.value[0] : null)

const displayDate = (dateStr: string) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-') as [string, string, string]
  const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

onMounted(async () => {
  try {
    let fetchedData = null;

    if (refCode) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_reference', refCode)
      
      if (!error && data) fetchedData = data;
    } 
    else if (courtParam && timeSlotParam && dateParam) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('court', courtParam)
        .eq('time_slot', timeSlotParam)
        .eq('booking_date', dateParam)
        .neq('status', 'Declined') 

      if (!error && data && data.length > 0) {
        if (data[0].booking_reference && data[0].booking_reference !== 'ADMIN_BLOCK') {
          const { data: fullData } = await supabase
            .from('bookings')
            .select('*')
            .eq('booking_reference', data[0].booking_reference)
          fetchedData = fullData;
        } else {
          fetchedData = data;
        }
      }
    }

  
    if (fetchedData && fetchedData.length > 0) {
      orderSlots.value = fetchedData.sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
      status.value = fetchedData[0].status.toUpperCase()
    } else {

      if (refCode) {
        status.value = 'NOT_FOUND'
      } else {
        status.value = 'AVAILABLE'
      }
    }

  } catch (err) {
    console.error("Error loading slot info:", err)
  } finally {
    isLoading.value = false
  }
})

const totalPrice = computed(() => {
  return orderSlots.value.reduce((sum, slot) => sum + (slot.price || 0), 0)
})


const imageFailedToLoad = ref(false)

// Computes the clean filename without any Supabase tokens attached
const cleanFileName = computed(() => {
  const url = customerInfo.value?.receipt_url
  if (!url) return 'the file'
  

  const urlEnd = url.split('/').pop() || 'the file'
  

  return urlEnd.split('?')[0]
})

const handleApprove = async () => {
  if (orderSlots.value.length === 0) return
  
  const ids = orderSlots.value.map(slot => slot.id)
  await supabase.from('bookings').update({ status: 'Approved' }).in('id', ids)

  try {
    const { error } = await supabase.functions.invoke('send-approval-email', {
      body: {
        customerName: customerInfo.value.full_name,
        customerEmail: customerInfo.value.email, 
        customerPhone: customerInfo.value.phone,
        reference: customerInfo.value.booking_reference,
        total: totalPrice.value,
        slots: orderSlots.value
      }
    })
    
    if (error) console.error("Email failed to send:", error)
  } catch (err) {
    console.error("Edge function error:", err)
  }

  showToast('Booking Approved Successfully!', 'success')
  setTimeout(() => {
    router.push('/admin/dashboard')
  }, 1500)
}

const handleUnblock = async () => {
  if (orderSlots.value.length > 0) {
    const ids = orderSlots.value.map(slot => slot.id)
    await supabase.from('bookings').delete().in('id', ids)
  }
  
  showToast('Court Unblocked!', 'success')
  setTimeout(() => {
    router.push('/admin/dashboard')
  }, 1200)
}

const promptConfirm = (type: 'block' | 'decline') => {
  confirmModal.value = {
    show: true,
    type: type,
    message: type === 'block' ? 'Block this court for this date and time?' : `Are you sure you want to decline this order (${orderSlots.value.length} slots)?`
  }
}

const executeConfirm = async () => {
  confirmModal.value.show = false
  
  if (confirmModal.value.type === 'decline' && orderSlots.value.length > 0) {
    const ids = orderSlots.value.map(slot => slot.id)
    await supabase.from('bookings').update({ status: 'Declined' }).in('id', ids)
    
    showToast('Booking Declined.', 'error')
    setTimeout(() => {
      router.push('/admin/dashboard')
    }, 1500)
  } 
  else if (confirmModal.value.type === 'block') {
    const { data: conflictCheck, error: checkError } = await supabase
    .from('bookings')
    .select('id')
    .eq('court', courtParam)
    .eq('time_slot', timeSlotParam)
    .eq('booking_date', dateParam)
    .neq('status', 'Declined')

  if (!checkError && conflictCheck && conflictCheck.length > 0) {
    showToast('Cannot block. Slot was just booked by a customer!', 'error')
    setTimeout(() => router.push('/admin/dashboard'), 2000)
    return
  }
    await supabase.from('bookings').insert({
      booking_reference: 'ADMIN_BLOCK',
      full_name: 'Admin Blocked',
      email: 'N/A',
      phone: 'N/A',
      booking_date: dateParam,
      court: courtParam,
      time_slot: timeSlotParam,
      price: 0,
      status: 'Blocked'
    })
    
    showToast('Court Blocked!', 'error')
    setTimeout(() => {
      router.push('/admin/dashboard')
    }, 1200)
  }
}
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-gray-800 relative">
    
    <transition name="toast-slide">
      <div v-if="toast.show" 
           class="fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2.5 transition-all border"
           :class="toast.type === 'success' ? 'bg-[#A9FC24] text-[#1C1C1C] border-[#97e31e]' : 'bg-[#FF8A8A] text-white border-[#ff7171]'">
        
        <svg v-if="toast.type === 'success'" class="w-5 h-5 text-[#1C1C1C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        <svg v-if="toast.type === 'error'" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>
        
        {{ toast.message }}
      </div>
    </transition>

    <header class="flex justify-between items-center px-6 md:px-16 py-4 bg-white border-b border-gray-200 sticky top-0 z-30 gap-4">
  

  <div class="flex-1 flex justify-start">
    <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
  </div>


  <div class="flex-[2] flex justify-center max-w-md w-full">
    <form @submit.prevent="handleSearch" class="relative w-full">
      <input 
        type="text" 
        v-model="searchQuery"
        placeholder="Search Reference (e.g. ADMIN-123)" 
        class="w-full bg-gray-50 border border-gray-200 text-sm px-4 py-2.5 rounded-full focus:ring-2 focus:ring-[#A9FC24] outline-none pl-10 font-medium text-gray-800 transition-all placeholder:font-normal"
      />
     
      <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
  
      <button 
        v-if="searchQuery" 
        type="button" 
        @click="searchQuery = ''" 
        class="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
      >
         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
         </svg>
      </button>
    </form>
  </div>

  <div class="flex-1 flex justify-end">
    <button @click="router.push('/admin/dashboard')" class="text-gray-600 hover:text-black font-medium transition-colors">
      Back to Dashboard
    </button>
  </div>
  
</header>

    <main class="flex justify-center px-4 py-12 relative">
      
      <div v-if="isLoading" class="text-gray-500 font-medium animate-pulse">Loading details...</div>
      <div v-else-if="status === 'NOT_FOUND'" class="bg-[#EBEBEB] rounded-[24px] p-8 md:p-10 w-full max-w-lg shadow-sm flex flex-col items-center justify-center text-center py-16 relative">
        <button @click="router.push('/admin/dashboard')" class="absolute top-6 right-6 md:top-8 md:right-8 bg-white/60 hover:bg-white text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold flex items-center gap-1.5 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back
        </button>

        <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="text-2xl font-bold text-[#4A4A4A] mb-2">Booking Not Found</h3>
        <p class="text-[#6B6B6B] font-medium">We couldn't find any booking matching the reference <br><span class="font-bold text-[#1C1C1C] block mt-1 text-lg">"{{ refCode }}"</span></p>
      </div>

      <div v-else class="bg-[#EBEBEB] rounded-[24px] p-8 md:p-10 w-full max-w-lg shadow-sm relative">
        
        <button @click="router.push('/admin/dashboard')" class="absolute top-6 right-6 md:top-8 md:right-8 bg-white/60 hover:bg-white text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold flex items-center gap-1.5 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back
        </button>

        <h2 class="text-3xl font-bold text-[#4A4A4A] mb-1 pr-20">
          <template v-if="orderSlots.length > 1">Order Details</template>
          <template v-else>{{ courtParam || customerInfo?.court }}</template>
        </h2>
        
        <p class="text-[#6B6B6B] font-medium text-sm mb-6">
          <template v-if="orderSlots.length > 1">{{ orderSlots.length }} slots requested</template>
          <template v-else>{{ timeSlotParam || customerInfo?.time_slot }}</template>
        </p>
        
        <p class="text-[#6B6B6B] text-sm mb-8 font-medium">Status: <span class="font-bold text-[#4A4A4A]">{{ status }}</span></p>

        <div v-if="status === 'AVAILABLE'">
          <button @click="promptConfirm('block')" class="bg-[#A9FC24] text-[#2A2A2A] px-8 py-3 rounded-xl font-bold hover:bg-[#97e31e] shadow-sm transition-colors">
            Block Court
          </button>
        </div>

        <div v-if="status === 'BLOCKED'">
          <button @click="handleUnblock" class="bg-[#A9FC24] text-[#2A2A2A] px-8 py-3 rounded-xl font-bold hover:bg-[#97e31e] shadow-sm transition-colors">
            Unblock Court
          </button>
        </div>

        <div v-if="status === 'PENDING' || status === 'APPROVED'" class="space-y-5">
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-[#6B6B6B] text-xs font-medium">Name</p>
              <p class="text-[#4A4A4A] text-lg font-bold">{{ customerInfo?.full_name }}</p>
            </div>
            <div>
              <p class="text-[#6B6B6B] text-xs font-medium">Number</p>
              <p class="text-[#4A4A4A] text-lg font-bold">{{ customerInfo?.phone }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-[#6B6B6B] text-xs font-medium">Email</p>
              <p class="text-[#4A4A4A] text-lg font-bold">{{ customerInfo?.email }}</p>
            </div>
          </div>

          <div class="mt-4 bg-white/60 p-4 rounded-xl border border-gray-200 shadow-sm">
            <p class="text-[#6B6B6B] text-xs font-medium mb-3 border-b border-gray-200 pb-2">Requested Slots</p>
            
            <div class="flex flex-col gap-3">
              <div v-for="slot in orderSlots" :key="slot.id" class="flex justify-between items-center text-sm font-bold text-[#4A4A4A]">
                <div class="flex items-center gap-2">
                  <span class="bg-[#EBEBEB] px-2 py-1 rounded text-xs">{{ slot.court }}</span>
                  <span class="text-xs text-gray-500 tracking-wide">{{ displayDate(slot.booking_date) }}</span>
                  <span class="ml-1">{{ slot.time_slot }}</span>
                </div>
                <span class="text-[#1C1C1C]">₱{{ slot.price || 0 }}</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
              <span class="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Total</span>
              <span class="text-lg font-black text-[#1C1C1C]">₱{{ totalPrice }}</span>
            </div>
          </div>
          
          <div class="mt-4">
            <p class="text-[#6B6B6B] text-xs font-medium mb-2">Proof of Payment</p>
            <div class="w-full bg-[#2A2A2A] rounded-xl overflow-hidden border-2 border-dashed border-gray-400 flex items-center justify-center min-h-[200px]">
               <img 
                 v-if="customerInfo?.receipt_url && !imageFailedToLoad" 
                 :src="customerInfo.receipt_url" 
                 @error="imageFailedToLoad = true"
                 alt="GCash Receipt" 
                 class="w-full h-auto max-h-[400px] object-contain" 
               />
               <div v-else-if="customerInfo?.receipt_url && imageFailedToLoad" class="text-gray-300 font-medium text-sm p-8 text-center flex flex-col items-center gap-2">
                 <svg class="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                 <span>Receipt archived to save space.</span>
                 <span>Look for <strong class="text-white">{{ cleanFileName }}</strong> on Google Drive.</span>
               </div>
               <span v-else class="text-gray-400 font-medium text-sm p-8 text-center">
                 No receipt attached
               </span>
            </div>
          </div>

          <div v-if="status === 'PENDING'" class="flex gap-4 mt-8 pt-4">
            <button @click="handleApprove" class="flex-1 bg-[#A9FC24] text-[#2A2A2A] py-3.5 rounded-xl font-bold hover:bg-[#97e31e] shadow-sm transition-transform active:scale-95">
              Approve All
            </button>
            <button @click="promptConfirm('decline')" class="flex-1 bg-[#FF8A8A] text-white py-3.5 rounded-xl font-bold hover:bg-[#ff7171] shadow-sm transition-transform active:scale-95">
              Decline All
            </button>
          </div>
        </div>

      </div>

      <div v-if="confirmModal.show" class="absolute inset-0 bg-black/60 flex items-center justify-center z-50 rounded-[24px]">
        <div class="bg-[#333333] rounded-[20px] p-8 max-w-sm w-11/12 text-center shadow-2xl">
          <h3 class="text-white text-xl font-medium mb-8">{{ confirmModal.message }}</h3>
          <div class="flex gap-4 justify-center">
            <button @click="confirmModal.show = false" class="flex-1 bg-white text-[#333333] py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-colors">
              Go Back
            </button>
            <button @click="executeConfirm" 
              :class="confirmModal.type === 'block' ? 'bg-[#A9FC24] text-[#2A2A2A] hover:bg-[#97e31e]' : 'bg-[#FF8A8A] text-white hover:bg-[#ff7171]'"
              class="flex-1 py-3.5 rounded-xl font-bold transition-colors">
              {{ confirmModal.type === 'block' ? 'Block Court' : 'Decline' }}
            </button>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}
</style>
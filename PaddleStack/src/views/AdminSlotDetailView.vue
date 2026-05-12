<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg'

const route = useRoute()
const router = useRouter()


const court = route.query.court as string
const timeSlot = route.query.time as string
const date = route.query.date as string

const booking = ref<any>(null)
const status = ref('AVAILABLE')
const isLoading = ref(true)


const confirmModal = ref({
  show: false,
  type: '', 
  message: ''
})

onMounted(async () => {

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('court', court)
    .eq('time_slot', timeSlot)
    .eq('booking_date', date)
    .neq('status', 'Declined') 

  if (data && data.length > 0) {
    booking.value = data[0]
    status.value = data[0].status.toUpperCase()
  } else {
    status.value = 'AVAILABLE'
  }
  
  isLoading.value = false
})

const handleApprove = async () => {
  if (booking.value?.id) {
    await supabase.from('bookings').update({ status: 'Approved' }).eq('id', booking.value.id)
  }
  router.push('/admin/dashboard')
}

const handleUnblock = async () => {
  if (booking.value?.id) {
    await supabase.from('bookings').delete().eq('id', booking.value.id)
  }
  router.push('/admin/dashboard')
}

const promptConfirm = (type: 'block' | 'decline') => {
  confirmModal.value = {
    show: true,
    type: type,
    message: type === 'block' ? 'Block this court for this date and time?' : 'Are you sure you want to decline?'
  }
}

const executeConfirm = async () => {
  if (confirmModal.value.type === 'decline' && booking.value?.id) {
    await supabase.from('bookings').update({ status: 'Declined' }).eq('id', booking.value.id)
  } 
  else if (confirmModal.value.type === 'block') {
    await supabase.from('bookings').insert({
      booking_reference: 'ADMIN_BLOCK',
      full_name: 'Admin Blocked',
      email: 'N/A',
      phone: 'N/A',
      booking_date: date,
      court: court,
      time_slot: timeSlot,
      price: 0,
      status: 'Blocked'
    })
  }
  router.push('/admin/dashboard')
}
</script>

<template>
  <div class="min-h-screen bg-white font-sans text-gray-800">
    
    <header class="flex justify-between items-center px-6 md:px-16 py-4 border-b border-gray-200">
      <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
      <button @click="router.push('/admin/dashboard')" class="text-gray-600 hover:text-black font-medium">
        Back to Dashboard
      </button>
    </header>

    <main class="flex justify-center px-4 py-12 relative">
      
      <div v-if="isLoading" class="text-gray-500 font-medium">Loading details...</div>

      <div v-else class="bg-[#EBEBEB] rounded-[24px] p-8 md:p-10 w-full max-w-md shadow-sm relative">
        
        <h2 class="text-4xl font-bold text-[#4A4A4A] mb-1">{{ court }}</h2>
        <p class="text-[#6B6B6B] font-medium text-sm mb-6">{{ timeSlot }}</p>
        <p class="text-[#6B6B6B] text-sm mb-8 font-medium">Status: {{ status }}</p>

        <div v-if="status === 'AVAILABLE'">
          <button @click="promptConfirm('block')" class="bg-[#A9FC24] text-[#2A2A2A] px-8 py-3 rounded-xl font-bold hover:bg-[#97e31e] shadow-sm">
            Block Court
          </button>
        </div>

        <div v-if="status === 'BLOCKED'">
          <button @click="handleUnblock" class="bg-[#A9FC24] text-[#2A2A2A] px-8 py-3 rounded-xl font-bold hover:bg-[#97e31e] shadow-sm">
            Unblock Court
          </button>
        </div>

        <div v-if="status === 'PENDING' || status === 'APPROVED'" class="space-y-4">
          <div>
            <p class="text-[#6B6B6B] text-xs font-medium">Name</p>
            <p class="text-[#4A4A4A] text-xl">{{ booking?.full_name }}</p>
          </div>
          <div>
            <p class="text-[#6B6B6B] text-xs font-medium">Email</p>
            <p class="text-[#4A4A4A] text-xl">{{ booking?.email }}</p>
          </div>
          <div>
            <p class="text-[#6B6B6B] text-xs font-medium">Number</p>
            <p class="text-[#4A4A4A] text-xl">{{ booking?.phone }}</p>
          </div>
          
          <div class="mt-4">
            <p class="text-[#6B6B6B] text-xs font-medium mb-2">Proof of Payment</p>
            <div class="w-full bg-[#2A2A2A] rounded-xl overflow-hidden border-2 border-dashed border-gray-400 flex items-center justify-center min-h-[200px]">
               <img 
                 v-if="booking?.receipt_url" 
                 :src="booking.receipt_url" 
                 alt="GCash Receipt" 
                 class="w-full h-auto max-h-[500px] object-contain" 
               />
               <span v-else class="text-gray-400 font-medium text-sm p-8 text-center">
                 No receipt attached
               </span>
            </div>
          </div>

          <div v-if="status === 'PENDING'" class="flex gap-4 mt-8 pt-4">
            <button @click="handleApprove" class="flex-1 bg-[#A9FC24] text-[#2A2A2A] py-3.5 rounded-xl font-bold hover:bg-[#97e31e] shadow-sm">
              Approve
            </button>
            <button @click="promptConfirm('decline')" class="flex-1 bg-[#FF8A8A] text-white py-3.5 rounded-xl font-bold hover:bg-[#ff7171] shadow-sm">
              Decline
            </button>
          </div>
        </div>

      </div>

      <div v-if="confirmModal.show" class="absolute inset-0 bg-black/60 flex items-center justify-center z-50 rounded-[24px]">
        <div class="bg-[#333333] rounded-[20px] p-8 max-w-sm w-11/12 text-center shadow-2xl">
          <h3 class="text-white text-xl font-medium mb-8">{{ confirmModal.message }}</h3>
          <div class="flex gap-4 justify-center">
            <button @click="confirmModal.show = false" class="flex-1 bg-white text-[#333333] py-3.5 rounded-xl font-bold hover:bg-gray-100">
              Go Back
            </button>
            <button @click="executeConfirm" 
              :class="confirmModal.type === 'block' ? 'bg-[#A9FC24] text-[#2A2A2A] hover:bg-[#97e31e]' : 'bg-[#FF8A8A] text-white hover:bg-[#ff7171]'"
              class="flex-1 py-3.5 rounded-xl font-bold">
              {{ confirmModal.type === 'block' ? 'Block Court' : 'Decline' }}
            </button>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>
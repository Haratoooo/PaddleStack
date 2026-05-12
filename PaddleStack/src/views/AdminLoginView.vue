<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import darkLogo from '@/assets/images/footerlogo.svg' 

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) throw error

    router.push('/admin/dashboard')
    
  } catch (error: any) {
    errorMessage.value = "Invalid email or password."
    console.error('Login error:', error.message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col font-sans">
    
    <header class="flex justify-start px-6 md:px-16 py-4 border-b border-gray-200">
      <img :src="darkLogo" alt="PaddleStack" class="h-8 md:h-9" />
    </header>

    <main class="flex-grow flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-xl bg-[#EBEBEB] rounded-3xl p-8 md:p-14 shadow-sm">
        
        <h1 class="text-3xl md:text-4xl font-bold text-[#4A4A4A] mb-10 tracking-tight">
          Admin Login
        </h1>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-6">
          <div>
            <label class="block text-[#6B6B6B] font-medium mb-1.5 pl-1 text-sm">Email</label>
            <input 
              type="email" 
              v-model="email"
              required
              class="w-full px-4 py-3.5 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-[#A9FC24] outline-none text-gray-800 transition-shadow"
            />
          </div>

          <div>
            <label class="block text-[#6B6B6B] font-medium mb-1.5 pl-1 text-sm">Password</label>
            <input 
              type="password" 
              v-model="password"
              required
              class="w-full px-4 py-3.5 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-[#A9FC24] outline-none text-gray-800 transition-shadow"
            />
          </div>

          <p v-if="errorMessage" class="text-red-500 text-sm font-medium pl-1">
            {{ errorMessage }}
          </p>

          <div class="mt-2">
            <button 
              type="submit"
              :disabled="isLoading"
              class="bg-[#4A4A4A] text-white px-10 py-3.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
            >
              {{ isLoading ? 'Processing...' : 'Login' }}
            </button>
          </div>

        </form>

      </div>
    </main>
  </div>
</template>
import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>((set: any) => ({
  user: null,
  accessToken: null,
  refreshToken: null,

  setAuth: (user: User, accessToken: string, refreshToken: string) => {
    // Store in state
    set({ user, accessToken, refreshToken })

    // Persist to localStorage
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  },

  clearAuth: () => {
    // Clear state
    set({ user: null, accessToken: null, refreshToken: null })

    // Clear localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },

  initializeAuth: () => {
    // Load from localStorage on app start
    const userStr = localStorage.getItem('user')
    const accessToken = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')

    if (userStr && accessToken && refreshToken) {
      try {
        const user = JSON.parse(userStr) as User
        set({ user, accessToken, refreshToken })
      } catch (error) {
        // If parsing fails, clear everything
        localStorage.removeItem('user')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
    }
  },
}))

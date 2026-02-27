import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import type { LoginRequest, User } from '@/types'

interface JwtPayload {
  sub: string
  email: string
  role: string
  full_name?: string
  exp: number
  type: string
}

export const useAuth = () => {
  const navigate = useNavigate()
  const { setAuth, clearAuth } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data: any) => {
      // Decode JWT to get user info
      const decoded = jwtDecode<JwtPayload>(data.access_token)
      
      // Construct User object from JWT claims
      const user: User = {
        id: decoded.sub,
        email: decoded.email,
        full_name: decoded.full_name || decoded.email.split('@')[0] || 'User',
        role: (decoded.role as 'admin' | 'radiologist' | 'staff') || 'staff',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      setAuth(user, data.access_token, data.refresh_token)
      // Navigation handled by LoginPage useEffect
    },
  })

  const logout = () => {
    authApi.logout().catch(() => {
      // Ignore logout errors, clear session anyway
    })
    clearAuth()
    navigate('/login')
  }

  return {
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout,
  }
}

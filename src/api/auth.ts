import { apiClient } from './client'
import type { LoginRequest, LoginResponse, RefreshRequest, RefreshResponse } from '@/types'

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', credentials)
    return response.data
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await apiClient.post<RefreshResponse>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    } as RefreshRequest)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout')
  },
}

import { apiClient } from './client'
import type { User, UserAuditEntry, UserCreate, UserPasswordReset, UserUpdate } from '@/types'
import axios from 'axios'

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ items: User[]; total: number } | User[]>('/api/v1/users')
    // Backend might return paginated response or array, handle both
    return Array.isArray(response.data) ? response.data : (response.data.items || [])
  },

  getUser: async (id: string): Promise<User | undefined> => {
    try {
      const response = await apiClient.get<User>(`/api/v1/users/${id}`)
      return response.data
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return undefined
      }
      throw err
    }
  },

  createUser: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>('/api/v1/users', data)
    return response.data
  },

  updateUser: async (id: string, data: UserUpdate): Promise<User> => {
    const response = await apiClient.patch<User>(`/api/v1/users/${id}`, data)
    return response.data
  },

  resetUserPassword: async (id: string, data: UserPasswordReset): Promise<void> => {
    await apiClient.post(`/api/v1/users/${id}/password-reset`, data)
  },

  getUserAuditHistory: async (id: string, limit = 100): Promise<UserAuditEntry[]> => {
    const response = await apiClient.get<UserAuditEntry[]>(`/api/v1/users/${id}/audit-history`, {
      params: { limit },
    })
    return response.data
  },
}

import { apiClient } from './client'
import type { User } from '@/types'
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
}

import { apiClient } from './client'
import type { User } from '@/types'

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{ items: User[]; total: number } | User[]>('/api/v1/users')
    // Backend might return paginated response or array, handle both
    return Array.isArray(response.data) ? response.data : (response.data.items || [])
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/api/v1/users/${id}`)
    return response.data
  },
}

import { apiClient } from './client'

export interface Physician {
  id: string
  full_name: string
  specialty?: string
  contact_info?: string
}

export const physiciansApi = {
  getPhysicians: async (): Promise<Physician[]> => {
    const response = await apiClient.get<{ items: Physician[]; total: number } | Physician[]>('/api/v1/physicians')
    // Backend might return paginated response or array, handle both
    return Array.isArray(response.data) ? response.data : (response.data.items || [])
  },

  getPhysician: async (id: string): Promise<Physician> => {
    const response = await apiClient.get<Physician>(`/api/v1/physicians/${id}`)
    return response.data
  },
}

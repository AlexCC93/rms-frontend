import { apiClient } from './client'
import type { RadiologistProfile, RadiologistProfileUpdate } from '@/types'

export const radiologistProfileApi = {
  getProfile: async (userId: string): Promise<RadiologistProfile> => {
    const response = await apiClient.get<RadiologistProfile>(
      `/api/v1/users/${userId}/radiologist-profile`
    )
    return response.data
  },

  updateProfile: async (
    userId: string,
    data: RadiologistProfileUpdate
  ): Promise<RadiologistProfile> => {
    const response = await apiClient.put<RadiologistProfile>(
      `/api/v1/users/${userId}/radiologist-profile`,
      data
    )
    return response.data
  },
}

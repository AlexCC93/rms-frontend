import { apiClient } from './client'
import type {
  AvailableSlotsResponse,
  RadiologistSchedule,
  RadiologistScheduleCreate,
  ScheduleFilters,
  Modality,
} from '@/types'

export interface AvailableSlotsParams {
  date: string           // YYYY-MM-DD
  modality?: Modality
  radiologist_id?: string
}

export const scheduleApi = {
  getAvailableSlots: async (params: AvailableSlotsParams): Promise<AvailableSlotsResponse> => {
    const response = await apiClient.get<AvailableSlotsResponse>(
      '/api/v1/schedule/available-slots',
      { params }
    )
    return response.data
  },

  getSchedules: async (filters?: ScheduleFilters): Promise<RadiologistSchedule[]> => {
    const response = await apiClient.get<{ items: RadiologistSchedule[]; total: number } | RadiologistSchedule[]>(
      '/api/v1/schedule',
      { params: filters }
    )
    return Array.isArray(response.data) ? response.data : (response.data.items || [])
  },

  createSchedule: async (data: RadiologistScheduleCreate): Promise<RadiologistSchedule> => {
    const response = await apiClient.post<RadiologistSchedule>('/api/v1/schedule', data)
    return response.data
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/schedule/${id}`)
  },
}

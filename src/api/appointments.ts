import { apiClient } from './client'
import type {
  Appointment,
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentStatusUpdate,
  AppointmentFilters,
} from '@/types'

export const appointmentsApi = {
  getAppointments: async (filters?: AppointmentFilters): Promise<Appointment[]> => {
    const response = await apiClient.get<{ items: Appointment[]; total: number }>('/api/v1/appointments', {
      params: filters,
    })
    // Backend returns paginated response, extract items array
    return response.data.items || []
  },

  getAppointment: async (id: string): Promise<Appointment> => {
    const response = await apiClient.get<Appointment>(`/api/v1/appointments/${id}`)
    return response.data
  },

  createAppointment: async (data: AppointmentCreate): Promise<Appointment> => {
    const response = await apiClient.post<Appointment>('/api/v1/appointments', data)
    return response.data
  },

  updateAppointment: async (id: string, data: AppointmentUpdate): Promise<Appointment> => {
    const response = await apiClient.put<Appointment>(`/api/v1/appointments/${id}`, data)
    return response.data
  },

  updateAppointmentStatus: async (
    id: string,
    data: AppointmentStatusUpdate
  ): Promise<Appointment> => {
    const response = await apiClient.patch<Appointment>(
      `/api/v1/appointments/${id}/status`,
      data
    )
    return response.data
  },

  deleteAppointment: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/appointments/${id}`)
  },
}

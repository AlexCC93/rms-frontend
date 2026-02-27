import { apiClient } from './client'
import type {
  Patient,
  PatientCreate,
  PatientUpdate,
  PatientFilters,
} from '@/types'

export const patientsApi = {
  getPatients: async (filters?: PatientFilters): Promise<Patient[]> => {
    const response = await apiClient.get<{ items: Patient[]; total: number }>('/api/v1/patients', {
      params: filters,
    })
    // Backend returns paginated response, extract items array
    return response.data.items || []
  },

  getPatient: async (id: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/api/v1/patients/${id}`)
    return response.data
  },

  createPatient: async (data: PatientCreate): Promise<Patient> => {
    const response = await apiClient.post<Patient>('/api/v1/patients', data)
    return response.data
  },

  updatePatient: async (id: string, data: PatientUpdate): Promise<Patient> => {
    const response = await apiClient.put<Patient>(`/api/v1/patients/${id}`, data)
    return response.data
  },

  deletePatient: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/patients/${id}`)
  },
}

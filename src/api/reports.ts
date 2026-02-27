import { apiClient } from './client'
import type {
  RadiologyReport,
  RadiologyReportCreate,
  RadiologyReportUpdate,
  ReportFilters,
} from '@/types'

export const reportsApi = {
  getReports: async (filters?: ReportFilters): Promise<RadiologyReport[]> => {
    const response = await apiClient.get<{ items: RadiologyReport[]; total: number }>('/api/v1/reports', {
      params: filters,
    })
    // Backend returns paginated response, extract items array
    return response.data.items || []
  },

  getReport: async (id: string): Promise<RadiologyReport> => {
    const response = await apiClient.get<RadiologyReport>(`/api/v1/reports/${id}`)
    return response.data
  },

  createReport: async (data: RadiologyReportCreate): Promise<RadiologyReport> => {
    const response = await apiClient.post<RadiologyReport>('/api/v1/reports', data)
    return response.data
  },

  updateReport: async (id: string, data: RadiologyReportUpdate): Promise<RadiologyReport> => {
    const response = await apiClient.put<RadiologyReport>(`/api/v1/reports/${id}`, data)
    return response.data
  },

  finalizeReport: async (id: string): Promise<RadiologyReport> => {
    const response = await apiClient.patch<RadiologyReport>(`/api/v1/reports/${id}/finalize`)
    return response.data
  },

  deleteReport: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/reports/${id}`)
  },
}

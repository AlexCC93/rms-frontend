import { apiClient } from './client'
import type {
  RadiologyReport,
  RadiologyReportCreate,
  RadiologyReportUpdate,
  ReportFilters,
  ReportImage,
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

  // --- Report Images ---

  uploadImage: async (reportId: string, file: File): Promise<ReportImage> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ReportImage>(
      `/api/v1/reports/${reportId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  listImages: async (reportId: string): Promise<ReportImage[]> => {
    const response = await apiClient.get<{ items: ReportImage[]; total: number }>(
      `/api/v1/reports/${reportId}/images`,
    )
    return response.data.items || []
  },

  getImageBlob: async (reportId: string, imageId: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/api/v1/reports/${reportId}/images/${imageId}`,
      { responseType: 'blob' },
    )
    return response.data
  },

  deleteImage: async (reportId: string, imageId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/reports/${reportId}/images/${imageId}`)
  },
}

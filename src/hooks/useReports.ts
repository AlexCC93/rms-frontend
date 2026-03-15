import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import type { ReportFilters, RadiologyReportCreate, RadiologyReportUpdate } from '@/types'

export const useReports = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => reportsApi.getReports(filters),
  })
}

export const useReport = (id: string | undefined) => {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.getReport(id!),
    enabled: !!id,
  })
}

export const useCreateReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RadiologyReportCreate) => reportsApi.createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export const useUpdateReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RadiologyReportUpdate }) =>
      reportsApi.updateReport(id, data),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['reports', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export const useFinalizeReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reportsApi.finalizeReport(id),
    onSuccess: (_: any, id: any) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['reports', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export const useDeleteReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reportsApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// --- Report Image hooks ---

export const useReportImages = (reportId: string | undefined) => {
  return useQuery({
    queryKey: ['reportImages', reportId],
    queryFn: () => reportsApi.listImages(reportId!),
    enabled: !!reportId,
  })
}

export const useReportImageBlob = (reportId: string | undefined, imageId: string | undefined) => {
  return useQuery({
    queryKey: ['reportImageBlob', reportId, imageId],
    queryFn: async () => {
      const blob = await reportsApi.getImageBlob(reportId!, imageId!)
      return URL.createObjectURL(blob)
    },
    enabled: !!reportId && !!imageId,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export const useUploadReportImage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, file }: { reportId: string; file: File }) =>
      reportsApi.uploadImage(reportId, file),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['reportImages', variables.reportId] })
    },
  })
}

export const useDeleteReportImage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, imageId }: { reportId: string; imageId: string }) =>
      reportsApi.deleteImage(reportId, imageId),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['reportImages', variables.reportId] })
    },
  })
}

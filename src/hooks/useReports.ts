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

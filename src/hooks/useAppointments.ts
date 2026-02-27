import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi } from '@/api/appointments'
import type {
  AppointmentFilters,
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentStatusUpdate,
} from '@/types'

export const useAppointments = (filters?: AppointmentFilters, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => appointmentsApi.getAppointments(filters),
    enabled: options?.enabled ?? true,
  })
}

export const useAppointment = (id: string | undefined) => {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => appointmentsApi.getAppointment(id!),
    enabled: !!id,
  })
}

export const useCreateAppointment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AppointmentCreate) => appointmentsApi.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.refetchQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AppointmentUpdate }) =>
      appointmentsApi.updateAppointment(id, data),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.refetchQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AppointmentStatusUpdate }) =>
      appointmentsApi.updateAppointmentStatus(id, data),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => appointmentsApi.deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

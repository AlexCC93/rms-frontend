import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi, type AvailableSlotsParams } from '@/api/schedule'
import type { RadiologistScheduleCreate, ScheduleFilters } from '@/types'

export const useAvailableSlots = (params: AvailableSlotsParams | null) => {
  return useQuery({
    queryKey: ['schedule', 'available-slots', params],
    queryFn: () => scheduleApi.getAvailableSlots(params!),
    enabled: !!params && !!params.date,
    staleTime: 30_000, // 30 s — slots can be booked by others, keep relatively fresh
  })
}

export const useSchedules = (filters?: ScheduleFilters) => {
  return useQuery({
    queryKey: ['schedule', 'templates', filters],
    queryFn: () => scheduleApi.getSchedules(filters),
  })
}

export const useCreateSchedule = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RadiologistScheduleCreate) => scheduleApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', 'templates'] })
    },
  })
}

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => scheduleApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', 'templates'] })
    },
  })
}

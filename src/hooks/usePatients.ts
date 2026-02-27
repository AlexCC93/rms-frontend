import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientsApi } from '@/api/patients'
import type { PatientFilters, PatientCreate, PatientUpdate } from '@/types'

export const usePatients = (filters?: PatientFilters) => {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: () => patientsApi.getPatients(filters),
  })
}

export const usePatient = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getPatient(id!),
    enabled: !!id,
  })
}

export const useCreatePatient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PatientCreate) => patientsApi.createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export const useUpdatePatient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PatientUpdate }) =>
      patientsApi.updatePatient(id, data),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patients', variables.id] })
    },
  })
}

export const useDeletePatient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => patientsApi.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

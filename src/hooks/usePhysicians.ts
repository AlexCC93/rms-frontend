import { useQuery } from '@tanstack/react-query'
import { physiciansApi } from '@/api/physicians'

export const usePhysicians = () => {
  return useQuery({
    queryKey: ['physicians'],
    queryFn: () => physiciansApi.getPhysicians(),
  })
}

export const usePhysician = (id: string | undefined) => {
  return useQuery({
    queryKey: ['physicians', id],
    queryFn: () => physiciansApi.getPhysician(id!),
    enabled: !!id,
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { radiologistProfileApi } from '@/api/radiologistProfile'
import type { RadiologistProfileUpdate } from '@/types'

export const useRadiologistProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['radiologist-profile', userId],
    queryFn: async () => {
      try {
        return await radiologistProfileApi.getProfile(userId!)
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          return null // Profile not configured yet — treat as empty
        }
        throw err
      }
    },
    enabled: !!userId,
    retry: false,
  })
}

export const useUpdateRadiologistProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: RadiologistProfileUpdate }) =>
      radiologistProfileApi.updateProfile(userId, data),
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: ['radiologist-profile', variables.userId],
      })
    },
  })
}

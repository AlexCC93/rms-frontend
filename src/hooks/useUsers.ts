import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import type { User } from '@/types'

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  })
}

export const useUser = (id: string | undefined, options?: Partial<UseQueryOptions<User | undefined>>) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
    retry: false,
    ...options,
  })
}

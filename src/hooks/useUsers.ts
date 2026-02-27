import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/api/users'

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  })
}

export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
  })
}

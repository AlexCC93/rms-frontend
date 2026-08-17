import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import type { User, UserCreate, UserPasswordReset, UserUpdate } from '@/types'

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  })
}

const invalidateUserCaches = (queryClient: ReturnType<typeof useQueryClient>, id?: string) => {
  queryClient.invalidateQueries({ queryKey: ['users'] })
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['users', id] })
    queryClient.invalidateQueries({ queryKey: ['user-audit-history', id] })
  }
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UserCreate) => usersApi.createUser(data),
    onSuccess: (user) => invalidateUserCaches(queryClient, user.id),
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) => usersApi.updateUser(id, data),
    onSuccess: (user) => invalidateUserCaches(queryClient, user.id),
  })
}

export const useResetUserPassword = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserPasswordReset }) =>
      usersApi.resetUserPassword(id, data),
    onSuccess: (_, variables) => invalidateUserCaches(queryClient, variables.id),
  })
}

export const useUserAuditHistory = (id: string | undefined, limit = 100) => {
  return useQuery({
    queryKey: ['user-audit-history', id, limit],
    queryFn: () => usersApi.getUserAuditHistory(id!, limit),
    enabled: !!id,
    retry: false,
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

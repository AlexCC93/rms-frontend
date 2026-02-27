import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

interface RoleGuardProps {
  children: React.ReactNode
  roles: UserRole[]
  redirectTo?: string
}

export function RoleGuard({
  children,
  roles,
  redirectTo = '/403',
}: RoleGuardProps) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

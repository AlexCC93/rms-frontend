import type { UserRole } from '@/types'

export const hasRole = (userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean => {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

export const canAccessReports = (userRole: UserRole | undefined): boolean => {
  return hasRole(userRole, ['admin', 'radiologist'])
}

export const canEditReport = (userRole: UserRole | undefined): boolean => {
  return hasRole(userRole, ['admin', 'radiologist'])
}

export const canFinalizeReport = (userRole: UserRole | undefined): boolean => {
  return hasRole(userRole, ['admin', 'radiologist'])
}

export const canDeletePatient = (userRole: UserRole | undefined): boolean => {
  return hasRole(userRole, ['admin'])
}

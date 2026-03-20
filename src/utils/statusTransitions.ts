import type { AppointmentStatus } from '@/types'
import i18next from 'i18next'

export const getAvailableStatusTransitions = (
  currentStatus: AppointmentStatus
): AppointmentStatus[] => {
  switch (currentStatus) {
    case 'scheduled':
      return ['completed', 'canceled', 'no_show']
    case 'completed':
    case 'canceled':
    case 'no_show':
      // These are terminal states
      return []
    default:
      return []
  }
}

export const getStatusTransitionLabel = (status: AppointmentStatus): string => {
  switch (status) {
    case 'completed':
      return i18next.t('appointments.markCompleted')
    case 'canceled':
      return i18next.t('appointments.markCanceled')
    case 'no_show':
      return i18next.t('appointments.markNoShow')
    default:
      return status
  }
}

export const canTransitionStatus = (currentStatus: AppointmentStatus): boolean => {
  return getAvailableStatusTransitions(currentStatus).length > 0
}

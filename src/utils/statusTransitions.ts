import type { AppointmentStatus } from '@/types'

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
      return 'Mark Completed'
    case 'canceled':
      return 'Cancel'
    case 'no_show':
      return 'Mark No Show'
    default:
      return status
  }
}

export const canTransitionStatus = (currentStatus: AppointmentStatus): boolean => {
  return getAvailableStatusTransitions(currentStatus).length > 0
}

import { Badge } from '@/components/ui/badge'
import type { AppointmentStatus, ReportStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: AppointmentStatus | ReportStatus
  type: 'appointment' | 'report'
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const getAppointmentStatusStyles = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'canceled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'no_show':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return ''
    }
  }

  const getReportStatusStyles = (status: ReportStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'final':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'amended':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return ''
    }
  }

  const getLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase()
  }

  const styles =
    type === 'appointment'
      ? getAppointmentStatusStyles(status as AppointmentStatus)
      : getReportStatusStyles(status as ReportStatus)

  return (
    <Badge variant="outline" className={cn('font-semibold', styles)}>
      {getLabel(status)}
    </Badge>
  )
}

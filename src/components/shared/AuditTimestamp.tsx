import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface AuditTimestampProps {
  createdAt: string
  updatedAt?: string
  label?: string
}

export function AuditTimestamp({
  createdAt,
  updatedAt,
  label,
}: AuditTimestampProps) {
  const { t } = useTranslation()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'MMM d, yyyy HH:mm')
  }

  const formatUTC = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toISOString()
  }

  const displayDate = updatedAt || createdAt
  const displayLabel = label || (updatedAt ? t('audit.updated') : t('audit.created'))

  return (
    <span
      className="text-sm text-muted-foreground"
      title={`${displayLabel} at ${formatUTC(displayDate)}`}
    >
      {displayLabel}: {formatDate(displayDate)}
    </span>
  )
}

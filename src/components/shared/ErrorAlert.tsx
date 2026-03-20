import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useTranslation } from 'react-i18next'

interface ErrorAlertProps {
  title?: string
  message: string
}

export function ErrorAlert({
  title,
  message,
}: ErrorAlertProps) {
  const { t } = useTranslation()
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title ?? t('common.error')}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

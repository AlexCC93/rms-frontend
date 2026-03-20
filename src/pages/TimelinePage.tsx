import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useTimeline } from '@/hooks/useTimeline'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/api/client'
import { format } from 'date-fns'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Modality } from '@/types'
import { useTranslation } from 'react-i18next'

export function TimelinePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const { t } = useTranslation()
  const [modalityFilter] = useState<Modality[]>([])

  const { data: timeline, isLoading, error } = useTimeline({
    patient_id: patientId!,
    modality: modalityFilter.length > 0 ? modalityFilter : undefined,
  })

  if (isLoading) {
    return <LoadingSpinner text={t('timeline.loadingTimeline')} />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('timeline.title')}</h1>
      </div>

      {!timeline || timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">{t('timeline.noHistory')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('timeline.noHistoryDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {timeline.map((entry) => (
            <Card key={entry.appointment_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ModalityBadge modality={entry.modality} />
                    <CardTitle className="text-lg">
                      {entry.study_description}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={entry.appointment_status} type="appointment" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.scheduled_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {entry.report_id ? (
                  <div>
                    <p className="text-sm font-medium mb-2">{t('timeline.impression')}</p>
                    <div className="rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                      {entry.report_impression}
                    </div>
                    {entry.finalized_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('timeline.finalized', { date: format(new Date(entry.finalized_at), 'MMM d, yyyy HH:mm') })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('timeline.noReportAvailable')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAppointment, useUpdateAppointmentStatus } from '@/hooks/useAppointments'
import { usePatient } from '@/hooks/usePatients'
import { usePhysician } from '@/hooks/usePhysicians'
import { useUser } from '@/hooks/useUsers'
import { useReports } from '@/hooks/useReports'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/api/client'
import { format } from 'date-fns'
import { ArrowLeft, Edit, Plus, UserRound } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { AuditTimestamp } from '@/components/shared/AuditTimestamp'
import { useToast } from '@/hooks/use-toast'
import { getAvailableStatusTransitions, getStatusTransitionLabel } from '@/utils/statusTransitions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { AppointmentStatus } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { canEditReport } from '@/utils/roleGuard'
import { useTranslation } from 'react-i18next'

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null)

  const { data: appointment, isLoading, error } = useAppointment(id)
  const { data: patient } = usePatient(appointment?.patient_id)
  const { data: physician } = usePhysician(appointment?.referring_physician_id || undefined)
  const { data: assignedRadiologist } = useUser(appointment?.radiologist_id || undefined)
  const { data: reports } = useReports(id ? { appointment_id: id } : undefined)
  const updateStatus = useUpdateAppointmentStatus()

  // Redirect radiologists to their appointments list on 403
  useEffect(() => {
    if ((error as any)?.response?.status === 403) {
      navigate('/appointments', { replace: true })
    }
  }, [error, navigate])

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    setPendingStatus(newStatus)
    setConfirmDialogOpen(true)
  }

  const confirmStatusChange = async () => {
    if (!id || !pendingStatus) return

    try {
      await updateStatus.mutateAsync({
        id,
        data: { status: pendingStatus },
      })
      toast({
        title: t('appointments.statusUpdated'),
        description: t('appointments.statusChangedTo', { status: pendingStatus }),
      })
      setConfirmDialogOpen(false)
      setPendingStatus(null)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('appointments.updateFailed'),
        description: getErrorMessage(err),
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner text={t('appointments.loadingAppointment')} />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  if (!appointment) {
    return <ErrorAlert message={t('appointments.appointmentNotFound')} />
  }

  const availableTransitions = getAvailableStatusTransitions(appointment.status)
  const report = reports?.[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/appointments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('appointments.appointmentDetails')}</h1>
            <p className="text-sm text-muted-foreground">
              ID: {appointment.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {appointment.status === 'scheduled' && (
            <Button
              variant="outline"
              onClick={() => navigate(`/appointments/${id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('appointments.appointmentInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.patient')}</p>
            <p
              className="text-base font-medium text-primary cursor-pointer hover:underline"
              onClick={() => navigate(`/patients/${appointment.patient_id}`)}
            >
              {patient
                ? `${patient.first_name} ${patient.last_name}`
                : t('common.unknown')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.status')}</p>
            <div className="mt-1">
              <StatusBadge status={appointment.status} type="appointment" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.modality')}</p>
            <div className="mt-1">
              <ModalityBadge modality={appointment.modality} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.studyDescription')}</p>
            <p className="text-base">{appointment.study_description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.scheduledAt')}</p>
            <p className="text-base">
              {format(new Date(appointment.scheduled_at), 'MMMM d, yyyy HH:mm')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.duration')}</p>
            <p className="text-base">{t('appointments.durationMinutes', { count: appointment.duration_minutes })}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.referringPhysician')}</p>
            <p className="text-base">{physician ? physician.full_name : (appointment.referring_physician_id ? appointment.referring_physician_id : '—')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" /> {t('appointments.assignedRadiologist')}
            </p>
            <p className="text-base">
              {assignedRadiologist
                ? assignedRadiologist.full_name
                : appointment.radiologist_id
                ? appointment.radiologist_id.slice(0, 8) + '…'
                : <span className="text-muted-foreground italic">{t('appointments.notYetAssigned')}</span>}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">{t('appointments.clinicalIndication')}</p>
            <p className="text-base">{appointment.clinical_indication || '—'}</p>
          </div>
          <div>
            <AuditTimestamp
              createdAt={appointment.created_at}
              updatedAt={appointment.updated_at}
            />
          </div>
        </CardContent>
      </Card>

      {availableTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('appointments.statusTransitions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {availableTransitions.map((status) => (
                <Button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  variant={status === 'canceled' ? 'destructive' : 'default'}
                >
                  {getStatusTransitionLabel(status)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('reports.report')}</CardTitle>
            {!report && canEditReport(user?.role) && appointment.status === 'completed' && (
              <Button onClick={() => navigate(`/reports/new?appointment_id=${id}`)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('reports.createReport')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {report ? (
            <div
              className="rounded-lg border p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Report #{report.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    Version {report.version}
                  </p>
                </div>
                <StatusBadge status={report.status} type="report" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('reports.noReportAvailable')}
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={t('appointments.confirmStatusChange')}
        message={t('appointments.confirmStatusChangeMsg', { status: pendingStatus?.replace('_', ' ') })}
        confirmLabel={t('common.confirm')}
        onConfirm={confirmStatusChange}
        isLoading={updateStatus.isPending}
      />
    </div>
  )
}

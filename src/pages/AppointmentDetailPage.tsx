import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAppointment, useUpdateAppointmentStatus } from '@/hooks/useAppointments'
import { usePatient } from '@/hooks/usePatients'
import { usePhysician } from '@/hooks/usePhysicians'
import { useReports } from '@/hooks/useReports'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/api/client'
import { format } from 'date-fns'
import { ArrowLeft, Edit, Plus } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { AuditTimestamp } from '@/components/shared/AuditTimestamp'
import { useToast } from '@/hooks/use-toast'
import { getAvailableStatusTransitions, getStatusTransitionLabel } from '@/utils/statusTransitions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { AppointmentStatus } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { canEditReport } from '@/utils/roleGuard'

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null)

  const { data: appointment, isLoading, error } = useAppointment(id)
  const { data: patient } = usePatient(appointment?.patient_id)
  const { data: physician } = usePhysician(appointment?.referring_physician_id || undefined)
  const { data: reports } = useReports(id ? { appointment_id: id } : undefined)
  const updateStatus = useUpdateAppointmentStatus()

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
        title: 'Status Updated',
        description: `Appointment status changed to ${pendingStatus}`,
      })
      setConfirmDialogOpen(false)
      setPendingStatus(null)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: getErrorMessage(err),
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading appointment..." />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  if (!appointment) {
    return <ErrorAlert message="Appointment not found" />
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
            <h1 className="text-3xl font-bold">Appointment Details</h1>
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
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Patient</p>
            <p
              className="text-base font-medium text-primary cursor-pointer hover:underline"
              onClick={() => navigate(`/patients/${appointment.patient_id}`)}
            >
              {patient
                ? `${patient.first_name} ${patient.last_name}`
                : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="mt-1">
              <StatusBadge status={appointment.status} type="appointment" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Modality</p>
            <div className="mt-1">
              <ModalityBadge modality={appointment.modality} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Study Description</p>
            <p className="text-base">{appointment.study_description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Scheduled At</p>
            <p className="text-base">
              {format(new Date(appointment.scheduled_at), 'MMMM d, yyyy HH:mm')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Duration</p>
            <p className="text-base">{appointment.duration_minutes} minutes</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Referring Physician</p>
            <p className="text-base">{physician ? physician.full_name : (appointment.referring_physician_id ? appointment.referring_physician_id : '—')}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Clinical Indication</p>
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
            <CardTitle>Status Transitions</CardTitle>
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
            <CardTitle>Report</CardTitle>
            {!report && canEditReport(user?.role) && appointment.status === 'completed' && (
              <Button onClick={() => navigate(`/reports/new?appointment_id=${id}`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Report
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
              No report available for this appointment.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Confirm Status Change"
        message={`Are you sure you want to change the status to ${pendingStatus?.replace('_', ' ')}?`}
        confirmLabel="Confirm"
        onConfirm={confirmStatusChange}
        isLoading={updateStatus.isPending}
      />
    </div>
  )
}

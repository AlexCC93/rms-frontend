import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useReport, useUpdateReport, useFinalizeReport, useCreateReport } from '@/hooks/useReports'
import { useAppointment } from '@/hooks/useAppointments'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/api/client'
import { format } from 'date-fns'
import { ArrowLeft, Save, CheckCircle2, Edit, FileText } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { AuditTimestamp } from '@/components/shared/AuditTimestamp'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuthStore } from '@/stores/authStore'
import { canEditReport } from '@/utils/roleGuard'

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)

  const [isEditing, setIsEditing] = useState(false)
  const [findings, setFindings] = useState('')
  const [impression, setImpression] = useState('')
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false)

  const { data: report, isLoading, error } = useReport(id)
  const { data: appointment } = useAppointment(report?.appointment_id)
  const updateReport = useUpdateReport()
  const finalizeReport = useFinalizeReport()
  const createReport = useCreateReport()

  const handleEdit = () => {
    if (report) {
      setFindings(report.findings)
      setImpression(report.impression)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!id) return

    try {
      await updateReport.mutateAsync({
        id,
        data: { findings, impression },
      })
      toast({
        title: 'Report Saved',
        description: 'Draft report has been updated',
      })
      setIsEditing(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: getErrorMessage(err),
      })
    }
  }

  const handleFinalize = async () => {
    if (!id) return

    try {
      await finalizeReport.mutateAsync(id)
      toast({
        title: 'Report Finalized',
        description: 'The report has been finalized and can no longer be edited',
      })
      setConfirmFinalizeOpen(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Finalize Failed',
        description: getErrorMessage(err),
      })
    }
  }

  const handleCreateAmendment = async () => {
    if (!report) return

    try {
      const newReport = await createReport.mutateAsync({
        appointment_id: report.appointment_id,
        findings: report.findings,
        impression: report.impression,
      })
      toast({
        title: 'Amendment Created',
        description: 'A new draft report has been created for amendment',
      })
      navigate(`/reports/${newReport.id}`)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Create Amendment Failed',
        description: getErrorMessage(err),
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading report..." />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  if (!report) {
    return <ErrorAlert message="Report not found" />
  }

  const canEdit = canEditReport(user?.role) && report.status === 'draft'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Report Details</h1>
            <p className="text-sm text-muted-foreground">
              Report ID: {report.id.slice(0, 8)} - Version {report.version}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {report.status === 'draft' && canEdit && isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateReport.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateReport.isPending ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button onClick={() => setConfirmFinalizeOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Finalize Report
              </Button>
            </>
          )}
          {report.status === 'draft' && canEdit && !isEditing && (
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Report
            </Button>
          )}
          {report.status === 'final' && canEdit && (
            <Button onClick={handleCreateAmendment}>
              <FileText className="mr-2 h-4 w-4" />
              Create Amendment
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
              onClick={() =>
                appointment && navigate(`/patients/${appointment.patient_id}`)
              }
            >
              {appointment?.patient
                ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Modality</p>
            {appointment && (
              <div className="mt-1">
                <ModalityBadge modality={appointment.modality} />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Study Description</p>
            <p className="text-base">{appointment?.study_description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Date</p>
            <p className="text-base">
              {appointment &&
                format(new Date(appointment.scheduled_at), 'MMM d, yyyy')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report</CardTitle>
            <StatusBadge status={report.status} type="report" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Radiologist
            </p>
            <p className="text-base">{report.radiologist?.full_name || 'Unknown'}</p>
          </div>

          <div>
            <Label htmlFor="findings">Findings</Label>
            {isEditing ? (
              <Textarea
                id="findings"
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                className="min-h-[200px] mt-2"
                placeholder="Enter findings..."
              />
            ) : (
              <div className="mt-2 rounded-md border p-4 min-h-[200px] whitespace-pre-wrap">
                {report.findings || 'No findings recorded'}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="impression">Impression</Label>
            {isEditing ? (
              <Textarea
                id="impression"
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                className="min-h-[150px] mt-2"
                placeholder="Enter impression..."
              />
            ) : (
              <div className="mt-2 rounded-md border p-4 min-h-[150px] whitespace-pre-wrap">
                {report.impression || 'No impression recorded'}
              </div>
            )}
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Version</p>
              <p className="text-base">{report.version}</p>
            </div>
            {report.finalized_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Finalized</p>
                <p className="text-base">
                  {format(new Date(report.finalized_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}
            <div>
              <AuditTimestamp
                createdAt={report.created_at}
                updatedAt={report.updated_at}
              />
            </div>
          </div>

          {report.parent_report_id && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Previous Version
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/reports/${report.parent_report_id}`)}
              >
                View Previous Version
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmFinalizeOpen}
        onOpenChange={setConfirmFinalizeOpen}
        title="Finalize Report"
        message="Finalized reports cannot be edited. Are you sure you want to proceed?"
        confirmLabel="Finalize"
        onConfirm={handleFinalize}
        isLoading={finalizeReport.isPending}
      />
    </div>
  )
}

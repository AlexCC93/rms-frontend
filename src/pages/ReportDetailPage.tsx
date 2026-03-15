import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useReport, useUpdateReport, useFinalizeReport, useCreateReport } from '@/hooks/useReports'
import { useAppointment } from '@/hooks/useAppointments'
import { usePatient } from '@/hooks/usePatients'
import { usePhysician } from '@/hooks/usePhysicians'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import { getErrorMessage } from '@/api/client'
import { format } from 'date-fns'
import { ArrowLeft, Save, CheckCircle2, Edit, FileText, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { AuditTimestamp } from '@/components/shared/AuditTimestamp'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuthStore } from '@/stores/authStore'
import { canEditReport } from '@/utils/roleGuard'
import { useUser } from '@/hooks/useUsers'
import { useResolvedHtml } from '@/hooks/useResolvedHtml'
import { resolveApiImageSrcs, restoreApiImageSrcs } from '@/utils/resolveReportImages'


export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)

  const [isEditing, setIsEditing] = useState(false)
  const [findings, setFindings] = useState('')
  const [impression, setImpression] = useState('')
  // Resolved versions with blob: URLs — used as initialValue for the editors
  const [resolvedFindings, setResolvedFindings] = useState('')
  const [resolvedImpression, setResolvedImpression] = useState('')
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false)
  const [confirmAmendmentOpen, setConfirmAmendmentOpen] = useState(false)

  const { data: report, isLoading, error } = useReport(id)
  const { data: appointment } = useAppointment(report?.appointment_id)
  const { data: patient } = usePatient(appointment?.patient_id)
  const { data: physician } = usePhysician(appointment?.referring_physician_id || undefined)
  const { data: radiologist } = useUser(report?.radiologist_id)
  const updateReport = useUpdateReport()
  const finalizeReport = useFinalizeReport()
  const createReport = useCreateReport()

  // Resolved HTML for read-only view — swaps /api/v1/... src → blob: URL
  const resolvedFindingsView = useResolvedHtml(report?.findings)
  const resolvedImpressionView = useResolvedHtml(report?.impression)

  const handleEdit = async () => {
    if (report) {
      const [rf, ri] = await Promise.all([
        resolveApiImageSrcs(report.findings),
        resolveApiImageSrcs(report.impression),
      ])
      setResolvedFindings(rf)
      setResolvedImpression(ri)
      // Keep the canonical (API-path) form so onChange updates are based on blob: URLs
      // and restored before saving
      setFindings(rf)
      setImpression(ri)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!id) return

    try {
      await updateReport.mutateAsync({
        id,
        data: {
          findings: restoreApiImageSrcs(findings),
          impression: restoreApiImageSrcs(impression),
        },
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
        radiologist_id: report.radiologist_id,
        findings: report.findings,
        impression: report.impression,
        parent_report_id: report.id,
      })
      toast({
        title: 'Amendment Created',
        description: 'The original report has been marked as amended. Edit the new draft to correct it.',
      })
      setConfirmAmendmentOpen(false)
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
  const canAmend = canEditReport(user?.role) && report.status === 'final'

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
          {report.status === 'final' && canAmend && (
            <Button variant="outline" onClick={() => setConfirmAmendmentOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Create Amendment
            </Button>
          )}
        </div>
      </div>

      {report.status === 'amended' && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">This report has been superseded</p>
            <p className="text-sm text-yellow-700 mt-1">
              An amendment was issued for this report. The content below is the original signed version and is preserved for audit purposes.
            </p>
          </div>
        </div>
      )}

      {report.parent_report_id && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-blue-800">Amendment — Version {report.version}</p>
            <p className="text-sm text-blue-700 mt-1">
              This report is an amendment of a previous version.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => navigate(`/reports/${report.parent_report_id}`)}
          >
            View Original
          </Button>
        </div>
      )}

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
              {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            {appointment && (
              <div className="mt-1">
                <StatusBadge status={appointment.status} type="appointment" />
              </div>
            )}
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
            <p className="text-base">{appointment?.study_description || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Scheduled At</p>
            <p className="text-base">
              {appointment
                ? format(new Date(appointment.scheduled_at), 'MMMM d, yyyy HH:mm')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Duration</p>
            <p className="text-base">
              {appointment ? `${appointment.duration_minutes} minutes` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Referring Physician</p>
            <p className="text-base">
              {physician
                ? physician.full_name
                : appointment?.referring_physician_id
                ? appointment.referring_physician_id
                : '—'}
            </p>
          </div>
          {appointment?.clinical_indication && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Clinical Indication</p>
              <p className="text-base">{appointment.clinical_indication}</p>
            </div>
          )}
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
            <p className="text-base">{radiologist?.full_name ?? '—'}</p>
          </div>

          <div>
            <Label className="mb-2 block">Findings</Label>
            {isEditing ? (
              <RichTextEditor
                key={`findings-edit-${id}`}
                initialValue={resolvedFindings}
                onChange={setFindings}
                placeholder="Enter findings…"
                reportId={id}
                minHeight="200px"
              />
            ) : (
              <div
                className="rte-content mt-2 rounded-md border p-4 min-h-[200px]"
                dangerouslySetInnerHTML={{ __html: resolvedFindingsView || '<p class="text-muted-foreground">No findings recorded</p>' }}
              />
            )}
          </div>

          <div>
            <Label className="mb-2 block">Impression</Label>
            {isEditing ? (
              <RichTextEditor
                key={`impression-edit-${id}`}
                initialValue={resolvedImpression}
                onChange={setImpression}
                placeholder="Enter impression…"
                reportId={id}
                minHeight="150px"
              />
            ) : (
              <div
                className="rte-content mt-2 rounded-md border p-4 min-h-[150px]"
                dangerouslySetInnerHTML={{ __html: resolvedImpressionView || '<p class="text-muted-foreground">No impression recorded</p>' }}
              />
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
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                This is an amended version.{' '}
                <span
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => navigate(`/reports/${report.parent_report_id}`)}
                >
                  View original report
                </span>
              </p>
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

      <ConfirmDialog
        open={confirmAmendmentOpen}
        onOpenChange={setConfirmAmendmentOpen}
        title="Create Amendment"
        message="This will mark the current finalized report as amended and create a new draft for corrections. The original report is permanently preserved for audit purposes. Do you want to proceed?"
        confirmLabel="Create Amendment"
        onConfirm={handleCreateAmendment}
        isLoading={createReport.isPending}
      />
    </div>
  )
}

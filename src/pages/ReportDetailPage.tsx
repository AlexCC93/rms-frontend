import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useReport, useUpdateReport, useFinalizeReport, useCreateReport, useResendNotification } from '@/hooks/useReports'
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
import { ArrowLeft, Save, CheckCircle2, Edit, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { AuditTimestamp } from '@/components/shared/AuditTimestamp'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuthStore } from '@/stores/authStore'
import { canEditReport, canFinalizeReport } from '@/utils/roleGuard'
import { useUser } from '@/hooks/useUsers'
import { useResolvedHtml } from '@/hooks/useResolvedHtml'
import { resolveApiImageSrcs, restoreApiImageSrcs } from '@/utils/resolveReportImages'
import { useTranslation } from 'react-i18next'


export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
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
  const { mutate: resendNotification, isPending: isResending } = useResendNotification()

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
        title: t('reports.reportSaved'),
        description: t('reports.draftUpdated'),
      })
      setIsEditing(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('reports.saveFailed'),
        description: getErrorMessage(err),
      })
    }
  }

  const handleFinalize = async () => {
    if (!id) return

    try {
      const result = await finalizeReport.mutateAsync(id)
      if (result.email_notification_sent === true) {
        toast({
          title: t('reports.reportFinalized'),
          description: t('reports.notificationSent'),
        })
      } else if (result.email_notification_skip_reason === 'no_consent') {
        toast({
          title: t('reports.reportFinalized'),
          description: t('reports.notificationSkippedNoConsent'),
        })
      } else {
        toast({
          title: t('reports.reportFinalized'),
          description: t('reports.notificationSkipped'),
        })
      }
      setConfirmFinalizeOpen(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('reports.finalizeFailed'),
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
        title: t('reports.amendmentCreated'),
        description: t('reports.amendmentCreatedDesc'),
      })
      setConfirmAmendmentOpen(false)
      navigate(`/reports/${newReport.id}`)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('reports.createAmendmentFailed'),
        description: getErrorMessage(err),
      })
    }
  }

  if (isLoading) {
    return <LoadingSpinner text={t('reports.loadingReport')} />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  if (!report) {
    return <ErrorAlert message={t('reports.reportNotFound')} />
  }

  const canEdit = canEditReport(user?.role) && report.status === 'draft'
  const canAmend = canEditReport(user?.role) && report.status === 'final'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('reports.reportDetails')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('reports.reportId', { id: report.id.slice(0, 8), version: report.version })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.status === 'draft' && canEdit && isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={updateReport.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateReport.isPending ? t('reports.savingDraft') : t('reports.saveDraft')}
              </Button>
              <Button onClick={() => setConfirmFinalizeOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('reports.finalizeReport')}
              </Button>
            </>
          )}
          {report.status === 'draft' && canEdit && !isEditing && (
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {t('reports.editReport')}
            </Button>
          )}
          {report.status === 'final' && canAmend && (
            <Button variant="outline" onClick={() => setConfirmAmendmentOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              {t('reports.createAmendment')}
            </Button>
          )}
          {report.status === 'final' && canFinalizeReport(user?.role) && (() => {
            const canNotify = !!(patient?.email && patient?.email_verified && patient?.email_notifications_consent)
            return (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isResending || !canNotify}
                  onClick={() => resendNotification(report.id)}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                  {isResending ? t('common.loading') : t('reports.resendNotification')}
                </Button>
                {!canNotify && (
                  <span className="text-sm text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {t('reports.resendDisabledReason')}
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {report.status === 'amended' && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800">{t('reports.superseded')}</p>
            <p className="text-sm text-yellow-700 mt-1">
              {t('reports.supersededDesc')}
            </p>
          </div>
          {report.amended_by_report_id && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => navigate(`/reports/${report.amended_by_report_id}`)}
            >
              {t('reports.viewAmendment')}
            </Button>
          )}
        </div>
      )}

      {report.parent_report_id && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-blue-800">{t('reports.amendmentVersion', { version: report.version })}</p>
            <p className="text-sm text-blue-700 mt-1">
              {t('reports.amendmentDesc')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => navigate(`/reports/${report.parent_report_id}`)}
          >
            {t('common.viewOriginal')}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.appointmentInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.patient')}</p>
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
            <p className="text-sm font-medium text-muted-foreground">{t('reports.status')}</p>
            {appointment && (
              <div className="mt-1">
                <StatusBadge status={appointment.status} type="appointment" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.modality')}</p>
            {appointment && (
              <div className="mt-1">
                <ModalityBadge modality={appointment.modality} />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.studyDescription')}</p>
            <p className="text-base">{appointment?.study_description || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.scheduledAt')}</p>
            <p className="text-base">
              {appointment
                ? format(new Date(appointment.scheduled_at), 'MMMM d, yyyy HH:mm')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.duration')}</p>
            <p className="text-base">
              {appointment ? t('reports.durationMinutes', { count: appointment.duration_minutes }) : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.referringPhysician')}</p>
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
              <p className="text-sm font-medium text-muted-foreground">{t('reports.clinicalIndication')}</p>
              <p className="text-base">{appointment.clinical_indication}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('reports.report')}</CardTitle>
            <StatusBadge status={report.status} type="report" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t('reports.radiologist')}
            </p>
            <p className="text-base">{radiologist?.full_name ?? '—'}</p>
          </div>

          <div>
            <Label className="mb-2 block">{t('reports.findings')}</Label>
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
                dangerouslySetInnerHTML={{ __html: resolvedFindingsView || `<p class="text-muted-foreground">${t('reports.noFindingsRecorded')}</p>` }}
              />
            )}
          </div>

          <div>
            <Label className="mb-2 block">{t('reports.impression')}</Label>
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
                dangerouslySetInnerHTML={{ __html: resolvedImpressionView || `<p class="text-muted-foreground">${t('reports.noImpressionRecorded')}</p>` }}
              />
            )}
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reports.version')}</p>
              <p className="text-base">{report.version}</p>
            </div>
            {report.finalized_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('reports.finalized')}</p>
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
                {t('reports.thisIsAmendedVersion')}{' '}
                <span
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => navigate(`/reports/${report.parent_report_id}`)}
                >
                  {t('reports.viewOriginalReport')}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmFinalizeOpen}
        onOpenChange={setConfirmFinalizeOpen}
        title={t('reports.confirmFinalize')}
        message={
          patient?.email && patient?.email_verified && patient?.email_notifications_consent
            ? t('reports.confirmFinalizeMsg')
            : `${t('reports.confirmFinalizeMsg')}\n\n${t('reports.confirmFinalizeNoNotification')}`
        }
        confirmLabel={t('reports.finalizeReport')}
        onConfirm={handleFinalize}
        isLoading={finalizeReport.isPending}
      />

      <ConfirmDialog
        open={confirmAmendmentOpen}
        onOpenChange={setConfirmAmendmentOpen}
        title={t('reports.confirmAmendment')}
        message={t('reports.confirmAmendmentMsg')}
        confirmLabel={t('reports.createAmendment')}
        onConfirm={handleCreateAmendment}
        isLoading={createReport.isPending}
      />
    </div>
  )
}

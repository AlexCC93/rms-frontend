import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateReport } from '@/hooks/useReports'
import { useAppointment } from '@/hooks/useAppointments'
import { usePatient } from '@/hooks/usePatients'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/api/client'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileText } from 'lucide-react'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

// Strip HTML tags to check for actual text content
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

const reportSchema = z.object({
  findings: z.string().refine((v) => stripHtml(v).length > 0, 'required'),
  impression: z.string().refine((v) => stripHtml(v).length > 0, 'required'),
})

type ReportFormData = z.infer<typeof reportSchema>

export function ReportFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()

  const appointmentId = searchParams.get('appointment_id') ?? undefined
  const user = useAuthStore((state) => state.user)

  const { data: appointment, isLoading: isLoadingAppointment, error: appointmentError } = useAppointment(appointmentId)
  const { data: patient } = usePatient(appointment?.patient_id)
  const createReport = useCreateReport()

  const {
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: { findings: '', impression: '' },
  })

  const onSubmit = async (data: ReportFormData) => {
    if (!appointmentId) return

    try {
      const newReport = await createReport.mutateAsync({
        appointment_id: appointmentId,
        radiologist_id: user!.id,
        findings: data.findings,
        impression: data.impression,
      })
      toast({ title: t('reports.reportCreated'), description: t('reports.reportCreatedDesc') })
      navigate(`/reports/${newReport.id}`)
    } catch (error) {
      toast({ variant: 'destructive', title: t('patients.creationFailed'), description: getErrorMessage(error) })
    }
  }

  if (!appointmentId) {
    return <ErrorAlert message={t('reports.noAppointment')} />
  }
  if (isLoadingAppointment) return <LoadingSpinner text={t('appointments.loadingAppointment')} />
  if (appointmentError) return <ErrorAlert message={getErrorMessage(appointmentError)} />
  if (!appointment) return <ErrorAlert message={t('reports.appointmentNotFound')} />

  if (appointment.radiologist_id !== user?.id) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/appointments/${appointmentId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{t('reports.newReport')}</h1>
        </div>
        <ErrorAlert message={t('reports.onlyAssignedRadiologist')} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/appointments/${appointmentId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('reports.newReport')}</h1>
          <p className="text-sm text-muted-foreground">{t('reports.createDraftForAppointment')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('reports.appointmentSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.patient')}</p>
            <p className="text-base font-medium">
              {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.modality')}</p>
            <div className="mt-1">
              <ModalityBadge modality={appointment.modality} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.studyDescription')}</p>
            <p className="text-base">{appointment.study_description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('reports.scheduledAt')}</p>
            <p className="text-base">
              {format(new Date(appointment.scheduled_at), 'MMMM d, yyyy HH:mm')}
            </p>
          </div>
          {appointment.clinical_indication && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">{t('reports.clinicalIndication')}</p>
              <p className="text-base">{appointment.clinical_indication}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.reportContent')}</CardTitle>
            <CardDescription>
              {t('reports.reportContentDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t('reports.findings')}</Label>
              <RichTextEditor
                initialValue=""
                onChange={(html) => setValue('findings', html, { shouldValidate: true })}
                placeholder={t('reports.describeFindings')}
                minHeight="220px"
              />
              {errors.findings && (
                <p className="text-sm text-destructive">{errors.findings.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('reports.impression')}</Label>
              <RichTextEditor
                initialValue=""
                onChange={(html) => setValue('impression', html, { shouldValidate: true })}
                placeholder={t('reports.summariseImpression')}
                minHeight="160px"
              />
              {errors.impression && (
                <p className="text-sm text-destructive">{errors.impression.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/appointments/${appointmentId}`)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createReport.isPending}>
                {createReport.isPending ? t('reports.creatingReport') : t('reports.createReport')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

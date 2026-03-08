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
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/api/client'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileText } from 'lucide-react'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { format } from 'date-fns'

const reportSchema = z.object({
  findings: z.string().min(1, 'Findings are required'),
  impression: z.string().min(1, 'Impression is required'),
})

type ReportFormData = z.infer<typeof reportSchema>

export function ReportFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const appointmentId = searchParams.get('appointment_id') ?? undefined
  const user = useAuthStore((state) => state.user)

  const { data: appointment, isLoading: isLoadingAppointment, error: appointmentError } = useAppointment(appointmentId)
  const { data: patient } = usePatient(appointment?.patient_id)
  const createReport = useCreateReport()

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      findings: '',
      impression: '',
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  const onSubmit = async (data: ReportFormData) => {
    if (!appointmentId) return

    try {
      const newReport = await createReport.mutateAsync({
        appointment_id: appointmentId,
        radiologist_id: user!.id,
        findings: data.findings,
        impression: data.impression,
      })
      toast({
        title: 'Report created',
        description: 'Draft report has been created successfully.',
      })
      navigate(`/reports/${newReport.id}`)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Creation failed',
        description: getErrorMessage(error),
      })
    }
  }

  if (!appointmentId) {
    return <ErrorAlert message="No appointment specified. Please navigate here from an appointment." />
  }

  if (isLoadingAppointment) {
    return <LoadingSpinner text="Loading appointment..." />
  }

  if (appointmentError) {
    return <ErrorAlert message={getErrorMessage(appointmentError)} />
  }

  if (!appointment) {
    return <ErrorAlert message="Appointment not found." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/appointments/${appointmentId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Report</h1>
          <p className="text-sm text-muted-foreground">Create a draft report for this appointment</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Appointment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Patient</p>
            <p className="text-base font-medium">
              {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
            </p>
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
          {appointment.clinical_indication && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Clinical Indication</p>
              <p className="text-base">{appointment.clinical_indication}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Report Content</CardTitle>
            <CardDescription>This report will be saved as a draft and can be finalized later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                id="findings"
                placeholder="Describe the imaging findings..."
                rows={6}
                {...register('findings')}
              />
              {errors.findings && (
                <p className="text-sm text-destructive">{errors.findings.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="impression">Impression</Label>
              <Textarea
                id="impression"
                placeholder="Summarise the clinical impression..."
                rows={4}
                {...register('impression')}
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
                Cancel
              </Button>
              <Button type="submit" disabled={createReport.isPending}>
                {createReport.isPending ? 'Creating...' : 'Create Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

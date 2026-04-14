import { useParams, useNavigate } from 'react-router-dom'
import { useSendVerificationEmail } from '@/hooks/usePatients'
import { useToast } from '@/hooks/use-toast'
import { usePatient } from '@/hooks/usePatients'
import { useAppointments } from '@/hooks/useAppointments'
import { useTimeline } from '@/hooks/useTimeline'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getErrorMessage } from '@/api/client'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, Edit, Plus } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import { AuditTimestamp } from '@/components/shared/AuditTimestamp'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function ResendVerificationButton({ patientId }: { patientId: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const sendVerification = useSendVerificationEmail()

  return (
    <Button
      size="xs"
      variant="outline"
      disabled={sendVerification.isPending}
      onClick={async () => {
        try {
          await sendVerification.mutateAsync(patientId)
          toast({ title: t('patients.verificationSent') })
        } catch {
          toast({ title: t('patients.verificationFailed'), variant: 'destructive' })
        }
      }}
    >
      {sendVerification.isPending ? t('common.loading') : t('patients.resendVerification')}
    </Button>
  )
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { data: patient, isLoading: isLoadingPatient, error: patientError } = usePatient(id)
  const { data: appointments, isLoading: isLoadingAppointments } = useAppointments(
    id ? { patient_id: id } : undefined,
    { enabled: !!id }
  )
  const { data: timeline, isLoading: isLoadingTimeline } = useTimeline({ patient_id: id! })

  if (isLoadingPatient) {
    return <LoadingSpinner text={t('patients.loadingPatient')} />
  }

  if (patientError) {
    return <ErrorAlert message={getErrorMessage(patientError)} />
  }

  if (!patient) {
    return <ErrorAlert message={t('patients.patientNotFound')} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('patients.patientId', { id: patient.id.slice(0, 8) })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('patients.editPatient')}
          </Button>
          <Button size="sm" onClick={() => navigate(`/appointments/new?patient_id=${id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('appointments.newAppointment')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('patients.patientInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.fullName')}</p>
            <p className="text-base">
              {patient.first_name} {patient.last_name}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.dateOfBirth')}</p>
            <p className="text-base">
              {format(new Date(patient.date_of_birth), 'MMMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.sex')}</p>
            <p className="text-base capitalize">{patient.sex}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.nationalId')}</p>
            <p className="text-base">{patient.national_id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.phone')}</p>
            <p className="text-base">{patient.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.emailField')}</p>
            <div className="flex items-center gap-2">
              <span className="text-base">{patient.email || '—'}</span>
              {patient.email && (
                <Badge
                  className={patient.email_verified ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}
                >
                  {patient.email_verified ? t('patients.emailVerified') : t('patients.emailNotVerified')}
                </Badge>
              )}
              {patient.email && !patient.email_verified && (
                <ResendVerificationButton patientId={patient.id} />
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.emailNotificationsConsent')}</p>
            <div className="flex items-center gap-2">
              <Badge
                className={patient.email_notifications_consent ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}
              >
                {patient.email_notifications_consent ? t('common.yes') : t('common.no')}
              </Badge>
              {patient.email_notifications_consent && patient.email_notifications_consent_at && (
                <span className="text-xs text-muted-foreground">{t('patients.emailNotificationsConsentAt')}: {format(new Date(patient.email_notifications_consent_at), 'MMM d, yyyy HH:mm')}</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">{t('patients.notes')}</p>
            <p className="text-base">{patient.notes || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('patients.status')}</p>
            <Badge
              variant="outline"
              className={
                patient.is_active
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }
            >
              {patient.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
          </div>
          <div>
            <AuditTimestamp
              createdAt={patient.created_at}
              updatedAt={patient.updated_at}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">{t('nav.appointments')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('timeline.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          {isLoadingAppointments ? (
            <LoadingSpinner text={t('appointments.loadingAppointments')} />
          ) : !appointments || !Array.isArray(appointments) || appointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t('patientDetail.noAppointmentsYet')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('patientDetail.scheduleFirstAppointment')}
                </p>
                <Button className="mt-4" onClick={() => navigate(`/appointments/new?patient_id=${id}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('appointments.newAppointment')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('appointments.modality')}</TableHead>
                    <TableHead>{t('appointments.studyDescription')}</TableHead>
                    <TableHead>{t('appointments.scheduledAt')}</TableHead>
                    <TableHead>{t('appointments.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow
                      key={appointment.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/appointments/${appointment.id}`)}
                    >
                      <TableCell>
                        <ModalityBadge modality={appointment.modality} />
                      </TableCell>
                      <TableCell>{appointment.study_description}</TableCell>
                      <TableCell>
                        {format(new Date(appointment.scheduled_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={appointment.status} type="appointment" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          {isLoadingTimeline ? (
            <LoadingSpinner text={t('timeline.loadingTimeline')} />
          ) : !timeline || timeline.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">{t('patientDetail.noImagingHistory')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry) => (
                <Card key={entry.appointment_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/appointments/${entry.appointment_id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ModalityBadge modality={entry.modality} />
                        <CardTitle className="text-base">{entry.study_description}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={entry.appointment_status} type="appointment" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.scheduled_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  {entry.report_id && (
                    <CardContent className="pt-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Impression</p>
                      <div className="rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                        {entry.report_impression}
                      </div>
                      {entry.finalized_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Finalized {format(new Date(entry.finalized_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

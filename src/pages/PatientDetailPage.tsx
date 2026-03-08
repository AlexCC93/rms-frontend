import { useParams, useNavigate } from 'react-router-dom'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: patient, isLoading: isLoadingPatient, error: patientError } = usePatient(id)
  const { data: appointments, isLoading: isLoadingAppointments } = useAppointments(
    id ? { patient_id: id } : undefined,
    { enabled: !!id }
  )
  const { data: timeline, isLoading: isLoadingTimeline } = useTimeline({ patient_id: id! })

  if (isLoadingPatient) {
    return <LoadingSpinner text="Loading patient..." />
  }

  if (patientError) {
    return <ErrorAlert message={getErrorMessage(patientError)} />
  }

  if (!patient) {
    return <ErrorAlert message="Patient not found" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Patient ID: {patient.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/patients/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Patient
          </Button>
          <Button onClick={() => navigate(`/appointments/new?patient_id=${id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Full Name</p>
            <p className="text-base">
              {patient.first_name} {patient.last_name}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
            <p className="text-base">
              {format(new Date(patient.date_of_birth), 'MMMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sex</p>
            <p className="text-base capitalize">{patient.sex}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">National ID</p>
            <p className="text-base">{patient.national_id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p className="text-base">{patient.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-base">{patient.email || '—'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Notes</p>
            <p className="text-base">{patient.notes || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge
              variant="outline"
              className={
                patient.is_active
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }
            >
              {patient.is_active ? 'Active' : 'Inactive'}
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
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          {isLoadingAppointments ? (
            <LoadingSpinner text="Loading appointments..." />
          ) : !appointments || !Array.isArray(appointments) || appointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No appointments yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Schedule the first appointment for this patient
                </p>
                <Button className="mt-4" onClick={() => navigate(`/appointments/new?patient_id=${id}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modality</TableHead>
                    <TableHead>Study Description</TableHead>
                    <TableHead>Scheduled At</TableHead>
                    <TableHead>Status</TableHead>
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
            <LoadingSpinner text="Loading timeline..." />
          ) : !timeline || timeline.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No imaging history found for this patient</p>
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

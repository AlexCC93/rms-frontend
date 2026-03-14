import { useState, useMemo } from 'react'
import { useAppointments } from '@/hooks/useAppointments'
import { useQueries } from '@tanstack/react-query'
import { patientsApi } from '@/api/patients'
import { usersApi } from '@/api/users'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/api/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModalityBadge } from '@/components/shared/ModalityBadge'
import type { AppointmentStatus, Modality } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AppointmentsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')
  const [modalityFilter, setModalityFilter] = useState<Modality | 'all'>('all')
  const [patientFilter, setPatientFilter] = useState<string>('all')
  const [radiologistFilter, setRadiologistFilter] = useState<string>('all')

  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    limit: 1000, // Get up to 1000 appointments
  }

  const { data: appointments, isLoading, error } = useAppointments(filters)

  // Get unique patient IDs from appointments
  const uniquePatientIds = useMemo(() => {
    if (!appointments) return []
    return [...new Set(appointments.map(a => a.patient_id))]
  }, [appointments])

  // Get unique radiologist IDs from appointments
  const uniqueRadiologistIds = useMemo(() => {
    if (!appointments) return []
    return [...new Set(appointments.map(a => a.radiologist_id).filter(Boolean) as string[])]
  }, [appointments])

  // Fetch each unique patient
  const patientQueries = useQueries({
    queries: uniquePatientIds.map(patientId => ({
      queryKey: ['patients', patientId],
      queryFn: () => patientsApi.getPatient(patientId),
      staleTime: 30000,
    })),
  })

  // Fetch each unique radiologist
  const radiologistQueries = useQueries({
    queries: uniqueRadiologistIds.map(radiologistId => ({
      queryKey: ['users', radiologistId],
      queryFn: () => usersApi.getUser(radiologistId),
      staleTime: 30000,
    })),
  })

  // Create a patient lookup map from the query results
  const patientMap = useMemo(() => {
    const map = new Map()
    patientQueries.forEach((query, index) => {
      if (query.data) {
        map.set(uniquePatientIds[index], query.data)
      }
    })
    return map
  }, [patientQueries, uniquePatientIds])

  // Create a radiologist lookup map from the query results
  const radiologistMap = useMemo(() => {
    const map = new Map()
    radiologistQueries.forEach((query, index) => {
      if (query.data) {
        map.set(uniqueRadiologistIds[index], query.data)
      }
    })
    return map
  }, [radiologistQueries, uniqueRadiologistIds])

  const isLoadingPatients = patientQueries.some(q => q.isLoading)
  const isLoadingRadiologists = radiologistQueries.some(q => q.isLoading)

  const filteredAppointments = useMemo(() => {
    if (!appointments) return []
    return appointments.filter(a => {
      if (modalityFilter !== 'all' && a.modality !== modalityFilter) return false
      if (patientFilter !== 'all' && a.patient_id !== patientFilter) return false
      if (radiologistFilter !== 'all' && a.radiologist_id !== radiologistFilter) return false
      return true
    })
  }, [appointments, modalityFilter, patientFilter, radiologistFilter])

  if (isLoading || isLoadingPatients || isLoadingRadiologists) {
    return <LoadingSpinner text="Loading appointments..." />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <Button onClick={() => navigate('/appointments/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as AppointmentStatus | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={modalityFilter}
          onValueChange={(value) => setModalityFilter(value as Modality | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by modality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modalities</SelectItem>
            <SelectItem value="XR">X-Ray (XR)</SelectItem>
            <SelectItem value="CT">CT Scan</SelectItem>
            <SelectItem value="US">Ultrasound (US)</SelectItem>
            <SelectItem value="MRI">MRI</SelectItem>
            <SelectItem value="MAMMO">Mammography</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={patientFilter}
          onValueChange={(value) => setPatientFilter(value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by patient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            {uniquePatientIds.map(id => {
              const patient = patientMap.get(id)
              return (
                <SelectItem key={id} value={id}>
                  {patient ? `${patient.first_name} ${patient.last_name}` : id}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <Select
          value={radiologistFilter}
          onValueChange={(value) => setRadiologistFilter(value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by radiologist" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Radiologists</SelectItem>
            {uniqueRadiologistIds.map(id => {
              const radiologist = radiologistMap.get(id)
              return (
                <SelectItem key={id} value={id}>
                  {radiologist ? radiologist.full_name : id}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No appointments found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Get started by creating a new appointment
          </p>
          <Button className="mt-4" onClick={() => navigate('/appointments/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Modality</TableHead>
                <TableHead>Study Description</TableHead>
                <TableHead>Scheduled At</TableHead>
                <TableHead>Radiologist</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appointment) => {
                const patient = patientMap.get(appointment.patient_id)
                const radiologist = appointment.radiologist_id
                  ? radiologistMap.get(appointment.radiologist_id)
                  : null
                return (
                  <TableRow
                    key={appointment.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                  >
                    <TableCell className="font-medium">
                      {patient ? (
                        `${patient.first_name} ${patient.last_name}`
                      ) : (
                        'Unknown'
                      )}
                    </TableCell>
                    <TableCell>
                      <ModalityBadge modality={appointment.modality} />
                    </TableCell>
                    <TableCell>{appointment.study_description}</TableCell>
                    <TableCell>
                      {format(new Date(appointment.scheduled_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{radiologist ? radiologist.full_name : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={appointment.status} type="appointment" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

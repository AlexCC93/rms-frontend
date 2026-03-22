import { useState, useMemo } from 'react'
import { useReports } from '@/hooks/useReports'
import { useQueries } from '@tanstack/react-query'
import { appointmentsApi } from '@/api/appointments'
import { patientsApi } from '@/api/patients'
import { useAppointment } from '@/hooks/useAppointments'
import { usePatient } from '@/hooks/usePatients'
import { useUser } from '@/hooks/useUsers'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
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
import type { RadiologyReport, ReportStatus } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'

function ReportRow({ report, onClick }: { report: RadiologyReport; onClick: () => void }) {
  const { data: appointment } = useAppointment(report.appointment_id)
  const { data: patient } = usePatient(appointment?.patient_id)
  const { data: radiologist } = useUser(report.radiologist_id, { throwOnError: false })

  return (
    <TableRow
      className={`cursor-pointer ${report.status === 'draft' ? 'bg-yellow-50' : ''}`}
      onClick={onClick}
    >
      <TableCell className="font-medium">
        {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
      </TableCell>
      <TableCell>
        {appointment ? <ModalityBadge modality={appointment.modality} /> : '—'}
      </TableCell>
      <TableCell>
        {radiologist?.full_name ?? '—'}
      </TableCell>
      <TableCell>
        <StatusBadge status={report.status} type="report" />
      </TableCell>
      <TableCell>{report.version}</TableCell>
      <TableCell>
        {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
      </TableCell>
      <TableCell>
        {report.finalized_at
          ? format(new Date(report.finalized_at), 'MMM d, yyyy HH:mm')
          : '—'}
      </TableCell>
    </TableRow>
  )
}

export function ReportsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [patientFilter, setPatientFilter] = useState<string>('all')

  const { data: reports, isLoading, error } = useReports({ limit: 1000 })

  // Extract unique appointment IDs from reports
  const uniqueAppointmentIds = useMemo(() => {
    if (!reports) return []
    return [...new Set(reports.map(r => r.appointment_id))]
  }, [reports])

  // Fetch each unique appointment
  const appointmentQueries = useQueries({
    queries: uniqueAppointmentIds.map(appointmentId => ({
      queryKey: ['appointments', appointmentId],
      queryFn: () => appointmentsApi.getAppointment(appointmentId),
      staleTime: 30000,
    })),
  })

  // Build appointment map
  const appointmentMap = useMemo(() => {
    const map = new Map<string, { patient_id: string }>()
    appointmentQueries.forEach((query, index) => {
      const id = uniqueAppointmentIds[index]
      if (query.data && id) {
        map.set(id, query.data)
      }
    })
    return map
  }, [appointmentQueries, uniqueAppointmentIds])

  // Extract unique patient IDs from appointments
  const uniquePatientIds = useMemo(() => {
    const ids = new Set<string>()
    appointmentMap.forEach(apt => ids.add(apt.patient_id))
    return [...ids]
  }, [appointmentMap])

  // Fetch each unique patient
  const patientQueries = useQueries({
    queries: uniquePatientIds.map(patientId => ({
      queryKey: ['patients', patientId],
      queryFn: () => patientsApi.getPatient(patientId),
      staleTime: 30000,
    })),
  })

  // Build patient map
  const patientMap = useMemo(() => {
    const map = new Map<string, { first_name: string; last_name: string }>()
    patientQueries.forEach((query, index) => {
      const id = uniquePatientIds[index]
      if (query.data && id) {
        map.set(id, query.data)
      }
    })
    return map
  }, [patientQueries, uniquePatientIds])

  const isLoadingAppointments = appointmentQueries.some(q => q.isLoading)
  const isLoadingPatients = patientQueries.some(q => q.isLoading)

  // Client-side filtering
  const filteredReports = useMemo(() => {
    if (!reports) return []
    return reports.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (patientFilter !== 'all') {
        const appointment = appointmentMap.get(r.appointment_id)
        if (!appointment || appointment.patient_id !== patientFilter) return false
      }
      return true
    })
  }, [reports, statusFilter, patientFilter, appointmentMap])

  if (isLoading || isLoadingAppointments || isLoadingPatients) {
    return <LoadingSpinner text={t('reports.loadingReports')} />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('reports.title')}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ReportStatus | 'all')}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder={t('reports.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('reports.draft')}</SelectItem>
            <SelectItem value="final">{t('reports.final')}</SelectItem>
            <SelectItem value="amended">{t('reports.amended')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={patientFilter}
          onValueChange={(value) => setPatientFilter(value)}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder={t('reports.filterByPatient')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('reports.allPatients')}</SelectItem>
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
      </div>

      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">{t('reports.noResults')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('reports.reportsCreatedFromAppointments')}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.patientName')}</TableHead>
                <TableHead>{t('reports.modality')}</TableHead>
                <TableHead>{t('reports.radiologist')}</TableHead>
                <TableHead>{t('reports.status')}</TableHead>
                <TableHead>{t('reports.version')}</TableHead>
                <TableHead>{t('reports.createdAt')}</TableHead>
                <TableHead>{t('reports.finalizedAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onClick={() => navigate(`/reports/${report.id}`)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

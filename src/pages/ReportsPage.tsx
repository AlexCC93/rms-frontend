import { useState } from 'react'
import { useReports } from '@/hooks/useReports'
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
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')

  const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined

  const { data: reports, isLoading, error } = useReports(filters)

  if (isLoading) {
    return <LoadingSpinner text="Loading reports..." />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ReportStatus | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="amended">Amended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!reports || !Array.isArray(reports) || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No reports found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Reports are created from completed appointments
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Modality</TableHead>
                <TableHead>Radiologist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Finalized At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
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

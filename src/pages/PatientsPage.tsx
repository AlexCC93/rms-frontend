import { useState } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { useDebounce } from '@/hooks/useDebounce'

export function PatientsPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data: patients, isLoading, error } = usePatients(
    debouncedSearch ? { search: debouncedSearch } : undefined
  )

  if (isLoading) {
    return <LoadingSpinner text="Loading patients..." />
  }

  if (error) {
    return <ErrorAlert message={getErrorMessage(error)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
        <Button onClick={() => navigate('/patients/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {!patients || patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No patients found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating a new patient'}
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => navigate('/patients/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Patient
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className={`cursor-pointer ${
                    patient.is_deleted ? 'opacity-50' : ''
                  }`}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  <TableCell className="font-medium">
                    {patient.first_name} {patient.last_name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(patient.date_of_birth), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="capitalize">{patient.sex}</TableCell>
                  <TableCell>{patient.national_id}</TableCell>
                  <TableCell>{patient.phone || '—'}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

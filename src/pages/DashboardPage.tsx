import { useDashboardStats } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { Calendar, CheckCircle2, AlertCircle, Plus, Users, FileText } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

export function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // If endpoint doesn't exist (404), show simplified dashboard
  const statsUnavailable = error && (error as any)?.response?.status === 404

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/patients/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Patient
          </Button>
          <Button onClick={() => navigate('/appointments/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {statsUnavailable ? (
        // Simplified dashboard when stats endpoint not available
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate('/patients')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle>Patients</CardTitle>
                  <CardDescription>Manage patient records</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate('/appointments')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle>Appointments</CardTitle>
                  <CardDescription>Schedule and track imaging</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate('/reports')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <CardTitle>Reports</CardTitle>
                  <CardDescription>View and finalize reports</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      ) : stats ? (
        // Full dashboard with stats. //TODO: Implement in the backend and remove statsUnavailable fallback.
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Today
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today_appointments_total}</div>
                <p className="text-xs text-muted-foreground">
                  Appointments scheduled for today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Scheduled
                </CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today_appointments_scheduled}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today_appointments_completed}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Issues
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.today_appointments_canceled + stats.today_appointments_no_show}
                </div>
                <p className="text-xs text-muted-foreground">
                  Canceled or no-show
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Draft Reports Awaiting Finalization</CardTitle>
              <CardDescription>
                Recent reports that need to be finalized
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recent_draft_reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No draft reports at this time.
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.recent_draft_reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">Report #{report.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <StatusBadge status={report.status} type="report" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

import { useDashboardStats } from '@/hooks/useDashboard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { Calendar, CheckCircle2, AlertCircle, Plus, Users, FileText, TrendingUp, Clock } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from 'react-i18next'

export function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { t } = useTranslation()

  // If endpoint doesn't exist (404), show simplified dashboard
  const statsUnavailable = error && (error as any)?.response?.status === 404

  if (isLoading) {
    return <LoadingSpinner text={t('dashboard.loadingDashboard')} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.welcomeBack', { name: user?.full_name || user?.email })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/patients/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.newPatient')}
          </Button>
          <Button onClick={() => navigate('/appointments/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.newAppointment')}
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
                  <CardTitle>{t('dashboard.patients')}</CardTitle>
                  <CardDescription>{t('dashboard.managePatientRecords')}</CardDescription>
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
                  <CardTitle>{t('dashboard.appointments')}</CardTitle>
                  <CardDescription>{t('dashboard.scheduleAndTrack')}</CardDescription>
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
                  <CardTitle>{t('dashboard.reports')}</CardTitle>
                  <CardDescription>{t('dashboard.viewAndFinalize')}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      ) : stats ? (
        <>
          {/* ── Today's activity ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('dashboard.todayActivity')}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.totalToday')}</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.today_appointments_total}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.appointmentsScheduledToday')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.scheduled')}</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.today_appointments_scheduled}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.awaitingCompletion')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.completed')}</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.today_appointments_completed}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.successfullyCompleted')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.issues')}</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.today_appointments_canceled + stats.today_appointments_no_show}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.canceledOrNoShow')}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Volume & throughput ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('dashboard.volumeThroughput')}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.patientsThisMonth')}</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.patients_this_month}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.appointmentsCurrentMonth')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.patientsThisYear')}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.patients_this_year}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.annualThroughput')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.upcoming7Days')}</CardTitle>
                  <Clock className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.appointments_next_7_days}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.scheduledVisitsAhead')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.reportsIssued')}</CardTitle>
                  <FileText className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reports_issued_this_month}</div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.finalizedReportsThisMonth')}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Draft reports action list ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('dashboard.draftReportsAwaitingFinalization')}</CardTitle>
                  <CardDescription>{t('dashboard.recentReportsNeedFinalization')}</CardDescription>
                </div>
                {stats.reports_pending_finalization > 0 && (
                  <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                    {stats.reports_pending_finalization} {t('common.pending')}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {stats.recent_draft_reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('dashboard.noDraftReports')}</p>
              ) : (
                <div className="space-y-3">
                  {stats.recent_draft_reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{t('dashboard.reportNumber', { id: report.id.slice(0, 8) })}</p>
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

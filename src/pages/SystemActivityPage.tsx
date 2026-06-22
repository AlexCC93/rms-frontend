import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, addDays, startOfDay } from 'date-fns'
import { ArrowLeft, Activity, Users, Zap, ShieldAlert, Eye, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

import { useSystemActivity } from '@/hooks/useAudit'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SystemActivityFlag, SystemActivityRole } from '@/types'

// ── Date helpers ────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for the given UTC Date */
function toDateInput(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Converts a YYYY-MM-DD string to an ISO-8601 UTC start-of-day string */
function toUtcStart(dateStr: string): string {
  return `${dateStr}T00:00:00Z`
}

/** Converts a YYYY-MM-DD string to an ISO-8601 UTC start-of-next-day (exclusive end) */
function toUtcEnd(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return toDateInput(addDays(d, 1)) + 'T00:00:00Z'
}

/** Format ISO UTC timestamp to "YYYY-MM-DD HH:mm UTC" */
function fmtTs(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy-MM-dd HH:mm') + ' UTC'
  } catch {
    return iso
  }
}

/** Default range: today (UTC) */
function defaultRange(): { start: string; end: string } {
  const today = startOfDay(new Date())
  return {
    start: toDateInput(today),
    end: toDateInput(today),
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: number
  description: string
  highlight?: 'warning' | 'danger' | 'neutral'
}

function SummaryCard({ icon, label, value, description, highlight }: SummaryCardProps) {
  const valueClass =
    highlight === 'danger'
      ? 'text-red-600'
      : highlight === 'warning'
        ? 'text-amber-600'
        : 'text-foreground'

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <p className={`text-3xl font-bold leading-none ${valueClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ── Role badge ──────────────────────────────────────────────────────────────

const ROLE_CLASSES: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  radiologist: 'bg-blue-100 text-blue-800 border-blue-200',
  staff: 'bg-green-100 text-green-800 border-green-200',
}

function RoleBadge({ role, label }: { role: SystemActivityRole; label: string }) {
  if (!role) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  const cls = ROLE_CLASSES[role] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <Badge className={`${cls} hover:opacity-90`} variant="outline">
      {label}
    </Badge>
  )
}

// ── Flag badge ───────────────────────────────────────────────────────────────

const FLAG_CLASSES: Record<SystemActivityFlag, string> = {
  OK: 'bg-green-100 text-green-800 border-green-200',
  Suspicious: 'bg-red-100 text-red-800 border-red-200',
  Review: 'bg-amber-100 text-amber-800 border-amber-200',
}

function FlagBadge({ flag, reason }: { flag: SystemActivityFlag; reason: string | null }) {
  const cls = FLAG_CLASSES[flag] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span title={reason ?? undefined}>
      <Badge className={`${cls} hover:opacity-90 gap-1`} variant="outline">
        {flag !== 'OK' && <AlertTriangle className="h-3 w-3" />}
        {flag}
      </Badge>
    </span>
  )
}

// ── Error mapping ────────────────────────────────────────────────────────────

function resolveError(error: unknown, t: (k: string) => string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) return t('audit.systemActivity.errorUnauthorized')
    if (status === 403) return t('audit.systemActivity.errorForbidden')
    if (status === 422) return t('audit.systemActivity.errorInvalidParams')
  }
  return t('audit.systemActivity.errorGeneric')
}

// ── Page component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export function SystemActivityPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const { start: initStart, end: initEnd } = defaultRange()
  const [startDate, setStartDate] = useState(initStart)
  const [endDate, setEndDate] = useState(initEnd)
  // Applied range (only updates when user clicks Apply)
  const [appliedStart, setAppliedStart] = useState(initStart)
  const [appliedEnd, setAppliedEnd] = useState(initEnd)
  const [page, setPage] = useState(1)

  const params = {
    start_at: toUtcStart(appliedStart),
    end_at: toUtcEnd(appliedEnd),
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading, error } = useSystemActivity(params)

  function handleApply() {
    setPage(1)
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total_rows / PAGE_SIZE)) : 1

  // Role display label
  function roleLabel(role: SystemActivityRole): string {
    if (role === 'admin') return t('audit.systemActivity.roleAdmin')
    if (role === 'radiologist') return t('audit.systemActivity.roleRadiologist')
    if (role === 'staff') return t('audit.systemActivity.roleStaff')
    return t('audit.systemActivity.roleUnknown')
  }

  // Period label for header
  const periodLabel = appliedStart === appliedEnd
    ? appliedStart
    : `${appliedStart} – ${appliedEnd}`

  const generatedAt = format(new Date(), 'MMM d, yyyy HH:mm')

  return (
    <div className="space-y-6">
      {/* ── Back button ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/audit')}
        className="shrink-0 -mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t('common.back')}
      </Button>

      {/* ── Page header ── */}
      <div className="flex items-start gap-3">
        <Activity className="h-8 w-8 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold">{t('audit.systemActivity.pageTitle')}</h1>
            <Badge className="bg-red-600 text-white border-red-700 text-xs">
              {t('audit.systemActivity.adminOnly')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Period: {periodLabel}
            {user && (
              <>
                {' '}|{' '}{t('audit.systemActivity.generatedBy')}: {user.full_name ?? user.email}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Date range picker ── */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start-date">{t('audit.systemActivity.startDate')}</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end-date">{t('audit.systemActivity.endDate')}</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-44"
          />
        </div>
        <Button onClick={handleApply} disabled={!startDate || !endDate}>
          {t('audit.systemActivity.applyRange')}
        </Button>
      </div>

      {/* ── Loading ── */}
      {isLoading && <LoadingSpinner text={t('audit.systemActivity.loading')} />}

      {/* ── Error ── */}
      {!isLoading && error && (
        <ErrorAlert message={resolveError(error, t)} />
      )}

      {/* ── Results ── */}
      {!isLoading && !error && data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              icon={<Users className="h-4 w-4" />}
              label={t('audit.systemActivity.summaryActiveUsers')}
              value={data.summary.active_users}
              description={t('audit.systemActivity.summaryActiveUsersDesc')}
            />
            <SummaryCard
              icon={<Zap className="h-4 w-4" />}
              label={t('audit.systemActivity.summaryTotalActions')}
              value={data.summary.total_actions}
              description={t('audit.systemActivity.summaryTotalActionsDesc')}
            />
            <SummaryCard
              icon={<ShieldAlert className="h-4 w-4" />}
              label={t('audit.systemActivity.summaryFailedLogins')}
              value={data.summary.failed_logins}
              description={t('audit.systemActivity.summaryFailedLoginsDesc')}
              highlight={data.summary.failed_logins > 0 ? 'danger' : 'neutral'}
            />
            <SummaryCard
              icon={<Eye className="h-4 w-4" />}
              label={t('audit.systemActivity.summaryPhiAccess')}
              value={data.summary.phi_access_events}
              description={t('audit.systemActivity.summaryPhiAccessDesc')}
              highlight={data.summary.phi_access_events > 0 ? 'warning' : 'neutral'}
            />
            <SummaryCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label={t('audit.systemActivity.summarySuspicious')}
              value={data.summary.suspicious_activity_flags}
              description={t('audit.systemActivity.summarySuspiciousDesc')}
              highlight={data.summary.suspicious_activity_flags > 0 ? 'danger' : 'neutral'}
            />
          </div>

          {/* Activity table */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-slate-50">
              <p className="text-xs font-semibold tracking-widest text-slate-600 uppercase">
                {t('audit.systemActivity.tableTitle')}
              </p>
            </div>

            {data.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Activity className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-lg font-medium">{t('audit.systemActivity.noResults')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>{t('audit.systemActivity.colTimestamp')}</TableHead>
                      <TableHead>{t('audit.systemActivity.colUser')}</TableHead>
                      <TableHead>{t('audit.systemActivity.colRole')}</TableHead>
                      <TableHead>{t('audit.systemActivity.colAction')}</TableHead>
                      <TableHead>{t('audit.systemActivity.colRecord')}</TableHead>
                      <TableHead>{t('audit.systemActivity.colFlag')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {fmtTs(row.timestamp)}
                          {row.event_count > 1 && row.window_end && (
                            <span className="block text-muted-foreground">
                              – {fmtTs(row.window_end)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{row.user}</TableCell>
                        <TableCell>
                          <RoleBadge role={row.role} label={roleLabel(row.role)} />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {row.action}
                            {row.event_count > 1 && (
                              <span className="ml-1 text-muted-foreground text-xs">
                                (×{row.event_count})
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.record_id}</TableCell>
                        <TableCell>
                          <FlagBadge flag={row.flag} reason={row.flag_reason} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('audit.systemActivity.page')} {data.page} {t('audit.systemActivity.of')} {totalPages}
                {' '}({data.total_rows} rows)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('audit.systemActivity.prevPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('audit.systemActivity.nextPage')}
                </Button>
              </div>
            </div>
          )}

          {/* HIPAA notice */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>{t('audit.systemActivity.hipaaNotice')}</span>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground border-t pt-3">
            <span>Generated: {generatedAt}</span>
            <span>
              {t('audit.systemActivity.footer')}&nbsp;|&nbsp;{t('audit.systemActivity.doNotDistribute')}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

import { useAuditAccessLog } from '@/hooks/useAudit'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { AuditAction } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function currentUtcYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

/** Format a month number as a two-digit string, e.g. 5 → "05" */
function padMonth(m: number): string {
  return String(m).padStart(2, '0')
}

/** Convert year + month to the value expected by <input type="month"> */
function toInputValue(year: number, month: number): string {
  return `${year}-${padMonth(month)}`
}

/** Format an ISO 8601 UTC timestamp to "YYYY-MM-DD HH:mm UTC" */
function formatTimestampUtc(iso: string): string {
  try {
    const date = parseISO(iso)
    return format(date, 'yyyy-MM-dd HH:mm') + ' UTC'
  } catch {
    return iso
  }
}

/** Month names for the subtitle (English only; full i18n can be added later) */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Action badge ────────────────────────────────────────────────────────────

const ACTION_CLASSES: Record<AuditAction, string> = {
  CREATE: 'bg-blue-100 text-blue-800 border-blue-200',
  FINALIZE: 'bg-green-100 text-green-800 border-green-200',
  VIEW: 'bg-gray-100 text-gray-700 border-gray-200',
  EXPORT: 'bg-orange-100 text-orange-800 border-orange-200',
}

function ActionBadge({ action }: { action: AuditAction }) {
  return (
    <Badge className={`${ACTION_CLASSES[action]} hover:opacity-90`} variant="outline">
      {action}
    </Badge>
  )
}

// ── Error mapping ───────────────────────────────────────────────────────────

function resolveErrorMessage(error: unknown, t: (k: string) => string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) return t('audit.accessLog.errorUnauthorized')
    if (status === 403) return t('audit.accessLog.errorForbidden')
    if (status === 422) return t('audit.accessLog.errorInvalidParams')
  }
  return t('audit.accessLog.errorGeneric')
}

// ── Component ───────────────────────────────────────────────────────────────

export function AuditAccessLogPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { year: initYear, month: initMonth } = currentUtcYearMonth()
  const [year, setYear] = useState(initYear)
  const [month, setMonth] = useState(initMonth)

  const { data, isLoading, error } = useAuditAccessLog(year, month)

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split('-').map(Number)
    const y = parts[0] ?? 0
    const m = parts[1] ?? 0
    if (y >= 2020 && y <= 2100 && m >= 1 && m <= 12) {
      setYear(y)
      setMonth(m)
    }
  }

  const monthName = MONTH_NAMES[month - 1]

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/audit')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common.back')}
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <ClipboardList className="h-8 w-8 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('audit.accessLog.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('audit.accessLog.period')}: {monthName} {year} &nbsp;|&nbsp; {t('audit.accessLog.adminOnly')}
          </p>
        </div>
      </div>

      {/* ── Month / year picker ── */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="period-picker">{t('audit.accessLog.period')}</Label>
          <Input
            id="period-picker"
            type="month"
            value={toInputValue(year, month)}
            min="2020-01"
            max="2100-12"
            onChange={handleMonthChange}
            className="w-44"
          />
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && <LoadingSpinner text={t('audit.accessLog.loading')} />}

      {/* ── Error ── */}
      {!isLoading && error && (
        <ErrorAlert message={resolveErrorMessage(error, t)} />
      )}

      {/* ── Results ── */}
      {!isLoading && !error && data && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap gap-6 rounded-lg border bg-white px-5 py-3 text-sm">
            <span>
              <span className="font-semibold">{t('audit.accessLog.totalActions')}:</span>{' '}
              {data.total_actions}
            </span>
            <span>
              <span className="font-semibold">{t('audit.accessLog.suspiciousFlags')}:</span>{' '}
              {data.suspicious_activity_flags}
            </span>
          </div>

          {/* Table or empty state */}
          {data.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-lg font-medium">{t('audit.accessLog.noResults')}</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('audit.accessLog.colTimestamp')}</TableHead>
                    <TableHead>{t('audit.accessLog.colUser')}</TableHead>
                    <TableHead>{t('audit.accessLog.colAction')}</TableHead>
                    <TableHead>{t('audit.accessLog.colRecord')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {formatTimestampUtc(row.timestamp)}
                      </TableCell>
                      <TableCell>{row.user}</TableCell>
                      <TableCell>
                        <ActionBadge action={row.action} />
                      </TableCell>
                      <TableCell>
                        <span
                          title={row.record}
                          className="cursor-default font-mono text-xs"
                        >
                          {row.record.slice(0, 8)}&hellip;
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

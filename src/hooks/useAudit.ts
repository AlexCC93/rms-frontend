import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit'
import type { SystemActivityParams } from '@/types'

export const useAuditAccessLog = (year: number, month: number) => {
  return useQuery({
    queryKey: ['audit', 'access-log', year, month],
    queryFn: () => auditApi.getAccessLog(year, month),
    enabled: year >= 2020 && year <= 2100 && month >= 1 && month <= 12,
  })
}

export const useSystemActivity = (params: SystemActivityParams) => {
  return useQuery({
    queryKey: ['audit', 'system-activity', params],
    queryFn: () => auditApi.getSystemActivity(params),
    enabled: !!params.start_at && !!params.end_at,
  })
}

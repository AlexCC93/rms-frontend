import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit'

export const useAuditAccessLog = (year: number, month: number) => {
  return useQuery({
    queryKey: ['audit', 'access-log', year, month],
    queryFn: () => auditApi.getAccessLog(year, month),
    enabled: year >= 2020 && year <= 2100 && month >= 1 && month <= 12,
  })
}

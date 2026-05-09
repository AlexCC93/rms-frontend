import { apiClient } from './client'
import type { AuditAccessLogReport } from '@/types'

export const auditApi = {
  getAccessLog: async (year: number, month: number): Promise<AuditAccessLogReport> => {
    const response = await apiClient.get<AuditAccessLogReport>('/api/v1/audit/access-log', {
      params: { year, month },
    })
    return response.data
  },
}

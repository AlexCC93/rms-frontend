import { apiClient } from './client'
import type { AuditAccessLogReport, SystemActivityReport, SystemActivityParams } from '@/types'

export const auditApi = {
  getAccessLog: async (year: number, month: number): Promise<AuditAccessLogReport> => {
    const response = await apiClient.get<AuditAccessLogReport>('/api/v1/audit/access-log', {
      params: { year, month },
    })
    return response.data
  },

  getSystemActivity: async (params: SystemActivityParams): Promise<SystemActivityReport> => {
    const response = await apiClient.get<SystemActivityReport>('/api/v1/audit/system-activity', {
      params,
    })
    return response.data
  },
}

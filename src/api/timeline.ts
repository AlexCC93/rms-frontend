import { apiClient } from './client'
import type { TimelineEntry, TimelineFilters } from '@/types'

export const timelineApi = {
  getTimeline: async (filters: TimelineFilters): Promise<TimelineEntry[]> => {
    const response = await apiClient.get<{ items: TimelineEntry[]; total: number } | TimelineEntry[]>('/api/v1/timeline', {
      params: {
        ...filters,
        modality: filters.modality?.join(','),
      },
    })
    // Backend might return paginated response or array, handle both
    return Array.isArray(response.data) ? response.data : (response.data.items || [])
  },
}

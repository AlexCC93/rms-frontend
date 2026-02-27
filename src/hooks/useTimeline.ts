import { useQuery } from '@tanstack/react-query'
import { timelineApi } from '@/api/timeline'
import type { TimelineFilters } from '@/types'

export const useTimeline = (filters: TimelineFilters) => {
  return useQuery({
    queryKey: ['timeline', filters],
    queryFn: () => timelineApi.getTimeline(filters),
    enabled: !!filters.patient_id,
  })
}

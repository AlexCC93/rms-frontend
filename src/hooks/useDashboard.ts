import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  })
}

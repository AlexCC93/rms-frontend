import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { dashboardApi } from '@/api/dashboard'

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: (query) => {
      // Stop polling if the endpoint doesn't exist
      if (axios.isAxiosError(query.state.error) && query.state.error.response?.status === 404)
        return false
      return 60000
    },
    // Don't retry on 404 — endpoint may not be implemented yet on the backend
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) return false
      return failureCount < 3
    },
  })
}

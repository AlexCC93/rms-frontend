import { apiClient } from './client'
import type { TimelineEntry, TimelineFilters } from '@/types'

interface PatientTimeline {
  patient_id: string
  total_exams: number
  timeline: TimelineEntry[]
}

export const timelineApi = {
  getTimeline: async (filters: TimelineFilters): Promise<TimelineEntry[]> => {
    const { patient_id, modality, from_date, to_date } = filters
    const response = await apiClient.get<PatientTimeline>(
      `/api/v1/patients/${patient_id}/timeline`,
      {
        params: {
          modality: modality?.join(','),
          date_from: from_date,
          date_to: to_date,
        },
      }
    )
    return (response.data.timeline ?? []).map((entry) => ({
      ...entry,
      // Normalise field name: backend may return 'status' instead of 'appointment_status'
      appointment_status: entry.appointment_status ?? (entry as any).status,
    }))
  },
}

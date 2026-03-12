// Enums and Literal Types
export type Sex = 'male' | 'female' | 'other' | 'unknown'
export type Modality = 'XR' | 'CT' | 'US' | 'MRI' | 'MAMMO'
export type AppointmentStatus = 'scheduled' | 'completed' | 'canceled' | 'no_show'
export type ReportStatus = 'draft' | 'final' | 'amended'
export type UserRole = 'admin' | 'radiologist' | 'staff'

// User
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// Patient
export interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  sex: Sex
  national_id: string
  phone?: string
  email?: string
  notes?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  created_by_id: string
  updated_by_id: string
}

export interface PatientCreate {
  first_name: string
  last_name: string
  date_of_birth: string
  sex: Sex
  national_id: string
  phone?: string
  email?: string
  notes?: string
}

export interface PatientUpdate {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  sex?: Sex
  national_id?: string
  phone?: string
  email?: string
  notes?: string
}

// Appointment
export interface Appointment {
  id: string
  patient_id: string
  referring_physician_id: string | null
  radiologist_id: string | null
  modality: Modality
  study_description: string
  clinical_indication?: string
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  is_active: boolean
  created_at: string
  updated_at: string
  // Expanded relations (optional)
  patient?: Patient
  radiologist?: User
}

export interface AppointmentCreate {
  patient_id: string
  referring_physician_id?: string
  radiologist_id?: string
  modality: Modality
  study_description: string
  clinical_indication?: string
  scheduled_at: string
  duration_minutes: number
}

export interface AppointmentUpdate {
  patient_id?: string
  referring_physician_id?: string
  radiologist_id?: string
  modality?: Modality
  study_description?: string
  clinical_indication?: string
  scheduled_at?: string
  duration_minutes?: number
}

// Radiologist Schedule
export interface RadiologistSchedule {
  id: string
  radiologist_id: string
  radiologist?: User
  day_of_week: number // 0=Mon … 6=Sun
  start_time: string // "HH:MM"
  end_time: string   // "HH:MM"
  slot_duration_minutes: number
  modality: Modality | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RadiologistScheduleCreate {
  radiologist_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  modality?: Modality
}

export interface AvailableSlot {
  radiologist_id: string
  radiologist_name: string
  start: string  // ISO datetime
  end: string    // ISO datetime
  slot_duration_minutes: number
}

export interface AvailableSlotsResponse {
  date: string
  modality: Modality | null
  total_slots: number
  slots: AvailableSlot[]
}

export interface ScheduleFilters {
  radiologist_id?: string
  day_of_week?: number
  modality?: Modality
}

export interface AppointmentStatusUpdate {
  status: AppointmentStatus
}

// Radiology Report
export interface RadiologyReport {
  id: string
  appointment_id: string
  radiologist_id: string
  findings: string
  impression: string
  status: ReportStatus
  version: number
  parent_report_id?: string
  finalized_at?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  created_by_id: string
  updated_by_id: string
  // Expanded relations (optional)
  appointment?: Appointment
  radiologist?: User
  parent_report?: RadiologyReport
}

export interface RadiologyReportCreate {
  appointment_id: string
  radiologist_id: string
  findings: string
  impression: string
  parent_report_id?: string
}

export interface RadiologyReportUpdate {
  findings?: string
  impression?: string
  radiologist_id?: string
}

// Timeline Entry
export interface TimelineEntry {
  appointment_id: string
  patient_id: string
  modality: Modality
  study_description: string
  scheduled_at: string
  appointment_status: AppointmentStatus
  report_id?: string
  report_impression?: string
  report_status?: ReportStatus
  finalized_at?: string
}

// Auth
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface RefreshRequest {
  refresh_token: string
}

export interface RefreshResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// API Error Response (RFC 7807)
export interface ApiError {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
}

// Query Filters
export interface PatientFilters {
  search?: string
  is_active?: boolean
  skip?: number
  limit?: number
}

export interface AppointmentFilters {
  patient_id?: string
  status?: AppointmentStatus
  modality?: Modality
  from_date?: string
  to_date?: string
  skip?: number
  limit?: number
}

export interface ReportFilters {
  patient_id?: string
  appointment_id?: string
  status?: ReportStatus
  radiologist_id?: string
  skip?: number
  limit?: number
}

export interface TimelineFilters {
  patient_id: string
  modality?: Modality[]
  from_date?: string
  to_date?: string
}

// Dashboard Stats
export interface DashboardStats {
  // Today's appointment breakdown
  today_appointments_total: number
  today_appointments_scheduled: number
  today_appointments_completed: number
  today_appointments_canceled: number
  today_appointments_no_show: number
  // Longitudinal metrics
  patients_this_month: number
  patients_this_year: number
  appointments_next_7_days: number
  // Report metrics
  reports_issued_this_month: number
  reports_pending_finalization: number
  recent_draft_reports: RadiologyReport[]
}

// Form Data Types
export interface PatientFormData {
  first_name: string
  last_name: string
  date_of_birth: string
  sex: Sex
  national_id: string
  phone: string
  email: string
  notes: string
}

export interface AppointmentFormData {
  patient_id: string
  referring_physician: string
  radiologist_id: string
  modality: Modality
  study_description: string
  clinical_indication: string
  scheduled_at: string
  duration_minutes: number
}

export interface ReportFormData {
  findings: string
  impression: string
}

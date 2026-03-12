import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PatientsPage } from '@/pages/PatientsPage'
import { PatientDetailPage } from '@/pages/PatientDetailPage'
import { PatientFormPage } from '@/pages/PatientFormPage'
import { AppointmentsPage } from '@/pages/AppointmentsPage'
import { AppointmentDetailPage } from '@/pages/AppointmentDetailPage'
import { AppointmentFormPage } from '@/pages/AppointmentFormPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ReportDetailPage } from '@/pages/ReportDetailPage'
import { ReportFormPage } from '@/pages/ReportFormPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { ScheduleManagementPage } from '@/pages/ScheduleManagementPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function AppRouter() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  // Initialize synchronously so the store is hydrated before the first render
  // evaluates ProtectedRoute. A useEffect would fire after the initial render,
  // causing ProtectedRoute to see user=null and redirect to /login.
  useState(() => {
    initializeAuth()
  })

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/new" element={<PatientFormPage />} />
        <Route path="patients/:id/edit" element={<PatientFormPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />

        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="appointments/new" element={<AppointmentFormPage />} />
        <Route path="appointments/:id/edit" element={<AppointmentFormPage />} />
        <Route path="appointments/:id" element={<AppointmentDetailPage />} />

        <Route
          path="reports"
          element={
            <RoleGuard roles={['admin', 'radiologist']}>
              <ReportsPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/new"
          element={
            <RoleGuard roles={['admin', 'radiologist']}>
              <ReportFormPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/:id"
          element={
            <RoleGuard roles={['admin', 'radiologist']}>
              <ReportDetailPage />
            </RoleGuard>
          }
        />

        <Route path="timeline/:patientId" element={<TimelinePage />} />

        <Route
          path="schedule"
          element={
            <RoleGuard roles={['admin']}>
              <ScheduleManagementPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

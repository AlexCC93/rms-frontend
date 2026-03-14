# RMS-lite Frontend — Codebase Reference

**Stack:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query v5, React Router v6, Zustand, React Hook Form + Zod.

**Backend base URL:** `http://localhost:8000` (configured via `VITE_API_BASE_URL` env var). All API paths start with `/api/v1/`.

**Auth model:** JWT access + refresh tokens stored in `localStorage`. Roles: `admin`, `radiologist`, `staff`.

---

## Directory Structure

```
src/
  main.tsx               # App entry point
  App.tsx                # Root component
  index.css              # Global styles (Tailwind base)
  vite-env.d.ts          # Vite type shims
  api/                   # Raw HTTP calls (axios wrappers)
  components/
    layout/              # App shell, sidebar, top bar
    shared/              # Reusable UI building blocks
    ui/                  # shadcn/ui primitives
  hooks/                 # TanStack Query hooks (data fetching + mutations)
  lib/                   # Utility functions
  pages/                 # Route-level page components
  router/                # Route definitions and auth guards
  stores/                # Zustand global state
  types/                 # All TypeScript interfaces and types
  utils/                 # Pure logic helpers (no React)
```

---

## Entry & Bootstrap

### `src/main.tsx`
App entry point. Creates the React root, wraps the app in `QueryClientProvider` (TanStack Query), configures global query defaults: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30000`.

### `src/App.tsx`
Root component. Wraps `AppRouter` in `BrowserRouter` and renders the global `Toaster` for toast notifications.

---

## Types — `src/types/index.ts`
Single source of truth for all TypeScript interfaces and union types.

**Primitive types:**
- `Sex` — `'male' | 'female' | 'other' | 'unknown'`
- `Modality` — `'XR' | 'CT' | 'US' | 'MRI' | 'MAMMO'`
- `AppointmentStatus` — `'scheduled' | 'completed' | 'canceled' | 'no_show'`
- `ReportStatus` — `'draft' | 'final' | 'amended'`
- `UserRole` — `'admin' | 'radiologist' | 'staff'`

**Entity interfaces:** `User`, `Patient`, `Appointment`, `RadiologistSchedule`, `AvailableSlot`, `AvailableSlotsResponse`, `RadiologyReport`, `TimelineEntry`, `DashboardStats`

**CRUD payload types:** `PatientCreate`, `PatientUpdate`, `AppointmentCreate`, `AppointmentUpdate`, `AppointmentStatusUpdate`, `RadiologyReportCreate`, `RadiologyReportUpdate`, `RadiologistScheduleCreate`

**Filter interfaces:** `PatientFilters` (`search`, `is_active`, `skip`, `limit`), `AppointmentFilters` (`patient_id`, `status`, `modality`, `from_date`, `to_date`, `skip`, `limit`), `ReportFilters` (`patient_id`, `appointment_id`, `status`, `radiologist_id`), `TimelineFilters` (`patient_id` required, plus optional `modality[]`, `from_date`, `to_date`)

**Auth types:** `LoginRequest`, `LoginResponse`, `RefreshRequest`, `RefreshResponse`, `ApiError`

> **Note:** `AvailableSlot` has a `slot_duration_minutes` field in the type definition, but the backend does **not** return it — compute it from `end - start` if needed.

---

## Router — `src/router/index.tsx`
Defines all client-side routes. Initializes auth from `localStorage` synchronously (via `useState` trick) to prevent redirect flicker.

**Public routes:** `/login`, `/403`

**Protected routes** (all require authenticated user, wrapped in `AppShell`):
| Path | Component | Roles |
|------|-----------|-------|
| `/dashboard` | `DashboardPage` | all |
| `/patients` | `PatientsPage` | all |
| `/patients/new` | `PatientFormPage` | all |
| `/patients/:id/edit` | `PatientFormPage` | all |
| `/patients/:id` | `PatientDetailPage` | all |
| `/appointments` | `AppointmentsPage` | all |
| `/appointments/new` | `AppointmentFormPage` | all |
| `/appointments/:id/edit` | `AppointmentFormPage` | all |
| `/appointments/:id` | `AppointmentDetailPage` | all |
| `/reports` | `ReportsPage` | admin, radiologist |
| `/reports/new` | `ReportFormPage` | admin, radiologist |
| `/reports/:id` | `ReportDetailPage` | admin, radiologist |
| `/timeline/:patientId` | `TimelinePage` | all |
| `/schedule` | `ScheduleManagementPage` | admin only |

Role-restricted routes use `<RoleGuard>` which redirects to `/403` on failure.

---

## API Layer — `src/api/`

All modules export a plain object of async functions. They use `apiClient` internally and return typed data (not the full axios response).

### `src/api/client.ts`
Configures the axios instance (`apiClient`) with:
- Base URL from `VITE_API_BASE_URL` (default: `http://localhost:8000`)
- Request interceptor: injects `Authorization: Bearer <access_token>` from `localStorage`
- Response interceptor: on 401, attempts a token refresh via `/api/v1/auth/refresh`. If refresh fails or no refresh token exists, clears session and redirects to `/login`. Queues concurrent requests during an in-progress refresh.
- `getErrorMessage(error)`: helper that extracts a user-readable string from any error (handles FastAPI RFC 7807 format, validation arrays, and plain errors).

### `src/api/auth.ts`
Endpoints: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.

### `src/api/patients.ts`
CRUD for `/api/v1/patients`. Handles both paginated `{ items, total }` and flat array responses from the backend. Methods: `getPatients(filters?)`, `getPatient(id)`, `createPatient(data)`, `updatePatient(id, data)`, `deletePatient(id)`.

### `src/api/appointments.ts`
CRUD for `/api/v1/appointments`. Always returns paginated `{ items, total }`. Methods: `getAppointments(filters?)`, `getAppointment(id)`, `createAppointment(data)`, `updateAppointment(id, data)`, `updateAppointmentStatus(id, data)`, `deleteAppointment(id)`.

> **Known backend limitation:** The `modality` filter in `AppointmentFilters` is silently ignored by the backend. Modality filtering is done client-side in `AppointmentsPage`. Status filter (`status`) does work server-side.

### `src/api/users.ts`
Read-only access to `/api/v1/users`. Methods: `getUsers()`, `getUser(id)` (returns `undefined` on 404 instead of throwing).

### `src/api/physicians.ts`
Read-only access to `/api/v1/physicians`. Defines its own `Physician` interface (`id`, `full_name`, `specialty?`, `contact_info?`). Methods: `getPhysicians()`, `getPhysician(id)`.

### `src/api/reports.ts`
CRUD + finalize for `/api/v1/reports`. Methods: `getReports(filters?)`, `getReport(id)`, `createReport(data)`, `updateReport(id, data)`, `finalizeReport(id)` (PATCH `.../finalize`), `deleteReport(id)`.

### `src/api/schedule.ts`
Two concerns: radiologist schedule templates and available slot queries.
- Also exports `AvailableSlotsParams` interface (`date: string`, `modality?: Modality`, `radiologist_id?: string`).
- `getAvailableSlots(params)` → `GET /api/v1/schedule/available-slots` — returns only truly free slots; the backend already filters out booked ones.
- `getSchedules(filters?)` → `GET /api/v1/schedule`
- `createSchedule(data)` → `POST /api/v1/schedule`
- `deleteSchedule(id)` → `DELETE /api/v1/schedule/:id`

### `src/api/timeline.ts`
`getTimeline(filters)` → `GET /api/v1/patients/:patient_id/timeline`. Normalises `status` → `appointment_status` on each entry (backend may return either field name).

### `src/api/dashboard.ts`
`getStats()` → `GET /api/v1/dashboard/stats`. Returns `DashboardStats`.

---

## Hooks — `src/hooks/`

All data-fetching hooks use TanStack Query. Query keys follow the pattern `['entity', filters?]`.

### `src/hooks/useAuth.ts`
Exposes `login`, `loginAsync`, `isLoggingIn`, `loginError`, `logout`. On success, decodes the JWT to construct a `User` object (avoids a separate `/me` call) and stores it via `authStore.setAuth`. `logout` calls the API (ignoring errors) then clears the store and navigates to `/login`.

### `src/hooks/usePatients.ts`
- `usePatients(filters?)` — list query, key `['patients', filters]`
- `usePatient(id)` — single entity, key `['patients', id]`
- `useCreatePatient()` — invalidates `['patients']` on success
- `useUpdatePatient()` — invalidates list + single entry
- `useDeletePatient()` — invalidates list

### `src/hooks/useAppointments.ts`
- `useAppointments(filters?, options?)` — supports `enabled` flag (used in patient detail)
- `useAppointment(id)`
- `useCreateAppointment()` — invalidates `['appointments']` and `['dashboard']`
- `useUpdateAppointment()` — invalidates list, single entry, dashboard
- `useUpdateAppointmentStatus()` — invalidates appointments, dashboard, and `['timeline']`
- `useDeleteAppointment()` — invalidates list and dashboard

### `src/hooks/usePhysicians.ts`
- `usePhysicians()` — full list, key `['physicians']`
- `usePhysician(id)` — single, key `['physicians', id]`

### `src/hooks/useUsers.ts`
- `useUsers()` — all users, key `['users']`
- `useUser(id, options?)` — single user; `retry: false` by default to handle 404 gracefully

### `src/hooks/useReports.ts`
- `useReports(filters?)`, `useReport(id)`
- `useCreateReport()`, `useUpdateReport()`, `useFinalizeReport()` — all invalidate `['reports']`, `['dashboard']`, and `['timeline']`
- (no delete mutation exposed — delete is on `reportsApi` but not hooked)

### `src/hooks/useSchedule.ts`
- `useAvailableSlots(params | null)` — enabled only when `params.date` is set. `staleTime: 0`, `gcTime: 0` so the backend is always hit fresh (booked slots must never be served from cache).
- `useSchedules(filters?)`, `useCreateSchedule()`, `useDeleteSchedule()` — manage recurring schedule templates

### `src/hooks/useTimeline.ts`
`useTimeline(filters)` — enabled only when `filters.patient_id` is truthy.

### `src/hooks/useDashboard.ts`
`useDashboardStats()` — polls every 60 seconds. Stops polling and stops retrying if the backend returns 404 (endpoint may not exist).

### `src/hooks/useDebounce.ts`
Generic `useDebounce<T>(value, delay)` — delays propagation of a value by `delay` ms. Used in `PatientsPage` for the search input.

### `src/hooks/use-toast.ts`
shadcn/ui toast state manager. Exposes `useToast()` which returns `{ toast, dismiss, toasts }`. Internal reducer manages a queue (limit: 1 visible toast at a time).

---

## Stores — `src/stores/`

### `src/stores/authStore.ts`
Zustand store for authentication state. Fields: `user`, `accessToken`, `refreshToken`.
- `setAuth(user, accessToken, refreshToken)` — sets state + persists all three to `localStorage`
- `clearAuth()` — clears state + removes from `localStorage`
- `initializeAuth()` — reads from `localStorage` and hydrates the store; called once synchronously in `AppRouter` before first render

---

## Pages — `src/pages/`

### `src/pages/LoginPage.tsx`
Public login form (email + password, Zod-validated). If user is already logged in, redirects to `/dashboard`. On success, navigation is handled by the `useEffect` watching `user` in `authStore`.

### `src/pages/DashboardPage.tsx`
Home page after login. Fetches `DashboardStats` and renders KPI stat blocks (today's appointments by status, monthly metrics, pending reports list). Gracefully degrades to a simplified nav-card layout if the `/dashboard/stats` endpoint returns 404.

### `src/pages/PatientsPage.tsx`
Searchable list of all patients. Search input is debounced (300 ms) and passed to `usePatients({ search })`. Rows are clickable and navigate to `PatientDetailPage`.

### `src/pages/PatientDetailPage.tsx`
Detail view for a single patient, using a tab layout:
- **Overview** — demographics, contact info, audit timestamps
- **Appointments** — table of all appointments for this patient (filtered by `patient_id`)
- **Timeline** — full imaging history via `useTimeline`

Provides "New Appointment" shortcut button that navigates to `/appointments/new?patient_id=:id`.

### `src/pages/PatientFormPage.tsx`
Create / edit patient form (Zod schema with RHF). Detects edit mode via `:id` URL param. On edit, populates form via `form.reset()` once the patient data loads.

### `src/pages/AppointmentsPage.tsx`
Paginated list of all appointments with four client-side or server-side filters:
- **Status** — server-side (`status` param passed to the API)
- **Modality** — client-side (backend ignores this param)
- **Patient** — client-side, dropdown populated from unique patients in the loaded dataset
- **Radiologist** — client-side, dropdown populated from unique radiologists in the loaded dataset

Patient and radiologist names are resolved by issuing individual `useQueries` for each unique ID found in the appointments list. All four filters are combined in a `filteredAppointments` memo.

### `src/pages/AppointmentFormPage.tsx`
Create / edit appointment form. Two-section layout:
1. **Patient & Clinical Info** — patient (locked to display in edit mode), modality, study description, referring physician (optional, `Controller`-based `Select` for reliable value binding), clinical indication
2. **Radiologist & Time Slot** — date picker triggers a fresh call to `/api/v1/schedule/available-slots?date=...&modality=...`. Available slots are rendered as clickable cards. `modalityForSlots` initialises to `'XR'` (matches form default) so the first date pick always produces exactly one query.

On 409 (slot taken), clears the selected slot and refetches. Supports pre-filling `patient_id` from the URL query string (`?patient_id=...`).

### `src/pages/AppointmentDetailPage.tsx`
Read-only detail view for one appointment. Resolves patient, referring physician, and assigned radiologist names via individual queries. Shows linked radiology reports. Provides status transition buttons (only available transitions per `statusTransitions` util are shown); transitions require a confirmation dialog. Radiologists who receive a 403 are silently redirected back to the list.

### `src/pages/ReportsPage.tsx`
List of radiology reports, filterable by status. Each row is rendered by a `ReportRow` sub-component that independently fetches and resolves appointment → patient and radiologist names. Draft reports are highlighted with a yellow background.

### `src/pages/ReportFormPage.tsx`
Create a new radiology report. Requires `?appointment_id=` query param. Displays appointment context (patient, modality, date) above the findings/impression text areas. Auto-assigns `radiologist_id` to the currently logged-in user.

### `src/pages/ReportDetailPage.tsx`
Full report viewer and editor. Features:
- Inline edit mode (findings + impression text areas) with save
- Radiologist re-assignment dropdown (admin/radiologist only)
- Finalize (PATCH `.../finalize`) with confirmation dialog
- Amend — creates a new `draft` report linked via `parent_report_id`
- Version history badge and parent report reference

### `src/pages/TimelinePage.tsx`
Chronological imaging timeline for a patient (`:patientId` URL param). Each entry is a `Card` showing modality badge, study description, appointment status badge, date, and — if available — the report impression and finalized date.

### `src/pages/ScheduleManagementPage.tsx`
Admin-only. Manages recurring radiologist schedule templates (not appointments). A form creates new templates (radiologist, day of week, start/end time, slot duration, optional modality). The table can be filtered by radiologist. Templates can be deleted with a confirmation dialog.

### `src/pages/ForbiddenPage.tsx`
Static 403 error page with a "Go to Dashboard" button. Rendered for role violations.

---

## Components — `src/components/`

### Layout

**`src/components/layout/AppShell.tsx`**
Full-height layout wrapper: `<Sidebar />` on the left, `<TopBar />` across the top, `<Outlet />` (React Router) as the main scrollable content area.

**`src/components/layout/Sidebar.tsx`**
Left navigation. Renders nav items filtered by the current user's role (e.g., "Schedules" is admin-only, "Reports" is admin/radiologist). Active route highlighted. Uses `useLocation` for path matching.

**`src/components/layout/TopBar.tsx`**
Top header bar. Displays the logged-in user's name and a colour-coded role badge. A dropdown menu exposes a logout action.

### Shared

**`src/components/shared/RoleGuard.tsx`**
Route wrapper that reads `user.role` from `authStore` and either renders children or redirects to `/403` (configurable via `redirectTo` prop).

**`src/components/shared/StatusBadge.tsx`**
Renders a coloured `Badge` for either `AppointmentStatus` or `ReportStatus`. Controlled by `type` prop. Colour map:
- appointment: scheduled=blue, completed=green, canceled=gray, no_show=orange
- report: draft=yellow, final=green, amended=purple

**`src/components/shared/ModalityBadge.tsx`**
Renders a coloured `Badge` for a `Modality` value. Colour map: XR=cyan, CT=indigo, US=teal, MRI=violet, MAMMO=pink.

**`src/components/shared/AuditTimestamp.tsx`**
Displays a formatted "Created: ..." or "Updated: ..." timestamp. Shows UTC ISO string in the `title` tooltip.

**`src/components/shared/ConfirmDialog.tsx`**
Generic modal confirmation dialog with configurable title, message, confirm/cancel labels, action callback, `destructive` variant, and loading state.

**`src/components/shared/ErrorAlert.tsx`**
Renders a destructive `Alert` with an icon, optional title (default "Error"), and message string.

**`src/components/shared/LoadingSpinner.tsx`**
Centered spinner with optional text label. Three sizes: `sm`, `md` (default), `lg`.

### UI — `src/components/ui/`
shadcn/ui primitives: `alert`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `table`, `tabs`, `textarea`, `toast`, `toaster`. These are **not** to be modified directly; customise via Tailwind classes at the usage site.

---

## Utilities — `src/utils/`

### `src/utils/statusTransitions.ts`
Logic for appointment status state machine.
- `getAvailableStatusTransitions(current)` — returns valid next states. `scheduled` → `[completed, canceled, no_show]`; terminal states return `[]`.
- `getStatusTransitionLabel(status)` — human-readable button labels ("Mark Completed", "Cancel", "Mark No Show").
- `canTransitionStatus(status)` — boolean shorthand.

### `src/utils/roleGuard.ts`
Pure role-check helpers (no React):
- `hasRole(role, allowedRoles)`
- `canAccessReports(role)` → admin, radiologist
- `canEditReport(role)` → admin, radiologist
- `canFinalizeReport(role)` → admin, radiologist
- `canDeletePatient(role)` → admin only

---

## Lib — `src/lib/`

### `src/lib/utils.ts`
Single export: `cn(...inputs)` — merges Tailwind class strings using `clsx` + `tailwind-merge`. Used throughout for conditional className composition.

---

## Key Patterns & Conventions

1. **All data fetching goes through hooks** — pages never import from `src/api/` directly.
2. **Forms use React Hook Form + Zod** — schema defined per-page, `zodResolver` wired into `useForm`. For `Select` components that need to reflect async `form.reset()` values, use `<Controller>` instead of `form.watch()`.
3. **Role enforcement is dual-layered** — `<RoleGuard>` at the route level and `canEdit*` utils for inline UI control.
4. **Cache invalidation** — mutations invalidate the minimum necessary query keys. Appointment mutations also invalidate `['dashboard']`. Report mutations also invalidate `['timeline']`.
5. **Available slots cache** — `staleTime: 0` + `gcTime: 0` so slot data is always fetched fresh from the backend.
6. **Backend quirks to be aware of:**
   - `GET /appointments` ignores `modality` query param → filter client-side.
   - `GET /schedule/available-slots` already returns only free slots — no client-side availability filtering needed.
   - `AvailableSlot` does not include `slot_duration_minutes` in the API response — compute from `end - start`.
   - `/api/v1/dashboard/stats` may return 404 if not implemented — the UI degrades gracefully.
   - The timeline API uses `date_from`/`date_to` query params (not `from_date`/`to_date`).

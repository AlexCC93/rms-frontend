# RMS-lite Frontend — Codebase Reference

**Stack:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query v5, React Router v6, Zustand, React Hook Form + Zod, Tiptap (rich-text editor), i18next + react-i18next (multilingual EN/ES).

**Deployment:** Vercel (SPA). `vercel.json` rewrites all routes to `/index.html` for client-side routing.

**Backend base URL:** `http://localhost:8000` (configured via `VITE_API_BASE_URL` env var). All API paths start with `/api/v1/`.

**Auth model:** JWT access + refresh tokens stored in `localStorage`. Roles: `admin`, `radiologist`, `staff`.

---

## Directory Structure

```
vercel.json              # Vercel SPA rewrite rules
src/
  main.tsx               # App entry point (imports i18n)
  App.tsx                # Root component
  index.css              # Global styles (Tailwind base)
  vite-env.d.ts          # Vite type shims
  api/                   # Raw HTTP calls (axios wrappers)
  components/
    layout/              # App shell, sidebar, top bar
    shared/              # Reusable UI building blocks + LanguageSwitcher
    ui/                  # shadcn/ui primitives
  hooks/                 # TanStack Query hooks (data fetching + mutations)
  i18n/                  # Internationalization config & translation files
    index.ts             # i18next init (LanguageDetector, EN/ES)
    en.json              # English translations (~250+ keys)
    es.json              # Spanish translations (mirrors en.json)
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
App entry point. Imports `./i18n` to initialise i18next before rendering. Creates the React root, wraps the app in `QueryClientProvider` (TanStack Query), configures global query defaults: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30000`.

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

**Entity interfaces:** `User`, `Patient`, `Appointment`, `RadiologistSchedule`, `AvailableSlot`, `AvailableSlotsResponse`, `RadiologyReport` (includes `parent_report_id?` and `amended_by_report_id?` for bidirectional amendment linking, and `email_notification_sent?: boolean` populated only on the finalize response), `ReportImage`, `ReportImageListResponse`, `TimelineEntry`, `DashboardStats`

**CRUD payload types:** `PatientCreate`, `PatientUpdate`, `AppointmentCreate`, `AppointmentUpdate`, `AppointmentStatusUpdate`, `RadiologyReportCreate`, `RadiologyReportUpdate`, `RadiologistScheduleCreate`

**Filter interfaces:** `PatientFilters` (`search`, `is_active`, `skip`, `limit`), `AppointmentFilters` (`patient_id`, `status`, `modality`, `from_date`, `to_date`, `skip`, `limit`), `ReportFilters` (`patient_id`, `appointment_id`, `status`, `radiologist_id`, `skip`, `limit`), `ScheduleFilters` (`radiologist_id`, `day_of_week`, `modality`), `TimelineFilters` (`patient_id` required, plus optional `modality[]`, `from_date`, `to_date`)

**Form data types:** `PatientFormData`, `AppointmentFormData`, `ReportFormData` — typed counterparts used by React Hook Form.

**Auth types:** `LoginRequest`, `LoginResponse`, `RefreshRequest`, `RefreshResponse`, `ApiError`

**`ReportImage`** — `{ id, report_id, filename, content_type, file_size, uploaded_by_id, is_active, created_at }`. Returned by the report-images endpoints.

**`ReportImageListResponse`** — `{ items: ReportImage[], total: number }`.

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
Read-only access to `/api/v1/users`. Handles both paginated and flat array responses. Methods: `getUsers()`, `getUser(id)` (returns `undefined` on 404 instead of throwing).

### `src/api/physicians.ts`
Read-only access to `/api/v1/physicians`. Defines its own `Physician` interface (`id`, `full_name`, `specialty?`, `contact_info?`). Handles both paginated and flat array responses. Methods: `getPhysicians()`, `getPhysician(id)`.

### `src/api/reports.ts`
CRUD + finalize + image management for `/api/v1/reports`.

**Report CRUD:**
- `getReports(filters?)` — paginated list
- `getReport(id)`
- `createReport(data)`
- `updateReport(id, data)`
- `finalizeReport(id)` — `PATCH /api/v1/reports/:id/finalize`; response includes `email_notification_sent` (`true`/`false`/`null`)
- `deleteReport(id)`

**Report image methods** (all under `/api/v1/reports/:reportId/images`):
- `uploadImage(reportId, file: File)` — `POST` with `multipart/form-data`; returns `ReportImage`
- `listImages(reportId)` — `GET`; returns `ReportImage[]`
- `getImageBlob(reportId, imageId)` — `GET` with `responseType: 'blob'`; returns `Blob`
- `deleteImage(reportId, imageId)` — `DELETE`

### `src/api/schedule.ts`
Two concerns: radiologist schedule templates and available slot queries.
- Also exports `AvailableSlotsParams` interface (`date: string`, `modality?: Modality`, `radiologist_id?: string`).
- `getAvailableSlots(params)` → `GET /api/v1/schedule/available-slots` — returns only truly free slots; the backend already filters out booked ones.
- `getSchedules(filters?)` → `GET /api/v1/schedule` — handles both paginated `{ items, total }` and flat array responses.
- `createSchedule(data)` → `POST /api/v1/schedule`
- `deleteSchedule(id)` → `DELETE /api/v1/schedule/:id`

### `src/api/timeline.ts`
`getTimeline(filters)` → `GET /api/v1/patients/:patient_id/timeline`. Normalises `status` → `appointment_status` on each entry (backend may return either field name). Query params use `date_from`/`date_to` (not `from_date`/`to_date`). Modality array is serialised as a comma-separated string.

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
- `useCreateAppointment()` — invalidates **and refetches** `['appointments']`, invalidates `['dashboard']`
- `useUpdateAppointment()` — invalidates **and refetches** list, invalidates single entry and dashboard
- `useUpdateAppointmentStatus()` — invalidates appointments, dashboard, and `['timeline']`
- `useDeleteAppointment()` — invalidates list and dashboard

### `src/hooks/usePhysicians.ts`
- `usePhysicians()` — full list, key `['physicians']`
- `usePhysician(id)` — single, key `['physicians', id]`

### `src/hooks/useUsers.ts`
- `useUsers()` — all users, key `['users']`
- `useUser(id, options?)` — single user; `retry: false` by default to handle 404 gracefully

### `src/hooks/useReports.ts`
**Report hooks:**
- `useReports(filters?)`, `useReport(id)`
- `useCreateReport()` — invalidates `['reports']`, `['dashboard']`, `['timeline']`
- `useUpdateReport()` — invalidates list, single entry, dashboard, timeline
- `useFinalizeReport()` — invalidates list, single entry, dashboard, timeline
- `useDeleteReport()` — invalidates `['reports']`, `['dashboard']`

**Report image hooks:**
- `useReportImages(reportId)` — key `['reportImages', reportId]`; fetches the full image list for a report
- `useReportImageBlob(reportId, imageId)` — key `['reportImageBlob', reportId, imageId]`; fetches the image as a blob and returns an object URL (`staleTime: 5min`, `gcTime: 5min`)
- `useUploadReportImage()` — mutation; on success invalidates `['reportImages', reportId]`
- `useDeleteReportImage()` — mutation; on success invalidates `['reportImages', reportId]`

### `src/hooks/useSchedule.ts`
- `useAvailableSlots(params | null)` — key `['schedule', 'available-slots', params]`; enabled only when `params.date` is set. `staleTime: 0`, `gcTime: 0` so the backend is always hit fresh (booked slots must never be served from cache).
- `useSchedules(filters?)` — key `['schedule', 'templates', filters]`
- `useCreateSchedule()` — invalidates `['schedule', 'templates']`
- `useDeleteSchedule()` — invalidates `['schedule', 'templates']`

### `src/hooks/useTimeline.ts`
`useTimeline(filters)` — key `['timeline', filters]`; enabled only when `filters.patient_id` is truthy.

### `src/hooks/useDashboard.ts`
`useDashboardStats()` — key `['dashboard', 'stats']`; polls every 60 seconds. Stops polling and stops retrying if the backend returns 404 (endpoint may not exist).

### `src/hooks/useDebounce.ts`
Generic `useDebounce<T>(value, delay)` — delays propagation of a value by `delay` ms. Used in `PatientsPage` for the search input.

### `src/hooks/useResolvedHtml.ts`
`useResolvedHtml(rawHtml)` — takes raw HTML containing `/api/v1/reports/.../images/...` src paths, fetches each image with the user's Bearer token via `resolveApiImageSrcs`, and returns the HTML with all paths swapped to ephemeral `blob:` URLs safe for use in `dangerouslySetInnerHTML`. Returns the original string synchronously on the first render, then the resolved version once all fetches complete. Uses a cancellation flag to avoid state updates after unmount.

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

All pages use the `useTranslation()` hook from react-i18next — every user-visible string is rendered via `t()` calls. All pages include responsive Tailwind classes for mobile-friendly layouts (see **Mobile Responsiveness** section below).

### `src/pages/LoginPage.tsx`
Public login form (email + password, Zod-validated). If user is already logged in, redirects to `/dashboard`. On success, navigation is handled by the `useEffect` watching `user` in `authStore`. Includes a `LanguageSwitcher` for pre-login language selection.

### `src/pages/DashboardPage.tsx`
Home page after login. Fetches `DashboardStats` and renders KPI stat blocks (today's appointments by status, monthly metrics, pending reports list). Gracefully degrades to a simplified nav-card layout if the `/dashboard/stats` endpoint returns 404. Stat grid uses `grid-cols-2 lg:grid-cols-4` for mobile. Action buttons use `size="sm"` with `flex-wrap`.

### `src/pages/PatientsPage.tsx`
Searchable list of all patients. Search input is debounced (300 ms) and passed to `usePatients({ search })`. Rows are clickable and navigate to `PatientDetailPage`. Table wrapped in `overflow-x-auto` for mobile horizontal scrolling.

### `src/pages/PatientDetailPage.tsx`
Detail view for a single patient, using a tab layout:
- **Overview** — demographics, contact info, audit timestamps
- **Appointments** — table of all appointments for this patient (filtered by `patient_id`)
- **Timeline** — full imaging history via `useTimeline`

Provides "New Appointment" shortcut button that navigates to `/appointments/new?patient_id=:id`.

### `src/pages/PatientFormPage.tsx`
Create / edit patient form (Zod schema with RHF). Detects edit mode via `:id` URL param. On edit, populates form via `form.reset()` once the patient data loads.

**Post-creation appointment prompt (create mode only):** After a successful `POST /patients`, instead of navigating to the patient detail page, a `ConfirmDialog` modal appears asking whether to schedule an appointment for the newly created patient. "Yes, schedule appointment" navigates to `/appointments/new?patientId=<uuid>` with the full `Patient` object passed via React Router state (avoids a `GET /patients/:id` call that would 403 for radiologists due to HIPAA scoping). "No, go to patients" navigates to `/patients`. Edit mode post-save behavior is unchanged.

### `src/pages/AppointmentsPage.tsx`
Paginated list of all appointments with four client-side or server-side filters. Filter bar uses `grid grid-cols-2` on mobile (stacks into 2-column grid). Table wrapped in `overflow-x-auto`. All `SelectTrigger` widths are `w-full md:w-[200px]` for responsive sizing.
- **Status** — server-side (`status` param passed to the API)
- **Modality** — client-side (backend ignores this param)
- **Patient** — client-side, dropdown populated from unique patients in the loaded dataset
- **Radiologist** — client-side, dropdown populated from unique radiologists in the loaded dataset


Patient and radiologist names are resolved by issuing individual `useQueries` for each unique ID found in the appointments list. All four filters are combined in a `filteredAppointments` memo.

### `src/pages/AppointmentFormPage.tsx`
Create / edit appointment form. Two-section layout:
1. **Patient & Clinical Info** — patient (locked to display in edit mode or when pre-filled via query param), modality, study description, referring physician (optional, `Controller`-based `Select` for reliable value binding), clinical indication
2. **Radiologist & Time Slot** — date picker triggers a fresh call to `/api/v1/schedule/available-slots?date=...&modality=...`. Available slots are rendered as clickable cards. `modalityForSlots` initialises to `'XR'` (matches form default) so the first date pick always produces exactly one query.

On 409 (slot taken), clears the selected slot and refetches. Supports pre-filling the patient via URL query string — accepts both `?patient_id=<uuid>` (used by `PatientDetailPage`) and `?patientId=<uuid>` (used by `PatientFormPage` post-creation flow). When a `patientId` is present:
- The patient field is locked (read-only disabled input showing the patient name), same as edit mode.
- Patient data is read from React Router's `location.state.patient` if available (passed by `PatientFormPage`), falling back to a `usePatient(id)` fetch for the `PatientDetailPage` flow.
- The patient is merged into the dropdown options via a `patientOptions` memo, so it appears even if the radiologist's normal scoped patient list doesn't include them.
- `patient_id` is set in the form's `defaultValues` from the query param.

### `src/pages/AppointmentDetailPage.tsx`
Read-only detail view for one appointment. Resolves patient, referring physician, and assigned radiologist names via individual queries. Shows linked radiology reports. Provides status transition buttons (only available transitions per `statusTransitions` util are shown); transitions require a confirmation dialog. Radiologists who receive a 403 are silently redirected back to the list.

### `src/pages/ReportsPage.tsx`
List of radiology reports with two client-side filters (status and patient). Fetches all reports with `limit: 1000`, then resolves unique appointment IDs via `useQueries` to build an appointment map, and from those extracts unique patient IDs for a second batch of `useQueries`. Both lookup maps are memoised. The **status filter** dropdown filters by `report.status` client-side. The **patient filter** dropdown is populated with patients that appear in the loaded reports and filters via the `report → appointment → patient_id` chain. Each row is rendered by a `ReportRow` sub-component that independently fetches and resolves appointment → patient and radiologist names. Draft reports are highlighted with a yellow background. Filter bar uses `grid grid-cols-2` on mobile.

### `src/pages/ReportFormPage.tsx`
Create a new radiology report. Requires `?appointment_id=` query param. Displays appointment context (patient, modality, date) above the findings/impression rich-text editors (`RichTextEditor`). Auto-assigns `radiologist_id` to the currently logged-in user.

### `src/pages/ReportDetailPage.tsx`
Full report viewer and editor. Features:
- Inline edit mode — findings and impression use `RichTextEditor` (with `reportId` prop so images are uploaded immediately to the backend)
- Report images panel via `ReportImageManager`
- Radiologist re-assignment dropdown (admin/radiologist only)
- Finalize (`PATCH .../finalize`) with confirmation dialog; on success, checks `email_notification_sent` — if `false`, shows a destructive warning toast indicating the email could not be delivered
- Amend — creates a new `draft` report linked via `parent_report_id`
- Superseded banner — when a report has `status === 'amended'`, a yellow warning banner is shown. If `amended_by_report_id` is set, a "View Amendment" button navigates to the child report that superseded it.
- Version history badge and parent report reference
- Read-only view uses `useResolvedHtml` to display embedded images fetched with auth as `blob:` URLs

### `src/pages/TimelinePage.tsx`
Chronological imaging timeline for a patient (`:patientId` URL param). Each entry is a `Card` showing modality badge, study description, appointment status badge, date, and — if available — the report impression and finalized date.

### `src/pages/ScheduleManagementPage.tsx`
Admin-only. Manages recurring radiologist schedule templates (not appointments). A form creates new templates (radiologist, day of week, start/end time, slot duration, optional modality). The table can be filtered by radiologist (filter stacks vertically on mobile). Table wrapped in `overflow-x-auto`. Templates can be deleted with a confirmation dialog.

### `src/pages/ForbiddenPage.tsx`
Static 403 error page with a "Go to Dashboard" button. Rendered for role violations.

---

## Components — `src/components/`

### Layout

**`src/components/layout/AppShell.tsx`**
Full-height layout wrapper with responsive sidebar behaviour. Uses `useState` for `sidebarOpen` to manage a mobile drawer. On mobile (`< md`), the sidebar is a fixed slide-in drawer (hidden off-screen by default via `-translate-x-full`, slides in with `translate-x-0` on a 200 ms CSS transition). A semi-transparent overlay (`bg-black/50`) appears behind it and closes the sidebar on tap. On desktop (`md:`), the sidebar is `relative` and always visible. Main content area uses reduced padding on mobile (`p-3 md:p-6`). Passes `onNavigate` to Sidebar and `onMenuToggle` to TopBar.

**`src/components/layout/Sidebar.tsx`**
Left navigation. Renders nav items filtered by the current user's role (e.g., "Schedules" is admin-only, "Reports" is admin/radiologist). Active route highlighted. Uses `useLocation` for path matching. All nav labels are translated via `t('nav.*')`. Accepts an `onNavigate` prop called on every `<Link>` click — used to close the mobile drawer after navigation.

**`src/components/layout/TopBar.tsx`**
Top header bar. Displays the logged-in user's name (hidden on `< sm` screens via `hidden sm:inline`) and a colour-coded role badge. Includes a hamburger `<Menu>` button (`md:hidden`) that calls `onMenuToggle` to open the mobile sidebar. A `LanguageSwitcher` component is rendered for switching between English and Spanish. A dropdown menu exposes a logout action. Responsive padding (`px-3 md:px-6`) and gaps (`gap-2 md:gap-4`).

### Shared

**`src/components/shared/RoleGuard.tsx`**
Route wrapper that reads `user.role` from `authStore` and either renders children or redirects to `/403` (configurable via `redirectTo` prop).

**`src/components/shared/StatusBadge.tsx`**
Renders a coloured `Badge` for either `AppointmentStatus` or `ReportStatus`. Controlled by `type` prop. Status labels are translated via `t()` using a `STATUS_KEYS` lookup object. Colour map:
- appointment: scheduled=blue, completed=green, canceled=gray, no_show=orange
- report: draft=yellow, final=green, amended=purple

**`src/components/shared/ModalityBadge.tsx`**
Renders a coloured `Badge` for a `Modality` value. Colour map: XR=cyan, CT=indigo, US=teal, MRI=violet, MAMMO=pink.

**`src/components/shared/AuditTimestamp.tsx`**
Displays a formatted "Created: ..." or "Updated: ..." timestamp (labels translated via `t('audit.*')`). Shows UTC ISO string in the `title` tooltip.

**`src/components/shared/ConfirmDialog.tsx`**
Generic modal confirmation dialog with configurable title, message, confirm/cancel labels, action callback, `destructive` variant, and loading state. Cancel and processing labels are translated via `t('common.*')`.

**`src/components/shared/ErrorAlert.tsx`**
Renders a destructive `Alert` with an icon, optional title (default translated via `t('common.error')`), and message string.

**`src/components/shared/LoadingSpinner.tsx`**
Centered spinner with optional text label. Three sizes: `sm`, `md` (default), `lg`.

**`src/components/shared/RichTextEditor.tsx`**
Tiptap-based rich text editor used for report findings and impression fields.

Props:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialValue` | `string` | `''` | Initial HTML. Changing this prop after mount does **not** reset the editor — use `key` to remount. |
| `onChange` | `(html: string) => void` | — | Called on every content change with the current HTML. |
| `placeholder` | `string` | `'Start typing…'` | Placeholder text. |
| `readOnly` | `boolean` | `false` | Disables editing and hides the toolbar. |
| `reportId` | `string` | — | If provided, images are uploaded to the backend immediately (`POST /api/v1/reports/:id/images`). Otherwise images are embedded as base64 data URIs. |
| `minHeight` | `string` | `'180px'` | CSS min-height for the editor area. |

Supported image formats: JPEG, PNG, GIF, WebP, DICOM (max 10 MB). Images can be inserted via toolbar button, paste from clipboard, or drag-and-drop onto the editor. When `reportId` is set, images are uploaded to the backend, a `blob:` URL is created locally for immediate display, and `registerBlobMapping` is called so `restoreApiImageSrcs` can convert the blob URL back to the stable API path before saving.

Tiptap extensions used: `StarterKit` (without blockquote, code, codeBlock, horizontalRule), `ImageExtension` (inline=false, allowBase64=true), `TextAlign` (heading + paragraph), `Placeholder`.

Toolbar controls: undo/redo, paragraph/heading selector (H1–H3), bold, italic, text-align (left/center/right/justify), insert image.

**`src/components/shared/ReportImageManager.tsx`**
Image CRUD panel rendered inside `ReportDetailPage`. Displays all images attached to a report in a thumbnail grid and provides upload (drag-and-drop / file picker) and delete capabilities.

Props:
| Prop | Type | Description |
|------|------|-------------|
| `reportId` | `string` | Report to manage images for. |
| `reportStatus` | `ReportStatus` | Controls editability — only `draft` / `amended` allow mutations. |
| `reportRadiologistId` | `string` | Used for ownership check. |
| `currentUserId` | `string` | The logged-in user's ID. |
| `currentUserRole` | `UserRole` | Used together with `reportRadiologistId` to determine `canManageImages`. |

Business rules: `canManageImages = isEditableStatus && (admin || (radiologist && owns the report))`. When the user cannot manage images, the upload zone is hidden. Uses `useReportImages`, `useUploadReportImage`, `useDeleteReportImage`, `useReportImageBlob` hooks internally. DICOM files show a file icon (no thumbnail). Raster image thumbnails are fetched via `useReportImageBlob`. Delete requires a `ConfirmDialog`. All labels and error messages are translated via `t('images.*')`.

**`src/components/shared/LanguageSwitcher.tsx`**
Dropdown language picker using a Globe icon trigger (`lucide-react`). Lists supported languages (English, Español). Calls `i18n.changeLanguage(code)` on selection. Current language is highlighted in bold. Rendered in `TopBar` and on `LoginPage`.

### UI — `src/components/ui/`
shadcn/ui primitives: `alert`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `table`, `tabs`, `textarea`, `toast`, `toaster`. These are **not** to be modified directly; customise via Tailwind classes at the usage site.

---

## Utilities — `src/utils/`

### `src/utils/statusTransitions.ts`
Logic for appointment status state machine. Imports `i18next` directly (not a React hook) because this is a pure utility module.
- `getAvailableStatusTransitions(current)` — returns valid next states. `scheduled` → `[completed, canceled, no_show]`; terminal states return `[]`.
- `getStatusTransitionLabel(status)` — translated button labels via `i18next.t('appointments.markCompleted')`, etc.
- `canTransitionStatus(status)` — boolean shorthand.

### `src/utils/roleGuard.ts`
Pure role-check helpers (no React):
- `hasRole(role, allowedRoles)`
- `canAccessReports(role)` → admin, radiologist
- `canEditReport(role)` → admin, radiologist
- `canFinalizeReport(role)` → admin, radiologist
- `canDeletePatient(role)` → admin only

### `src/utils/resolveReportImages.ts`
Utilities for translating between backend API image paths and ephemeral `blob:` URLs. Used by `RichTextEditor` and `useResolvedHtml` to safely display authenticated images.

- `resolveApiImageSrcs(html)` — scans HTML for `/api/v1/reports/.../images/...` src patterns, fetches each with the user's Bearer token (via `apiClient`), creates a `blob:` URL, and replaces the path in the HTML. Already-cached paths are returned immediately from an in-memory `blobCache` map. Failures are silently ignored (image appears broken rather than crashing the render).
- `registerBlobMapping(apiPath, blobUrl)` — registers a known API-path ↔ blob-URL pair into both the forward and reverse caches. Call this after uploading an image so `restoreApiImageSrcs` can later map it back.
- `restoreApiImageSrcs(html)` — before saving HTML back to the backend, replaces any ephemeral `blob:` URLs we created with their original `/api/v1/...` paths. New images added as base64 data URIs during the current edit session are left as-is (the backend handles extraction).

Both caches (`blobCache` and `reverseMap`) are module-level `Map` instances — they persist for the lifetime of the browser session.

---

## Lib — `src/lib/`

### `src/lib/utils.ts`
Single export: `cn(...inputs)` — merges Tailwind class strings using `clsx` + `tailwind-merge`. Used throughout for conditional className composition.

---

## Internationalization (i18n) — `src/i18n/`

The entire UI supports English and Spanish via i18next.

### `src/i18n/index.ts`
Configures i18next with `LanguageDetector` (detection order: `localStorage` → `navigator`) and `react-i18next`. Fallback language: `'en'`. Supported languages: `['en', 'es']`. Translations are bundled statically (imported JSON, no lazy loading).

### `src/i18n/en.json` / `src/i18n/es.json`
~250+ translation keys each, organised into flat namespaces within a single `translation` namespace:
- `common` — Save, Cancel, Edit, Delete, Loading, Error, etc.
- `auth` — Login, Logout, email/password labels
- `nav` — Sidebar navigation items (Dashboard, Patients, Appointments, Reports, Schedules)
- `dashboard` — Dashboard title, welcome message, stat labels, action buttons
- `patients` — Patient list/detail/form labels, search placeholder, table headers, post-creation appointment prompt
- `appointments` — Appointment list/detail/form labels, status labels, filter placeholders
- `reports` — Report list/detail/form labels, status labels, finalize/amend actions
- `schedule` — Schedule management labels, day-of-week names, form fields
- `timeline` — Timeline page labels
- `forbidden` — 403 error page text
- `images` — Image upload/delete labels, error messages (unsupported type, too large)
- `audit` — Created/Updated timestamp labels
- `modalities` — Modality display names (X-Ray, CT Scan, etc.)
- `editor` — Rich text editor toolbar labels
- `language` — Language names (English, Español)

**Usage pattern:** In React components, `const { t } = useTranslation()` then `t('namespace.key')`. In pure utility modules (e.g., `statusTransitions.ts`), import `i18next` directly and call `i18next.t()`.

---

## Deployment — `vercel.json`

SPA rewrite configuration for Vercel:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
All requests are routed to `/index.html` so React Router handles client-side routing. Without this, page refreshes on any route other than `/` would return a Vercel 404.

---

## Key Patterns & Conventions

1. **All data fetching goes through hooks** — pages never import from `src/api/` directly (the sole exception is `RichTextEditor`, which calls `reportsApi.uploadImage` and `reportsApi.getImageBlob` directly for immediate editor feedback).
2. **Forms use React Hook Form + Zod** — schema defined per-page, `zodResolver` wired into `useForm`. For `Select` components that need to reflect async `form.reset()` values, use `<Controller>` instead of `form.watch()`.
3. **Role enforcement is dual-layered** — `<RoleGuard>` at the route level and `canEdit*` utils for inline UI control.
4. **Cache invalidation** — mutations invalidate the minimum necessary query keys. Appointment mutations also invalidate `['dashboard']`. Report mutations also invalidate `['timeline']`. Create/update appointment mutations additionally call `refetchQueries` to force an immediate re-fetch.
5. **Available slots cache** — `staleTime: 0` + `gcTime: 0` so slot data is always fetched fresh from the backend.
6. **Rich text fields** — findings and impression are stored as HTML. `RichTextEditor` handles authoring; `useResolvedHtml` handles authenticated image display in read-only views; `restoreApiImageSrcs` is called before `PUT /reports/:id` to convert blob URLs back to stable API paths.
7. **Internationalization** — every user-visible string in every page, layout component, and shared component is rendered through `t()` translation calls. The `LanguageSwitcher` component (Globe icon dropdown in the top bar) allows runtime language switching without page reload. Language preference is persisted to `localStorage`.
8. **Mobile responsiveness** — the app is fully responsive down to ~320 px viewport width:
   - **Sidebar** — hidden off-screen on mobile, slides in as a fixed drawer with overlay backdrop when toggled via the hamburger menu button in the top bar.
   - **Page headers** — use `flex-col sm:flex-row` for stacking on small screens; titles use `text-2xl sm:text-3xl`.
   - **Tables** — all data tables are wrapped in `overflow-x-auto` containers for horizontal scrolling on narrow viewports.
   - **Filter bars** — use `grid grid-cols-2` on mobile; select widths are `w-full md:w-[200px]`.
   - **Dashboard grid** — `grid-cols-2 lg:grid-cols-4` for stat cards.
   - **Content padding** — `p-3 md:p-6` throughout.
9. **Backend quirks to be aware of:**
   - `GET /appointments` ignores `modality` query param → filter client-side.
   - `GET /schedule/available-slots` already returns only free slots — no client-side availability filtering needed.
   - `AvailableSlot.slot_duration_minutes` is present in the TypeScript type but the backend does not return it — compute from `end - start` if needed.
   - `/api/v1/dashboard/stats` may return 404 if not implemented — the UI degrades gracefully (polling stops, no error shown).
   - The timeline API uses `date_from`/`date_to` query params (not `from_date`/`to_date`). The modality filter is sent as a comma-separated string.
   - Several list endpoints (`/users`, `/physicians`, `/schedule`) may return either a flat array or a paginated `{ items, total }` object — the API layer handles both shapes.

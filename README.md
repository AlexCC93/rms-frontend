# RMS-lite Frontend

Radiology Management System (RMS-lite) - Frontend Application

A modern, clinical-grade web application for managing radiology operations, built with React 18, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: React 18 with TypeScript (strict mode)
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand (global) + React Query (server state)
- **UI Components**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios with interceptors
- **Date Handling**: date-fns
- **Testing**: Vitest + React Testing Library

## Features

### Authentication & Authorization
- Secure JWT-based authentication
- Automatic token refresh
- Role-based access control (Admin, Radiologist, Staff)
- Session management with localStorage persistence

### Patient Management
- Create, read, update, and soft-delete patients
- Search and filter capabilities with debounced search
- Patient demographic information
- Patient timeline and appointment history

### Appointment Management
- Schedule and manage radiology appointments
- Support for multiple modalities (XR, CT, US, MRI, MAMMO)
- Status transitions (scheduled → completed/canceled/no_show)
- Conflict detection for overlapping appointments

### Report Management (Admin & Radiologist only)
- Create and edit draft reports
- Finalize reports (immutable after finalization)
- Report versioning and amendments
- Full audit trail with timestamps

### Dashboard
- Real-time statistics for today's appointments
- Status breakdown (scheduled, completed, canceled, no-show)
- Draft reports requiring attention
- Auto-refresh every 60 seconds

### Clinical Design Principles
- **Zero Ambiguity**: Clear status indicators and confirmation dialogs for all destructive actions
- **No Optimistic UI**: All changes wait for server confirmation
- **Specific Error Messages**: Surface detailed error messages from backend RFC 7807 responses
- **Audit Trail**: All entities show creation and update timestamps
- **High Contrast**: Clean, clinical aesthetic optimized for medical environments

## Prerequisites

- Node.js 18+ and npm
- Backend API server running (default: http://localhost:8000)

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rms-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your backend API URL if different from default

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build

Create a production build:

```bash
npm run build
```

The build output will be in the `dist` directory.

## Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Testing

Run tests:

```bash
npm test
```

## Project Structure

```
src/
├── api/                  # API client and endpoint modules
│   ├── client.ts        # Axios instance with interceptors
│   ├── auth.ts          # Authentication endpoints
│   ├── patients.ts      # Patient endpoints
│   ├── appointments.ts  # Appointment endpoints
│   ├── reports.ts       # Report endpoints
│   └── timeline.ts      # Timeline endpoints
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── layout/          # Layout components (AppShell, Sidebar, TopBar)
│   └── shared/          # Shared components (badges, dialogs, etc.)
├── hooks/               # React Query hooks and custom hooks
├── pages/               # Page components
├── router/              # Route definitions and guards
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── main.tsx            # Application entry point
```

## User Roles & Permissions

### Admin
- Full access to all features
- Can manage all resources
- Can access reports

### Radiologist
- Can access all features except user management
- Can create, edit, and finalize reports
- Can manage patients and appointments

### Staff
- Can manage patients and appointments
- Cannot access reports
- Limited to operational tasks

## Key Features by Page

### Login Page
- Email/password authentication
- Input validation with inline error messages
- Automatic redirect to dashboard on success

### Dashboard
- Today's appointment statistics
- Recent draft reports
- Quick action buttons
- Auto-refresh every 60 seconds

### Patients Page
- Searchable patient list (300ms debounce)
- Create/edit patient forms with validation
- Soft delete with confirmation
- Visual indicators for inactive patients

### Patient Detail Page
- Full demographic information
- Tabbed interface for appointments and timeline
- Inline editing capability
- Quick appointment creation

### Appointments Page
- Filter by status and modality
- Comprehensive appointment list
- Create appointments with conflict detection
- Link to patient details

### Appointment Detail Page
- Full appointment information
- Status transition buttons (when applicable)
- Linked report display
- Create report button (for radiologists)

### Reports Page
- Filter by status (draft/final/amended)
- Visual highlighting for draft reports
- Report versioning information

### Report Detail Page
- View/edit findings and impressions
- Finalize reports (with confirmation)
- Create amendments for finalized reports
- Version history navigation

### Timeline Page
- Chronological imaging history
- Collapsible report impressions
- Filter by modality and date range

## Development Guidelines

### Component Patterns
- Use functional components with hooks
- Implement proper loading and error states
- Follow shadcn/ui patterns for consistency

### State Management
- Local UI state: `useState`
- Global app state: Zustand
- Server state: React Query
- Form state: React Hook Form

### Error Handling
- Always catch and display errors
- Use toast notifications for user feedback
- Extract error messages from RFC 7807 responses
- Never show raw error codes to users

### Validation
- Client-side validation with Zod schemas
- Match backend validation rules
- Show field-specific error messages
- Prevent invalid submissions

## API Integration

All API calls use the centralized Axios client (`src/api/client.ts`) with:
- Automatic JWT token attachment
- Token refresh on 401 responses
- Request/response interceptors
- Type-safe API functions

## Styling

- Tailwind CSS utility classes
- shadcn/ui component library
- Consistent color palette for clinical contexts
- Responsive design (desktop-first)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ required
- No IE11 support

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]

## Support

For issues or questions, please contact [your contact info]

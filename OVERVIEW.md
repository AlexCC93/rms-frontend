# RMS-lite — Radiology Management System

## What is RMS-lite?

RMS-lite is a modern web application designed to streamline the day-to-day operations of a radiology department. It provides a centralized platform where staff can manage patients, schedule imaging appointments, and handle radiology reports — all from a single, intuitive interface accessible through any modern web browser.

The system is built with clinical environments in mind. Every design decision prioritizes clarity, safety, and auditability — the qualities that matter most when handling medical data.

---

## Who is it for?

RMS-lite supports three user roles, each with tailored access to the features they need:

- **Administrators** have full control over the system. They can manage all patients, appointments, reports, and radiologist schedules. They also have access to system-wide configuration.

- **Radiologists** can manage patients and appointments, and have full access to the reporting workflow — creating, editing, finalizing, and amending radiology reports.

- **Staff members** handle the operational side: registering patients, scheduling appointments, and coordinating the flow of work. They do not have access to radiology reports, keeping clinical documentation appropriately restricted.

---

## Core Features

### Patient Management

Register and maintain patient records including demographics, contact information, and clinical notes. Patients can be searched instantly with a live search bar. Each patient has a dedicated profile page showing their full appointment history and imaging timeline. Records can be soft-deleted when no longer active, preserving data integrity for audit purposes.

After creating a new patient, the system prompts the user with the option to immediately schedule an appointment for that patient. This streamlines the common workflow where a radiologist registers a patient and needs to book their first imaging study — all without leaving the current flow or requiring an administrator to intervene.

### Appointment Scheduling

Schedule radiology appointments across five imaging modalities: X-Ray, CT, US, MRI, and Mammography. The system integrates with radiologist availability schedules — when creating an appointment, it shows only the time slots that are actually free, preventing double-bookings. Appointments follow a clear status lifecycle: once scheduled, they can be marked as completed, canceled, or no-show.

When navigating to the appointment form from the post-patient-creation prompt or from a patient's detail page, the patient is automatically pre-selected and locked, so the user can proceed directly to choosing a modality and time slot.

### Radiologist Schedule Management

Administrators can define recurring weekly availability templates for each radiologist, specifying working hours, slot duration, and optionally restricting templates to specific modalities. These templates feed directly into the appointment scheduling workflow, ensuring that only genuinely available time slots are offered.

### Radiology Reports

Radiologists create reports tied to completed appointments. Each report includes clinical findings and an impression, authored using a rich text editor that supports formatted text and embedded images. Reports follow a controlled lifecycle:

1. **Draft** — The report can be freely edited. Images can be attached, and content can be revised as many times as needed.
2. **Final** — Once finalized, the report is locked and cannot be changed. This ensures the integrity of the clinical record.
3. **Amended** — If corrections are needed after finalization, the system supports a formal amendment process. A new draft is created that references the original, and the original report is permanently preserved and marked as superseded. Users can navigate between the original and its amendment in both directions.

Every report tracks its version number and maintains a full audit trail of creation and modification timestamps.

### Imaging Timeline

Each patient has a chronological imaging timeline that brings together all their appointments, modalities, and report impressions in one view. This gives clinicians a quick, at-a-glance history of a patient's radiology studies — filterable by modality and date range.

### Dashboard

The home screen provides a real-time operational snapshot: today's appointment counts broken down by status, monthly metrics, and a list of draft reports awaiting finalization. The dashboard refreshes automatically every 60 seconds, so it always reflects the current state of operations.

---

## Filtering and Search

The system provides practical tools to find information quickly:

- **Patients** can be searched by name with instant, type-ahead results.
- **Appointments** can be filtered by status, modality, patient, and radiologist — all combinable.
- **Reports** can be filtered by status (draft, final, amended) and by patient.

All filters update results immediately without page reloads.

---

## Safety and Clinical Design

RMS-lite is designed around principles that are essential in a clinical setting:

- **No ambiguity.** Every status is clearly indicated with color-coded badges. Destructive or irreversible actions (deleting a patient, finalizing a report, creating an amendment) always require explicit confirmation through a dialog.

- **No optimistic updates.** The interface never shows a change as successful until the server confirms it. This prevents situations where a user believes an action was completed when it actually failed.

- **Clear error messages.** When something goes wrong, the system surfaces specific, human-readable error messages — never raw technical codes.

- **Full audit trail.** Every record displays when it was created and last updated, providing traceability for compliance and quality assurance.

- **Report integrity.** Finalized reports are immutable. Amendments create a new version while permanently preserving the original, ensuring a complete and tamper-proof clinical record.

---

## Multilingual Support

The entire interface is available in both English and Spanish. Users can switch languages at any time using the language selector in the top navigation bar — or even before logging in on the login screen. The preference is remembered across sessions.

---

## Access and Deployment

RMS-lite is a web application that runs in any modern browser (Chrome, Firefox, Safari, Edge) — no software installation is required on user machines. It connects to a backend API server that handles data storage, authentication, and business logic.

Authentication uses secure token-based sessions. Users log in with their email and password, and the system manages session tokens automatically, including transparent token refresh so users are not interrupted during their work.

---

## At a Glance

| Capability | Details |
|---|---|
| Patient records | Create, search, edit, soft-delete |
| Imaging modalities | X-Ray, CT, Ultrasound, MRI, Mammography |
| Appointment scheduling | Integrated with radiologist availability; conflict detection |
| Report workflow | Draft → Final → Amendment, with full version history |
| Image support | Attach and embed clinical images in reports |
| User roles | Admin, Radiologist, Staff — with appropriate access control |
| Languages | English, Spanish |
| Dashboard | Real-time stats with auto-refresh |
| Audit trail | Creation and update timestamps on all records |
| Browser support | Chrome, Firefox, Safari, Edge |

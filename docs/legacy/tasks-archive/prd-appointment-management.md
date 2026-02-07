# PRD: Appointment Management

## Overview
Core appointment management system enabling users to create, view, edit, and delete appointments with overlap detection, multiple view options, and role-based access for Admin, Single, and Team users.

## Problem Statement
Users need a reliable way to manage their schedules, avoid double-booking, and visualize appointments across different time ranges. Teams need shared visibility while maintaining individual control.

## Goals
- Enable full CRUD operations for appointments
- Prevent scheduling conflicts with smart overlap detection
- Provide flexible viewing options (List, Calendar, Drag & Drop)
- Support Admin, Single User, and Team User roles

## Non-Goals (Out of Scope)
- AI/ML-based conflict resolution (Phase 2)
- External calendar integration (separate PRD)
- Reminders and notifications (separate PRD)
- Recurring appointments (Phase 2)

---

## User Stories

### [US-001] Project Setup and Database Schema
**As a** developer
**I want** the project initialized with the tech stack and database schema
**So that** I can build features on a solid foundation

**Acceptance Criteria:**
- [ ] Node.js/Express backend initialized with TypeScript
- [ ] React.js frontend initialized with Material-UI and TypeScript
- [ ] PostgreSQL database connection configured
- [ ] Appointments table created with: id, title, description, start_time, end_time, timezone, user_id, created_at, updated_at
- [ ] Users table created with: id, email, name, role (admin/single/team), team_id, created_at
- [ ] Teams table created with: id, name, created_at
- [ ] Database migrations setup

**Technical Notes:**
- Use UTC for all timestamp storage
- Use ISO 8601 format for API responses
- Set up ESLint and Prettier

---

### [US-002] Create Appointment API Endpoint
**As a** user
**I want** to create a new appointment via API
**So that** I can add events to my schedule

**Acceptance Criteria:**
- [ ] POST /api/appointments endpoint created
- [ ] Validates required fields: title, start_time, end_time
- [ ] Stores times in UTC
- [ ] Returns created appointment with 201 status
- [ ] Returns validation errors with 400 status

**Technical Notes:**
- Use express-validator for input validation
- Dependency: US-001

---

### [US-003] Read Appointments API Endpoints
**As a** user
**I want** to retrieve my appointments via API
**So that** I can view my schedule

**Acceptance Criteria:**
- [ ] GET /api/appointments returns user's appointments
- [ ] GET /api/appointments/:id returns single appointment
- [ ] Supports date range filtering (?start=&end=)
- [ ] Returns 404 for non-existent appointments
- [ ] Respects user ownership (users only see their own)

**Technical Notes:**
- Pagination support for list endpoint
- Dependency: US-001

---

### [US-004] Update Appointment API Endpoint
**As a** user
**I want** to update an existing appointment via API
**So that** I can modify my schedule

**Acceptance Criteria:**
- [ ] PUT /api/appointments/:id endpoint created
- [ ] Validates ownership before update
- [ ] Partial updates supported (PATCH semantics)
- [ ] Returns updated appointment with 200 status
- [ ] Returns 404 for non-existent appointments
- [ ] Returns 403 for unauthorized access

**Technical Notes:**
- Dependency: US-002, US-003

---

### [US-005] Delete Appointment API Endpoint
**As a** user
**I want** to delete an appointment via API
**So that** I can remove events from my schedule

**Acceptance Criteria:**
- [ ] DELETE /api/appointments/:id endpoint created
- [ ] Validates ownership before deletion
- [ ] Returns 204 on successful deletion
- [ ] Returns 404 for non-existent appointments
- [ ] Returns 403 for unauthorized access

**Technical Notes:**
- Soft delete vs hard delete decision (recommend soft delete)
- Dependency: US-002

---

### [US-006] Overlap Detection Service
**As a** user
**I want** to be warned about scheduling conflicts
**So that** I don't accidentally double-book

**Acceptance Criteria:**
- [ ] Service detects overlapping appointments for same user
- [ ] Returns list of conflicting appointments
- [ ] Integrated into create/update endpoints
- [ ] API returns overlap warnings in response
- [ ] Blocked by default, but accepts ?force=true to override

**Technical Notes:**
- Check: new_start < existing_end AND new_end > existing_start
- Dependency: US-002, US-004

---

### [US-007] Appointment Form Component
**As a** user
**I want** a form to create/edit appointments
**So that** I can manage my schedule through the UI

**Acceptance Criteria:**
- [ ] Form with fields: title, description, start date/time, end date/time, timezone
- [ ] Date/time pickers using Material-UI
- [ ] Form validation with error messages
- [ ] Submit creates new appointment via API
- [ ] Loading state during submission

**Technical Notes:**
- Use react-hook-form for form management
- Dependency: US-002

---

### [US-008] Overlap Warning Dialog
**As a** user
**I want** to see a warning when my appointment overlaps with existing ones
**So that** I can decide whether to proceed or modify

**Acceptance Criteria:**
- [ ] Dialog displays when overlap detected
- [ ] Shows list of conflicting appointments
- [ ] "Cancel" button returns to form
- [ ] "Create Anyway" button forces creation
- [ ] Clear visual warning styling

**Technical Notes:**
- Material-UI Dialog component
- Dependency: US-006, US-007

---

### [US-009] Appointments List View
**As a** user
**I want** to see my appointments in a list
**So that** I can quickly scan my schedule

**Acceptance Criteria:**
- [ ] List displays appointments sorted by date
- [ ] Shows title, date, time for each appointment
- [ ] Click opens appointment details
- [ ] Delete button with confirmation
- [ ] Empty state when no appointments

**Technical Notes:**
- Material-UI List/Table component
- Dependency: US-003

---

### [US-010] Appointment Detail View
**As a** user
**I want** to view full details of an appointment
**So that** I can see all information

**Acceptance Criteria:**
- [ ] Displays all appointment fields
- [ ] Edit button navigates to edit form
- [ ] Delete button with confirmation dialog
- [ ] Back navigation to list view

**Technical Notes:**
- Material-UI Card or Paper component
- Dependency: US-003, US-007

---

### [US-011] Calendar View Component
**As a** user
**I want** to see my appointments in a calendar view
**So that** I can visualize my schedule over time

**Acceptance Criteria:**
- [ ] Monthly calendar grid view
- [ ] Appointments displayed on their dates
- [ ] Navigation between months
- [ ] Click on date shows appointments for that day
- [ ] Click on appointment opens detail view

**Technical Notes:**
- Consider FullCalendar library or build custom with Material-UI
- Dependency: US-003

---

### [US-012] Calendar Week and Day Views
**As a** user
**I want** week and day views in the calendar
**So that** I can see detailed time slots

**Acceptance Criteria:**
- [ ] Week view shows 7-day grid with time slots
- [ ] Day view shows single day with time slots
- [ ] Toggle between Month/Week/Day views
- [ ] Appointments positioned by time
- [ ] Time slot visual indicators

**Technical Notes:**
- Dependency: US-011

---

### [US-013] Drag and Drop Rescheduling
**As a** user
**I want** to drag appointments to reschedule them
**So that** I can quickly adjust my schedule

**Acceptance Criteria:**
- [ ] Drag appointment to new date in calendar
- [ ] Drag to new time slot in week/day view
- [ ] Visual feedback during drag
- [ ] Confirmation or immediate save option
- [ ] Overlap warning if conflict detected

**Technical Notes:**
- Use react-beautiful-dnd or native drag API
- Dependency: US-011, US-012, US-006

---

### [US-014] View Toggle Navigation
**As a** user
**I want** to switch between List and Calendar views
**So that** I can choose my preferred visualization

**Acceptance Criteria:**
- [ ] Toggle buttons for List/Calendar views
- [ ] Persists view preference in local storage
- [ ] Smooth transition between views
- [ ] URL reflects current view (/appointments/list, /appointments/calendar)

**Technical Notes:**
- React Router for view routing
- Dependency: US-009, US-011

---

### [US-015] User Role - Admin Access
**As an** admin
**I want** to view and manage all users' appointments
**So that** I can oversee the entire organization

**Acceptance Criteria:**
- [ ] Admin can view all appointments across users
- [ ] Filter by user in list/calendar views
- [ ] Admin can edit/delete any appointment
- [ ] Role check middleware on API endpoints

**Technical Notes:**
- Dependency: US-003, US-004, US-005

---

### [US-016] User Role - Team Visibility
**As a** team user
**I want** to see my team members' appointments
**So that** I can coordinate schedules

**Acceptance Criteria:**
- [ ] Team members see each other's appointments (read-only)
- [ ] Visual distinction between own and team appointments
- [ ] Can only edit/delete own appointments
- [ ] Team filter in views

**Technical Notes:**
- Dependency: US-003, US-015

---

### [US-017] Timezone Display and Selection
**As a** user
**I want** to view appointments in my local timezone
**So that** times are meaningful to me

**Acceptance Criteria:**
- [ ] User can set preferred timezone in settings
- [ ] Appointments display in user's timezone
- [ ] Timezone selector in appointment form
- [ ] Clear timezone indicator on appointments

**Technical Notes:**
- Use date-fns-tz or luxon for timezone handling
- Store in UTC, display in local
- Dependency: US-007, US-009, US-011

---

## Technical Requirements

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/appointments | Create appointment |
| GET | /api/appointments | List appointments (with filters) |
| GET | /api/appointments/:id | Get single appointment |
| PUT | /api/appointments/:id | Update appointment |
| DELETE | /api/appointments/:id | Delete appointment |
| GET | /api/appointments/check-overlap | Check for conflicts |

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'single', 'team')),
  team_id UUID REFERENCES teams(id),
  timezone VARCHAR(100) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_end_time ON appointments(end_time);
```

## UI/UX Requirements
- Responsive design for desktop and mobile
- Material-UI theming with light/dark mode support
- Loading skeletons during data fetch
- Toast notifications for success/error states
- Keyboard navigation support

## Testing Requirements
- Unit tests for overlap detection logic
- API endpoint integration tests
- React component tests with React Testing Library
- E2E tests for critical flows (create, edit, delete appointment)

## Success Metrics
- Users can create appointments in < 30 seconds
- Zero double-bookings without explicit override
- < 2 second page load time

## Timeline
- **Phase 1 (Core CRUD)**: US-001 through US-010
- **Phase 2 (Calendar Views)**: US-011 through US-014
- **Phase 3 (Roles & Timezone)**: US-015 through US-017

# IntelliPlan - Entwickler-Dokumentation

Diese Dokumentation richtet sich an Entwickler, die an IntelliPlan arbeiten möchten.

## 🏗️ Projekt-Architektur

### Übersicht

IntelliPlan folgt einer klassischen Client-Server-Architektur mit klarer Trennung zwischen Frontend und Backend.

```
┌─────────────────┐
│                 │
│   Frontend      │  React + TypeScript
│   (Port 5173)   │  Material-UI, FullCalendar
│                 │
└────────┬────────┘
         │
         │ HTTP/REST API
         │
┌────────▼────────┐
│                 │
│   Backend       │  Node.js + Express
│   (Port 3000)   │  TypeScript
│                 │
└────────┬────────┘
         │
         │ SQL
         │
┌────────▼────────┐
│                 │
│   PostgreSQL    │  Relationale Datenbank
│   (Port 5432)   │  UTC Timestamps
│                 │
└─────────────────┘
```

### Backend-Struktur

```
backend/
├── src/
│   ├── app.ts                 # Express App-Konfiguration
│   ├── index.ts               # Server Entry Point
│   ├── config/
│   │   ├── database.ts        # PostgreSQL Pool
│   │   └── migrate.ts         # Migration Runner
│   ├── controllers/           # Request Handler
│   │   ├── appointmentController.ts
│   │   ├── authController.ts
│   │   ├── projectController.ts
│   │   ├── resourceController.ts
│   │   └── taskController.ts
│   ├── middleware/            # Express Middleware
│   │   ├── errorHandler.ts   # Globaler Error Handler
│   │   └── roleMiddleware.ts # Authorization (geplant)
│   ├── models/                # TypeScript Interfaces & DTOs
│   │   ├── appointment.ts
│   │   ├── project.ts
│   │   ├── resource.ts
│   │   ├── task.ts
│   │   └── user.ts
│   ├── routes/                # Route Definitionen
│   │   ├── appointments.ts
│   │   ├── auth.ts (geplant)
│   │   ├── projects.ts
│   │   ├── resources.ts
│   │   ├── tasks.ts
│   │   └── index.ts
│   ├── services/              # Business Logic
│   │   ├── activityService.ts
│   │   ├── aiConflictService.ts
│   │   ├── appointmentService.ts
│   │   ├── authService.ts (geplant)
│   │   ├── emailService.ts (geplant)
│   │   ├── projectService.ts
│   │   ├── resourceService.ts
│   │   ├── taskService.ts
│   │   └── userService.ts
│   ├── scripts/
│   │   └── seedUser.ts        # Test-User erstellen
│   └── validators/            # express-validator Schemas
│       ├── appointmentValidator.ts
│       ├── authValidator.ts (geplant)
│       ├── projectValidator.ts
│       └── resourceValidator.ts
└── migrations/                # SQL Migrationen (sequenziell nummeriert)
    ├── 000_enable_pgcrypto.sql
    ├── 001_create_teams.sql
    ├── 002_create_users.sql
    ├── 003_create_appointments.sql
    ├── 004_create_projects.sql
    ├── 005_create_tasks.sql
    ├── 006_create_task_dependencies.sql
    ├── 007_create_task_work_slots.sql
    ├── 008_create_project_activity.sql
    ├── 009_add_task_work_slots_all_day.sql
    ├── 010_add_tasks_resource_label.sql
    ├── 011_create_resources.sql
    ├── 012_add_tasks_resource_id.sql
    ├── 013_add_users_password_hash.sql
    └── 014_add_user_auth_tokens.sql
```

### Frontend-Struktur

```
frontend/
├── src/
│   ├── main.tsx               # Entry Point
│   ├── App.tsx                # Root Component
│   ├── components/            # Wiederverwendbare Komponenten
│   ├── pages/                 # Seiten/Views
│   ├── services/              # API Client
│   ├── hooks/                 # Custom React Hooks
│   ├── types/                 # TypeScript Types
│   ├── theme/                 # MUI Theme
│   └── assets/                # Bilder, Icons
└── public/                    # Statische Assets
```

## 🔧 Entwicklungs-Setup

### Lokale Umgebung

1. **Node.js & npm installieren** (Version 18+)
2. **PostgreSQL installieren** oder Docker verwenden
3. **Repository klonen und Abhängigkeiten installieren** (siehe [README.md](README.md#installation))

### Umgebungsvariablen

#### Backend `.env`

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=intelliplan
DB_USER=postgres
DB_PASSWORD=postgres

# JWT (geplant)
# JWT_SECRET=your-secret-key
# JWT_EXPIRES_IN=7d
```

#### Frontend `.env`

```env
VITE_API_URL=http://localhost:3000/api
# VITE_USER_ID=<optional: für Entwicklung ohne Auth>
```

### Datenbank-Migrationen

Migrationen werden sequenziell nummeriert und in der Reihenfolge ausgeführt:

```bash
cd backend
npm run migrate
```

**Neue Migration erstellen:**

1. Erstelle Datei `migrations/NNN_beschreibung.sql` (NNN = nächste Nummer)
2. Verwende immer `IF NOT EXISTS` für CREATE-Statements
3. Führe Migration aus: `npm run migrate`

**Beispiel:**

```sql
-- migrations/015_add_users_email_verified.sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_email_verified
ON users(email_verified);
```

### Scripts

#### Backend

```bash
npm run dev          # Start Development Server (nodemon)
npm run build        # TypeScript Kompilierung
npm start            # Start Production Server
npm run migrate      # Datenbank-Migrationen ausführen
npm run seed:user    # Test-User erstellen
npm run lint         # ESLint ausführen
npm run typecheck    # TypeScript Type Checking
```

#### Frontend

```bash
npm run dev          # Start Vite Dev Server
npm run build        # Production Build
npm run preview      # Preview Production Build
npm run lint         # ESLint ausführen
npm run typecheck    # TypeScript Type Checking
```

## 📐 Codebase Patterns

Diese Patterns wurden während der Entwicklung entdeckt und sollten konsistent angewendet werden.

### Datenbank-Patterns

1. **UTC Timestamps**: Alle Zeitstempel in UTC speichern

   ```typescript
   const result = await pool.query(
     "INSERT INTO appointments (start_time, end_time) VALUES ($1, $2)",
     [new Date(startTime), new Date(endTime)],
   );
   ```

2. **ISO 8601 Return**: Zeitstempel als ISO 8601 zurückgeben

   ```typescript
   startTime: row.start_time.toISOString();
   ```

3. **snake_case in DB, camelCase in API**:

   ```typescript
   // Database
   (start_time, end_time, user_id);

   // API / TypeScript
   (startTime, endTime, userId);
   ```

4. **Response Mapper verwenden**:

   ```typescript
   export function toAppointmentResponse(row: any): Appointment {
     return {
       id: row.id,
       title: row.title,
       startTime: row.start_time.toISOString(),
       endTime: row.end_time.toISOString(),
       // ... weitere Mappings
     };
   }
   ```

5. **IF NOT EXISTS für Migrationen**:
   ```sql
   CREATE TABLE IF NOT EXISTS appointments (...);
   CREATE INDEX IF NOT EXISTS idx_name ON table(column);
   ```

### TypeScript Patterns

1. **Strikte Types verwenden**:

   ```typescript
   // DTOs definieren
   export interface CreateAppointmentDTO {
     title: string;
     startTime: string; // ISO 8601
     endTime: string;
   }
   ```

2. **Type Guards für Arrays**:

   ```typescript
   const userId = Array.isArray(req.headers["x-user-id"])
     ? req.headers["x-user-id"][0]
     : req.headers["x-user-id"];
   ```

3. **Typed Request Params**:
   ```typescript
   const id = req.params.id as string;
   ```

### Validation Patterns

1. **express-validator für Input Validation**:

   ```typescript
   export const createAppointmentValidator = [
     body("title").isString().notEmpty().trim(),
     body("startTime").isISO8601(),
     body("endTime").isISO8601(),
   ];
   ```

2. **Validation in Controller prüfen**:
   ```typescript
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
     return res.status(400).json({ errors: errors.array() });
   }
   ```

### Service Layer Patterns

1. **Business Logic in Services**:

   ```typescript
   // appointmentService.ts
   export async function createAppointment(
     userId: string,
     data: CreateAppointmentDTO,
   ): Promise<Appointment> {
     // Business logic here
   }
   ```

2. **Error Handling mit Custom Errors**:
   ```typescript
   if (!appointment) {
     throw new Error("Appointment not found");
   }
   ```

### Controller Patterns

1. **Try-Catch mit Error Handler**:

   ```typescript
   export const create = async (
     req: Request,
     res: Response,
     next: NextFunction,
   ) => {
     try {
       // Controller logic
     } catch (error) {
       next(error); // Global error handler
     }
   };
   ```

2. **Ownership Checks vor Updates/Deletes**:
   ```typescript
   const owner = await appointmentService.getAppointmentOwner(id);
   if (owner !== userId) {
     return res.status(403).json({ error: "Forbidden" });
   }
   ```

### AI Service Patterns

1. **Konflikt-Pattern Erkennung**:

   ```typescript
   function identifyConflictPattern(
     requested: TimeRange,
     conflict: TimeRange,
   ): ConflictPattern {
     // Analyse der Überschneidung
   }
   ```

2. **Confidence Scoring**:

   ```typescript
   function calculateConfidence(suggestion: Suggestion): number {
     let confidence = 0.5; // Basis-Confidence
     // Faktoren addieren/subtrahieren
     return Math.min(1, Math.max(0, confidence));
   }
   ```

3. **Historical Learning Storage**:
   ```typescript
   // .beads/conflict_learnings.json
   {
     "patterns": ["overlap-end", "fully-contained"],
     "successfulSuggestions": ["move_earlier", "reschedule"],
     "lastUpdated": "2026-01-21T..."
   }
   ```

## 🧪 Testing

### Manuelles Testing

**AI Conflict Service testen:**

```bash
cd backend
TEST_USER_ID=<your-uuid> node test_ai_conflict.js
```

### Unit Tests

```bash
cd backend
npm test                # Alle Tests (Vitest)
npm run test:watch      # Watch Mode
npm run test:coverage   # Coverage Report
```

**Test-Dateien:**
- `src/services/__tests__/authService.test.ts` — bcrypt, JWT, token blacklist
- `src/services/__tests__/aiConflictService.test.ts` — AI-Strategien, Conflict Patterns
- `src/services/__tests__/appointmentService.test.ts` — CRUD, Overlap, Pagination
- `src/services/__tests__/taskService.test.ts` — Tasks, Dependencies, Scheduling
- `src/validators/__tests__/appointmentValidator.test.ts` — Input Validation

**Vitest Config:** `backend/vitest.config.ts` (setzt `JWT_SECRET` für Test-Isolation)

### Integration Tests

```bash
cd backend
npm test                # Läuft auch Integration Tests mit
```

- `src/routes/__tests__/auth.integration.test.ts` — Auth Endpoints via Supertest

## 🐛 Debugging

### Backend Debugging

1. **Console Logs aktivieren**:

   ```typescript
   console.log("[DEBUG]", variable);
   ```

2. **VS Code Debugger**: Siehe `.vscode/launch.json` (geplant)

3. **PostgreSQL Queries loggen**:
   ```typescript
   // In database.ts
   pool.on("query", (query) => {
     console.log("[SQL]", query);
   });
   ```

### Frontend Debugging

1. **Browser DevTools**: Console, Network, React DevTools
2. **Vite HMR**: Hot Module Replacement für schnelles Feedback

### Häufige Probleme

**"Appointment creation fails":**

- Prüfe ob Test-User existiert: `npm run seed:user`
- Prüfe `x-user-id` Header im Frontend

**"Database connection failed":**

- Prüfe ob PostgreSQL läuft: `docker ps` oder `psql -U postgres`
- Prüfe `.env` Credentials

**"Migration fails":**

- Prüfe ob vorherige Migrationen erfolgreich waren
- Manuelle Prüfung: `psql -U postgres -d intelliplan -c "\dt"`

## 📦 Dependencies

### Backend

- **express**: Web Framework
- **pg**: PostgreSQL Client
- **express-validator**: Input Validation
- **date-fns**: Date Utilities
- **date-fns-tz**: Timezone Support

### Frontend

- **react**: UI Library
- **@mui/material**: Material-UI Components
- **@fullcalendar/react**: Kalender-Komponente
- **date-fns**: Date Utilities
- **axios**: HTTP Client

## 🔄 Git Workflow

### Branch Strategy

- `main`: Production-ready Code
- `feature/*`: Feature Branches
- `hotfix/*`: Bugfixes

### Commit Messages

Wir folgen [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add reverse planning endpoint
fix: Resolve timezone conversion bug
docs: Update DEVELOPMENT.md
refactor: Extract conflict detection logic
test: Add unit tests for AI service
```

### Pull Requests

1. Feature Branch erstellen
2. Implementierung + Tests
3. PR öffnen mit Beschreibung
4. Code Review
5. Merge in `main`

## 📝 Code Style

### TypeScript

- **Semicolons**: Ja
- **Quotes**: Single quotes
- **Indentation**: 2 Spaces
- **Trailing Commas**: Ja

### ESLint

```bash
npm run lint        # Prüfen
npm run lint --fix  # Auto-Fix
```

## 🚀 Deployment (geplant)

### Backend

- **Hosting**: Heroku / AWS / Azure
- **Database**: PostgreSQL (managed)
- **Environment**: Production `.env` mit Secrets

### Frontend

- **Hosting**: Vercel / Netlify / AWS S3 + CloudFront
- **Build**: `npm run build`
- **Environment**: `VITE_API_URL` auf Production-Backend setzen

## 📚 Weitere Ressourcen

- [README.md](README.md): Hauptdokumentation für End-User
- [AGENTS.md](AGENTS.md): Agent Instructions
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md): Implementierungs-Zusammenfassung
- [tasks/](tasks/): PRD-Dokumente für Features

---

**Viel Erfolg beim Entwickeln!** 🚀

Bei Fragen oder Problemen: [GitHub Issues](https://github.com/McMuff86/IntelliPlan/issues)

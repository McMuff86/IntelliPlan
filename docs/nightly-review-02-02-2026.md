# IntelliPlan – Nightly Review 02.02.2026

## 📊 Projekt-Status

### Code-Metriken
| Metrik | Wert |
|--------|------|
| Backend TS Files | 79 |
| Frontend TS/TSX Files | 70 |
| Test Files | 8 |
| DB Migrations | 25 |
| Dependencies (Backend) | 12 |
| PRD User Stories | 17/17 ✅ alle done |
| progress.txt | 971 Zeilen |

### Abgeschlossene PRD-Runden
- **Task Planning** (US-TP-001 bis US-TP-012) – Projekte, Tasks, Work Slots, Dependencies, Timeline
- **Beads Integration** (US-015) – Memory Management für Agent-Loop
- **AI Conflict Resolution** (US-016) – 5 Strategien für Terminoptimierung
- **Reverse Planning** (US-017) – Rückwärtsplanung von Deadlines
- **Auth + DSGVO** (US-018) – Basis-Authentifizierung, Datenschutz
- **Marketing Hook** (US-019) – Demo-Seite, PDF-Export

### Tech Stack Ist-Zustand
- **Frontend:** React 18 + TypeScript + Material-UI + FullCalendar + Vite
- **Backend:** Express + TypeScript + PostgreSQL (pg) + Pino Logger
- **Auth:** bcryptjs + jsonwebtoken (JWT)
- **Sicherheit:** helmet, cors, express-rate-limit, express-validator
- **Email:** nodemailer (konfiguriert aber noch nicht produktiv)
- **DB:** PostgreSQL via Docker, 25 Migrationen
- **Dev Tools:** Vitest, ESLint

---

## 🔍 Analyse: Stärken

1. **Solide Basis** – Saubere Architektur (Controller → Service → DB), TypeScript durchgängig
2. **Alle 17 Stories done** – Sehr guter Fortschritt für ein Side-Project
3. **AI Features** – Conflict Resolution mit 5 Strategien ist ein Differenzierungsmerkmal
4. **Branchen-Templates** – Schreinerei-spezifisch, Alleinstellungsmerkmal
5. **Docker-Setup** – Backend + Frontend + DB + Mailpit alles containerisiert
6. **Reverse Planning** – Rückwärtsplanung ist ein starkes Feature für Handwerker
7. **Marketing-ready** – Demo-Seite mit PDF-Export ist clever für ersten Cashflow

---

## ⚠️ Analyse: Schwächen & Lücken

### Kritisch (vor Beta-Release)
1. **Auth ist Basis** – JWT+bcrypt vorhanden, aber OAuth (Google/Microsoft) fehlt
2. **Nur 8 Tests** – Für 79 Backend-Files viel zu wenig. Test-Coverage schätze ~10%
3. **Kein CI/CD** – Keine GitHub Actions, keine automatisierten Checks
4. **Keine Input-Sanitization Audit** – express-validator ist da, aber wie konsistent?
5. **Keine API-Dokumentation** – Kein Swagger/OpenAPI

### Wichtig (vor Launch)
6. **Keine Echtzeit-Sync** – Kein WebSocket für Multi-User Updates
7. **Kalender-Sync fehlt** – ICS/Google/Outlook Import nicht implementiert
8. **Reminders Backend** – Templates/Scheduling Backend da, aber Push-Delivery fehlt
9. **Mobile UX** – Responsive theoretisch, aber nicht getestet/optimiert
10. **Performance** – Keine Paginierung bei Listen-Endpoints sichtbar

### Nice-to-have
11. **Dark Mode** – Explizit als Out-of-Scope markiert, aber für SaaS wichtig
12. **i18n** – DE/EN Strings im Code gemischt
13. **Rate Limiting** – Vorhanden aber in Dev deaktiviert (README commit)
14. **Error Tracking** – Pino Logger da, aber kein Sentry/ähnliches

---

## 📋 Empfohlene nächste Schritte (priorisiert)

### Phase A: Stabilisierung (vor Beta-Einladungen)
1. **Tests schreiben** – Mindestens Service-Layer Tests für alle kritischen Pfade
2. **GitHub Actions CI** – Lint + Typecheck + Tests bei jedem Push
3. **API-Dokumentation** – Swagger/OpenAPI generieren
4. **Input-Validation Audit** – Alle Endpoints prüfen

### Phase B: Feature-Komplettierung
5. **OAuth Integration** – Google + Microsoft Login
6. **Kalender-Sync** – ICS Import, Google Calendar bidirektional
7. **Reminder Delivery** – Email + Push Notifications
8. **Paginierung** – Alle Listen-Endpoints

### Phase C: Launch-Vorbereitung
9. **Landing Page** – Eigenständig, nicht in der App
10. **Pricing** – Stripe/Payment Integration
11. **Hosting** – Railway/Render/Fly.io Setup
12. **Analytics** – Plausible/PostHog für Usage Tracking

### Phase D: Differenzierung
13. **Voice Agent Integration** – OpenClaw Voice Agent als Telefon-Interface
14. **Rhino/Grasshopper Plugin** – CAD → IntelliPlan Brücke
15. **Multi-Tenant** – Team/Firma-Support

---

## 🔗 Querverbindungen

### → OpenClaw Voice Agent
- IntelliPlan REST-API als Tool-Calling Target
- Projekte/Tasks/Termine per Sprache abrufen
- "Was steht morgen an?" → GET /api/appointments?date=tomorrow

### → Qwen3-TTS
- Voice-Notifications für Erinnerungen
- "Dein Termin in 15 Minuten" per TTS generiert

### → Sentinel (OpenClaw)
- Heartbeat-Check: IntelliPlan Health-Endpoint überwachen
- Automatische Erinnerungen via Telegram

---

*Erstellt: 02.02.2026, 03:45 – Sentinel Nacht-Session*

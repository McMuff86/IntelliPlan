# IntelliPlan Setup für Work-PC

## Quick Start (ca. 10 Minuten)

### 1. Repository klonen
```bash
git clone https://github.com/McMuff86/IntelliPlan.git
cd IntelliPlan
```

### 2. Docker starten (PostgreSQL + Mailpit)
```bash
docker compose up -d
```

Warte kurz, bis die Container laufen:
```bash
docker ps
# Sollte zeigen: intelliplan-postgres und intelliplan-mailpit
```

### 3. Backend Setup

```bash
cd backend
npm install
```

**Wichtig**: `.env` Datei erstellen (aus `.env.example` kopieren):
```bash
cp .env.example .env
```

**WICHTIG**: In `backend/.env` folgende Zeile ändern:
```bash
EMAIL_VERIFY_BYPASS=true   # Auf TRUE setzen für Entwicklung!
```

**JWT_SECRET setzen** (wichtig!):
```bash
# In .env das JWT_SECRET ersetzen mit einem echten Secret
JWT_SECRET=dein-geheimer-schlüssel-hier
```

Migrationen ausführen:
```bash
npm run migrate
```

Test-User erstellen (optional):
```bash
SEED_USER_EMAIL=test@test.com SEED_USER_PASSWORD=TestPassword123! npm run seed:user
```

Email verifizieren (wenn EMAIL_VERIFY_BYPASS=false):
```bash
docker exec intelliplan-postgres psql -U postgres -d intelliplan -c "UPDATE users SET email_verified_at = NOW() WHERE email = 'test@test.com';"
```

Backend starten:
```bash
npm run dev
```

Backend läuft jetzt auf: **http://localhost:3000**

### 4. Frontend Setup (neues Terminal)

```bash
cd frontend
npm install
```

**Frontend `.env` erstellen** (wenn noch nicht vorhanden):
```bash
# frontend/.env
VITE_API_URL=http://localhost:3000/api
```

Frontend starten:
```bash
npm run dev
```

Frontend läuft jetzt auf: **http://localhost:5173**

### 5. Login

Öffne http://localhost:5173

**Option 1**: Mit deinem bestehenden Account (aus Home-PC):
- Email: `mcmuff.ai@proton.me`
- Password: [dein Passwort]

**Option 2**: Neuen Test-User erstellen:
- Email: `test@test.com`
- Password: `TestPassword123!`
- (Nur wenn du Schritt 3 gemacht hast)

**Option 3**: Neuen Account registrieren (wenn EMAIL_VERIFY_BYPASS=true)
- Klicke auf "Register"
- Du bekommst sofort einen Token (keine Email-Verifikation nötig)

---

## Troubleshooting

### "Email not verified" Fehler
```bash
docker exec intelliplan-postgres psql -U postgres -d intelliplan -c "UPDATE users SET email_verified_at = NOW() WHERE email = 'deine@email.com';"
```

### "Failed to load project calendar"
```bash
cd backend
npm run migrate  # Migrationen nachholen
```

### Datenbank zurücksetzen (wenn nötig)
```bash
docker compose down -v  # Löscht auch Volumes (ACHTUNG: alle Daten weg!)
docker compose up -d
cd backend
npm run migrate
```

### Projekte/Daten von Home-PC übertragen

Die Datenbank ist lokal in Docker. Um Daten vom Home-PC zu übertragen:

**Option 1**: Datenbank-Dump (auf Home-PC):
```bash
docker exec intelliplan-postgres pg_dump -U postgres intelliplan > intelliplan_backup.sql
```

**Auf Work-PC wiederherstellen**:
```bash
docker exec -i intelliplan-postgres psql -U postgres intelliplan < intelliplan_backup.sql
```

**Option 2**: Einfach neu anlegen (für Entwicklung meist einfacher)

---

## Ports

- Frontend: **5173**
- Backend: **3000**
- PostgreSQL: **5432**
- Mailpit UI: **8025** (http://localhost:8025)

## URLs

- App: http://localhost:5173
- API: http://localhost:3000/api
- Mailpit (Email-Vorschau): http://localhost:8025

---

## Authentifizierung

Das Projekt nutzt jetzt **AuthContext** (Wave 1 Implementation):
- JWT-basierte Authentifizierung
- Protected Routes (redirect zu /auth wenn nicht eingeloggt)
- Auto-Login bei Page-Refresh
- Sichere Token-Verwaltung

---

## Entwicklung

**Backend** (Port 3000):
```bash
cd backend
npm run dev  # Auto-reload bei Änderungen
```

**Frontend** (Port 5173):
```bash
cd frontend
npm run dev  # Hot-reload bei Änderungen
```

**Tests**:
```bash
cd backend
node test_auth_wave1.js  # Auth Wave 1 Tests
node test_ai_conflict.js  # Conflict Resolution Tests
```

---

**Viel Erfolg! 🚀**

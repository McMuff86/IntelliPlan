# IntelliPlan

**Intelligente Terminplanung und Projektmanagement für Schweizer Schreinereien**

IntelliPlan ist eine moderne Web-Anwendung zur effizienten Planung und Verwaltung von Terminen, Aufgaben und Projekten. Mit KI-gestützten Features hilft IntelliPlan Schreinereien und anderen Handwerksbetrieben, Zeit zu sparen und Konflikte automatisch zu lösen.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-beta-yellow.svg)

## ✨ Features

### 🗓️ Terminverwaltung

- **Vollständiges CRUD**: Erstellen, Bearbeiten, Löschen von Terminen
- **Konflikt-Erkennung**: Automatische Erkennung von überschneidenden Terminen
- **Kalender-Ansichten**: Liste und Kalender mit Drag & Drop
- **Zeitzone-Unterstützung**: UTC-Speicherung, ISO 8601 Format
- **Externe Integration**: ICS-Import, Outlook/Google OAuth (geplant)

### 📊 Projekt- und Aufgabenplanung

- **Projektbasierte Organisation**: Gruppierung von Aufgaben in Projekten
- **Abhängigkeiten**: Modellierung von Task-Dependencies
- **Manuelle Zeitblöcke**: Flexible Zuweisung von Arbeitszeiten
- **Reverse Planning**: Rückwärtsplanung von Endterminen (geplant)
- **Ressourcenverwaltung**: Verwaltung von Maschinen, Werkzeugen und Personal

### 🤖 KI-gestützte Features

- **Automatische Konfliktlösung**: 5 intelligente Strategien zur Terminoptimierung
  - 🔄 Umplanen: Nächster verfügbarer Zeitslot
  - ✂️ Aufteilen: Termin um Konflikte herum splitten
  - ⏱️ Kürzen: Dauer reduzieren für verfügbare Zeit
  - 🔁 Tauschen: Mit Terminen niedrigerer Priorität tauschen
  - ⏪ Vorziehen: Vor dem Konflikt einplanen
- **Business Hours Awareness**: Berücksichtigung von Arbeitszeiten (8-17 Uhr, Mo-Fr)
- **Historisches Lernen**: Speicherung von Konfliktmustern für bessere Vorschläge
- **Schreinerei-spezifische Logik**: Erkennung von Planungs- vs. Produktionsaufgaben

### 🔒 Sicherheit & Compliance

- **Authentifizierung**: Sichere Benutzeranmeldung (in Entwicklung)
- **DSGVO-konform**: Datenschutz nach Schweizer/EU-Standards (in Entwicklung)
- **Verschlüsselung**: Sichere Speicherung sensibler Daten

## 🚀 Quick Start

### Voraussetzungen

- **Node.js** 18+ und npm
- **PostgreSQL** 14+
- **Docker** (optional, für lokale Entwicklung empfohlen)

### Installation

1. **Repository klonen**

```bash
git clone https://github.com/McMuff86/IntelliPlan.git
cd IntelliPlan
```

2. **Abhängigkeiten installieren**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Datenbank einrichten**

Mit Docker (empfohlen):

```bash
# Im Projekt-Root
docker compose up -d
```

Oder manuelle PostgreSQL-Installation mit folgenden Einstellungen:

- Host: `localhost`
- Port: `5432`
- Datenbank: `intelliplan`
- Benutzer: `postgres`
- Passwort: `postgres`

4. **Umgebungsvariablen konfigurieren**

Backend `.env` erstellen (von `.env.example`):

```bash
cd backend
cp .env.example .env
# Passwort in .env anpassen
```

Frontend `.env` erstellen (von `.env.example`):

```bash
cd ../frontend
cp .env.example .env
```

5. **Datenbank-Migrationen ausführen**

```bash
cd backend
npm run migrate
```

6. **Test-Benutzer erstellen** (für Entwicklung)

```bash
npm run seed:user
```

Notiere dir die angezeigte `User ID` und setze sie im Frontend:

```bash
# Im Browser-Console
localStorage.setItem('userId', '<PASTE_USER_ID>');
```

7. **Anwendung starten**

**Windows (PowerShell):**

```powershell
.\start-dev.ps1
```

**macOS/Linux:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

8. **Browser öffnen**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 💻 Tech Stack

### Frontend

- **React** 18 mit TypeScript
- **Vite** als Build-Tool
- **Material-UI** (MUI) für responsive UI
- **FullCalendar** für Kalenderansichten
- **date-fns** für Datums-Operationen

### Backend

- **Node.js** mit Express
- **TypeScript** für Type Safety
- **PostgreSQL** für relationale Daten
- **node-postgres** (pg) als Datenbank-Client

### AI/ML

- **Regelbasiertes System** für Konfliktlösung (aktuell)
- **TensorFlow.js** / **Hugging Face** (geplant für ML-Integration)

### DevOps

- **Docker** für lokale Entwicklung
- **ESLint** für Code-Qualität
- **Git** für Versionskontrolle

## 📚 Dokumentation

- **[AGENTS.md](AGENTS.md)**: Entwickler-Referenz und Ralph-Pattern
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: Entwickler-Setup und Codebase-Patterns
- **[scripts/ralph/README.md](scripts/ralph/README.md)**: Ralph Autonomous Agent Loop
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**: Implementierungs-Zusammenfassung
- **[CASHFLOW_PLAN.md](CASHFLOW_PLAN.md)**: Business-Agent Briefing für ersten Cashflow

## 🛣️ Roadmap

### ✅ Abgeschlossen

- [x] Terminverwaltung (CRUD)
- [x] Projekt- und Aufgabenplanung
- [x] Ressourcenverwaltung
- [x] KI-gestützte Konfliktlösung
- [x] Enhanced Beads Integration für Entwickler-Workflow

### 🔄 In Arbeit

- [ ] **US-017**: Reverse-Planning Feature
- [ ] **US-018**: Authentifizierung & DSGVO Compliance
- [ ] **US-019**: Marketing Demo-Seite
- [ ] **US-TP-011**: Optionale Erinnerungen
- [ ] **US-TP-012**: Arbeitszeitvorlagen

### 📋 Geplant

- [ ] ML-basierte Konfliktlösung (statt regelbasiert)
- [ ] ERP-Integration (Borm/Triviso)
- [ ] Mobile App (iOS/Android)
- [ ] Slack/Teams-Benachrichtigungen
- [ ] Mehrsprachigkeit (DE, FR, IT für Schweiz)
- [ ] Erweiterte Reporting und Analytics

## 💼 Business Model

**Zielmarkt**: Kleine bis mittlere Schweizer Schreinereien

**Pricing**: 50-200 CHF pro Benutzer/Monat

**Value Proposition**:

- ⏱️ **Zeitersparnis**: 20+ Stunden/Woche bei manueller Planung
- 🤖 **KI-Optimierung**: Automatische Terminvorschläge
- 🔒 **DSGVO-konform**: Für CH/EU-Märkte
- 🔗 **ERP-Integration**: Nahtlose Anbindung an bestehende Systeme

**Umsatzziel**: 10-50K CHF/Monat bis Q4 2026

## 🤝 Contributing

Beiträge sind willkommen! Bitte beachte:

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'feat: Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

Mehr Details im [DEVELOPMENT.md](DEVELOPMENT.md).

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

## 👨‍💻 Entwickler

Entwickelt mit ❤️ von **McMuff86**

Kontakt: [GitHub](https://github.com/McMuff86)

## 🙏 Danksagungen

- **Geoffrey Huntley** für das [Ralph Pattern](https://ghuntley.com/ralph/)
- **Amp** für den [AI-gestützten Entwicklungs-Workflow](https://ampcode.com)
- Die Open-Source-Community für die fantastischen Tools und Libraries

---

**Status**: Beta | **Version**: 0.1.0 | **Letzte Aktualisierung**: Januar 2026

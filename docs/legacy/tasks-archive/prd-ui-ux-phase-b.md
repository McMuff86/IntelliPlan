# PRD: Phase B - UI/UX Verbesserungen

## Overview
Verbesserung der Benutzerführung und Navigation in IntelliPlan. Aktuell fehlen grundlegende UI-Elemente wie Header-Navigation, Quick-Actions auf der Home-Seite und eine intuitive Benutzerführung.
Status: Implementiert (Jan 2026)

## Problem Statement
Nutzer können die App nicht bedienen, weil:
- **Keine Navigation**: Der Header zeigt nur das Logo, keine Links zu Seiten
- **Leere Home-Seite**: Nur "Welcome"-Text, keine Funktionen
- **Kein Onboarding**: Neue Nutzer wissen nicht, was sie tun können
- **Keine Übersicht**: Kein Dashboard mit anstehenden Terminen

## Goals
- Intuitive Navigation zu allen App-Bereichen
- Home-Seite als nützliches Dashboard
- Klare visuelle Hierarchie und Benutzerführung
- Responsive Design für alle Gerätegrössen

## Non-Goals (Out of Scope)
- Neue Backend-Funktionalität
- Authentifizierung/Login
- Dark Mode Theme
- Mobile App

## User Stories

### [US-B001] Header Navigation mit Links
**As a** Nutzer
**I want** Navigationslinks im Header
**So that** ich schnell zwischen Seiten wechseln kann

**Acceptance Criteria:**
- [x] Navigation Links im Header: Home, Appointments, Settings
- [x] Aktiver Link ist visuell hervorgehoben
- [x] Responsive: Hamburger-Menü auf kleinen Bildschirmen
- [x] Logo klickbar, führt zu Home

**Technical Notes:**
- Layout.tsx erweitern
- React Router NavLink für aktive States
- Material-UI Drawer für Mobile-Menü

---

### [US-B002] Home Dashboard - Übersicht
**As a** Nutzer
**I want** meine nächsten Termine auf der Home-Seite sehen
**So that** ich sofort weiss, was ansteht

**Acceptance Criteria:**
- [x] Widget "Upcoming Appointments" zeigt nächste 5 Termine
- [x] Termine sind klickbar (navigiert zu Detail-Ansicht)
- [x] Zeigt Datum, Uhrzeit, Titel
- [x] Empty State wenn keine Termine
- [x] "View All" Link zu Appointments-Seite

**Technical Notes:**
- Neuer API-Call oder gefilterte Daten aus useAppointments
- Card-basiertes Layout

---

### [US-B003] Home Dashboard - Quick Actions
**As a** Nutzer
**I want** Quick-Action Buttons auf der Home-Seite
**So that** ich häufige Aktionen schnell ausführen kann

**Acceptance Criteria:**
- [x] Button "New Appointment" prominent platziert
- [x] Button "View Calendar" 
- [x] Button "View List"
- [x] Buttons mit Icons und klarem Text
- [x] Hover-States und visuelle Feedback

**Technical Notes:**
- Material-UI Button/Card components
- React Router navigation

---

### [US-B004] Home Dashboard - Statistik-Karten
**As a** Nutzer
**I want** eine Übersicht meiner Terminstatistik
**So that** ich meine Planung im Blick habe

**Acceptance Criteria:**
- [x] Karte "Today": Anzahl Termine heute
- [x] Karte "This Week": Anzahl Termine diese Woche
- [x] Karte "Total": Gesamtanzahl Termine
- [x] Karten sind klickbar (filter Ansicht)
- [x] Visuelles Design mit Icons

**Technical Notes:**
- Berechnung im Frontend aus vorhandenen Daten
- Grid-Layout für Karten

---

### [US-B005] Footer Verbesserung
**As a** Nutzer
**I want** einen nützlichen Footer
**So that** ich schnell zu wichtigen Links gelange

**Acceptance Criteria:**
- [x] Quick Links: Appointments, Calendar, Settings
- [x] Copyright-Text aktuell
- [x] Responsive Layout
- [x] Visuell abgesetzt vom Content

**Technical Notes:**
- Layout.tsx Footer-Bereich erweitern

---

### [US-B006] Breadcrumb Navigation
**As a** Nutzer
**I want** Breadcrumbs auf Unterseiten
**So that** ich weiss wo ich bin und schnell zurück navigieren kann

**Acceptance Criteria:**
- [x] Breadcrumbs auf: Appointment Detail, Create Appointment, Settings
- [x] Format: Home > Appointments > [Titel]
- [x] Klickbare Links
- [x] Konsistentes Styling

**Technical Notes:**
- Neues Breadcrumb-Component
- Material-UI Breadcrumbs

---

### [US-B007] Empty States mit Call-to-Action
**As a** Nutzer
**I want** hilfreiche Empty States
**So that** ich weiss was ich tun kann wenn keine Daten vorhanden sind

**Acceptance Criteria:**
- [x] Appointments List: "No appointments yet" + Create Button
- [x] Calendar View: "No appointments this month" + Create Button
- [x] Illustration oder Icon für leere Zustände
- [x] Konsistenter Stil

**Technical Notes:**
- EmptyState-Component erstellen
- In AppointmentsList und CalendarView einbinden

---

### [US-B008] Loading States verbessern
**As a** Nutzer
**I want** visuelles Feedback beim Laden
**So that** ich weiss dass die App arbeitet

**Acceptance Criteria:**
- [x] Skeleton Loader für Appointments-Liste
- [x] Skeleton Loader für Calendar
- [x] Spinner für Buttons während Actions
- [x] Konsistentes Loading-Pattern

**Technical Notes:**
- Material-UI Skeleton Component
- Loading states in bestehende Components einbauen

---

### [US-B009] Confirmation Dialogs vereinheitlichen
**As a** Nutzer
**I want** konsistente Bestätigungs-Dialoge
**So that** ich versehentliche Aktionen verhindern kann

**Acceptance Criteria:**
- [x] Delete Confirmation Dialog standardisiert
- [x] Klare Beschreibung was gelöscht wird
- [x] Cancel und Confirm Buttons
- [x] Destructive Actions in Rot

**Technical Notes:**
- Wiederverwendbares ConfirmDialog-Component

---

### [US-B010] Responsive Design Check
**As a** Nutzer
**I want** die App auf allen Gerätengrössen nutzen können
**So that** ich flexibel bin

**Acceptance Criteria:**
- [x] Mobile Breakpoint (< 600px) getestet
- [x] Tablet Breakpoint (600-900px) getestet
- [x] Desktop (> 900px) getestet
- [x] Appointments Form responsive
- [x] Calendar View responsive
- [x] Navigation Mobile-friendly

**Technical Notes:**
- Material-UI Breakpoints nutzen
- useMediaQuery für conditional rendering

---

### [US-B011] Accessibility Verbesserungen
**As a** Nutzer mit Einschränkungen
**I want** die App barrierefrei nutzen
**So that** ich alle Funktionen erreichen kann

**Acceptance Criteria:**
- [x] Alle Buttons haben aria-labels
- [x] Tab-Navigation funktioniert
- [x] Fokus-Styles sichtbar
- [x] Farbkontraste ausreichend (WCAG AA)
- [x] Screen Reader friendly Labels

**Technical Notes:**
- Bestehende Components auditen
- aria-* Attribute ergänzen

---

### [US-B012] Keyboard Shortcuts
**As a** Power User
**I want** Keyboard Shortcuts für häufige Aktionen
**So that** ich schneller arbeiten kann

**Acceptance Criteria:**
- [x] N = New Appointment
- [x] Escape = Dialog schliessen/Abbrechen
- [x] Enter = Bestätigen in Dialogs
- [x] ? = Shortcut-Hilfe anzeigen
- [x] Shortcuts-Hilfe Modal

**Technical Notes:**
- useHotkeys Hook erstellen
- Help Modal Component

---

## Technical Requirements
- Keine neuen Backend-Änderungen nötig
- Alle Änderungen im Frontend
- Material-UI Components nutzen
- React Router für Navigation

## UI/UX Requirements
- Konsistentes Design mit bestehendem Theme
- Smooth Transitions (200-300ms)
- Klare visuelle Hierarchie
- Feedback bei allen User-Aktionen

## Testing Requirements
- Komponenten manuell testen
- Responsive Design in Browser DevTools prüfen
- Keyboard Navigation testen
- Screen Reader testen (optional)

## Success Metrics
- Nutzer können ohne Anleitung navigieren
- Alle Seiten sind innerhalb von 2 Klicks erreichbar
- Keine "tote" Seite ohne Aktionen

## Timeline
- Geschätzter Aufwand: 12 User Stories
- Priorität: High (Appointments, Calendar, Settings), Medium (Statistiken), Low (Shortcuts)

## Priorisierte Reihenfolge
1. US-B001 (Header Navigation) - **Kritisch**
2. US-B002 (Upcoming Appointments)
3. US-B003 (Quick Actions)
4. US-B007 (Empty States)
5. US-B006 (Breadcrumbs)
6. US-B008 (Loading States)
7. US-B004 (Statistik-Karten)
8. US-B005 (Footer)
9. US-B009 (Confirmation Dialogs)
10. US-B010 (Responsive Check)
11. US-B011 (Accessibility)
12. US-B012 (Keyboard Shortcuts)

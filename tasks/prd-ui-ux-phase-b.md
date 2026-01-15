# PRD: Phase B - UI/UX Verbesserungen

## Overview
Verbesserung der Benutzerführung und Navigation in IntelliPlan. Aktuell fehlen grundlegende UI-Elemente wie Header-Navigation, Quick-Actions auf der Home-Seite und eine intuitive Benutzerführung.

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
- [ ] Navigation Links im Header: Home, Appointments, Settings
- [ ] Aktiver Link ist visuell hervorgehoben
- [ ] Responsive: Hamburger-Menü auf kleinen Bildschirmen
- [ ] Logo klickbar, führt zu Home

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
- [ ] Widget "Upcoming Appointments" zeigt nächste 5 Termine
- [ ] Termine sind klickbar (navigiert zu Detail-Ansicht)
- [ ] Zeigt Datum, Uhrzeit, Titel
- [ ] Empty State wenn keine Termine
- [ ] "View All" Link zu Appointments-Seite

**Technical Notes:**
- Neuer API-Call oder gefilterte Daten aus useAppointments
- Card-basiertes Layout

---

### [US-B003] Home Dashboard - Quick Actions
**As a** Nutzer
**I want** Quick-Action Buttons auf der Home-Seite
**So that** ich häufige Aktionen schnell ausführen kann

**Acceptance Criteria:**
- [ ] Button "New Appointment" prominent platziert
- [ ] Button "View Calendar" 
- [ ] Button "View List"
- [ ] Buttons mit Icons und klarem Text
- [ ] Hover-States und visuelle Feedback

**Technical Notes:**
- Material-UI Button/Card components
- React Router navigation

---

### [US-B004] Home Dashboard - Statistik-Karten
**As a** Nutzer
**I want** eine Übersicht meiner Terminstatistik
**So that** ich meine Planung im Blick habe

**Acceptance Criteria:**
- [ ] Karte "Today": Anzahl Termine heute
- [ ] Karte "This Week": Anzahl Termine diese Woche
- [ ] Karte "Total": Gesamtanzahl Termine
- [ ] Karten sind klickbar (filter Ansicht)
- [ ] Visuelles Design mit Icons

**Technical Notes:**
- Berechnung im Frontend aus vorhandenen Daten
- Grid-Layout für Karten

---

### [US-B005] Footer Verbesserung
**As a** Nutzer
**I want** einen nützlichen Footer
**So that** ich schnell zu wichtigen Links gelange

**Acceptance Criteria:**
- [ ] Quick Links: Appointments, Calendar, Settings
- [ ] Copyright-Text aktuell
- [ ] Responsive Layout
- [ ] Visuell abgesetzt vom Content

**Technical Notes:**
- Layout.tsx Footer-Bereich erweitern

---

### [US-B006] Breadcrumb Navigation
**As a** Nutzer
**I want** Breadcrumbs auf Unterseiten
**So that** ich weiss wo ich bin und schnell zurück navigieren kann

**Acceptance Criteria:**
- [ ] Breadcrumbs auf: Appointment Detail, Create Appointment, Settings
- [ ] Format: Home > Appointments > [Titel]
- [ ] Klickbare Links
- [ ] Konsistentes Styling

**Technical Notes:**
- Neues Breadcrumb-Component
- Material-UI Breadcrumbs

---

### [US-B007] Empty States mit Call-to-Action
**As a** Nutzer
**I want** hilfreiche Empty States
**So that** ich weiss was ich tun kann wenn keine Daten vorhanden sind

**Acceptance Criteria:**
- [ ] Appointments List: "No appointments yet" + Create Button
- [ ] Calendar View: "No appointments this month" + Create Button
- [ ] Illustration oder Icon für leere Zustände
- [ ] Konsistenter Stil

**Technical Notes:**
- EmptyState-Component erstellen
- In AppointmentsList und CalendarView einbinden

---

### [US-B008] Loading States verbessern
**As a** Nutzer
**I want** visuelles Feedback beim Laden
**So that** ich weiss dass die App arbeitet

**Acceptance Criteria:**
- [ ] Skeleton Loader für Appointments-Liste
- [ ] Skeleton Loader für Calendar
- [ ] Spinner für Buttons während Actions
- [ ] Konsistentes Loading-Pattern

**Technical Notes:**
- Material-UI Skeleton Component
- Loading states in bestehende Components einbauen

---

### [US-B009] Confirmation Dialogs vereinheitlichen
**As a** Nutzer
**I want** konsistente Bestätigungs-Dialoge
**So that** ich versehentliche Aktionen verhindern kann

**Acceptance Criteria:**
- [ ] Delete Confirmation Dialog standardisiert
- [ ] Klare Beschreibung was gelöscht wird
- [ ] Cancel und Confirm Buttons
- [ ] Destructive Actions in Rot

**Technical Notes:**
- Wiederverwendbares ConfirmDialog-Component

---

### [US-B010] Responsive Design Check
**As a** Nutzer
**I want** die App auf allen Gerätengrössen nutzen können
**So that** ich flexibel bin

**Acceptance Criteria:**
- [ ] Mobile Breakpoint (< 600px) getestet
- [ ] Tablet Breakpoint (600-900px) getestet
- [ ] Desktop (> 900px) getestet
- [ ] Appointments Form responsive
- [ ] Calendar View responsive
- [ ] Navigation Mobile-friendly

**Technical Notes:**
- Material-UI Breakpoints nutzen
- useMediaQuery für conditional rendering

---

### [US-B011] Accessibility Verbesserungen
**As a** Nutzer mit Einschränkungen
**I want** die App barrierefrei nutzen
**So that** ich alle Funktionen erreichen kann

**Acceptance Criteria:**
- [ ] Alle Buttons haben aria-labels
- [ ] Tab-Navigation funktioniert
- [ ] Fokus-Styles sichtbar
- [ ] Farbkontraste ausreichend (WCAG AA)
- [ ] Screen Reader friendly Labels

**Technical Notes:**
- Bestehende Components auditen
- aria-* Attribute ergänzen

---

### [US-B012] Keyboard Shortcuts
**As a** Power User
**I want** Keyboard Shortcuts für häufige Aktionen
**So that** ich schneller arbeiten kann

**Acceptance Criteria:**
- [ ] N = New Appointment
- [ ] Escape = Dialog schliessen/Abbrechen
- [ ] Enter = Bestätigen in Dialogs
- [ ] ? = Shortcut-Hilfe anzeigen
- [ ] Shortcuts-Hilfe Modal

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

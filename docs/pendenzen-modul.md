# Feature: Pendenzen-Modul

> **Status:** Draft  
> **Version:** 0.1.0  
> **Erstellt:** 2026-02-04  
> **Autor:** Adi  

---

## Übersicht

Das Pendenzen-Modul ermöglicht die Erfassung, Verwaltung und Nachverfolgung von Aufgaben innerhalb eines Projekts. Es ist für den Einsatz auf Baustellen optimiert (Tablet/Mobile) und unterstützt Offline-Funktionalität.

### Ziele

- Ersetzen von Excel-basierten Pendenzenlisten
- Echtzeit-Synchronisation zwischen Büro und Baustelle
- Offline-Fähigkeit für Bereiche ohne Mobilempfang (Keller, Tiefgarage)
- Klare Verantwortlichkeiten und Statusverfolgung
- Skalierbare Struktur für spätere Erweiterungen (Standorte, Bauteile, Anhänge)

### Benutzerrollen

| Rolle | Beschreibung |
|-------|--------------|
| **Monteur** | Erfasst und bearbeitet Pendenzen vor Ort |
| **Projektleiter** | Verwaltet alle Pendenzen im Projekt, weist zu, priorisiert |
| **Admin** | Vollzugriff auf alle Projekte und Einstellungen |

---

## Datenmodell

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Projekt   │       │   Pendenz   │       │  Benutzer   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ projekt_id  │       │ id (PK)     │
│ nummer      │       │ id (PK)     │──────►│ name        │
│ name        │       │ nr          │       │ email       │
│ status      │       │ beschreibung│       │ rolle       │
│ erstellt_am │       │ bereich     │       │ telefon     │
└─────────────┘       │ prioritaet  │       └─────────────┘
                      │ status      │
                      │ faellig_bis │
                      │ erledigt_am │
                      │ bemerkungen │
                      │ auftrags_nr │
                      │ verantwortlich_id (FK)
                      │ erfasst_von_id (FK)
                      │ erstellt_am │
                      │ aktualisiert_am │
                      └─────────────┘
```

### Tabellen

#### `projekte`

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Eindeutige ID |
| `nummer` | VARCHAR(50) | NOT NULL, UNIQUE | Projektnummer (z.B. "25.0591") |
| `name` | VARCHAR(255) | NOT NULL | Projektname (z.B. "Roggächer A") |
| `status` | ENUM | DEFAULT 'aktiv' | aktiv, abgeschlossen, archiviert |
| `erstellt_am` | TIMESTAMPTZ | DEFAULT NOW() | |
| `aktualisiert_am` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `benutzer`

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Eindeutige ID |
| `name` | VARCHAR(100) | NOT NULL | Anzeigename |
| `email` | VARCHAR(255) | UNIQUE | Für Login und Benachrichtigungen |
| `telefon` | VARCHAR(20) | | Für SMS-Benachrichtigungen (optional) |
| `rolle` | ENUM | NOT NULL | monteur, projektleiter, admin |
| `aktiv` | BOOLEAN | DEFAULT true | |
| `erstellt_am` | TIMESTAMPTZ | DEFAULT NOW() | |

#### `pendenzen`

| Feld | Typ | Constraints | Beschreibung |
|------|-----|-------------|--------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Eindeutige ID |
| `projekt_id` | UUID | FK → projekte.id, NOT NULL | |
| `nr` | INTEGER | NOT NULL | Auto-incrementing pro Projekt |
| `beschreibung` | TEXT | NOT NULL | Was ist zu tun? |
| `bereich` | ENUM | NOT NULL | avor, montage, planung, material |
| `verantwortlich_id` | UUID | FK → benutzer.id | Wer ist zuständig? |
| `erfasst_von_id` | UUID | FK → benutzer.id, NOT NULL | Wer hat erfasst? |
| `prioritaet` | ENUM | DEFAULT 'mittel' | hoch, mittel, niedrig |
| `status` | ENUM | DEFAULT 'offen' | offen, in_arbeit, erledigt |
| `faellig_bis` | DATE | | Deadline |
| `erledigt_am` | DATE | | Wann abgeschlossen? |
| `bemerkungen` | TEXT | | Zusätzliche Infos |
| `auftragsnummer` | VARCHAR(50) | | Referenz (z.B. "25.0591-003") |
| `kategorie` | ENUM | DEFAULT 'projekt' | projekt, allgemein, benutzer |
| `erstellt_am` | TIMESTAMPTZ | DEFAULT NOW() | |
| `aktualisiert_am` | TIMESTAMPTZ | DEFAULT NOW() | |
| `archiviert_am` | TIMESTAMPTZ | | Soft-Delete Timestamp |

#### Indizes

```sql
CREATE INDEX idx_pendenzen_projekt ON pendenzen(projekt_id) WHERE archiviert_am IS NULL;
CREATE INDEX idx_pendenzen_verantwortlich ON pendenzen(verantwortlich_id) WHERE archiviert_am IS NULL;
CREATE INDEX idx_pendenzen_status ON pendenzen(status) WHERE archiviert_am IS NULL;
CREATE INDEX idx_pendenzen_faellig ON pendenzen(faellig_bis) WHERE status != 'erledigt' AND archiviert_am IS NULL;
CREATE INDEX idx_pendenzen_archiviert ON pendenzen(archiviert_am) WHERE archiviert_am IS NOT NULL;
```

### Enums

```sql
CREATE TYPE projekt_status AS ENUM ('aktiv', 'abgeschlossen', 'archiviert');
CREATE TYPE benutzer_rolle AS ENUM ('monteur', 'projektleiter', 'admin');
CREATE TYPE pendenz_bereich AS ENUM ('avor', 'montage', 'planung', 'material');
CREATE TYPE pendenz_prioritaet AS ENUM ('hoch', 'mittel', 'niedrig');
CREATE TYPE pendenz_status AS ENUM ('offen', 'in_arbeit', 'erledigt');
CREATE TYPE pendenz_kategorie AS ENUM ('projekt', 'allgemein', 'benutzer');
```

### Historie

> **Hinweis:** Die bestehende Historie-Logik aus IntelliPlan Core soll wiederverwendet werden. Falls diese auf einer generischen `historie` oder `audit_log` Tabelle basiert, kann das Pendenzen-Modul dieselbe Struktur nutzen.

```sql
-- Falls neue Tabelle benötigt, sonst bestehende IntelliPlan-Historie nutzen
CREATE TABLE pendenzen_historie (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pendenz_id UUID REFERENCES pendenzen(id),
  benutzer_id UUID REFERENCES benutzer(id),
  aktion VARCHAR(50), -- 'erstellt', 'aktualisiert', 'status_geaendert', 'archiviert'
  feld VARCHAR(100), -- welches Feld geändert wurde
  alter_wert TEXT,
  neuer_wert TEXT,
  zeitstempel TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pendenzen_historie_pendenz ON pendenzen_historie(pendenz_id);
```

**Alternativ:** Trigger auf `pendenzen` Tabelle der Änderungen automatisch in die bestehende IntelliPlan-Historie schreibt.

---

## API Spezifikation

### Endpoints

#### Pendenzen

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/projekte/{projekt_id}/pendenzen` | Liste aller Pendenzen eines Projekts |
| GET | `/api/pendenzen/{id}` | Einzelne Pendenz abrufen |
| POST | `/api/projekte/{projekt_id}/pendenzen` | Neue Pendenz erstellen |
| PATCH | `/api/pendenzen/{id}` | Pendenz aktualisieren |
| DELETE | `/api/pendenzen/{id}` | Pendenz löschen (soft delete) |

#### Filter & Query Parameter

```
GET /api/projekte/{projekt_id}/pendenzen?status=offen&verantwortlich={user_id}&bereich=montage
```

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `status` | string | Filter nach Status |
| `verantwortlich` | UUID | Filter nach Verantwortlichem |
| `bereich` | string | Filter nach Bereich |
| `ueberfaellig` | boolean | Nur überfällige anzeigen |
| `sort` | string | Sortierung (z.B. "faellig_bis", "-erstellt_am") |

### Request/Response Beispiele

#### Neue Pendenz erstellen

```http
POST /api/projekte/550e8400-e29b-41d4-a716-446655440000/pendenzen
Content-Type: application/json
Authorization: Bearer {token}

{
  "beschreibung": "Gummidichtungen und Bänder montieren Haus A",
  "bereich": "montage",
  "verantwortlich_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "prioritaet": "hoch",
  "faellig_bis": "2026-02-05",
  "bemerkungen": "Verzug durch Lieferant",
  "auftragsnummer": "25.0591-001"
}
```

#### Response

```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "projekt_id": "550e8400-e29b-41d4-a716-446655440000",
  "nr": 12,
  "beschreibung": "Gummidichtungen und Bänder montieren Haus A",
  "bereich": "montage",
  "verantwortlich": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Veli"
  },
  "erfasst_von": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Adi"
  },
  "prioritaet": "hoch",
  "status": "offen",
  "faellig_bis": "2026-02-05",
  "erledigt_am": null,
  "bemerkungen": "Verzug durch Lieferant",
  "auftragsnummer": "25.0591-001",
  "erstellt_am": "2026-02-04T10:30:00Z",
  "aktualisiert_am": "2026-02-04T10:30:00Z"
}
```

#### Status ändern

```http
PATCH /api/pendenzen/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
Content-Type: application/json

{
  "status": "erledigt"
}
```

---

## Offline-Sync

### Architektur

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  IndexedDB      │◄───────►│  Sync Engine    │◄───────►│  Supabase       │
│  (Local)        │         │  (Service Worker)│         │  (Remote)       │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Sync-Strategie

1. **Optimistic UI** – Änderungen werden sofort lokal angezeigt
2. **Background Sync** – Service Worker synchronisiert bei Verbindung
3. **Conflict Resolution** – Last-Write-Wins mit Timestamp-Vergleich
4. **Retry Queue** – Fehlgeschlagene Syncs werden wiederholt

### Lokale Datenbank (IndexedDB)

```javascript
const dbSchema = {
  pendenzen: {
    keyPath: 'id',
    indexes: [
      { name: 'projekt_id', keyPath: 'projekt_id' },
      { name: 'sync_status', keyPath: '_sync_status' }
    ]
  },
  sync_queue: {
    keyPath: 'id',
    autoIncrement: true
  }
};
```

### Sync-Status pro Eintrag

| Status | Beschreibung |
|--------|--------------|
| `synced` | Mit Server synchronisiert |
| `pending` | Lokale Änderung, wartet auf Sync |
| `conflict` | Konflikt erkannt, manuell lösen |
| `error` | Sync fehlgeschlagen |

---

## UI Komponenten

### Screens

#### 1. Projektübersicht (Dashboard)

- Liste aller aktiven Projekte
- Pro Projekt: Anzahl offene/überfällige Pendenzen
- Ampel-Indikator (Grün/Gelb/Rot)

#### 2. Pendenzenliste (Hauptscreen)

- Header mit Projektnummer und -name
- Statistik-Kacheln: Offen | In Arbeit | Erledigt | Total
- Filter nach Verantwortlichem und Status
- Liste der Pendenzen mit:
  - Prioritäts-Indikator (farbiger Balken)
  - Nummer, Bereich, Auftragsnummer
  - Beschreibung
  - Bemerkungen (falls vorhanden)
  - Verantwortlicher und Fälligkeitsdatum
  - Status-Actions (→ In Arbeit, ✓ Erledigt)
- FAB: Neue Pendenz

#### 3. Neue Pendenz (Modal/Sheet)

- Beschreibung (Textarea, required)
- Bereich (Buttons: AVOR, Montage, Planung, Material)
- Verantwortlich (Dropdown)
- Priorität (Buttons: Niedrig, Mittel, Hoch)
- Fällig bis (Date Picker)
- Bemerkungen (Input, optional)
- Auftragsnummer (Input, optional)
- [Später: Foto hinzufügen]

#### 4. Offline-Indikator

- Banner wenn offline
- Sync-Status in Header (Badge mit Anzahl pending)

### Komponenten-Struktur

```
/components
  /pendenzen
    PendenzenListe.tsx
    PendenzCard.tsx
    PendenzForm.tsx
    PendenzStatusActions.tsx
    PendenzenFilter.tsx
    PendenzenStats.tsx
  /common
    OfflineBanner.tsx
    SyncIndicator.tsx
    FAB.tsx
```

---

## Berechtigungen

### Matrix

| Aktion | Monteur | Projektleiter | Admin |
|--------|---------|---------------|-------|
| Pendenzen ansehen (eigenes Projekt) | ✓ | ✓ | ✓ |
| Pendenzen ansehen (alle Projekte) | ✗ | ✗ | ✓ |
| Pendenz erstellen | ✓ | ✓ | ✓ |
| Eigene Pendenz bearbeiten | ✓ | ✓ | ✓ |
| Fremde Pendenz bearbeiten | ✗ | ✓ | ✓ |
| Status ändern (zugewiesene) | ✓ | ✓ | ✓ |
| Status ändern (alle) | ✗ | ✓ | ✓ |
| Pendenz löschen | ✗ | ✓ (eigene) | ✓ |
| Benutzer verwalten | ✗ | ✗ | ✓ |

### Row Level Security (Supabase)

```sql
-- Pendenzen: Lesen nur im eigenen Projekt
CREATE POLICY "pendenzen_select" ON pendenzen
  FOR SELECT USING (
    projekt_id IN (
      SELECT projekt_id FROM projekt_benutzer 
      WHERE benutzer_id = auth.uid()
    )
  );

-- Pendenzen: Erstellen wenn Projektzugriff
CREATE POLICY "pendenzen_insert" ON pendenzen
  FOR INSERT WITH CHECK (
    projekt_id IN (
      SELECT projekt_id FROM projekt_benutzer 
      WHERE benutzer_id = auth.uid()
    )
  );
```

---

## Benachrichtigungen

### Trigger

| Event | Empfänger | Kanal |
|-------|-----------|-------|
| Neue Pendenz zugewiesen | Verantwortlicher | Push, E-Mail |
| Pendenz wird morgen fällig | Verantwortlicher | Push |
| Pendenz ist überfällig | Verantwortlicher, Projektleiter | Push, E-Mail |
| Status auf "Erledigt" | Erfasser (wenn ≠ Verantwortlicher) | Push |

### Implementierung

- Push: Web Push API / Firebase Cloud Messaging
- E-Mail: Supabase Edge Functions + Resend/SendGrid
- Optional später: SMS via Twilio

---

## Erweiterungen (Phase 2+)

### Anhänge (Fotos, Dokumente)

```sql
CREATE TABLE anhaenge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pendenz_id UUID REFERENCES pendenzen(id),
  typ VARCHAR(50), -- 'foto', 'dokument', 'plan'
  dateiname VARCHAR(255),
  speicher_pfad VARCHAR(500), -- Supabase Storage path
  groesse INTEGER, -- max 30MB (31457280 bytes)
  mime_type VARCHAR(100),
  erstellt_von_id UUID REFERENCES benutzer(id),
  erstellt_am TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anhaenge_pendenz ON anhaenge(pendenz_id);
```

**Storage-Konfiguration (Supabase):**
- Bucket: `pendenzen-anhaenge`
- Max file size: 30MB
- Allowed MIME types: `image/*`, `application/pdf`
- Pfad-Struktur: `/{projekt_id}/{pendenz_id}/{dateiname}`

### Standorte / Lokalisierung (Phase 2+)

```sql
CREATE TABLE standorte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projekt_id UUID REFERENCES projekte(id),
  typ VARCHAR(50), -- 'gebaeude', 'stockwerk', 'wohnung', 'raum'
  bezeichnung VARCHAR(255),
  parent_id UUID REFERENCES standorte(id),
  sortierung INTEGER
);

ALTER TABLE pendenzen ADD COLUMN standort_id UUID REFERENCES standorte(id);
```

### Verknüpfung zu Lieferanten/Bestellungen

```sql
ALTER TABLE pendenzen ADD COLUMN lieferant_id UUID REFERENCES lieferanten(id);
ALTER TABLE pendenzen ADD COLUMN bestellung_id UUID REFERENCES bestellungen(id);
```

---

## Testing

### Unit Tests

- Datenvalidierung (Pflichtfelder, Enums)
- Berechtigungsprüfung
- Sync-Logik (Conflict Resolution)

### Integration Tests

- API Endpoints (CRUD)
- Offline → Online Sync
- Push-Benachrichtigungen

### E2E Tests

- Kompletter Workflow: Erfassen → Zuweisen → Bearbeiten → Erledigen
- Offline-Szenario simulieren

---

## Technologie-Stack (Empfehlung)

| Komponente | Technologie |
|------------|-------------|
| Frontend | React + TypeScript |
| UI Framework | Tailwind CSS |
| State Management | Zustand oder TanStack Query |
| Offline Storage | IndexedDB (via Dexie.js) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Sync | Supabase Realtime + Custom Sync Logic |
| Push | Firebase Cloud Messaging |
| Deployment | Vercel (Frontend), Supabase (Backend) |

---

## Milestones

### MVP (v0.1)

- [ ] Datenbank-Schema aufsetzen (inkl. Historie-Integration)
- [ ] Basis-API (CRUD Pendenzen)
- [ ] UI: Pendenzenliste + Erfassen + Status ändern
- [ ] Einfacher Auth (Supabase Auth)
- [ ] Filter nach Status und Verantwortlichem
- [ ] Foto-Upload (bis 30MB)
- [ ] Auftragsnummer mit Fallback (Allgemein/Benutzer-Pendenz)

### v0.2

- [ ] Offline-Fähigkeit (IndexedDB + Sync)
- [ ] Push-Benachrichtigungen
- [ ] Überfällig-Indikator
- [ ] Archivierung (Soft-Delete) mit Archiv-Ansicht

### v0.3

- [ ] Standorte/Lokalisierung
- [ ] Dashboard mit Ampelübersicht
- [ ] Borm-Auftragsnummern-Import (manuell/CSV)

### v1.0

- [ ] Vollständige Berechtigungen
- [ ] E-Mail-Benachrichtigungen
- [ ] Export (Excel, PDF)
- [ ] Lieferanten-/Bestellungs-Verknüpfung

---

## Klärungen

| Frage | Antwort |
|-------|---------|
| ERP-Software | **Borm** – keine native API vorhanden. Dies ist ein Hauptgrund für IntelliPlan. |
| Löschen von Pendenzen | **Soft-Delete / Archivieren** – Pendenzen werden nicht gelöscht sondern archiviert. |
| Änderungshistorie | **Ja** – Bestehende Historie-Logik aus IntelliPlan Core wiederverwenden. |
| Max. Dateigrösse Fotos | **30 MB** pro Foto |
| Auftragsnummer-Validierung | **Ja, mit Fallback** – Validierung wenn möglich, sonst "Allgemein" oder "Benutzer-Pendenz" als Kategorie. |

---

## ERP-Integration (Borm)

Da Borm keine native API bietet, gibt es folgende Optionen für eine spätere Integration:

1. **Manueller Export** – Pendenzenliste als Excel/CSV exportieren für Import in Borm
2. **Datenbank-Zugriff** – Falls Borm auf SQL Server/PostgreSQL läuft: Direkter DB-Zugriff (readonly) für Auftragsnummern-Validierung
3. **Datei-basiert** – Borm-Exporte (falls vorhanden) periodisch einlesen

Für MVP: Auftragsnummern werden als Freitext erfasst mit optionaler Validierung gegen eine manuell gepflegte Liste oder Import.

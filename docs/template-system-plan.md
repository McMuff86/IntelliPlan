# IntelliPlan - Branchen-Template-System

## Übersicht

Ein flexibles System das ermöglicht:
- **Branchen-Profile** (Industry Profiles) - Grundkonfiguration der App
- **Produkt-Templates** (Task Templates) - Vordefinierte Arbeitsabläufe
- **Template-Vererbung** - Basis-Templates die erweitert werden können

---

## 1. Datenmodell

### Industry (Branche)
```typescript
interface Industry {
  id: string;
  name: string;                    // "Schreinerei", "Architekturbüro"
  description: string;
  icon: string;
  defaultProductTypes: string[];   // Welche Produkttypen standardmässig aktiv
  settings: IndustrySettings;
}

interface IndustrySettings {
  usePhases: boolean;              // Architektur: Phasen (SIA), Handwerk: direkt
  supportsSubtasks: boolean;       // Erlaubt Unterpunkte (1.1, 1.2) für Branchen wie Architektur
  terminology: {                   // Branchen-spezifische Begriffe
    project: string;               // "Projekt" vs "Auftrag" vs "Mandat"
    task: string;                  // "Aufgabe" vs "Arbeitsschritt" vs "Phase"
    client: string;                // "Kunde" vs "Bauherr" vs "Auftraggeber"
  };
}
```

### ProductType (Produkttyp)
```typescript
interface ProductType {
  id: string;
  industryId: string;
  name: string;                    // "Rahmentüren", "Stahlzargen", "Schränke"
  description: string;
  icon: string;
  defaultTemplate: string;         // ID des Standard-Templates
  isActive: boolean;
}
```

### TaskTemplate (Aufgaben-Vorlage)
```typescript
interface TaskTemplate {
  id: string;
  productTypeId: string;
  name: string;                    // "Standard Rahmentür Ablauf"
  description: string;
  tasks: TemplateTask[];
  isDefault: boolean;
  createdBy: 'system' | 'user';
}

interface TemplateTask {
  id: string;                      // Eindeutige ID (z.B. "task_abc123")
  order: number;                   // Einfache Reihenfolge: 1, 2, 3, 4...
  code?: string;                   // Optional: Kundenspezifischer Code (für ERP-Kompatibilität)
  name: string;                    // "Türblatt bestellen"
  description?: string;
  estimatedDuration?: number;      // In Stunden oder Tagen
  durationUnit: 'hours' | 'days';
  dependsOn?: string[];            // IDs der Vorgänger-Tasks (robust, da ID sich nicht ändert)
  category: TaskCategory;
  isOptional: boolean;
  defaultAssignee?: string;        // Rolle oder Person
  checklistItems?: string[];       // Sub-Tasks
}

// Vorteile der einfachen 1-x Nummerierung:
// - Sofort verständlich für neue Benutzer
// - Unbegrenzt erweiterbar
// - Einfaches Einfügen/Umsortieren mit Auto-Renummerierung
// - Abhängigkeiten über IDs (nicht Nummern) = robust bei Änderungen

type TaskCategory = 
  | 'planning'      // AVOR, Projektgespräch
  | 'procurement'   // Bestellung
  | 'production'    // Produktion
  | 'treatment'     // Behandlung (Oberfläche)
  | 'assembly'      // Montage
  | 'delivery'      // Lieferung
  | 'approval'      // Abnahme, Freigabe
  | 'documentation' // Dokumentation
  ;
```

---

## 2. Branchen-Konfigurationen

### 2.1 Schreinerei / Zimmerei

```yaml
industry:
  id: carpentry
  name: "Schreinerei / Zimmerei"
  terminology:
    project: "Auftrag"
    task: "Arbeitsschritt"
    client: "Kunde"

productTypes:
  - Rahmentüren
  - Stahlzargen-Türen
  - Schiebetüren
  - Schränke / Einbauschränke
  - Küchen
  - Badmöbel
  - Büromöbel
  - Treppen
  - Fenster
  - Fassaden / Holzbau
  - Innenausbau (allgemein)
```

#### Template: Rahmentüren
| # | Task | Kategorie | Dauer | Abhängigkeit |
|---|------|-----------|-------|--------------|
| 1 | AVOR / Liefertermin klären | planning | 1d | – |
| 2 | Türblatt bestellen | procurement | 1d | 1 |
| 3 | Beschlag bestellen | procurement | 1d | 1 |
| 4 | Produktion Rahmen | production | 3d | 2, 3 |
| 5 | Produktion Türblatt | production | 2d | 2 |
| 6 | Behandlung Rahmen | treatment | 2d | 4 |
| 7 | Behandlung Türblatt | treatment | 2d | 5 |
| 8 | Montage Rahmen | assembly | 1d | 6 |
| 9 | Montage Türblatt | assembly | 0.5d | 7, 8 |

#### Template: Stahlzargen
| # | Task | Kategorie | Dauer | Abhängigkeit |
|---|------|-----------|-------|--------------|
| 1 | Bestellung Umfassung | procurement | 1d | – |
| 2 | Montage Umfassung | assembly | 1d | 1 |
| 3 | Montagevorbereitung Türblätter | planning | 0.5d | 2 |
| 4 | Türblatt bestellen | procurement | 1d | 3 |
| 5 | Beschlag bestellen | procurement | 1d | 3 |
| 6 | Montage Türblatt | assembly | 1d | 4, 5 |

#### Template: Schränke / Einbauschränke
| # | Task | Kategorie | Dauer | Abhängigkeit |
|---|------|-----------|-------|--------------|
| 1 | Projektgespräch / Aufmass | planning | 0.5d | – |
| 2 | AVOR / Liefertermin | planning | 1d | 1 |
| 3 | Material bestellen | procurement | 1d | 2 |
| 4 | Produktion Korpus | production | 3d | 3 |
| 5 | Produktion Fronten | production | 2d | 3 |
| 6 | Behandlung | treatment | 2d | 4, 5 |
| 7 | Beschläge montieren | assembly | 1d | 6 |
| 8 | Vormontage | assembly | 1d | 7 |
| 9 | Lieferung & Montage | assembly | 1d | 8 |

#### Template: Küchen
| # | Task | Kategorie | Dauer | Abhängigkeit |
|---|------|-----------|-------|--------------|
| 1 | Beratungsgespräch | planning | 2h | – |
| 2 | Aufmass vor Ort | planning | 2h | 1 |
| 3 | Planung & Offerte | planning | 4h | 2 |
| 4 | Kundenfreigabe | approval | – | 3 |
| 5 | Geräte bestellen | procurement | 1d | 4 |
| 6 | Arbeitsplatte bestellen | procurement | 1d | 4 |
| 7 | Beschläge/Armaturen bestellen | procurement | 1d | 4 |
| 8 | Produktion Korpusse | production | 5d | 4 |
| 9 | Produktion Fronten | production | 4d | 4 |
| 10 | Behandlung | treatment | 3d | 8, 9 |
| 11 | Vormontage Werkstatt | assembly | 2d | 10 |
| 12 | Demontage alte Küche | assembly | 0.5d | 11 |
| 13 | Sanitär/Elektro Vorbereitung | assembly | 1d | 12 |
| 14 | Montage Küche | assembly | 2d | 13, 5 |
| 15 | Arbeitsplatte montieren | assembly | 0.5d | 14, 6 |
| 16 | Geräte einbauen | assembly | 0.5d | 15 |
| 17 | Abnahme mit Kunde | approval | 1h | 16 |

---

### 2.2 Architekturbüro

```yaml
industry:
  id: architecture
  name: "Architekturbüro"
  usePhases: true  # SIA-Phasen
  terminology:
    project: "Projekt"
    task: "Phase"
    client: "Bauherr"
```

#### Template: Neubau (SIA-Phasen)
| # | Task | Kategorie | Anteil | Abhängigkeit |
|---|------|-----------|--------|--------------|
| 1 | **Strategische Planung** | planning | 3% | – |
| 1.1 | Bedürfnisformulierung | planning | – | – |
| 1.2 | Lösungsstrategien | planning | – | 1.1 |
| 1.3 | Machbarkeitsstudie | planning | – | 1.2 |
| 2 | **Vorstudien** | planning | 7% | 1 |
| 2.1 | Grundlagenermittlung | planning | – | 1.3 |
| 2.2 | Variantenstudium | planning | – | 2.1 |
| 2.3 | Vorprojekt | planning | – | 2.2 |
| 3 | **Projektierung** | planning | 25% | 2 |
| 3.1 | Bauprojekt | planning | – | 2.3 |
| 3.2 | Bewilligungsverfahren (Baueingabe) | approval | – | 3.1 |
| 3.3 | Ausführungsprojekt | planning | – | 3.2 |
| 4 | **Ausschreibung** | procurement | 10% | 3 |
| 4.1 | Ausschreibung | procurement | – | 3.3 |
| 4.2 | Offertvergleich | procurement | – | 4.1 |
| 4.3 | Vergabeantrag | procurement | – | 4.2 |
| 5 | **Realisierung** | production | 30% | 4 |
| 5.1 | Ausführungsplanung | planning | – | 4.3 |
| 5.2 | Bauleitung | production | – | 5.1 |
| 5.3 | Inbetriebnahme | assembly | – | 5.2 |
| 5.4 | Abnahme | approval | – | 5.3 |
| 6 | **Bewirtschaftung** | documentation | 5% | 5 |
| 6.1 | Dokumentation | documentation | – | 5.4 |
| 6.2 | Garantiearbeiten | production | – | 6.1 |

*Hinweis: Für Architekturbüros werden SIA-Phasen (1-6) mit Unterpunkten (.1, .2, .3) verwendet, da dies der Branchenstandard ist.*

#### Template: Umbau / Sanierung
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Bestandsaufnahme | planning | – |
| 2 | Zustandsanalyse | planning | 1 |
| 3 | Machbarkeitsstudie | planning | 2 |
| 4 | Vorprojekt | planning | 3 |
| 5 | Baueingabe (falls nötig) | approval | 4 |
| 6 | Ausführungsprojekt | planning | 5 |
| 7 | Ausschreibung | procurement | 6 |
| 8 | Vergabe | procurement | 7 |
| 9 | Bauleitung | production | 8 |
| 10 | Abnahme | approval | 9 |

#### Template: Innenarchitektur
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Erstgespräch & Briefing | planning | – |
| 2 | Raumanalyse & Aufmass | planning | 1 |
| 3 | Konzeptentwicklung | planning | 2 |
| 4 | Moodboard & Materialkonzept | planning | 3 |
| 5 | Entwurfspräsentation | approval | 4 |
| 6 | Detailplanung | planning | 5 |
| 7 | Kostenvoranschlag | planning | 6 |
| 8 | Freigabe Bauherr | approval | 7 |
| 9 | Ausschreibung Gewerke | procurement | 8 |
| 10 | Ausführungsüberwachung | production | 9 |
| 11 | Abnahme | approval | 10 |

---

### 2.3 Metallbau / Schlosserei

```yaml
industry:
  id: metalwork
  name: "Metallbau / Schlosserei"
  terminology:
    project: "Auftrag"
    task: "Arbeitsschritt"
    client: "Kunde"
```

#### Template: Geländer / Handlauf
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Aufmass vor Ort | planning | – |
| 2 | Konstruktion / CAD | planning | 1 |
| 3 | Kundenfreigabe | approval | 2 |
| 4 | Material bestellen | procurement | 3 |
| 5 | Zuschnitt | production | 4 |
| 6 | Schweissen | production | 5 |
| 7 | Schleifen | production | 6 |
| 8 | Oberflächenbehandlung | treatment | 7 |
| 9 | Montage | assembly | 8 |

#### Template: Stahlbau / Tragwerk
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Statische Berechnung | planning | – |
| 2 | Werkstattplanung | planning | 1 |
| 3 | Freigabe Statiker | approval | 2 |
| 4 | Material bestellen | procurement | 3 |
| 5 | Zuschnitt | production | 4 |
| 6 | Vorfertigung | production | 5 |
| 7 | Schweissarbeiten | production | 6 |
| 8 | Korrosionsschutz | treatment | 7 |
| 9 | Transport | delivery | 8 |
| 10 | Montage | assembly | 9 |
| 11 | Abnahme Statiker | approval | 10 |

---

### 2.4 Elektroinstallation

```yaml
industry:
  id: electrical
  name: "Elektroinstallation"
  terminology:
    project: "Auftrag"
    task: "Arbeitsschritt"
    client: "Kunde"
```

#### Template: Hausinstallation Neubau
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Installationsplanung | planning | – |
| 2 | Material kalkulieren | planning | 1 |
| 3 | Kundenfreigabe Schema | approval | 2 |
| 4 | Material bestellen | procurement | 3 |
| 5 | Rohbau-Installation | production | 4 |
| 6 | Abnahme Rohbau (ESTI) | approval | 5 |
| 7 | Ausbau-Installation | production | 6 |
| 8 | Geräte einbauen | assembly | 7 |
| 9 | Inbetriebnahme | assembly | 8 |
| 10 | Sicherheitskontrolle | approval | 9 |
| 11 | Dokumentation | documentation | 10 |

---

### 2.5 Sanitär / Heizung (HLKS)

```yaml
industry:
  id: hvac
  name: "Sanitär / Heizung / Lüftung"
  terminology:
    project: "Auftrag"
    task: "Arbeitsschritt"
    client: "Kunde"
```

#### Template: Badezimmer Renovation
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Beratung & Aufmass | planning | – |
| 2 | Planung & Offerte | planning | 1 |
| 3 | Kundenfreigabe | approval | 2 |
| 4 | Sanitärobjekte bestellen | procurement | 3 |
| 5 | Plättli/Fliesen bestellen | procurement | 3 |
| 6 | Demontage alt | production | 4, 5 |
| 7 | Rohinstallation | production | 6 |
| 8 | Abdichtung | production | 7 |
| 9 | Plättliarbeiten | production | 8 |
| 10 | Fertigmontage | assembly | 9 |
| 11 | Inbetriebnahme | assembly | 10 |
| 12 | Abnahme | approval | 11 |

---

### 2.6 Gartenbau / Landschaftsarchitektur

```yaml
industry:
  id: landscaping
  name: "Gartenbau / Landschaftsarchitektur"
  terminology:
    project: "Projekt"
    task: "Arbeitsschritt"
    client: "Kunde"
```

#### Template: Gartengestaltung
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Beratung vor Ort | planning | – |
| 2 | Bestandsaufnahme | planning | 1 |
| 3 | Entwurfsplanung | planning | 2 |
| 4 | Pflanzplan | planning | 3 |
| 5 | Kundenfreigabe | approval | 4 |
| 6 | Pflanzen bestellen | procurement | 5 |
| 7 | Materialien bestellen | procurement | 5 |
| 8 | Erdarbeiten | production | 6, 7 |
| 9 | Hardscape (Wege, Mauern) | production | 8 |
| 10 | Pflanzarbeiten | production | 9 |
| 11 | Rasen anlegen | production | 10 |
| 12 | Abnahme | approval | 11 |

---

### 2.7 Generalunternehmer / Baumanagement

```yaml
industry:
  id: general_contractor
  name: "Generalunternehmer"
  terminology:
    project: "Bauprojekt"
    task: "Meilenstein"
    client: "Bauherr"
```

#### Template: Wohnbauprojekt
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Projektdefinition | planning | – |
| 2 | Grundstücksprüfung | planning | 1 |
| 3 | Architekturauftrag | procurement | 2 |
| 4 | Vorprojekt | planning | 3 |
| 5 | Baubewilligung | approval | 4 |
| 6 | Ausführungsplanung | planning | 5 |
| 7 | Ausschreibung Gewerke | procurement | 6 |
| 8 | Vergabe | procurement | 7 |
| 9 | Baugrube / Fundament | production | 8 |
| 10 | Rohbau | production | 9 |
| 11 | Dach | production | 10 |
| 12 | Fassade | production | 11 |
| 13 | Haustechnik | production | 12 |
| 14 | Innenausbau | production | 13 |
| 15 | Aussenanlagen | production | 14 |
| 16 | Abnahme | approval | 15 |
| 17 | Übergabe | delivery | 16 |

---

### 2.8 Eventagentur / Veranstaltungstechnik

```yaml
industry:
  id: events
  name: "Eventagentur / Veranstaltungstechnik"
  terminology:
    project: "Event"
    task: "Aufgabe"
    client: "Auftraggeber"
```

#### Template: Firmenevent
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Briefing Kunde | planning | – |
| 2 | Konzeptentwicklung | planning | 1 |
| 3 | Location Recherche | planning | 2 |
| 4 | Budgetierung | planning | 3 |
| 5 | Präsentation & Freigabe | approval | 4 |
| 6 | Location buchen | procurement | 5 |
| 7 | Technik buchen | procurement | 5 |
| 8 | Catering buchen | procurement | 5 |
| 9 | Personal planen | planning | 6 |
| 10 | Detailplanung | planning | 7, 8, 9 |
| 11 | Produktion Materialien | production | 10 |
| 12 | Aufbau | assembly | 11 |
| 13 | Durchführung | production | 12 |
| 14 | Abbau | assembly | 13 |
| 15 | Nachbereitung | documentation | 14 |

---

### 2.9 Grafikdesign / Werbeagentur

```yaml
industry:
  id: design_agency
  name: "Grafikdesign / Werbeagentur"
  terminology:
    project: "Projekt"
    task: "Phase"
    client: "Kunde"
```

#### Template: Corporate Design
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Briefing | planning | – |
| 2 | Recherche & Analyse | planning | 1 |
| 3 | Moodboards | planning | 2 |
| 4 | Logo-Entwürfe | production | 3 |
| 5 | Präsentation | approval | 4 |
| 6 | Überarbeitung | production | 5 |
| 7 | Finale Freigabe | approval | 6 |
| 8 | Farb- & Typografie-System | production | 7 |
| 9 | Geschäftsausstattung | production | 8 |
| 10 | Styleguide erstellen | documentation | 9 |
| 11 | Datenübergabe | delivery | 10 |

---

### 2.10 Software / IT-Dienstleister

```yaml
industry:
  id: software
  name: "Software / IT-Dienstleister"
  terminology:
    project: "Projekt"
    task: "Phase"
    client: "Kunde"
```

#### Template: Softwareprojekt (Agil)
| # | Task | Kategorie | Abhängigkeit |
|---|------|-----------|--------------|
| 1 | Discovery / Requirements | planning | – |
| 2 | Architektur & Design | planning | 1 |
| 3 | Setup Entwicklungsumgebung | planning | 2 |
| 4 | Sprint 1 | production | 3 |
| 5 | Review & Demo | approval | 4 |
| 6 | Sprint 2-n (iterativ) | production | 5 |
| 7 | Testing & QA | production | 6 |
| 8 | User Acceptance Testing | approval | 7 |
| 9 | Deployment | assembly | 8 |
| 10 | Go-Live | delivery | 9 |
| 11 | Support & Maintenance | production | 10 |

---

## 3. UI-Konzept

### 3.1 Onboarding / Branchen-Auswahl

```
┌─────────────────────────────────────────────────────────────┐
│  Willkommen bei IntelliPlan!                                │
│  Wähle deine Branche, um passende Templates zu erhalten:    │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 🪚      │ │ 🏛️      │ │ ⚡      │ │ 🔧      │           │
│  │Schrein- │ │Architek-│ │Elektro  │ │Metallbau│           │
│  │erei     │ │trbüro   │ │         │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 🚿      │ │ 🌳      │ │ 🎪      │ │ 💻      │           │
│  │Sanitär/ │ │Garten-  │ │Event    │ │Software │           │
│  │HLKS     │ │bau      │ │         │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  [ Andere Branche... ]                                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Template-Auswahl bei Projekt-Erstellung

```
┌─────────────────────────────────────────────────────────────┐
│  Neues Projekt erstellen                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Projektname: [ Küche Familie Müller                    ]   │
│                                                             │
│  Produkttyp:  [ Küchen                               v ]   │
│                                                             │
│  Template auswählen:                                        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ○ Standard Küchen-Ablauf (16 Schritte)               │ │
│  │   Beratung → Aufmass → Planung → ... → Abnahme       │ │
│  │                                                       │ │
│  │ ○ Küche Express (8 Schritte)                         │ │
│  │   Kompakter Ablauf für kleinere Projekte             │ │
│  │                                                       │ │
│  │ ○ Küche mit Umbau (20 Schritte)                      │ │
│  │   Inkl. Abbruch, Sanitär, Elektro                    │ │
│  │                                                       │ │
│  │ ○ Leeres Projekt (keine Vorlage)                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [ ] Template nach Erstellung anpassen                      │
│                                                             │
│  [Abbrechen]                           [Projekt erstellen]  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Template-Verwaltung

```
┌─────────────────────────────────────────────────────────────┐
│  Einstellungen > Templates                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Aktive Produkttypen:                                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ [✓] Rahmentüren          [✓] Schränke                │ │
│  │ [✓] Stahlzargen          [✓] Küchen                  │ │
│  │ [✓] Schiebetüren         [ ] Treppen                 │ │
│  │ [ ] Fenster              [ ] Fassaden                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Templates verwalten:                                       │
│  ┌─────────────────────────────────────────────────────┬─┐ │
│  │ Rahmentüren                                         │▼│ │
│  ├─────────────────────────────────────────────────────┴─┤ │
│  │  • Standard Rahmentür (System) ⭐ Default    [Bearbeiten]│
│  │  • Rahmentür Express (Eigenes)              [Bearbeiten]│
│  │  [+ Neues Template erstellen]                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [+ Branche hinzufügen]  [Templates importieren]            │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Template-Editor

```
┌─────────────────────────────────────────────────────────────┐
│  Template bearbeiten: Standard Rahmentür                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────┬──────────────────────┬──────────┬───────┬──────┐ │
│  │ Seq  │ Aufgabe              │ Kategorie│ Dauer │ Abh. │ │
│  ├──────┼──────────────────────┼──────────┼───────┼──────┤ │
│  │ 400  │ AVOR / Liefertermin  │ Planung  │ 1d    │ -    │ │
│  │ 401  │ Türblatt bestellen   │ Beschaff.│ 1d    │ 400  │ │
│  │ 402  │ Beschlag bestellen   │ Beschaff.│ 1d    │ 400  │ │
│  │ 403  │ Produktion Rahmen    │ Produkt. │ 3d    │401,2 │ │
│  │ ...  │ ...                  │ ...      │ ...   │ ...  │ │
│  └──────┴──────────────────────┴──────────┴───────┴──────┘ │
│                                                             │
│  [+ Schritt hinzufügen]  [↑↓ Reihenfolge]  [🗑️ Löschen]     │
│                                                             │
│  [Abbrechen]                                    [Speichern]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Implementierungs-Roadmap

### Phase 1: Basis (MVP)
- [ ] Datenmodell für Industries, ProductTypes, TaskTemplates
- [ ] 2-3 Branchen mit je 3-5 Templates
- [ ] Branchen-Auswahl beim Onboarding
- [ ] Template-Auswahl bei Projekt-Erstellung
- [ ] Tasks werden aus Template generiert

### Phase 2: Anpassung
- [ ] Templates können bearbeitet werden
- [ ] Eigene Templates erstellen
- [ ] Produkttypen aktivieren/deaktivieren
- [ ] Template als "Favorit" markieren

### Phase 3: Erweitert
- [ ] Template-Import/Export (JSON)
- [ ] Template-Sharing zwischen Benutzern
- [ ] Branchen-Kombinationen (z.B. Schreinerei + Küchenbau)
- [ ] AI-basierte Template-Vorschläge basierend auf Projektbeschreibung

### Phase 4: Intelligence
- [ ] Automatische Zeitschätzungen basierend auf historischen Daten
- [ ] Vorschläge für fehlende Schritte
- [ ] Ähnliche Projekte vergleichen

---

## 5. Datenbank-Schema (Prisma)

```prisma
model Industry {
  id            String        @id @default(cuid())
  name          String
  description   String?
  icon          String?
  settings      Json          // IndustrySettings
  productTypes  ProductType[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model ProductType {
  id            String         @id @default(cuid())
  industryId    String
  industry      Industry       @relation(fields: [industryId], references: [id])
  name          String
  description   String?
  icon          String?
  isActive      Boolean        @default(true)
  templates     TaskTemplate[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model TaskTemplate {
  id            String        @id @default(cuid())
  productTypeId String
  productType   ProductType   @relation(fields: [productTypeId], references: [id])
  name          String
  description   String?
  tasks         Json          // TemplateTask[]
  isDefault     Boolean       @default(false)
  isSystem      Boolean       @default(false) // System vs User-created
  organizationId String?      // Für eigene Templates
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

---

## 6. Seed-Daten

Für den Start würde ich empfehlen, folgende Branchen mit Templates zu implementieren:

1. **Schreinerei** (Dein Kernbereich)
   - Rahmentüren, Stahlzargen, Schränke, Küchen

2. **Architekturbüro** (Zweiter Fokus)
   - Neubau SIA, Umbau, Innenarchitektur

3. **Metallbau** (Ergänzung)
   - Geländer, Stahlbau

Das gibt eine gute Basis und zeigt die Flexibilität des Systems.

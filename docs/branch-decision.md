# IntelliPlan – Branch-Strategie & Refactoring-Entscheidung

## Branch-Vergleich

### Main Branch (d7d885a)
| Metrik | Wert |
|--------|------|
| Commits total | 117 |
| Backend Source Files | 78 |
| Frontend Source Files | 77 |
| Test Files | 11 |
| Migrations | 29 (001-028) |
| Pages | 14 |

**Features auf Main:**
- Auth (JWT, Login, Registration, DSGVO)
- Appointments (CRUD, Overlap, Calendar, DnD)
- Projects (CRUD, Gantt, Timeline, Dependencies, Cascade Shift)
- Tasks (CRUD, Work Slots, Dependencies)
- Resources (Basic CRUD)
- Reminders
- Working Time Templates
- Industries / Product Types / Task Templates
- Pendenzen (Todo-System)
- Demo Page
- Onboarding
- AI Conflict Resolution (rule-based)
- RBAC (Rollen-System)
- Search

**Routes (13):** auth, appointments, projects, tasks, resources, reminders, working-time-templates, industries, product-types, task-templates, pendenzen

---

### Feature/wochenplan-phase2 Branch (c166509)
| Metrik | Wert | Delta zu Main |
|--------|------|---------------|
| Commits seit Abzweig | 31 | +31 |
| Backend Source Files | 96 | +18 |
| Frontend Source Files | 91 | +14 |
| Test Files | 25 | +14 |
| Migrations | 38 (001-041) | +9 |
| Pages | 18 | +4 |
| Neue Lines of Code | ~20'767 | – |

**Neue Features (nur auf Phase2):**
- Wochenplan (KW-View, Sections, Phasen, Halbtags-Grid) – **1430 LOC Service**
- Task Assignments (CRUD, Halbtags-Zuweisungen)
- Import (Excel Parser, Validate, Execute) – **1048 LOC Service**
- Export (CSV)
- Capacity Dashboard (Auslastung pro KW)
- Mitarbeiter-View (Grid, Detail Panel, Edit Dialog)
- Quick-Assign Popover
- Conflict Indicators
- Multi-Week Trend View
- Keyboard Shortcuts (KW-Navigation)
- work_role, skills, qualifications auf Resources

**Neue Routes (+5):** assignments, wochenplan, capacity, import, export

**Modifizierte Bestandsdateien (26):** Hauptsächlich Erweiterungen an Models, Services, Validators (neue Felder wie phase_code, planned_week, order_number etc.)

---

### Konflikte

**Merge-Situation:** Main hat 0 Commits seit dem Branch-Point. Das heisst: **Phase2 ist ein reiner Fast-Forward-Merge.** Es gibt KEINE Konflikte.

---

## Analyse: Was ist Legacy/Veraltet?

### AGENTS.md / CLAUDE.md (623 Zeilen)
| Abschnitt | Status | Empfehlung |
|-----------|--------|------------|
| Ralph Loop Beschreibung | ❌ Veraltet – wird nicht mehr genutzt | Entfernen |
| Beads System (150+ Zeilen) | ❌ Veraltet – durch Claude/OpenClaw ersetzt | Entfernen |
| Working Modes (Ralph/Beads/Single-Agent) | ❌ Veraltet | Entfernen |
| Tech Stack / Core Features | ⚠️ Teilweise veraltet (AI Features nicht gebaut) | Aktualisieren |
| PRD-basierter Workflow | ❌ Veraltet | Entfernen |
| Project Goal ("Appointment Management") | ❌ Veraltet – IntelliPlan ist jetzt Fertigungs-Planung | Komplett neu |
| Docker/DB Setup | ✅ Noch relevant | Behalten |
| Test Patterns | ✅ Noch relevant | Behalten |

### Scripts
| Script | Status | Empfehlung |
|--------|--------|------------|
| `scripts/ralph/ralph.sh` | ❌ Nicht mehr genutzt | Entfernen |
| `scripts/ralph/prompt.md` | ❌ Nicht mehr genutzt | Entfernen |
| `scripts/beads/deduplicate_progress.py` | ❌ Nicht mehr genutzt | Entfernen |
| `scripts/beads/version_beads.py` | ❌ Nicht mehr genutzt | Entfernen |

### .beads/ Verzeichnis
- `config.yaml`, `interactions.jsonl`, `issues.jsonl`, `metadata.json`, `versions/`
- ❌ Komplett veraltet, nicht mehr genutzt → Entfernen

### prd.json (17 Stories, alle ✅)
- Beschreibt "Task Planning & Project Scheduling"
- Alle Stories als "passes" markiert
- ❌ Veraltet – PRD-driven Development wird nicht mehr genutzt → Entfernen oder archivieren

### progress.txt
- 1200+ Zeilen Iterationslog seit Tag 1
- ⚠️ Historisch wertvoll, aber nicht mehr aktiv genutzt (Claude nutzt Memory-System)
- Empfehlung: Archivieren als `docs/legacy/progress-history.txt`, frisch starten

---

## Entscheidung: Branch-Strategie

### Option A: Phase2 in Main mergen
```
main ─────────────────────────── merge ← feature/wochenplan-phase2
                                  │
                                  └── Weiterentwicklung ab hier
```

**Pro:**
- Fast-Forward, keine Konflikte
- Alle 20k+ LOC neuer Code bleiben erhalten
- Wochenplan, Import, Kapazität, Mitarbeiter – alles wertvoll
- Tests (25 Files, 475+ Tests) geben Sicherheit

**Contra:**
- Import-Parser hat bekannte Probleme (Junk-Resources)
- Einige Bugs noch offen (Conflicts SQL etc.)
- Code teilweise hastig in Nacht-Sessions entstanden

### Option B: Frisch auf Main weiterbauen
```
main ─── Weiterentwicklung ab hier
         (Phase2 als Referenz, cherry-pick was brauchbar ist)
```

**Pro:**
- Sauberer Start
- Nur übernehmen was getestet und stabil ist
- AGENTS.md etc. direkt richtig aufsetzen

**Contra:**
- ~20k LOC wegwerfen (oder mühsam cherry-picken)
- Wochenplan-Service (1430 LOC), Import-Service (1048 LOC) nochmal bauen?
- 475+ Tests nochmal schreiben?

### Option C: Phase2 mergen + Cleanup-Sprint ✅ EMPFEHLUNG
```
main ─── merge ← phase2 ─── cleanup/refactoring ─── Weiterentwicklung
```

**Pro:**
- Behält alle Arbeit
- Cleanup als bewusster Schritt (nicht im Hintergrund)
- AGENTS.md, Scripts, Beads etc. aufräumen
- Import-Bugs fixen
- Junk-Resources bereinigen
- Alles danach auf solidem Fundament

**Cleanup-Sprint Scope:**
1. Merge phase2 → main
2. Legacy entfernen (Ralph, Beads, prd.json, alte Scripts)
3. AGENTS.md komplett neu schreiben (Produktbeschreibung, nicht Tooling)
4. progress.txt archivieren
5. Junk-Resources cleanup (Migration)
6. Import-Parser fixen
7. pgAdmin in docker-compose (bereits gemacht)
8. Docs konsolidieren

**Aufwand: ~3-4h** (1 Session)

---

## Empfohlener Ablauf

```
1. Merge feature/wochenplan-phase2 → main        (5 min)
2. Cleanup-Sprint auf main                        (3-4h)
3. Milestone 1 starten (Gantt-Integration)        (9h)
4. Milestone 2 (Projekt erstellen)                (8h)
   → Beta-Tester kontaktieren (Renatos Cousin)
```

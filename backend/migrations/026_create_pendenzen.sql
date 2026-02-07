-- Migration: 026_create_pendenzen
-- Description: Create pendenzen module tables (Pendenzen, Pendenzen-Historie)
-- Note: Reuses existing users table for benutzer references and audit_logs for general auditing.
--       The pendenzen_historie table captures field-level change tracking specific to pendenzen.

-- Enums
DO $$ BEGIN
  CREATE TYPE pendenz_bereich AS ENUM ('avor', 'montage', 'planung', 'material');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pendenz_prioritaet AS ENUM ('hoch', 'mittel', 'niedrig');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pendenz_status AS ENUM ('offen', 'in_arbeit', 'erledigt');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pendenz_kategorie AS ENUM ('projekt', 'allgemein', 'benutzer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Pendenzen table
CREATE TABLE IF NOT EXISTS pendenzen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nr INTEGER NOT NULL,
  beschreibung TEXT NOT NULL,
  bereich pendenz_bereich NOT NULL,
  verantwortlich_id UUID REFERENCES users(id) ON DELETE SET NULL,
  erfasst_von_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  prioritaet pendenz_prioritaet NOT NULL DEFAULT 'mittel',
  status pendenz_status NOT NULL DEFAULT 'offen',
  faellig_bis DATE,
  erledigt_am DATE,
  bemerkungen TEXT,
  auftragsnummer VARCHAR(50),
  kategorie pendenz_kategorie NOT NULL DEFAULT 'projekt',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (project_id, nr)
);

-- Partial indices for active (non-archived) pendenzen
CREATE INDEX IF NOT EXISTS idx_pendenzen_project ON pendenzen(project_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pendenzen_verantwortlich ON pendenzen(verantwortlich_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pendenzen_status ON pendenzen(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pendenzen_faellig ON pendenzen(faellig_bis) WHERE status != 'erledigt' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pendenzen_archived ON pendenzen(archived_at) WHERE archived_at IS NOT NULL;

-- Pendenzen Historie table (field-level change tracking)
CREATE TABLE IF NOT EXISTS pendenzen_historie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendenz_id UUID NOT NULL REFERENCES pendenzen(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  aktion VARCHAR(50) NOT NULL,
  feld VARCHAR(100),
  alter_wert TEXT,
  neuer_wert TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pendenzen_historie_pendenz ON pendenzen_historie(pendenz_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_pendenzen_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pendenzen_updated_at ON pendenzen;
CREATE TRIGGER trg_pendenzen_updated_at
  BEFORE UPDATE ON pendenzen
  FOR EACH ROW
  EXECUTE FUNCTION update_pendenzen_updated_at();

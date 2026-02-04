export type PendenzBereich = 'avor' | 'montage' | 'planung' | 'material';
export type PendenzPrioritaet = 'hoch' | 'mittel' | 'niedrig';
export type PendenzStatus = 'offen' | 'in_arbeit' | 'erledigt';
export type PendenzKategorie = 'projekt' | 'allgemein' | 'benutzer';

export interface Pendenz {
  id: string;
  project_id: string;
  nr: number;
  beschreibung: string;
  bereich: PendenzBereich;
  verantwortlich_id: string | null;
  erfasst_von_id: string;
  prioritaet: PendenzPrioritaet;
  status: PendenzStatus;
  faellig_bis: string | null;
  erledigt_am: string | null;
  bemerkungen: string | null;
  auftragsnummer: string | null;
  kategorie: PendenzKategorie;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface PendenzWithNames extends Pendenz {
  verantwortlich_name: string | null;
  erfasst_von_name: string;
}

export interface PendenzResponse {
  id: string;
  projectId: string;
  nr: number;
  beschreibung: string;
  bereich: PendenzBereich;
  verantwortlichId: string | null;
  verantwortlichName: string | null;
  erfasstVonId: string;
  erfasstVonName: string;
  prioritaet: PendenzPrioritaet;
  status: PendenzStatus;
  faelligBis: string | null;
  erledigtAm: string | null;
  bemerkungen: string | null;
  auftragsnummer: string | null;
  kategorie: PendenzKategorie;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePendenzDTO {
  project_id: string;
  erfasst_von_id: string;
  beschreibung: string;
  bereich: PendenzBereich;
  verantwortlich_id?: string | null;
  prioritaet?: PendenzPrioritaet;
  faellig_bis?: string | null;
  bemerkungen?: string | null;
  auftragsnummer?: string | null;
  kategorie?: PendenzKategorie;
}

export interface UpdatePendenzDTO {
  beschreibung?: string;
  bereich?: PendenzBereich;
  verantwortlich_id?: string | null;
  prioritaet?: PendenzPrioritaet;
  status?: PendenzStatus;
  faellig_bis?: string | null;
  erledigt_am?: string | null;
  bemerkungen?: string | null;
  auftragsnummer?: string | null;
  kategorie?: PendenzKategorie;
}

export interface PendenzHistorie {
  id: string;
  pendenz_id: string;
  user_id: string | null;
  aktion: string;
  feld: string | null;
  alter_wert: string | null;
  neuer_wert: string | null;
  created_at: string;
}

export interface PendenzHistorieResponse {
  id: string;
  pendenzId: string;
  userId: string | null;
  aktion: string;
  feld: string | null;
  alterWert: string | null;
  neuerWert: string | null;
  createdAt: string;
}

export const toPendenzResponse = (row: PendenzWithNames): PendenzResponse => ({
  id: row.id,
  projectId: row.project_id,
  nr: row.nr,
  beschreibung: row.beschreibung,
  bereich: row.bereich,
  verantwortlichId: row.verantwortlich_id,
  verantwortlichName: row.verantwortlich_name ?? null,
  erfasstVonId: row.erfasst_von_id,
  erfasstVonName: row.erfasst_von_name,
  prioritaet: row.prioritaet,
  status: row.status,
  faelligBis: row.faellig_bis,
  erledigtAm: row.erledigt_am,
  bemerkungen: row.bemerkungen,
  auftragsnummer: row.auftragsnummer,
  kategorie: row.kategorie,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toPendenzHistorieResponse = (row: PendenzHistorie): PendenzHistorieResponse => ({
  id: row.id,
  pendenzId: row.pendenz_id,
  userId: row.user_id,
  aktion: row.aktion,
  feld: row.feld,
  alterWert: row.alter_wert,
  neuerWert: row.neuer_wert,
  createdAt: row.created_at,
});

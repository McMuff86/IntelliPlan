import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import type {
  PendenzBereich,
  PendenzPrioritaet,
  PendenzKategorie,
  CreatePendenzDTO,
  UpdatePendenzDTO,
  PendenzResponse,
} from '../../types';

const bereichOptions: { value: PendenzBereich; label: string }[] = [
  { value: 'avor', label: 'AVOR' },
  { value: 'montage', label: 'Montage' },
  { value: 'planung', label: 'Planung' },
  { value: 'material', label: 'Material' },
];

const prioritaetOptions: { value: PendenzPrioritaet; label: string }[] = [
  { value: 'hoch', label: 'Hoch' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'niedrig', label: 'Normal' },
];

const kategorieOptions: { value: PendenzKategorie; label: string }[] = [
  { value: 'projekt', label: 'Projekt' },
  { value: 'allgemein', label: 'Allgemein' },
  { value: 'benutzer', label: 'Benutzer' },
];

interface PendenzFormProps {
  pendenz?: PendenzResponse | null;
  onSubmit: (data: CreatePendenzDTO | UpdatePendenzDTO) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

interface FormErrors {
  beschreibung?: string;
  bereich?: string;
}

const PendenzForm = ({ pendenz, onSubmit, onCancel, loading = false, isEdit = false }: PendenzFormProps) => {
  const [beschreibung, setBeschreibung] = useState(pendenz?.beschreibung ?? '');
  const [bereich, setBereich] = useState<PendenzBereich>(pendenz?.bereich ?? 'avor');
  const [prioritaet, setPrioritaet] = useState<PendenzPrioritaet>(pendenz?.prioritaet ?? 'mittel');
  const [faelligBis, setFaelligBis] = useState(pendenz?.faelligBis ?? '');
  const [bemerkungen, setBemerkungen] = useState(pendenz?.bemerkungen ?? '');
  const [auftragsnummer, setAuftragsnummer] = useState(pendenz?.auftragsnummer ?? '');
  const [kategorie, setKategorie] = useState<PendenzKategorie>(pendenz?.kategorie ?? 'projekt');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when pendenz changes
  useEffect(() => {
    if (pendenz) {
      setBeschreibung(pendenz.beschreibung);
      setBereich(pendenz.bereich);
      setPrioritaet(pendenz.prioritaet);
      setFaelligBis(pendenz.faelligBis ?? '');
      setBemerkungen(pendenz.bemerkungen ?? '');
      setAuftragsnummer(pendenz.auftragsnummer ?? '');
      setKategorie(pendenz.kategorie);
    }
  }, [pendenz]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!beschreibung.trim()) {
      newErrors.beschreibung = 'Beschreibung ist erforderlich';
    } else if (beschreibung.length > 5000) {
      newErrors.beschreibung = 'Beschreibung darf maximal 5000 Zeichen haben';
    }
    if (!bereich) {
      newErrors.bereich = 'Bereich ist erforderlich';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const data: CreatePendenzDTO | UpdatePendenzDTO = {
      beschreibung: beschreibung.trim(),
      bereich,
      prioritaet,
      faelligBis: faelligBis || null,
      bemerkungen: bemerkungen.trim() || null,
      auftragsnummer: auftragsnummer.trim() || null,
      kategorie,
    };

    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler beim Speichern';
      setSubmitError(message);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        {submitError && <Alert severity="error">{submitError}</Alert>}

        <TextField
          label="Beschreibung"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          multiline
          minRows={3}
          maxRows={8}
          required
          error={!!errors.beschreibung}
          helperText={errors.beschreibung}
          fullWidth
          inputProps={{ maxLength: 5000 }}
        />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            select
            label="Bereich"
            value={bereich}
            onChange={(e) => setBereich(e.target.value as PendenzBereich)}
            required
            error={!!errors.bereich}
            helperText={errors.bereich}
            sx={{ minWidth: 160 }}
          >
            {bereichOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Priorität"
            value={prioritaet}
            onChange={(e) => setPrioritaet(e.target.value as PendenzPrioritaet)}
            sx={{ minWidth: 140 }}
          >
            {prioritaetOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Kategorie"
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value as PendenzKategorie)}
            sx={{ minWidth: 140 }}
          >
            {kategorieOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Fällig bis"
            type="date"
            value={faelligBis}
            onChange={(e) => setFaelligBis(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <TextField
            label="Auftragsnummer"
            value={auftragsnummer}
            onChange={(e) => setAuftragsnummer(e.target.value)}
            inputProps={{ maxLength: 50 }}
            sx={{ minWidth: 180 }}
          />
        </Box>

        <TextField
          label="Bemerkungen"
          value={bemerkungen}
          onChange={(e) => setBemerkungen(e.target.value)}
          multiline
          minRows={2}
          maxRows={5}
          fullWidth
          inputProps={{ maxLength: 5000 }}
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 1 }}>
          <Button onClick={onCancel} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Speichern...' : isEdit ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default PendenzForm;

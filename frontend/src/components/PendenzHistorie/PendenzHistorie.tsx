import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ArchiveIcon from '@mui/icons-material/Archive';
import EditIcon from '@mui/icons-material/Edit';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { PendenzHistorieResponse } from '../../types';
import { pendenzService } from '../../services/pendenzService';

interface PendenzHistorieProps {
  pendenzId: string;
  refreshTrigger?: number;
}

const getAktionIcon = (aktion: string) => {
  switch (aktion) {
    case 'erstellt':
      return <CreateIcon fontSize="small" />;
    case 'status_geaendert':
      return <SwapHorizIcon fontSize="small" />;
    case 'archiviert':
      return <ArchiveIcon fontSize="small" />;
    default:
      return <EditIcon fontSize="small" />;
  }
};

const getAktionColor = (aktion: string): string => {
  switch (aktion) {
    case 'erstellt':
      return 'primary.main';
    case 'status_geaendert':
      return 'warning.main';
    case 'archiviert':
      return 'text.disabled';
    default:
      return 'info.main';
  }
};

const formatFeldName = (feld: string | null): string => {
  if (!feld) return '';
  const map: Record<string, string> = {
    beschreibung: 'Beschreibung',
    bereich: 'Bereich',
    verantwortlich_id: 'Verantwortlich',
    prioritaet: 'Priorität',
    status: 'Status',
    faellig_bis: 'Fällig bis',
    erledigt_am: 'Erledigt am',
    bemerkungen: 'Bemerkungen',
    auftragsnummer: 'Auftragsnummer',
    kategorie: 'Kategorie',
  };
  return map[feld] || feld;
};

const formatWert = (feld: string | null, wert: string | null): string => {
  if (!wert) return '–';
  if (feld === 'status') {
    const statusMap: Record<string, string> = {
      offen: 'Offen',
      in_arbeit: 'In Arbeit',
      erledigt: 'Erledigt',
    };
    return statusMap[wert] || wert;
  }
  if (feld === 'prioritaet') {
    const prioMap: Record<string, string> = {
      hoch: 'Hoch',
      mittel: 'Mittel',
      niedrig: 'Normal',
    };
    return prioMap[wert] || wert;
  }
  if (feld === 'bereich') {
    const bereichMap: Record<string, string> = {
      avor: 'AVOR',
      montage: 'Montage',
      planung: 'Planung',
      material: 'Material',
    };
    return bereichMap[wert] || wert;
  }
  return wert;
};

const PendenzHistorie = ({ pendenzId, refreshTrigger }: PendenzHistorieProps) => {
  const [historie, setHistorie] = useState<PendenzHistorieResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await pendenzService.getHistorie(pendenzId);
        if (!cancelled) setHistorie(data);
      } catch {
        if (!cancelled) setError('Historie konnte nicht geladen werden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [pendenzId, refreshTrigger]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (historie.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Keine Historie vorhanden.
      </Typography>
    );
  }

  return (
    <Stack spacing={0} sx={{ position: 'relative', pl: 4 }}>
      {/* Vertical line */}
      <Box
        sx={{
          position: 'absolute',
          left: 15,
          top: 8,
          bottom: 8,
          width: 2,
          bgcolor: 'divider',
        }}
      />
      {historie.map((entry) => (
        <Box
          key={entry.id}
          sx={{
            position: 'relative',
            py: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          {/* Dot */}
          <Box
            sx={{
              position: 'absolute',
              left: -25,
              top: 18,
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              border: 2,
              borderColor: getAktionColor(entry.aktion),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: getAktionColor(entry.aktion),
              zIndex: 1,
            }}
          >
            {getAktionIcon(entry.aktion)}
          </Box>
          <Paper
            variant="outlined"
            sx={{ flex: 1, p: 1.5, ml: 1 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {entry.aktion === 'erstellt' && 'Erstellt'}
                {entry.aktion === 'archiviert' && 'Archiviert'}
                {entry.aktion === 'status_geaendert' && 'Status geändert'}
                {entry.aktion === 'aktualisiert' && `${formatFeldName(entry.feld)} geändert`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(parseISO(entry.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
              </Typography>
            </Box>
            {entry.feld && (
              <Typography variant="caption" color="text.secondary">
                {formatWert(entry.feld, entry.alterWert)} → {formatWert(entry.feld, entry.neuerWert)}
              </Typography>
            )}
          </Paper>
        </Box>
      ))}
    </Stack>
  );
};

export default PendenzHistorie;

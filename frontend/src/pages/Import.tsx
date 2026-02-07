import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import TaskIcon from '@mui/icons-material/Task';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  validateWochenplanImport,
  executeWochenplanImport,
} from '../services/importService';
import type { ImportValidation, ImportResult } from '../services/importService';

type ImportState = 'idle' | 'validating' | 'validated' | 'importing' | 'done' | 'error';

const Import = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ImportState>('idle');
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const resetState = () => {
    setFile(null);
    setState('idle');
    setValidation(null);
    setResult(null);
    setError(null);
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (
      !selectedFile.name.endsWith('.xlsx') &&
      !selectedFile.name.endsWith('.xls')
    ) {
      setError('Bitte eine Excel-Datei (.xlsx) auswählen');
      return;
    }
    setFile(selectedFile);
    setState('idle');
    setValidation(null);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setState('validating');
    setError(null);

    try {
      const v = await validateWochenplanImport(file);
      setValidation(v);
      setState('validated');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error || 'Validierung fehlgeschlagen'
          : 'Validierung fehlgeschlagen';
      setError(msg);
      setState('error');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setState('importing');
    setError(null);

    try {
      const r = await executeWochenplanImport(file);
      setResult(r);
      setState('done');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error || 'Import fehlgeschlagen'
          : 'Import fehlgeschlagen';
      setError(msg);
      setState('error');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Excel Import
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Wochenplan aus Excel importieren. Unterstützt das Format der Wochenplan-Excel-Datei mit
        KW-Sheets.
      </Typography>

      {/* File Upload Zone */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          border: '2px dashed',
          borderColor: dragActive
            ? 'primary.main'
            : file
              ? 'success.main'
              : 'divider',
          bgcolor: dragActive
            ? 'action.hover'
            : file
              ? 'success.main'
              : 'background.paper',
          ...(file && {
            bgcolor: 'rgba(46, 125, 50, 0.04)',
          }),
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          textAlign: 'center',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (state !== 'importing' && state !== 'validating') {
            document.getElementById('file-input')?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        {file ? (
          <Box>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h6">{file.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(file.size)}
            </Typography>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon sx={{ fontSize: 48, mb: 1, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.secondary">
              Excel-Datei hierher ziehen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              oder klicken zum Auswählen (.xlsx)
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={
            state === 'validating' ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <UploadFileIcon />
            )
          }
          onClick={handleValidate}
          disabled={!file || state === 'validating' || state === 'importing'}
        >
          {state === 'validating' ? 'Validiere...' : 'Validieren'}
        </Button>

        <Button
          variant="contained"
          color="success"
          startIcon={
            state === 'importing' ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CheckCircleIcon />
            )
          }
          onClick={handleImport}
          disabled={
            !file ||
            !validation?.valid ||
            state === 'importing' ||
            state === 'validating'
          }
        >
          {state === 'importing' ? 'Importiere...' : 'Importieren'}
        </Button>

        {(state !== 'idle' || file) && (
          <Button variant="outlined" onClick={resetState} disabled={state === 'importing'}>
            Zurücksetzen
          </Button>
        )}
      </Stack>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Fehler</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Validation Results */}
      {validation && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Validierung
          </Typography>

          {validation.valid ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <AlertTitle>Bereit zum Import</AlertTitle>
              Die Datei ist gültig und kann importiert werden.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Fehler gefunden</AlertTitle>
              Die Datei enthält Fehler und kann nicht importiert werden.
            </Alert>
          )}

          {/* Summary */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Zusammenfassung
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip
              icon={<FolderIcon />}
              label={`${validation.summary.projectCount} Projekte`}
              variant="outlined"
            />
            <Chip
              icon={<TaskIcon />}
              label={`${validation.summary.taskCount} Tasks`}
              variant="outlined"
            />
            <Chip
              icon={<PeopleIcon />}
              label={`${validation.summary.resourceCount} Mitarbeiter`}
              variant="outlined"
            />
            <Chip
              icon={<AssignmentIcon />}
              label={`${validation.summary.assignmentCount} Zuweisungen`}
              variant="outlined"
            />
            <Chip
              icon={<CalendarMonthIcon />}
              label={`${validation.summary.phaseScheduleCount} Phasen-Pläne`}
              variant="outlined"
            />
          </Stack>

          {validation.summary.weeksCovered.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Kalenderwochen: {validation.summary.weeksCovered.map((kw) => `KW${kw}`).join(', ')}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Errors */}
          {validation.errors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="error.main">
                Fehler ({validation.errors.length})
              </Typography>
              <List dense>
                {validation.errors.map((err, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ErrorIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={err} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="warning.main">
                Warnungen ({validation.warnings.length})
              </Typography>
              <List dense>
                {validation.warnings.map((warn, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningAmberIcon color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={warn} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      )}

      {/* Import Result */}
      {result && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Import-Ergebnis
          </Typography>

          {result.success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <AlertTitle>Import erfolgreich!</AlertTitle>
              Alle Daten wurden erfolgreich importiert.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Import fehlgeschlagen</AlertTitle>
              {result.errors.join(', ')}
            </Alert>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`${result.projectsCreated} Projekte erstellt`}
              color="success"
              variant="outlined"
              size="small"
            />
            {result.projectsUpdated > 0 && (
              <Chip
                label={`${result.projectsUpdated} Projekte aktualisiert`}
                color="info"
                variant="outlined"
                size="small"
              />
            )}
            <Chip
              label={`${result.tasksCreated} Tasks erstellt`}
              color="success"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${result.resourcesCreated} Mitarbeiter erstellt`}
              color="success"
              variant="outlined"
              size="small"
            />
            {result.resourcesUpdated > 0 && (
              <Chip
                label={`${result.resourcesUpdated} Mitarbeiter aktualisiert`}
                color="info"
                variant="outlined"
                size="small"
              />
            )}
            <Chip
              label={`${result.assignmentsCreated} Zuweisungen`}
              color="success"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${result.phaseSchedulesCreated} Phasen-Pläne`}
              color="success"
              variant="outlined"
              size="small"
            />
          </Stack>

          {result.errors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error.main">
                Fehler ({result.errors.length})
              </Typography>
              <List dense>
                {result.errors.map((err, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ErrorIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={err} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default Import;

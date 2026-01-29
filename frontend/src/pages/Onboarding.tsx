import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  CircularProgress,
  Button,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { industryService } from '../services/industryService';
import type { Industry } from '../types';

const industryIcons: Record<string, string> = {
  carpentry: '\u{1FA9A}',
  architecture: '\u{1F3DB}',
  metalwork: '\u{1F527}',
  electrical: '\u{26A1}',
  hvac: '\u{1F6BF}',
  landscaping: '\u{1F333}',
  general_contractor: '\u{1F3D7}',
  events: '\u{1F3AA}',
  design_agency: '\u{1F3A8}',
  software: '\u{1F4BB}',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    industryService
      .getAll()
      .then(setIndustries)
      .catch(() => setError('Branchen konnten nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id === selectedId ? null : id);
  };

  const handleContinue = async () => {
    try {
      setSaving(true);
      setError(null);
      await authService.updateIndustry(selectedId);
      await refreshUser();
      navigate('/projects');
    } catch {
      setError('Branche konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      setSaving(true);
      await authService.updateIndustry(null);
      await refreshUser();
      navigate('/');
    } catch {
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Willkommen bei IntelliPlan{user?.name ? `, ${user.name}` : ''}!
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Wählen Sie Ihre Branche, um passende Aufgaben-Vorlagen zu erhalten.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {industries.map((industry) => {
          const isSelected = selectedId === industry.id;
          const icon = industry.icon ? industryIcons[industry.icon] || '' : '';
          return (
            <Grid key={industry.id} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card
                variant={isSelected ? 'elevation' : 'outlined'}
                sx={{
                  border: isSelected ? '2px solid' : undefined,
                  borderColor: isSelected ? 'primary.main' : undefined,
                  position: 'relative',
                }}
              >
                <CardActionArea onClick={() => handleSelect(industry.id)} sx={{ p: 2 }}>
                  {isSelected && (
                    <CheckCircleIcon
                      color="primary"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                  <CardContent sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h4" sx={{ mb: 1 }}>
                      {icon}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {industry.name}
                    </Typography>
                    {industry.description && (
                      <Typography variant="caption" color="text.secondary">
                        {industry.description}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button variant="text" onClick={handleSkip} disabled={saving}>
          Überspringen
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={saving || !selectedId}
          size="large"
        >
          {saving ? 'Speichern...' : 'Weiter'}
        </Button>
      </Box>
    </Box>
  );
}

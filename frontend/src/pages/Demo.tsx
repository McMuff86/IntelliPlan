import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SecurityIcon from '@mui/icons-material/Security';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const DEMO_FEATURES = [
  {
    icon: <CalendarMonthIcon sx={{ fontSize: 40 }} />,
    title: 'Terminplanung',
    description: 'Kalender-, Listen- und Gantt-Ansichten. Drag & Drop für schnelle Umplanung. Wochenansicht mit Zeitslots.',
  },
  {
    icon: <AccountTreeIcon sx={{ fontSize: 40 }} />,
    title: 'Projektmanagement',
    description: 'Projekte mit Aufgaben, Abhängigkeiten und Arbeitsslots. Timeline-Ansicht für die Übersicht.',
  },
  {
    icon: <AutoFixHighIcon sx={{ fontSize: 40 }} />,
    title: 'KI-Konfliktlösung',
    description: 'Automatische Erkennung von Terminüberschneidungen mit intelligenten Lösungsvorschlägen.',
  },
  {
    icon: <AccessTimeIcon sx={{ fontSize: 40 }} />,
    title: 'Rückwärtsplanung',
    description: 'Vom Abgabetermin rückwärts planen. Ressourcen und Maschinenkapazitäten automatisch berücksichtigen.',
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: 'DSGVO-konform',
    description: 'Sichere Authentifizierung, Datenexport und Recht auf Löschung. Swiss Hosting.',
  },
  {
    icon: <CalendarMonthIcon sx={{ fontSize: 40 }} />,
    title: 'Arbeitszeitvorlagen',
    description: 'Mo-Fr 8-17 Uhr Vorlagen. Feiertage und Wochenenden flexibel konfigurierbar.',
  },
];

const DEMO_SCHEDULE = [
  { time: '08:00', task: 'Küche Meier – Zuschnitt Korpus', project: 'Küche Meier' },
  { time: '10:00', task: 'Küche Meier – CNC Fronten', project: 'Küche Meier' },
  { time: '13:00', task: 'Einbauschrank Huber – Aufmass', project: 'Schrank Huber' },
  { time: '14:30', task: 'Büromöbel AG – Planung', project: 'Büro AG' },
  { time: '16:00', task: 'Küche Meier – Beschläge montieren', project: 'Küche Meier' },
];

const PRICING_TIERS = [
  { name: 'Starter', price: '50', users: '1 Benutzer', features: ['Terminplanung', 'Kalenderansichten', 'Projekte'] },
  { name: 'Professional', price: '120', users: 'Bis 5 Benutzer', features: ['Alles in Starter', 'KI-Konfliktlösung', 'Rückwärtsplanung', 'Arbeitszeitvorlagen'] },
  { name: 'Enterprise', price: '200', users: 'Unbegrenzt', features: ['Alles in Professional', 'Team-Management', 'API-Zugang', 'Priority Support'] },
];

export default function Demo() {
  const navigate = useNavigate();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.text('IntelliPlan', 20, 25);
      doc.setFontSize(12);
      doc.text('Intelligente Terminplanung für Schreinereien', 20, 35);

      doc.setFontSize(14);
      doc.text('Ergebnisse', 20, 55);
      doc.setFontSize(11);
      doc.text('Bis zu 20+ Stunden pro Woche eingespart', 25, 65);
      doc.text('Keine Terminüberschneidungen mehr', 25, 73);
      doc.text('Automatische Rückwärtsplanung ab Deadline', 25, 81);
      doc.text('DSGVO-konforme Datenhaltung', 25, 89);

      doc.setFontSize(14);
      doc.text('Beispiel-Tagesplan (Schreinerei)', 20, 109);
      doc.setFontSize(10);
      let y = 119;
      DEMO_SCHEDULE.forEach((item) => {
        doc.text(`${item.time}  ${item.task}`, 25, y);
        y += 8;
      });

      doc.setFontSize(14);
      doc.text('Preise', 20, y + 15);
      doc.setFontSize(10);
      y += 25;
      PRICING_TIERS.forEach((tier) => {
        doc.text(`${tier.name}: CHF ${tier.price}/Monat (${tier.users})`, 25, y);
        y += 8;
      });

      doc.setFontSize(10);
      doc.text('Kontakt: info@intelliplan.ch | www.intelliplan.ch', 20, 280);

      doc.save('IntelliPlan-Demo.pdf');
    } catch {
      console.error('PDF export failed');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        sx={{
          p: { xs: 4, md: 6 },
          mb: 4,
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,78,59,0.25) 100%)',
          borderRadius: 3,
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
          IntelliPlan
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Intelligente Terminplanung für Schreinereien
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          Sparen Sie bis zu 20+ Stunden pro Woche mit KI-gestützter Planung,
          automatischer Konfliktlösung und Rückwärtsplanung ab Deadline.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/auth')}
          >
            Jetzt starten
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<DownloadIcon />}
            onClick={handleExportPDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? 'Generiere PDF…' : 'PDF herunterladen'}
          </Button>
        </Box>
      </Paper>

      {/* Features Grid */}
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
        Funktionen
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {DEMO_FEATURES.map((feature, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ color: 'primary.main', mb: 1 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Demo Schedule */}
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
        Beispiel: Tagesplan einer Schreinerei
      </Typography>
      <Paper sx={{ p: 3, mb: 5 }}>
        {DEMO_SCHEDULE.map((item, index) => (
          <Box key={index}>
            <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, gap: 2 }}>
              <Typography variant="body1" fontWeight={600} sx={{ minWidth: 60 }}>
                {item.time}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1">{item.task}</Typography>
              </Box>
              <Chip label={item.project} size="small" variant="outlined" />
            </Box>
            {index < DEMO_SCHEDULE.length - 1 && <Divider />}
          </Box>
        ))}
      </Paper>

      {/* Pricing */}
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
        Preise
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {PRICING_TIERS.map((tier, index) => (
          <Grid key={index} size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                height: '100%',
                border: index === 1 ? 2 : 1,
                borderColor: index === 1 ? 'primary.main' : 'divider',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                {index === 1 && (
                  <Chip label="Empfohlen" color="primary" size="small" sx={{ mb: 1 }} />
                )}
                <Typography variant="h5" fontWeight={700}>
                  {tier.name}
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ my: 2 }}>
                  CHF {tier.price}
                  <Typography component="span" variant="body2" color="text.secondary">
                    /Monat
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {tier.users}
                </Typography>
                <Divider sx={{ my: 2 }} />
                {tier.features.map((feature, fi) => (
                  <Typography key={fi} variant="body2" sx={{ py: 0.5 }}>
                    {feature}
                  </Typography>
                ))}
                <Button
                  variant={index === 1 ? 'contained' : 'outlined'}
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/auth')}
                >
                  Loslegen
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* CTA */}
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,78,59,0.2) 100%)',
          borderRadius: 3,
          mb: 4,
        }}
      >
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Bereit für effizientere Planung?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Starten Sie jetzt und sparen Sie sofort Zeit bei der Terminplanung.
        </Typography>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/auth')}
        >
          Kostenlos testen
        </Button>
      </Paper>
    </Box>
  );
}

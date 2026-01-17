import { Box, Typography, Paper, TextField, MenuItem, Button, Snackbar, Alert, Divider } from '@mui/material';
import { useState } from 'react';
import { useTimezone } from '../hooks/useTimezone';
import { useThemePreference } from '../hooks/useThemePreference';
import { useLayoutPreference } from '../hooks/useLayoutPreference';
import Breadcrumbs from '../components/Breadcrumbs';

export default function Settings() {
  const { timezone, setTimezone, availableTimezones } = useTimezone();
  const { theme, setTheme, themeOptions } = useThemePreference();
  const { layout, setLayout, layoutOptions } = useLayoutPreference();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [selectedLayout, setSelectedLayout] = useState(layout);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setTimezone(selectedTimezone);
    setTheme(selectedTheme);
    setLayout(selectedLayout);
    setSaved(true);
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: 'Settings' }]} />
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 500 }}>
        <Typography variant="h6" gutterBottom>
          Timezone Preferences
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set your preferred timezone for displaying appointment times.
        </Typography>

        <TextField
          select
          label="Preferred Timezone"
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {availableTimezones.map((tz) => (
            <MenuItem key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </MenuItem>
          ))}
        </TextField>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose a theme preset for the overall look and feel.
        </Typography>

        <TextField
          select
          label="Theme"
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value as typeof selectedTheme)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {themeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Layout width"
          value={selectedLayout}
          onChange={(e) => setSelectedLayout(e.target.value as typeof selectedLayout)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {layoutOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSave}>
            Save Settings
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSaved(false)} severity="success">
          Settings saved successfully
        </Alert>
      </Snackbar>
    </Box>
  );
}

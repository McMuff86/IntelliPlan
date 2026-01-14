import { Box, Typography, Paper, TextField, MenuItem, Button, Snackbar, Alert } from '@mui/material';
import { useState } from 'react';
import { useTimezone } from '../hooks/useTimezone';

export default function Settings() {
  const { timezone, setTimezone, availableTimezones } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setTimezone(selectedTimezone);
    setSaved(true);
  };

  return (
    <Box>
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

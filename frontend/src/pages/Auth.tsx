import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  MenuItem,
} from '@mui/material';
import { authService } from '../services/authService';
import { useTimezone } from '../hooks/useTimezone';
import Breadcrumbs from '../components/Breadcrumbs';

type AuthMode = 'login' | 'register';

export default function Auth() {
  const navigate = useNavigate();
  const { timezone, availableTimezones } = useTimezone();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim() || (mode === 'register' && !name.trim())) {
      setError('Please fill out all required fields.');
      return;
    }

    try {
      setLoading(true);
      const response =
        mode === 'register'
          ? await authService.register({
              name: name.trim(),
              email: email.trim(),
              password,
              timezone: selectedTimezone,
            })
          : await authService.login(email.trim(), password);

      localStorage.setItem('token', response.token);
      localStorage.setItem('userId', response.user.id);
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: 'Auth' }]} />
      <Typography variant="h4" component="h1" gutterBottom>
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 480 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_event, next) => next && setMode(next)}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="login">Sign In</ToggleButton>
          <ToggleButton value="register">Register</ToggleButton>
        </ToggleButtonGroup>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {mode === 'register' && (
          <TextField
            label="Full name"
            fullWidth
            margin="normal"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}

        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {mode === 'register' && (
          <TextField
            select
            label="Timezone"
            value={selectedTimezone}
            onChange={(event) => setSelectedTimezone(event.target.value)}
            fullWidth
            margin="normal"
          >
            {availableTimezones.map((tz) => (
              <MenuItem key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Register'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  IconButton,
  InputAdornment,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { authService } from '../services/authService';
import { useTimezone } from '../hooks/useTimezone';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumbs from '../components/Breadcrumbs';

type AuthMode = 'login' | 'register' | 'reset-request' | 'reset-confirm';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { timezone, availableTimezones } = useTimezone();
  const { login: contextLogin, setUser, setToken } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    const token = searchParams.get('token');
    if (action === 'verify' && token) {
      setMode('login');
      setLoading(true);
      authService
        .verifyEmail(token)
        .then(() => setSuccess('Email verified. You can sign in now.'))
        .catch(() => setError('Email verification failed or expired.'))
        .finally(() => setLoading(false));
    }
    if (action === 'reset' && token) {
      setMode('reset-confirm');
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim() || (mode !== 'reset-request' && !password.trim()) || (mode === 'register' && !name.trim())) {
      setError('Please fill out all required fields.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (mode === 'reset-confirm' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'register') {
        const response = await authService.register({
          name: name.trim(),
          email: email.trim(),
          password,
          timezone: selectedTimezone,
        });
        if (response.token) {
          setToken(response.token);
          setUser(response.user);
          navigate('/');
          return;
        }
        setSuccess('Account created. Check your email for a verification link.');
        if (response.verificationLink) {
          setSuccess(`Account created. Verify here: ${response.verificationLink}`);
        }
        return;
      }
      if (mode === 'login') {
        await contextLogin(email.trim(), password);
        navigate('/');
        return;
      }
      if (mode === 'reset-request') {
        await authService.requestPasswordReset(email.trim());
        setSuccess('If the email exists, a reset link was sent.');
        return;
      }
      const token = searchParams.get('token');
      if (!token) {
        setError('Reset token is missing.');
        return;
      }
      await authService.resetPassword(token, password);
      setSuccess('Password updated. You can sign in now.');
      setMode('login');
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { data?: { error?: string } } };
      const message = axiosError.response?.data?.error;
      setError(message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: 'Auth' }]} />
      <Typography variant="h4" component="h1" gutterBottom>
        {mode === 'login'
          ? 'Sign In'
          : mode === 'register'
            ? 'Create Account'
            : mode === 'reset-request'
              ? 'Reset Password'
              : 'Set New Password'}
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 480 }}>
        {mode !== 'reset-confirm' && (
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_event, next) => next && setMode(next)}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="login">Sign In</ToggleButton>
            <ToggleButton value="register">Register</ToggleButton>
            <ToggleButton value="reset-request">Reset</ToggleButton>
          </ToggleButtonGroup>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
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
        {mode !== 'reset-request' && (
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}
        {(mode === 'register' || mode === 'reset-confirm') && (
          <TextField
            label="Confirm password"
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end">
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

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
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                  ? 'Register'
                  : mode === 'reset-request'
                    ? 'Send Reset'
                    : 'Update Password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

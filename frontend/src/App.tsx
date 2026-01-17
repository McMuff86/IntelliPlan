import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, codexTheme } from './theme/theme';
import { useThemePreference } from './hooks/useThemePreference';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Appointments from './pages/Appointments';
import CreateAppointment from './pages/CreateAppointment';
import AppointmentDetail from './pages/AppointmentDetail';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectTimeline from './pages/ProjectTimeline';
import TaskDetail from './pages/TaskDetail';

function App() {
  const { theme } = useThemePreference();
  const activeTheme = theme === 'codex' ? codexTheme : lightTheme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  return (
    <ThemeProvider theme={activeTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/appointments/list" element={<Appointments />} />
            <Route path="/appointments/calendar" element={<Appointments />} />
            <Route path="/appointments/new" element={<CreateAppointment />} />
            <Route path="/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/timeline" element={<ProjectTimeline />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/calendar" element={<Navigate to="/appointments/calendar" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

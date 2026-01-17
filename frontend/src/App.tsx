import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from './theme/theme';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Appointments from './pages/Appointments';
import CreateAppointment from './pages/CreateAppointment';
import AppointmentDetail from './pages/AppointmentDetail';
import Settings from './pages/Settings';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';

function App() {
  return (
    <ThemeProvider theme={lightTheme}>
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
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
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

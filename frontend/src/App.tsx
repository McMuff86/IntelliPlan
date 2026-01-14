import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from './theme/theme';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Appointments from './pages/Appointments';
import CreateAppointment from './pages/CreateAppointment';
import AppointmentDetail from './pages/AppointmentDetail';
import Calendar from './pages/Calendar';

function App() {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/appointments/new" element={<CreateAppointment />} />
            <Route path="/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/calendar" element={<Calendar />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from './theme/theme';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import CreateAppointment from './pages/CreateAppointment';

function App() {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/appointments/new" element={<CreateAppointment />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

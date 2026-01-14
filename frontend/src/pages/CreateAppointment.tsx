import { useNavigate } from 'react-router-dom';
import { Container, Typography } from '@mui/material';
import AppointmentForm from '../components/AppointmentForm';

export default function CreateAppointment() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        New Appointment
      </Typography>
      <AppointmentForm
        onSuccess={() => navigate('/')}
        onCancel={() => navigate('/')}
      />
    </Container>
  );
}

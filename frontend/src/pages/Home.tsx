import { Typography, Box, Grid } from '@mui/material';
import UpcomingAppointments from '../components/UpcomingAppointments';

const Home = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to IntelliPlan
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <UpcomingAppointments />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;

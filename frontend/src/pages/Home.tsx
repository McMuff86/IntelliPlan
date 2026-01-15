import { Typography, Box, Grid } from '@mui/material';
import UpcomingAppointments from '../components/UpcomingAppointments';
import QuickActions from '../components/QuickActions';
import StatsCards from '../components/StatsCards';

const Home = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to IntelliPlan
      </Typography>
      <Box sx={{ mb: 3 }}>
        <StatsCards />
      </Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <UpcomingAppointments />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <QuickActions />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;

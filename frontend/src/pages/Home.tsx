import { Typography, Box, Grid } from '@mui/material';
import UpcomingAppointments from '../components/UpcomingAppointments';
import QuickActions from '../components/QuickActions';
import StatsCards from '../components/StatsCards';

const Home = () => {
  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3,
          background: 'var(--ip-surface-elevated)',
          border: '1px solid var(--ip-outline)',
          boxShadow: 'var(--ip-shadow)',
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Your week at a glance
        </Typography>
        <Typography variant="h3" component="h1" sx={{ mb: 1 }}>
          Welcome back to IntelliPlan
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Focus on what matters next. Review upcoming appointments, jump into new meetings, and stay ahead of your schedule.
        </Typography>
      </Box>
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

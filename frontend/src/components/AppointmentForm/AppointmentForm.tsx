import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { AppointmentFormData, Appointment, OverlapConflict } from '../../types';
import { appointmentService } from '../../services/appointmentService';
import OverlapWarningDialog from '../OverlapWarningDialog';
import { formatISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import axios from 'axios';
import { getStoredTimezone, COMMON_TIMEZONES } from '../../hooks/useTimezone';

interface AppointmentFormProps {
  initialData?: Appointment;
  onSuccess?: (appointment: Appointment) => void;
  onCancel?: () => void;
}

export default function AppointmentForm({
  initialData,
  onSuccess,
  onCancel,
}: AppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlapConflict, setOverlapConflict] = useState<OverlapConflict | null>(null);

  const isEditing = !!initialData;

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<AppointmentFormData>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      startDate: initialData?.startTime ? new Date(initialData.startTime) : null,
      endDate: initialData?.endTime ? new Date(initialData.endTime) : null,
      timezone: initialData?.timezone || getStoredTimezone(),
    },
  });

  const submitForm = async (data: AppointmentFormData, force = false) => {
    if (!data.startDate || !data.endDate) return;

    setIsSubmitting(true);
    setError(null);
    setOverlapConflict(null);

    try {
      const startTimeUTC = formatISO(fromZonedTime(data.startDate, data.timezone));
      const endTimeUTC = formatISO(fromZonedTime(data.endDate, data.timezone));

      const payload = {
        title: data.title,
        description: data.description || undefined,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        timezone: data.timezone,
      };

      let result: Appointment;
      if (isEditing && initialData) {
        result = await appointmentService.update(initialData.id, payload, force);
      } else {
        result = await appointmentService.create(payload, force);
      }

      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setOverlapConflict({
          hasOverlap: true,
          conflicts: err.response.data.conflicts || [],
        });
      } else if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'An error occurred');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: AppointmentFormData) => {
    submitForm(data, false);
  };

  const handleForceSubmit = () => {
    const data = getValues();
    submitForm(data, true);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper elevation={2} sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          {isEditing ? 'Edit Appointment' : 'Create Appointment'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <OverlapWarningDialog
          open={!!overlapConflict}
          conflicts={overlapConflict?.conflicts || []}
          onCancel={() => setOverlapConflict(null)}
          onConfirm={handleForceSubmit}
          isSubmitting={isSubmitting}
        />

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="title"
            control={control}
            rules={{ required: 'Title is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Title"
                fullWidth
                margin="normal"
                error={!!errors.title}
                helperText={errors.title?.message}
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description"
                fullWidth
                margin="normal"
                multiline
                rows={3}
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="startDate"
            control={control}
            rules={{ required: 'Start date is required' }}
            render={({ field }) => (
              <DateTimePicker
                label="Start Date & Time"
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                    error: !!errors.startDate,
                    helperText: errors.startDate?.message,
                  },
                }}
              />
            )}
          />

          <Controller
            name="endDate"
            control={control}
            rules={{
              required: 'End date is required',
              validate: (value) => {
                const startDate = getValues('startDate');
                if (value && startDate && value <= startDate) {
                  return 'End date must be after start date';
                }
                return true;
              },
            }}
            render={({ field }) => (
              <DateTimePicker
                label="End Date & Time"
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                    error: !!errors.endDate,
                    helperText: errors.endDate?.message,
                  },
                }}
              />
            )}
          />

          <Controller
            name="timezone"
            control={control}
            rules={{ required: 'Timezone is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Timezone"
                fullWidth
                margin="normal"
                error={!!errors.timezone}
                helperText={errors.timezone?.message}
                disabled={isSubmitting}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Box
            sx={{
              mt: 3,
              display: 'flex',
              gap: 2,
              justifyContent: { xs: 'stretch', sm: 'flex-end' },
              flexDirection: { xs: 'column-reverse', sm: 'row' },
            }}
          >
            {onCancel && (
              <Button onClick={onCancel} disabled={isSubmitting} fullWidth sx={{ display: { xs: 'block', sm: 'inline-flex' } }}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
              fullWidth
              sx={{ display: { xs: 'flex', sm: 'inline-flex' } }}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
}

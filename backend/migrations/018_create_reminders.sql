CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  remind_at TIMESTAMPTZ NOT NULL,
  reminder_type VARCHAR(20) NOT NULL DEFAULT 'relative',  -- 'relative' or 'absolute'
  offset_minutes INTEGER,  -- e.g., 15 = "15 min before"
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_appointment ON reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE status = 'pending';

-- Migration: 013_add_users_password_hash
-- Description: Add password hash for internal auth

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

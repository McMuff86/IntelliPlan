-- Migration: 000_enable_pgcrypto
-- Description: Enable pgcrypto for gen_random_uuid()

CREATE EXTENSION IF NOT EXISTS pgcrypto;

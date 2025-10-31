-- Migration: add resend_count to otp_verifications
-- Adds a resend_count integer column with default 0 to track OTP resend attempts
-- This statement is idempotent using IF NOT EXISTS so it can be re-run safely

ALTER TABLE otp_verifications
  ADD COLUMN IF NOT EXISTS resend_count integer DEFAULT 0;

-- Add missing core columns to StudySession that should exist
-- These are needed for session logging to work

ALTER TABLE "StudySession"
ADD COLUMN IF NOT EXISTS "startTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "endTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

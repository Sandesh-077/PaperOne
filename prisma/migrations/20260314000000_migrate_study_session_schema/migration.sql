-- Add new columns to StudySession
ALTER TABLE "StudySession" ADD COLUMN "startTime" TIMESTAMP(3);
ALTER TABLE "StudySession" ADD COLUMN "endTime" TIMESTAMP(3);
ALTER TABLE "StudySession" ADD COLUMN "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "StudySession" ADD COLUMN "subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudySession" ADD COLUMN "topic" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudySession" ADD COLUMN "taskType" TEXT NOT NULL DEFAULT 'Revision';
ALTER TABLE "StudySession" ADD COLUMN "paperCode" TEXT;
ALTER TABLE "StudySession" ADD COLUMN "paperYear" INTEGER;
ALTER TABLE "StudySession" ADD COLUMN "deepFocusScore" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "StudySession" ADD COLUMN "questionsAttempted" INTEGER;
ALTER TABLE "StudySession" ADD COLUMN "questionsCorrect" INTEGER;
ALTER TABLE "StudySession" ADD COLUMN "accuracy" DOUBLE PRECISION;
ALTER TABLE "StudySession" ADD COLUMN "mistakeType" TEXT;
ALTER TABLE "StudySession" ADD COLUMN "distractionCount" INTEGER NOT NULL DEFAULT 0;

-- Migrate data from old columns to new columns if they exist and have data
-- Set default values for required fields
UPDATE "StudySession" SET "totalHours" = CASE WHEN "duration" IS NOT NULL THEN "duration" ELSE 0 END WHERE "totalHours" = 0;
UPDATE "StudySession" SET "subject" = 'Unassigned' WHERE "subject" = '';
UPDATE "StudySession" SET "topic" = 'General' WHERE "topic" = '';

-- Create indexes for new columns
CREATE INDEX "StudySession_subject_idx" ON "StudySession"("subject");
CREATE INDEX "StudySession_topic_idx" ON "StudySession"("topic");

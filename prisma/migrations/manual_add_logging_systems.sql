-- Add unitsCompleted and notes to LearningSession
ALTER TABLE "LearningSession" ADD COLUMN IF NOT EXISTS "unitsCompleted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LearningSession" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Create PracticePaperLog table
CREATE TABLE IF NOT EXISTS "PracticePaperLog" (
    "id" TEXT NOT NULL,
    "practicePaperId" TEXT NOT NULL,
    "questionStart" TEXT NOT NULL,
    "questionEnd" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "totalMarks" INTEGER,
    "duration" INTEGER,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticePaperLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "PracticePaperLog_practicePaperId_idx" ON "PracticePaperLog"("practicePaperId");
CREATE INDEX IF NOT EXISTS "PracticePaperLog_date_idx" ON "PracticePaperLog"("date");

-- Add foreign key constraint
ALTER TABLE "PracticePaperLog" 
ADD CONSTRAINT "PracticePaperLog_practicePaperId_fkey" 
FOREIGN KEY ("practicePaperId") 
REFERENCES "PracticePaper"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

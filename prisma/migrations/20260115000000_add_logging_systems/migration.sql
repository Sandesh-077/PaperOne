-- AlterTable
ALTER TABLE "LearningSession" ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "unitsCompleted" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PracticePaperLog_practicePaperId_idx" ON "PracticePaperLog"("practicePaperId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PracticePaperLog_date_idx" ON "PracticePaperLog"("date");

-- AddForeignKey
ALTER TABLE "PracticePaperLog" ADD CONSTRAINT "PracticePaperLog_practicePaperId_fkey" FOREIGN KEY ("practicePaperId") REFERENCES "PracticePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

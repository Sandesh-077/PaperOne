-- AlterTable
ALTER TABLE "PracticePaper" ADD COLUMN IF NOT EXISTS "totalQuestions" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PracticePaperQuestion" (
    "id" TEXT NOT NULL,
    "practicePaperId" TEXT NOT NULL,
    "questionNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'redo',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticePaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PracticePaperQuestion_practicePaperId_idx" ON "PracticePaperQuestion"("practicePaperId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PracticePaperQuestion_status_idx" ON "PracticePaperQuestion"("status");

-- AddForeignKey
ALTER TABLE "PracticePaperQuestion" ADD CONSTRAINT "PracticePaperQuestion_practicePaperId_fkey" FOREIGN KEY ("practicePaperId") REFERENCES "PracticePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

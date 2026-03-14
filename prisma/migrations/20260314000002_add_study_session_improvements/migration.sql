-- AddStudySessionImprovements
-- Add new fields to StudySession for topical papers, notes uploads, and marks tracking
ALTER TABLE "StudySession" 
ADD COLUMN "isTopicalPaper" BOOLEAN DEFAULT false,
ADD COLUMN "topicalPaperName" TEXT,
ADD COLUMN "topicalSource" TEXT,
ADD COLUMN "uploadedPaperUrl" TEXT,
ADD COLUMN "notesAuthor" TEXT,
ADD COLUMN "notesSource" TEXT,
ADD COLUMN "uploadedNotesUrl" TEXT,
ADD COLUMN "totalMarks" INTEGER,
ADD COLUMN "obtainedMarks" INTEGER;

-- Create UserConfig table for custom subjects and task types
CREATE TABLE "UserConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "customSubjects" JSONB NOT NULL DEFAULT '[]',
  "customTaskTypes" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE INDEX "UserConfig_userId_idx" ON "UserConfig"("userId");

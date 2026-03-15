-- CreateTable "ExamEntry"
CREATE TABLE "ExamEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "paperCode" TEXT NOT NULL,
    "paperName" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "targetScore" DOUBLE PRECISION,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable "RevisionPlan"
CREATE TABLE "RevisionPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstExamDate" TIMESTAMP(3) NOT NULL,
    "lastExamDate" TIMESTAMP(3) NOT NULL,
    "studyHoursPerDay" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "planData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable "DailyTask"
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sessionSlot" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "taskDesc" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "studySessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamEntry_userId_idx" ON "ExamEntry"("userId");

-- CreateIndex
CREATE INDEX "ExamEntry_examDate_idx" ON "ExamEntry"("examDate");

-- CreateIndex
CREATE INDEX "RevisionPlan_userId_idx" ON "RevisionPlan"("userId");

-- CreateIndex
CREATE INDEX "DailyTask_userId_date_idx" ON "DailyTask"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyTask_planId_idx" ON "DailyTask"("planId");

-- AddForeignKey
ALTER TABLE "ExamEntry" ADD CONSTRAINT "ExamEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionPlan" ADD CONSTRAINT "RevisionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RevisionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

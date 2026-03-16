-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN "mistakeLogged" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Essay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "content" TEXT NOT NULL,
    "essayType" TEXT,
    "aiFeedback" JSONB,
    "aiFeedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Essay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Essay_userId_idx" ON "Essay"("userId");

-- AddForeignKey
ALTER TABLE "Essay" ADD CONSTRAINT "Essay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

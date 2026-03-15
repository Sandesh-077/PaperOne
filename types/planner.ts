/**
 * Exam Planner TypeScript Interfaces
 * Types for exam tracking, revision planning, and daily tasks
 */

/**
 * Input shape for creating a new exam entry
 */
export interface ExamEntryInput {
  subject: string;
  subjectName: string;
  paperCode: string;
  paperName: string;
  examDate: string;
  timeSlot: "AM" | "PM";
  previousScore?: number;
  targetScore?: number;
  color?: string;
}

/**
 * Exam entry with database metadata
 */
export interface ExamEntry extends ExamEntryInput {
  id: string;
  userId: string;
  createdAt: string;
}

/**
 * Single study session block within a day
 */
export interface PlanSession {
  slot: "morning" | "afternoon" | "evening";
  subject: string;
  subjectName: string;
  task: string;
  type: "revision" | "pastpaper" | "practice" | "rest";
}

/**
 * One day in the revision plan
 */
export interface PlanDay {
  date: string; // YYYY-MM-DD format
  phase: "foundation" | "blitz" | "exam";
  isExamDay?: boolean;
  examOn?: string; // Exam subject if exam day
  sessions: PlanSession[];
}

/**
 * Phase information within a revision plan
 */
export interface RevisionPhase {
  name: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string;
}

/**
 * Complete AI-generated revision plan data
 */
export interface RevisionPlanData {
  phases: RevisionPhase[];
  days: PlanDay[];
}

/**
 * Daily task from database
 */
export interface DailyTask {
  id: string;
  date: string;
  sessionSlot: string;
  subject: string;
  subjectName: string;
  taskDesc: string;
  taskType: string;
  phase: string;
  completed: boolean;
  completedAt?: string;
  studySessionId?: string;
}

/**
 * Subject context for AI plan generation
 */
export interface SubjectContext {
  subject: string;
  subjectName: string;
  papers: Array<{
    paperCode: string;
    paperName: string;
    examDate: string;
    timeSlot: "AM" | "PM";
  }>;
  previousScore?: number;
  targetScore?: number;
  gapSize?: number;
}

/**
 * TypeScript interfaces for the Exam Planner feature
 * Covers exam entries, revision plans, and daily tasks
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

export interface ExamEntry extends ExamEntryInput {
  id: string;
  userId: string;
  createdAt: string;
}

export interface PlanSession {
  slot: "morning" | "afternoon" | "evening";
  subject: string;
  subjectName: string;
  task: string;
  type: "revision" | "pastpaper" | "practice" | "rest";
}

export interface PlanDay {
  date: string; // YYYY-MM-DD format
  phase: "foundation" | "blitz" | "exam";
  isExamDay?: boolean;
  examOn?: string; // Exam subject name if isExamDay is true
  sessions: PlanSession[];
}

export interface RevisionPhase {
  name: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string;
}

export interface RevisionPlanData {
  phases: RevisionPhase[];
  days: PlanDay[];
}

export interface DailyTask {
  id: string;
  date: string; // ISO date string
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

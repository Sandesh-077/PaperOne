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
 * Single topic in a subject session with paper reference and completion tracking
 */
export interface TopicWithPaper {
  name: string;
  paperCode?: string; // e.g., "P4" or "21" if from specific paper
  completed?: boolean;
  completedAt?: string;
}

/**
 * Topic progress for a subject on a specific day
 */
export interface DayTopicProgress {
  dayNumber: number;
  subject: string;
  topics: TopicWithPaper[];
}

/**
 * Subject-wise session within a day
 */
export interface SubjectSessionInDay {
  subject: string; // Subject code: 9701, 9702, 9709, 9618, 8021
  subjectName: string;
  paperCode?: string; // e.g., 9702/21 for specific paper
  topics: (string | TopicWithPaper)[]; // Chapter/topic names, optionally with paper code
  activity: 'revision' | 'topical-past-paper' | 'full-paper';
  focusWeakAreas?: boolean;
  description?: string;
}

/**
 * One day in subject-wise revision plan
 */
export interface SubjectWisePlanDay {
  date: string; // YYYY-MM-DD format
  dayNumber: number;
  phase: 'foundation' | 'blitz' | 'exam';
  isExamDay?: boolean;
  examEntries?: Array<{ subject: string; subjectName: string; paperCode: string; timeSlot: string }>;
  subjects: SubjectSessionInDay[];
}

/**
 * Complete AI-generated revision plan data
 */
export interface RevisionPlanData {
  phases: RevisionPhase[];
  days: PlanDay[];
}

/**
 * Subject-wise revision plan (new format)
 */
export interface SubjectWiseRevisionData {
  phases: RevisionPhase[];
  days: SubjectWisePlanDay[];
  formatVersion: 'subject-wise';
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

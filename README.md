# PaperOne - Comprehensive Project Documentation

**Version:** 2.1.0  
**Last Updated:** March 16, 2026  
**Author:** PaperOne Development Team

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Design Patterns](#architecture--design-patterns)
4. [Database Schema Detailed Guide](#database-schema-detailed-guide)
5. [API Routes Documentation](#api-routes-documentation)
6. [Frontend Structure](#frontend-structure)
7. [Authentication System](#authentication-system)
8. [Core Features Explained](#core-features-explained)
9. [Development Guide](#development-guide)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting & Common Issues](#troubleshooting--common-issues)

---

## Project Overview

### What is PaperOne?

**PaperOne** is a comprehensive digital learning platform designed specifically for A-Level students preparing for examinations across multiple subjects including:

- **A-Level Physics/Chemistry/Biology** (9701, 9702, 9709, 9618, 8021)
- **SAT Preparation**
- **General Education** (custom learning)

The platform transforms traditional exam preparation by providing:

- **Structured Study Tracking** - Log every study session with detailed metrics
- **Performance Analytics** - Weekly and monthly performance summaries
- **Topic Mastery System** - Track learning progress for individual topics
- **Mistake Learning** - Document and reflect on errors to avoid repetition
- **Note Management** - Organize study materials by subject/topic
- **Practice Paper Tracking** - Monitor past paper practice and progress

### Key Philosophy

PaperOne operates on the principle that **structured tracking leads to measurable improvement**. Rather than generic study apps, this platform:

- Forces explicit documentation of study activity
- Provides immediate, data-driven feedback
- Enables students to identify weakness patterns
- Tracks long-term trends and improvements
- Creates accountability through visible progress metrics

---

## Technology Stack

### Frontend Framework

- **Next.js 14.2.0** - React framework with App Router (server-side rendering, API routes, static generation)
- **React 18.3.0** - Component-based UI library
- **TypeScript 5.4.0** - Type-safe JavaScript for development
- **Tailwind CSS 3.4.0** - Utility-first CSS framework for rapid styling

### Backend Infrastructure

- **Next.js API Routes** - Serverless backend endpoints (no separate server needed)
- **Node.js Runtime** - JavaScript/TypeScript execution environment

### Database & ORM

- **PostgreSQL** - Relational database (ACID-compliant, production-grade)
- **Prisma 5.10.0** - Type-safe ORM that generates client based on schema
  - Auto-generates TypeScript types from schema
  - Migration management system
  - Built-in database introspection
  - Connection pooling support

### Authentication & Security

- **NextAuth.js 4.24.0** - Complete authentication solution
  - JWT-based stateless sessions
  - Credentials provider (email/password)
  - Built-in CSRF protection
  - Callback hooks for custom logic
- **bcryptjs 2.4.3** - Password hashing library
  - Uses bcrypt algorithm with salt rounds
  - Industry standard for password security

### Developer Tools

- **ESLint** - Code quality linting
- **Autoprefixer** - CSS vendor prefix automation
- **PostCSS** - CSS transformation tool
- **Nodemailer & Resend** - Email services for OTP and password reset

### Deployment

- **Vercel** - Serverless deployment platform (built for Next.js)
- **Vercel Postgres** - Managed PostgreSQL database as a service

---

## Architecture & Design Patterns

### Overall Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Next.js Pages (React Components + TypeScript)         │  │
│  │  ├── Auth Pages (login, register, forgot-password)     │  │
│  │  └── Dashboard Pages (protected routes)                │  │
│  │      ├── Main Dashboard                                │  │
│  │      ├── Study Sessions                                │  │
│  │      ├── Topic Management                              │  │
│  │      ├── Mistake Logs                                  │  │
│  │      └── Analytics & Reports                           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Backend (Node.js)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  API Routes (/app/api/*)                               │  │
│  │  ├── /api/auth - NextAuth authentication endpoints     │  │
│  │  ├── /api/study-sessions - Session CRUD operations    │  │
│  │  ├── /api/topics - Topic management                    │  │
│  │  ├── /api/mistake-log - Mistake tracking               │  │
│  │  ├── /api/notes - Notes and files                      │  │
│  │  └── /api/stats - Analytics calculations               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQL Queries
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            Prisma ORM & PostgreSQL Database                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  User Accounts                                          │  │
│  │  Study Sessions (timestamped activity logs)            │  │
│  │  Topics & Subtopics (curriculum structure)             │  │
│  │  Topic Mastery (tracking learning progress)            │  │
│  │  Mistake Logs (error reflection & analysis)            │  │
│  │  Weekly/Monthly Performance (aggregated metrics)       │  │
│  │  Notes & Resources (study materials)                   │  │
│  │  Practice Papers (past paper tracking)                 │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Architecture Principles

#### 1. **Layered Architecture**

- **Presentation Layer**: React components with TypeScript
- **API Layer**: Next.js API routes (HTTP endpoints)
- **Business Logic Layer**: Service functions in API routes
- **Data Access Layer**: Prisma ORM for database operations

#### 2. **Separation of Concerns**

- **Pages** - UI rendering only
- **API Routes** - Business logic and database operations
- **Lib Files** - Utility functions and configurations
- **Types** - TypeScript definitions (in `/types`)

#### 3. **Single Responsibility Principle**

Each API route handles one resource:

- `/api/study-sessions` - Study session management
- `/api/topics` - Topic lifecycle
- `/api/mistake-log` - Mistake documentation
- `/api/stats` - Analytics calculations

#### 4. **Stateless Design**

- No server-side session storage
- JWT tokens contain all necessary information
- Enables horizontal scaling

---

## Database Schema Detailed Guide

### Schema Overview

The database is organized around a **Study Tracking Core** with supporting systems for organization and analytics.

### Model Relationships

```
User (1) ──────────┬──────────> StudySession (N)
                   ├──────────> Subject (N)
                   ├──────────> TopicMastery (N)
                   ├──────────> MistakeLog (N)
                   ├──────────> WeeklyPerformance (N)
                   ├──────────> MonthSummary (N)
                   ├──────────> Error (N)
                   └──────────> UserConfig (1)

Subject (1) ──────────┬──────────> Topic (N)
                      ├──────────> PracticePaper (N)
                      └──────────> Note (N)

Topic (1) ────────────┬──────────> Subtopic (N)
                      ├──────────> PracticePaper (N)
                      └──────────> Note (N)

Subtopic (1) ─────────────────────> Note (N)

PracticePaper (1) ─────────────────> [User-defined questions]
```

### Core Models Explained

#### **User Model**

```prisma
model User {
  id              String
  email           String @unique        // User's email (login identifier)
  password        String                // Bcrypt-hashed password
  name            String?               // Display name
  otp             String?               // One-time password for verification
  otpExpires      DateTime?             // OTP expiration timestamp
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  errors          Error[]               // Error logs
  studySessions   StudySession[]        // Study activity logs
  subjects        Subject[]             // Custom subjects
  topicMastery    TopicMastery[]       // Learning progress per topic
  mistakeLogs     MistakeLog[]         // Mistake documentation
  weeklyPerformance WeeklyPerformance[] // Weekly aggregated metrics
  monthSummary    MonthSummary[]       // Monthly aggregated metrics
  config          UserConfig?           // User settings and customizations
}
```

**Key Points:**

- `email` is unique to prevent duplicate accounts
- `password` is never stored in plain text (always hashed with bcryptjs)
- `otp` and `otpExpires` enable email verification flows
- Relations are one-to-many (one user can have many study sessions, topics, etc.)

#### **StudySession Model** (Core Logging System)

```prisma
model StudySession {
  id                String
  userId            String

  // === SESSION TIMING ===
  date              DateTime          // Date of study session
  startTime         DateTime?         // When study started (optional)
  endTime           DateTime?         // When study ended (optional)
  totalHours        Float             // Total duration in hours (calculated or entered)

  // === SUBJECT & TOPIC ===
  subject           String            // Subject code (9701, 9702, SAT, etc.)
  topic             String            // Topic name (e.g., "Mechanics", "Organic Chemistry")

  // === TASK TYPE ===
  taskType          String            // Type of study: "PastPaper" | "Revision" | "Flashcards" | "Notes" | custom

  // === PAST PAPER FIELDS (conditional) ===
  paperCode         String?           // Paper identifier (e.g., "9702/21")
  paperYear         Int?              // Year of paper (e.g., 2023)
  isTopicalPaper    Boolean           // Is this a topical (specific topic) or full paper?
  topicalPaperName  String?           // Name of topical paper if applicable
  topicalSource     String?           // Source/origin of topical paper
  uploadedPaperUrl  String?           // URL to uploaded PDF

  // === NOTES FIELDS (conditional) ===
  notesAuthor       String?           // Author/creator of notes
  notesSource       String?           // Where notes are from
  uploadedNotesUrl  String?           // URL to uploaded notes PDF

  // === PERFORMANCE METRICS ===
  deepFocusScore    Int               // 1-10 scale - how focused was the session?
  questionsAttempted Int?             // (Deprecated) use totalMarks/obtainedMarks
  questionsCorrect  Int?              // (Deprecated) use totalMarks/obtainedMarks
  totalMarks        Int?              // Total marks available in the paper/quiz
  obtainedMarks     Int?              // Marks obtained/earned
  accuracy          Float?            // Auto-calculated: (obtainedMarks / totalMarks) * 100

  // === MISTAKE TRACKING ===
  mistakeType       String?           // Type of mistakes made: "Concept" | "Formula" | "Careless"

  // === DISTRACTIONS ===
  distractionCount  Int               // Number of times distracted during session

  // === NOTES ===
  notes             String? @db.Text  // Freeform notes about the session

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // === INDEXES (for query performance) ===
  @@index([userId])   // Fast lookup by user
  @@index([date])     // Fast lookup by date
  @@index([subject])  // Fast lookup by subject
  @@index([topic])    // Fast lookup by topic
}
```

**Deep Dive - Why This Structure:**

The StudySession model is designed to capture **everything about a study event** in one record:

- Timing data enables calculation of study hours
- Task type determines which optional fields are relevant
- Performance metrics (accuracy, focus score, marks) feed into analytics
- Mistake tracking identifies problem areas
- Distractions reveal environmental/focus issues

**Example CreateSession:**

```typescript
// Logging a 2-hour past paper session
let studySession = await prisma.studySession.create({
  data: {
    userId: "user123",
    date: new Date("2026-03-15"),
    startTime: new Date("2026-03-15T14:00:00"),
    endTime: new Date("2026-03-15T16:00:00"),
    totalHours: 2,
    subject: "9702", // Chemistry A-Level
    topic: "Organic Chemistry",
    taskType: "PastPaper",
    paperCode: "9702/21",
    paperYear: 2023,
    uploadedPaperUrl: "https://uploads.example.com/9702_2023_paper1.pdf",
    totalMarks: 105,
    obtainedMarks: 87, // Student got 87/105
    accuracy: 82.86, // Auto-calculated
    deepFocusScore: 8, // Good focus
    distractionCount: 2, // Got distracted twice
    mistakeType: "Concept", // Made conceptual errors
    notes: "Struggled with carbon bonding questions. Need to revise...",
  },
});
```

#### **TopicMastery Model** (Learning Progress Tracking)

```prisma
model TopicMastery {
  id              String
  userId          String
  subject         String      // A-Level code
  topicName       String      // e.g., "Mechanics", "Waves"

  // MANUAL INPUTS
  confidenceScore Int         // 1-5 scale: how confident in this topic? (1=confused, 5=expert)

  // AUTO-CALCULATED FROM STUDY SESSIONS
  sessionsLogged  Int         // Count of StudySession records for this topic+subject
  lastRevised     DateTime?   // Most recent StudySession.date for this topic
  needsRevision   Boolean     // True if: confidence <= 3 OR lastRevised > 7 days ago

  @@unique([userId, subject, topicName])  // Prevent duplicate topic/user combos
}
```

**Example Flow:**

1. User logs first session: Chemistry "Thermodynamics"
   - System creates TopicMastery(subject="9702", topicName="Thermodynamics")
   - sessionsLogged = 1, lastRevised = today

2. User logs another Thermodynamics session next week
   - System updates: sessionsLogged = 2, lastRevised = today

3. After 7 days without logging:
   - needsRevision = true (auto-flagged for relearning)

#### **MistakeLog Model** (Error Analysis & Reflection)

```prisma
model MistakeLog {
  id              String
  userId          String
  date            DateTime    // When the mistake occurred
  subject         String      // A-Level code
  topic           String      // What topic was it about?

  // MISTAKE DETAILS (all required - forces reflection)
  whatWentWrong   String      // Description of the error
  correctMethod   String      // What should have been done?
  formulaOrConcept String     // Key formula/concept involved
  mistakeType     String      // "Concept" | "Formula" | "Careless"

  reviewed        Boolean     // Has student reviewed and understood the mistake?

  @@index([userId])
  @@index([date])
  @@index([subject])
  @@index([reviewed])   // Can query "unreviewed mistakes"
}
```

**Educational Purpose:**
This model forces students to engage in metacognition:

- "What went wrong?" - Identify the error
- "What's the correct method?" - Learn the right approach
- "What formula/concept?" - Connect to underlying knowledge
- "Mistake type?" - Categorize to identify patterns

#### **WeeklyPerformance Model** (Aggregated Weekly Metrics)

```prisma
model WeeklyPerformance {
  id              String
  userId          String
  subject         String
  weekStartDate   DateTime    // Monday of the week
  weekEndDate     DateTime    // Sunday of the week

  // === STUDY HOURS COMPONENT ===
  studyHours      Float       // Sum of totalHours from all sessions that week
  studyHoursScore Float       // (studyHours / 35) * 25, capped at 25

  // === ACCURACY COMPONENT ===
  accuracy        Float       // Average accuracy from all sessions with marks
  accuracyScore   Float       // accuracy * 0.30, capped at 30

  // === FOCUS COMPONENT ===
  avgFocusScore   Float       // Average deepFocusScore from all sessions
  focusScore      Float       // (avgFocusScore / 10) * 20, capped at 20

  // === PAST PAPERS COMPONENT ===
  papersCompleted Int         // Count of sessions with taskType="PastPaper"
  papersScore     Float       // (papersCompleted / 5) * 15, capped at 15

  // === DISTRACTIONS COMPONENT ===
  totalDistractions Int       // Sum of all distractionCount
  distractionScore Float      // max(10 - (totalDistractions * 0.5), 0), capped at 10

  // === OVERALL RATING ===
  weeklyRating    Float       // Sum of all 5 scores = out of 100 possible points
  gradeLabel      String      // "Elite" | "Strong" | "Building" | "Weak" | "Lock In"
  deltaPreviousWeek Float?    // This week's rating - last week's rating (trend)

  // === REFLECTION FIELDS ===
  reflection      String?     // Student's end-of-week reflection
  nextWeekGoal    String?     // Goal for next week
  biggestWin      String?     // What went well this week?

  @@unique([userId, subject, weekStartDate])
}
```

**Scoring System Deep Dive:**

The weekly grade is calculated from 5 components:

| Component    | Max Points | Formula                     | Purpose                                                 |
| ------------ | ---------- | --------------------------- | ------------------------------------------------------- |
| Study Hours  | 25         | (hours / 35) × 25           | Incentivizes consistent study (35 hrs/week target)      |
| Accuracy     | 30         | average_accuracy × 0.30     | Rewards correct answers                                 |
| Focus        | 20         | (avg_focus_score / 10) × 20 | Rewards quality study                                   |
| Papers       | 15         | (completed / 5) × 15        | Incentivizes past paper practice (5 papers/week target) |
| Distractions | 10         | max(10 - (count × 0.5), 0)  | Penalizes distractions                                  |
| **TOTAL**    | **100**    | Sum of all                  | Overall weekly performance                              |

**Grade Labels:**

- **Elite** (90-100) - Exceptional week
- **Strong** (75-89) - Very good week
- **Building** (60-74) - Making progress
- **Weak** (45-59) - Needs improvement
- **Lock In** (0-44) - Critical improvement needed

#### **MonthSummary Model** (Aggregated Monthly Metrics)

```prisma
model MonthSummary {
  id              String
  userId          String
  subject         String
  monthYear       String      // Format: "2026-03" (March 2026)

  // AGGREGATED FROM 4 WEEKS
  totalStudyHours Float       // Sum of weekly studyHours across month
  totalPapers     Int         // Sum of weekly papersCompleted
  averageAccuracy Float       // Average of weekly accuracy values
  bestWeekRating  Float       // Max rating achieved in any week
  worstWeekRating Float       // Min rating achieved in any week
  week4MinusWeek1 Float?      // Trend: Week 4 rating - Week 1 rating (improvement)

  monthGrade      String      // "A*" | "A" | "B" | "C" | "D" | "Needs Work"
}
```

#### **Subject & Topic Models** (Curriculum Organization)

```prisma
model Subject {
  id          String
  userId      String
  name        String      // e.g., "Chemistry A2", "SAT Math"
  type        String      // "alevel" | "sat" | "extra"
  level       String?     // "AS" | "A2" for A-Level, "Paper 3" for SAT
  color       String?     // For UI display
  icon        String?     // For UI display

  topics      Topic[]     // One subject has many topics
  practicePapers PracticePaper[]
  notes       Note[]
}

model Topic {
  id          String
  subjectId   String
  subject     Subject @relation(...)
  name        String      // e.g., "Mechanics"
  description String?
  order       Int         // Display order
  completed   Boolean     // Is this topic fully completed?
  completedAt DateTime?   // When was it marked complete?

  subtopics   Subtopic[]  // Topics can have subtopics
  practicePapers PracticePaper[]
  notes       Note[]
}

model Subtopic {
  id          String
  topicId     String
  topic       Topic @relation(...)
  name        String      // e.g., "Newton's Laws"
  description String?
  order       Int
  completed   Boolean
  completedAt DateTime?

  notes       Note[]
}
```

#### **PracticePaper Model** (Past Paper Tracking)

```prisma
model PracticePaper {
  id              String
  subjectId       String
  topicId         String?

  paperName       String      // e.g., "2023 May/June Paper 1"
  paperType       String      // "full" | "topical" | "printed"
  pdfUrl          String?     // URL to PDF file
  questionStart   String      // e.g., "1", "5a"
  questionEnd     String      // e.g., "10", "8c"
  totalQuestions  Int?        // Total question count

  completed       Boolean     // All questions logged?
  score           Int?        // Total score
  totalMarks      Int?        // Total available marks
  notes           String?

  reminderDate    DateTime?   // When to practice again
  reminderDays    Int?        // Days before next reminder
}
```

#### **Note Model** (Study Materials)

```prisma
model Note {
  id              String
  subjectId       String?
  topicId         String?
  subtopicId      String?

  title           String
  content         String?
  fileUrl         String?     // URL to PDF, image, video
  fileType        String?     // "pdf" | "image" | "video" | "link"
  lastViewedAt    DateTime?
  lastPosition    String?     // Resume position (page number, timestamp)
}
```

#### **UserConfig Model** (Customization)

```prisma
model UserConfig {
  id              String
  userId          String @unique

  customSubjects  Json        // Array of { name: string, code: string }
  customTaskTypes Json        // Array of custom task type names
}
```

---

## API Routes Documentation

### API Route Architecture

All API routes follow this pattern:

```
/app/api/[resource]/route.ts  → Handles GET, POST for that resource
/app/api/[resource]/[id]/route.ts → Handles GET, PUT, DELETE for specific record
```

### Authentication Flow

All protected routes must verify the user's session:

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Now safe to use session.user.id as authenticated user
  const userId = session.user.id;
  // ... proceed with database operations
}
```

### Study Sessions Endpoints

#### `GET /api/study-sessions`

**Purpose:** Fetch user's study sessions

**Query Parameters:**

- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Skip this many records (for pagination)
- `subject` (optional): Filter by subject
- `startDate` (optional): Filter sessions after this date
- `endDate` (optional): Filter sessions before this date

**Response:**

```typescript
{
  sessions: StudySession[],
  total: number
}
```

#### `POST /api/study-sessions`

**Purpose:** Create a new study session

**Request Body:**

```typescript
{
  date: string (ISO date),
  startTime?: string,
  endTime?: string,
  totalHours: number,
  subject: string,
  topic: string,
  taskType: string,
  deepFocusScore: number,
  obtainedMarks?: number,
  totalMarks?: number,
  accuracy?: number,
  distractionCount?: number,
  notes?: string,
  // ... other conditional fields based on taskType
}
```

**Response:** Created StudySession object

#### `GET /api/study-sessions/[id]`

**Purpose:** Fetch a specific study session

**Response:** StudySession object

#### `PUT /api/study-sessions/[id]`

**Purpose:** Update a study session

**Response:** Updated StudySession object

#### `DELETE /api/study-sessions/[id]`

**Purpose:** Delete a study session

**Response:** Success message

---

### Grammar AI Endpoints

#### `POST /api/ai/grammar`

**Purpose:** Analyze text for grammar errors using Groq AI

**Request Body:**

```typescript
{
  text: string; // Plain text (max 2000 characters)
}
```

**Response:**

```typescript
{
  errors: Array<{
    original: string,
    corrected: string,
    explanation: string,
    type: 'grammar' | 'punctuation' | 'register' | 'tense'
  }>,
  correctedText: string,
  overallComment: string,
  score: number  // 0-10
}
```

**Error Handling:**

- `400`: Text exceeds 2000 characters
- `401`: Unauthorized (no session)
- `500`: AI service error

---

### Vocabulary AI Endpoints

#### `POST /api/ai/vocabulary`

**Purpose:** Learn vocabulary or improve writing suggestions using Gemini AI

**Request Body - Learn Mode:**

```typescript
{
  mode: "word",
  word: string  // Single word to learn
}
```

**Response - Learn Mode:**

```typescript
{
  word: string,
  definition: string,
  academicExample: string,
  synonyms: Array<{
    word: string,
    nuance: string
  }>,
  gpTip: string
}
```

**Request Body - Improve Mode:**

```typescript
{
  mode: "passage",
  passage: string  // Text to improve
}
```

**Response - Improve Mode:**

```typescript
{
  suggestions: Array<{
    original: string;
    alternatives: string[];
    why: string;
  }>;
}
```

**Error Handling:**

- `400`: Invalid mode or missing required field
- `401`: Unauthorized (no session)
- `500`: AI service error

---

### Essay Endpoints

#### `GET /api/essays`

**Purpose:** Fetch all essays for the user

**Response:**

```typescript
{
  essays: Array<{
    id: string;
    title: string;
    prompt?: string;
    content: string;
    wordCount: number;
    essayType: string;
    grade?: string;
    aiFeedback?: object;
    aiFeedbackAt?: string;
    createdAt: string;
  }>;
}
```

#### `POST /api/essays`

**Purpose:** Create a new essay

**Request Body:**

```typescript
{
  title: string,
  prompt?: string,
  content: string,
  essayType: 'full' | 'introduction' | 'conclusion' | 'argument' | 'counterclaim' | 'rebuttal',
  grade?: string,
  notes?: string
}
```

**Response:** Created Essay object

#### `GET /api/essays/[id]`

**Purpose:** Fetch a specific essay with AI feedback if available

**Response:** Essay object with aiFeedback

#### `PATCH /api/essays/[id]`

**Purpose:** Update an essay

**Request Body:** Partial Essay object (any fields to update)

**Response:** Updated Essay object

#### `DELETE /api/essays/[id]`

**Purpose:** Delete an essay

**Response:** Success message

#### `POST /api/essays/[id]/feedback`

**Purpose:** Generate AI feedback on essay using Gemini AI (Cambridge GP 8021 evaluation)

**Response:**

```typescript
{
  feedback: {
    ao1: {
      band: string,
      score: number,
      strengths: string[],
      improvements: string[]
    },
    ao2: {
      band: string,
      score: number,
      strengths: string[],
      improvements: string[]
    },
    ao3: {
      band: string,
      score: number,
      strengths: string[],
      improvements: string[]
    },
    overall: {
      total: string,    // "38/50"
      grade: string,    // "A", "B", "C", "D", "E"
      topFix: string,
      topStrength: string
    }
  }
}
```

---

### Weekly Performance Endpoints

#### `GET /api/weekly-performance/[weekStartDate]`

**Purpose:** Delete a study session

**Response:** Deleted StudySession object

### Topics Endpoints

#### `GET /api/topics`

**Purpose:** Fetch all topics for a subject

**Query Parameters:**

- `subject`: Subject code (required)
- `includeMastery`: Include TopicMastery data? (boolean)

**Response:**

```typescript
{
  topics: Topic[],
  mastery?: TopicMastery[]
}
```

#### `POST /api/topics`

**Purpose:** Create a new topic

**Request Body:**

```typescript
{
  subjectId: string,
  name: string,
  description?: string,
  order?: number
}
```

#### `GET /api/subtopics/[id]`

**Purpose:** Fetch subtopics for a topic

**Response:** Subtopic[]

#### `POST /api/subtopics`

**Purpose:** Create subtopic under a topic

**Request Body:**

```typescript
{
  topicId: string,
  name: string,
  description?: string
}
```

### Mistake Log Endpoints

#### `GET /api/mistake-log`

**Purpose:** Fetch user's mistake log

**Query Parameters:**

- `subject` (optional)
- `reviewed` (optional): boolean - filter by review status

**Response:** MistakeLog[]

#### `POST /api/mistake-log`

**Purpose:** Log a new mistake

**Request Body:**

```typescript
{
  date: string,
  subject: string,
  topic: string,
  whatWentWrong: string,
  correctMethod: string,
  formulaOrConcept: string,
  mistakeType: "Concept" | "Formula" | "Careless"
}
```

#### `PUT /api/mistake-log/[id]`

**Purpose:** Update mistake (mark as reviewed, update details)

**Request Body:** Partial MistakeLog

### Weekly Performance Endpoints

#### `GET /api/weekly-performance/[weekStartDate]`

**Purpose:** Fetch weekly performance for a specific week

**Response:**

```typescript
{
  subject: string,
  weekStartDate: DateTime,
  weeklyRating: number,
  gradeLabel: string,
  studyHours: number,
  accuracy: number,
  // ... all performance metrics
}
```

#### `GET /api/weekly-performance/[weekStartDate]/[subject]`

**Purpose:** Fetch weekly performance for specific subject

**Response:** WeeklyPerformance object

---

## Frontend Structure

### File Organization

```
app/
├── globals.css              # Global CSS (Tailwind imports)
├── layout.tsx               # Root layout with NextAuth provider
├── page.tsx                 # Home page (redirects to dashboard)
├── providers.tsx            # SessionProvider wrapper
│
├── (dashboard)/              # Route group - shared layout
│   ├── layout.tsx           # Dashboard layout (navigation, sidebar)
│   ├── dashboard/
│   │   └── page.tsx         # Main dashboard view
│   ├── grammar/
│   │   └── page.tsx         # Grammar checker + save rules
│   ├── vocabulary/
│   │   └── page.tsx         # Learn words + improve writing
│   ├── essays/
│   │   ├── page.tsx         # Essays list
│   │   ├── new/
│   │   │   └── page.tsx     # Write new essay
│   │   └── [id]/
│   │       └── page.tsx     # View/edit essay + AI feedback
│   ├── session-log/
│   │   └── page.tsx         # Log study sessions
│   ├── sessions/
│   │   └── page.tsx         # View all sessions + filters + edit
│   ├── exam-planner/
│   │   └── page.tsx         # Plan exams + generate revision
│   └── [other modules]/
│
├── api/                      # API routes (backend endpoints)
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts     # NextAuth handler
│   ├── ai/
│   │   ├── grammar/
│   │   │   └── route.ts     # POST AI grammar check
│   │   └── vocabulary/
│   │       └── route.ts     # POST AI vocabulary learn/improve
│   ├── essays/
│   │   ├── route.ts         # GET/POST essays
│   │   └── [id]/
│   │       ├── route.ts     # GET/PATCH/DELETE essay
│   │       └── feedback/
│   │           └── route.ts # POST essay AI feedback
│   ├── study-sessions/
│   │   ├── route.ts         # GET/POST sessions
│   │   └── [id]/
│   │       └── route.ts     # GET/PUT/DELETE specific session
│   └── [other endpoints]/
│
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
├── forgot-password/
│   └── page.tsx

components/
└── Navigation.tsx           # Main navigation component

lib/
├── prisma.ts               # Prisma client singleton
├── auth.ts                 # NextAuth configuration
├── study-session.ts        # Study session utilities
├── topics.ts               # Topic management utilities
├── revision-scheduler.ts   # Scheduling logic
└── essay-topics.ts        # Essay prompt data

types/
└── next-auth.d.ts         # NextAuth type extensions

prisma/
├── schema.prisma          # Database schema
└── migrations/            # Migration history
```

### Key Page Components

#### Dashboard Layout (`(dashboard)/layout.tsx`)

- Main navigation/sidebar
- Protected route guard
- Consistent styling across dashboard

#### Dashboard Page (`(dashboard)/dashboard/page.tsx`)

- Widget layout with key metrics
- Study session summary
- Weekly performance graph
- Topic mastery overview
- Quick action buttons

### Component Architecture

All components are React Server Components by default (in App Router):

```typescript
// page.tsx (Server Component)
export default async function DashboardPage() {
  const session = await getServerSession()
  const stats = await fetchDashboardStats(session.user.id)

  return (
    <div>
      <StatCard data={stats} />
      <ChartComponent data={stats.weeklyData} />
    </div>
  )
}
```

Client-side interactivity uses `'use client'`:

```typescript
// Interactive component
'use client'

import { useState } from 'react'

export function StudySessionForm() {
  const [formData, setFormData] = useState(...)

  const handleSubmit = async (e) => {
    // Client-side form handling
  }

  return (...)
}
```

---

## Authentication System

### How NextAuth Works in PaperOne

#### 1. **Setup** (`lib/auth.ts`)

```typescript
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      // Defines email/password login
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // 2. Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        // 3. Return user object if valid (DO NOT return password!)
        if (isPasswordValid) {
          return { id: user.id, email, name };
        }
      },
    }),
  ],

  session: {
    strategy: "jwt", // Use JWT instead of database sessions
  },

  callbacks: {
    // Add user.id to JWT token
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },

    // Add token info to session object
    async session({ session, token }) {
      if (session.user) session.user.id = token.id;
      return session;
    },
  },
};
```

#### 2. **Registration Flow**

```typescript
// /api/register route
export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });
  if (existing) throw new Error("User already exists");

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      config: { create: {} }, // Create default config
    },
  });

  return Response.json({ success: true });
}
```

#### 3. **Login Flow**

1. User enters credentials on `/login`
2. Form submits to NextAuth sessions callback
3. NextAuth calls `authorize()` function
4. Password is verified with bcryptjs
5. JWT token is created with user.id
6. Cookie with token is set (httpOnly for security)
7. User is redirected to dashboard

#### 4. **Protected Routes**

```typescript
// Any page can check authentication:
const session = await getServerSession(authOptions);

if (!session) {
  redirect("/login"); // Force login
}
```

#### 5. **Password Security**

- **Hashing Algorithm**: bcrypt with salt rounds = 10
- **Never Stored**: Plain passwords never stored in database
- **Comparison**: Used bcryptjs.compare() to verify
- **Hash Cost**: ~100ms per hash (intentionally slow to prevent brute force)

---

## Core Features Explained

### Feature 1: AI-Powered Grammar Checker

**What It Does:**
Real-time grammar analysis using Groq AI (LLaMA 3.3 70B). Students paste text and receive detailed feedback on grammar, punctuation, register, and tense issues specific to Cambridge A-Level General Paper (8021).

**How It Works:**

1. Student pastes text (max 2000 characters) in grammar checker
2. Groq AI analyzes for common errors:
   - Subject-verb agreement
   - Tense consistency
   - Article usage (a/an/the)
   - Prepositions
   - Sentence fragments
   - Informal words that should be academic
3. System returns:
   - **Error list** with original/corrected versions, explanations, and type badges
   - **Overall score** (0-10)
   - **Full corrected text** (copyable)
   - **No errors state** with positive reinforcement

**Data Structure:**

```typescript
GrammarFeedback {
  errors: Array<{
    original: string,
    corrected: string,
    explanation: string,
    type: 'grammar' | 'punctuation' | 'register' | 'tense'
  }>,
  correctedText: string,
  overallComment: string,
  score: number (0-10)
}
```

**API Route:** `POST /api/ai/grammar`

**UI Features:**

- Character counter (visual warning at 1800+)
- Loading state during analysis
- Color-coded error type badges
- Copy button for corrected text
- Separate section for saving grammar rules

### Feature 2: AI-Powered Vocabulary Coach

**What It Does:**
Dual-mode vocabulary enhancement using Gemini 2.0 Flash AI. Learn new words with academic context or improve existing writing with better vocabulary suggestions.

**Two Modes:**

**Mode 1: Learn a Word**

- Enter any word
- Get:
  - Clear definition
  - Academic example sentence
  - Synonyms with nuance explanations
  - GP-specific tips (how this word impresses examiners)

**Mode 2: Improve My Writing**

- Paste any passage (essay, practice answer, etc.)
- AI identifies 3-5 repetitive or weak vocabulary choices
- For each suggestion:
  - Shows original word
  - Lists better alternatives
  - Explains "why better" for learning

**Data Structure - Learn Mode:**

```typescript
WordTeaching {
  word: string,
  definition: string,
  academicExample: string,
  synonyms: Array<{
    word: string,
    nuance: string  // How it differs from main word
  }>,
  gpTip: string  // Exam strategy tip
}
```

**Data Structure - Improve Mode:**

```typescript
VocabularySuggestion {
  original: string,
  alternatives: string[],
  why: string  // Explanation of improvement
}
```

**API Route:** `POST /api/ai/vocabulary`

**UI Features:**

- Tab-based interface (Learn | Improve)
- Responsive suggestion cards
- Color-coded badges for alternatives
- Contextual explanations

### Feature 3: Essay Management with AI Feedback

**What It Does:**
Complete essay authoring and assessment system. Students write essays in multiple formats (full, introduction, conclusion, argument paragraph, counter-claim, rebuttal) and receive automated feedback aligned to Cambridge GP 8021 mark scheme.

**Essay Types:**

- Full Essay (complete response)
- Introduction
- Conclusion
- Argument Paragraph
- Counter-claim
- Rebuttal

**AI Feedback System:**

Uses Gemini AI to evaluate essays against Cambridge criteria across 3 Assessment Objectives:

**AO1: Content** (25 points)

- Quality of ideas and arguments
- Relevance to the prompt
- Use of evidence/examples
- Structural coherence

**AO2: Language** (15 points)

- Vocabulary range and accuracy
- Sentence structures
- Register (formal academic tone)
- Grammar and spelling

**AO3: Structure** (10 points)

- Logical argument flow
- Paragraph organization
- Clear introduction/conclusion
- Transitional phrases

**Feedback Output:**

```typescript
EssayFeedback {
  ao1: {
    band: string,        // "A" | "B" | "C" | "D" | "E"
    score: number,       // 0-25
    strengths: string[],
    improvements: string[]
  },
  ao2: { ... },
  ao3: { ... },
  overall: {
    total: string,       // "38/50"
    grade: string,       // "A" | "B" | "C" | "D" | "E"
    topFix: string,      // Priority improvement
    topStrength: string  // Key strength
  }
}
```

**API Routes:**

- `GET /api/essays` - List all essays
- `POST /api/essays` - Create new essay
- `GET /api/essays/[id]` - Fetch single essay
- `PATCH /api/essays/[id]` - Update essay
- `DELETE /api/essays/[id]` - Delete essay
- `POST /api/essays/[id]/feedback` - Generate AI feedback

**UI Features:**

- Essay type selector (6 pill buttons)
- Word count tracker
- AI feedback button with regeneration option
- Three color-coded AO cards (Blue/Green/Purple)
- Summary bar with score, grade, top priority, top strength
- Full essay display with saved metadata

### Feature 4: Study Session Logging

**What It Does:**
Students record every study session with comprehensive metadata about what they studied, how well they did, and how focused they were.

**Why It Matters:**

- Creates accountability and habit tracking
- Enables performance analysis
- Identifies subject/topic weaknesses
- Shows study duration trends

**Data Captured Per Session:**

```
timing: date, startTime, endTime, totalHours
content: subject, topic, taskType
performance: accuracy, obtainedMarks, totalMarks, deepFocusScore
environment: distractionCount
mistakes: mistakeType categorization
notes: freeform observations
chapter: for revision sessions
```

**Data Analysis:**

- Weekly aggregation calculates performance scores
- Monthly trends show improvement
- Subject-specific metrics guide revision priorities
- Topic mastery tracking identifies weak areas
- Filters: by subject, task type, date range, search term

**Session Editor:**

- Modal interface for editing past sessions
- Task-type specific fields shown conditionally
- Full CRUD operations (Create, Read, Update, Delete)

### Feature 5: Topic Mastery System

**What It Does:**
Automatically tracks learning progress for each topic within each subject.

**How It Works:**

1. **Student logs first session for a topic**
   - System creates TopicMastery record
   - initializes: sessionsLogged=1, lastRevised=today

2. **System tracks study frequency**
   - Each session updates: sessionsLogged++, lastRevised=today
   - After 7 days without studying: needsRevision=true

3. **Student rates confidence**
   - confidenceScore (1-5): their self-assessment
   - System calculates: needsRevision = confidence ≤ 3 OR lastRevised > 7 days

4. **Dashboard shows revision needed**
   - Color-coded topics needing revisitation
   - Suggested study order based on confidence + recency

**Use Cases:**

- "Which topics should I study this week?" → Check needsRevision=true
- "Am I improving in Physics?" → Compare accuracy over time
- "How prepared am I for Organic Chemistry?" → View sessionsLogged + lastRevised

### Feature 6: Mistake Analysis

**Educational Value:**
Forces metacognitive reflection on errors.

**Data Structure:**
Each mistake requires:

- **What went wrong?** (Error description)
- **Correct method** (Proper approach)
- **Formula/concept** (Key underlying knowledge)
- **Mistake type** (Concept | Formula | Careless)
- **Reviewed?** (Student has reflected and understood?)

**Analytics Enabled:**

- "What are my most common mistake types?" → Find patterns
- "Which topics have most mistakes?" → Prioritize revision
- "How many mistakes am I still not reviewing?" → Track reflection rate

### Feature 7: Weekly Performance Scoring

**Scoring System:**

The system evaluates weekly performance across 5 dimensions:

**1. Study Hours (25 points)**

- Formula: (totalHours / 35) × 25
- Target: 35 hours/week (7 hours/day)
- Rationale: Consistency is key for exam prep

**2. Accuracy (30 points)**

- Formula: (averageAccuracy) × 0.30
- Highest weight component
- Encourages correct answers over volume

**3. Focus Quality (20 points)**

- Formula: (avgFocusScore / 10) × 20
- Based on student's self-rated deepFocusScore (1-10)
- Discourages distracted study sessions

**4. Past Papers (15 points)**

- Formula: (papersCompleted / 5) × 15
- Target: 5 past papers/week
- Realistic exam simulation practice

**5. Distraction Penalty (10 points)**

- Formula: max(10 - (totalDistractions × 0.5), 0)
- Each distraction costs 0.5 points
- Encourages focus environment

**Total:** 0-100 points per week

**Grade Translation:**

- Elite: 90-100 (A+ week)
- Strong: 75-89 (Solid week)
- Building: 60-74 (Progressive week)
- Weak: 45-59 (Needs effort)
- Lock In: 0-44 (Critical focus needed)

**Trend Analysis:**

- `deltaPreviousWeek`: This week's rating - last week's rating
- Positive delta = progressing
- Negative delta = declining

### Feature 8: User Configuration

**What Customizes:**

```json
{
  "customSubjects": [
    { "name": "Special Math", "code": "MATH_SPECIAL" },
    { "name": "Extended Physics", "code": "PHYS_EXT" }
  ],
  "customTaskTypes": ["Group Study", "VidyoWatch", "PastPaperDrill"]
}
```

**Why It Matters:**

- Users have different curricula (A-Level, IB, SAT, etc.)
- Different schools use different task categories
- Flexibility to adapt to student's exact needs

### Feature 9: Integrated Learning System (v2.1.0)

**Philosophy:**
Combine vocabulary mastery, writing practice, grammar analysis, and personalized weakness remediation into one cohesive learning loop powered by AI.

**Components:**

#### **1. Daily Vocabulary Coach (5 Words/Day)**

Each day, students receive 5 curated vocabulary words from EGP/IELTS/SAT domains:

```
Today's Words:
  • Serendipity (EGP) ⭐⭐⭐⭐
  • Ubiquitous (IELTS) ⭐⭐
  • Pragmatic (SAT) ⭐
```

**Per Word Includes:**

- Definition + Academic definition
- Example sentence in context
- Synonyms and antonyms
- Grammar tips for EGP exams
- Common student mistakes
- Your progress: (learning | learned | needs_practice) + confidence level

**Daily Rotation Logic:**

- Consistent rotation using date-based hashing (same 5 words every day)
- Word bank: 10+ pre-curated words per category
- Resets daily at midnight

#### **2. Writing Practice with AI Assessment**

Students submit writing and receive comprehensive AI-powered feedback:

**Submission Process:**

1. Paste/type writing (essay excerpt, answer, or freeform)
2. Optionally select: difficulty level, focus area (grammar/vocabulary/structure)
3. Submit → Instant confirmation + AI begins scoring

**AI Assessment (0-10 Scoring):**

| Dimension        | Measures                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Grammar Score    | Subject-verb agreement, tense consistency, articles, prepositions, sentence fragments, register, pronoun reference |
| Vocabulary Score | Word choice appropriateness, range, precision, usage of new vocabulary                                             |
| Structure Score  | Paragraph organization, sentence variety, transitions, coherence                                                   |
| Overall Score    | Holistic quality across all dimensions                                                                             |

**Feedback Delivered:**

```
GRAMMAR ISSUES (8 found):
  ✗ Subject-Verb Agreement (Line 3): "The students has..." → "The students have..."
  ✗ Tense Consistency (Line 7): Mix of past/present, use past throughout
  ✗ Article Usage (Line 12): Missing "the" before "university"

VOCABULARY ANALYSIS:
  ✓ Used 3 words correctly: serendipity, pragmatic, ubiquitous
  ✗ Misused 1 word: "notorious" (you meant "famous"?)

STRENGTHS:
  • Clear thesis statement
  • Good use of examples

NEXT STEPS:
  • Practice subject-verb agreement
  • Review present/past tense patterns
  • See Grammar Coach for targeted exercises
```

**Automatic Weakness Tracking:**

- Each grammar issue identified → Auto-creates GrammarWeaknessArea
- Tracks: error frequency, first/last occurrence, improvement rate
- Triggered automatically → No manual setup needed

#### **3. Learning Journal (Deep Metacognition)**

For each vocabulary word learned, student maintains personal journal:

**Journal Sections:**

1. **Your Meaning** - Student's own explanation (forced to articulate understanding)
2. **Example Sentences** - 3-5 sentences student writes using the word
3. **Personal Notes** - Mnemonics, memory tricks, personal associations
4. **Grammar Rules** - What grammar patterns apply when using this word?
5. **Areas of Confusion** - What's puzzling about this word?
6. **Practice Scenarios** - Where have you used this word in actual writing?

**Metacognitive Loop:**

- Writing practice → Identify vocabulary mistakes
- → Auto-prompt: "Create learning journal entry for this word"
- → Journal reflection → Deeper understanding
- → Next writing practice → Better usage

#### **4. Grammar Weakness Tracking**

System auto-identifies grammar areas to focus on:

**Weakness Card Shows:**

- Grammar area (e.g., "Subject-Verb Agreement", "Tense Consistency")
- How many times found in your writings
- Last time it occurred
- Focus urgency level (1-5)
- Improvement rate (trending up or down?)

**Sorted By Priority:**

- Urgency (focus level 1-5)
- Frequency (how many instances)
- Recency (last occurred)

#### **5. Adaptive Exercise Generation**

When student clicks "Practice", AI generates 5 progressive exercises:

**Example Exercise Set for "Subject-Verb Agreement":**

```
Level 1 - Fill the Blank:
  The team ___ (play/plays) well together.
  Answer: plays

Level 2 - Choose Correct:
  a) Each student have their own textbook
  b) Each student has their own textbook
  Answer: b)

Level 3 - Rewrite:
  "The group of students is studying hard"
  Rewrite to fix subject-verb agreement issues

Level 4 - Identify & Correct:
  "The strategies used by successful companies helps them grow"
  Find and fix all subject-verb agreement errors

Level 5 - Scenario-Based:
  Write 3 sentences about "Team success" ensuring correct subject-verb agreement
  Example answer provided after submission
```

**Exercise Tracking:**

- `practiceAttempts` - How many exercises completed
- Student answers show expected answer + explanation
- Improvement rate auto-calculated from writing submissions

#### **Data Flow: Writing → Assessment → Improvement → Mastery**

```
1. WRITE
   Student submits writing attempt
       ↓
2. ASSESS (Gemini AI)
   - Grammar analysis (7 error types)
   - Vocabulary check (new word usage)
   - Structure evaluation
   - 4 scores generated (0-10 each)
       ↓
3. IDENTIFY WEAKNESSES
   - Auto-create GrammarWeaknessArea for each error
   - Map vocabulary mistakes back to words
   - Increment usage counts
       ↓
4. TRACK & COMPARE
   - Student sees scores + feedback
   - Grammar Coach updated with new weaknesses
   - All weaknesses sortable by urgency
       ↓
5. PRACTICE (Optional but Recommended)
   - Student clicks "Practice" on weakness area
   - System generates 5 targeted exercises
   - Builds micro-mastery before next writing attempt
       ↓
6. WRITE AGAIN (Spaced Repetition)
   - Student submits new piece of writing
   - AI detects if weakness improved
   - Improvement rate tracked
   - System eventually marks weakness as "mastered"
       ↓
7. MASTERY
   - Weakness area graduates to "monitored" status
   - Student continues writing, but area no longer in top 3 to focus on
```

#### **API Endpoints:**

| Route                                | Purpose                                                 |
| ------------------------------------ | ------------------------------------------------------- |
| `GET /api/ai/daily-words`            | Get today's 5 vocabulary words + your progress          |
| `POST /api/writing-practice`         | Submit writing for AI assessment                        |
| `GET /api/writing-practice`          | View all past writing submissions + feedback            |
| `POST/PATCH /api/learning-journal`   | Create/edit word reflection journal                     |
| `GET /api/learning-journal`          | View journals for all learned words                     |
| `GET/PATCH /api/vocabulary-progress` | Track learning status (learning/learned/needs_practice) |
| `GET /api/grammar-weakness`          | View all identified weak grammar areas                  |
| `POST /api/grammar-weakness`         | Generate targeted exercises for selected weakness       |

#### **Data Models:**

```
DailyWord (pre-curated bank)
├── word, definition, academicDefinition
├── exampleSentence, synonyms[], antonyms[]
├── category (EGP|IELTS|SAT), difficulty (1-5)
├── grammarPartOfSpeech
├── gpTip (exam strategy)
└── commonMistakes (pedagogy)

VocabularyProgress (student tracking per word)
├── status (learning|learned|needs_practice)
├── confidenceLevel (1-5)
├── correctUsageCount, incorrectUsageCount
└── firstSeenAt, lastPracticedAt, learnedAt

WritingPractice (submissions with AI assessment)
├── title, prompt, studentWriting
├── grammarScore, vocabularyScore, sentenceStructureScore, overallScore
├── aiFeedback (JSON: grammarErrors[], vocabularyAnalysis[], strengths[], improvements[])
├── wordsUsedCorrectly[], wordsUsedIncorrectly[]
└── grammarAreasFound[]

LearningJournal (deep reflection per word)
├── meaningNoted (student's explanation)
├── exampleSentences[], personalNotes
├── grammarRulesApplied[], areasOfConfusion
└── practiceScenarios[], attemptedQuizzes

GrammarWeaknessArea (auto-identified problems)
├── grammarArea, description
├── instanceCount, firstOccurrenceAt, lastOccurrenceAt
├── focusLevel (1-5 urgency)
├── practiceAttempts, improvementRate
├── contextExamples[], suggestedResources[]
```

#### **Student Experience:**

**Monday (Learning Phase):**

```
✅ See today's 5 words: serendipity, ubiquitous, pragmatic, notorious, erstwhile
✅ Read definitions and examples
✅ Create learning journal for each word
✅ Try to use all 5 in a paragraph
```

**Tuesday (Practice Phase):**

```
✅ Submit essay excerpt for AI assessment
✅ Receive scores: Grammar 7/10, Vocabulary 8/10, Structure 6/10
✅ See feedback: "You used 'serendipity' correctly but had 2 subject-verb agreement errors"
✅ System identifies: Subject-Verb Agreement + Tense Consistency as weak areas
```

**Wednesday (Targeted Practice):**

```
✅ Open Grammar Coach
✅ See: "Your top 3 weak areas: Subject-Verb Agreement (8 instances), Tense Consistency (6), Articles (4)"
✅ Click "Practice" on Subject-Verb Agreement
✅ Complete 5 progressive exercises (fill-blank → scenario-based)
```

**Thursday (Reflection):**

```
✅ Write 3-4 sentences using today's word (newly chosen)
✅ Add to Learning Journal: "Used it when describing team dynamics - means 'agreement by chance, luck'"
✅ Complete next Writing Practice submission
```

**Friday-Sunday (Consolidation):**

```
✅ Revisit weak areas as they appear in writing
✅ Watch improvement rate increase
✅ Vocabulary confidence builds: "learning" → "learned"
```

#### **UI Features (Frontend Integration)**

The learning system is fully integrated into the dashboard and accessible across multiple pages:

**Dashboard** (`/dashboard/home`)

- **Today's 5 Words Widget** - Shows daily vocabulary words with learned/learning status
- **Latest Writing Widget** - Displays most recent writing submission with scores (Grammar, Vocabulary, Overall)
- **Grammar Focus Widget** - Shows top 3 grammar weaknesses with priority indicators
- **Quick Statistics** - Hours logged this week, past papers attempted, sessions completed
- All widgets auto-update with real-time data from learning system APIs

**Vocabulary Page** (`/dashboard/vocabulary`)

- **Today's Vocabulary Focus Section** - Grid display of 5 daily words
- **Per-Word Cards** - Shows word name, definition, category, difficulty level, confidence stars
- **Mark Learned Button** - Toggle word status between learning/learned with instant API update
- **Learning Statistics** - Words mastered today, total vocabulary count, daily target completion %
- **Quick Navigation** - Links to Writing Practice and Grammar Coach for immediate application
- **Learn a Word Tab** - Traditional vocabulary learning with AI-powered definitions
- **Improve My Writing Tab** - Submit text for vocabulary enhancement suggestions

**Writing Practice Page** (`/dashboard/writing-practice`)

- **Submission Form** - Title, prompt, writing content, difficulty level, focus area selection
- **Async Feedback System** - Real-time polling for AI assessment results
- **Score Display** - 4 cards showing Grammar (0-10), Vocabulary (0-10), Structure (0-10), Overall (0-10)
- **Feedback Sections** - Grammar errors with corrections, vocabulary analysis, strengths, improvements
- **Grammar Area Indicator** - Links identified weak areas to Grammar Coach
- **Past Submissions View** - Scroll through all previous writing attempts with scores

**Learning Journal Page** (`/dashboard/learning-journal`)

- **Sidebar** - Today's 5 vocabulary words with learned status indicators
- **Journal Editor** - Edit/view mode toggle for flexible interaction
- **Full Reflection Fields**:
  - Meaning (student's own explanation)
  - Example Sentences (3 free-text inputs)
  - Personal Notes (mnemonics and memory tricks)
  - Grammar Rules Applied (tag-based management)
  - Areas of Confusion (free-text)
  - Practice Scenarios (tag-based examples)
- **Complete CRUD** - Create, read, update, delete journal entries per word
- **Word Progress Badges** - Status (learning|learned|needs_practice) with confidence stars

**Grammar Coach Page** (`/dashboard/grammar-coach`)

- **Weakness List View** - All identified grammar areas with descriptions
- **Statistics Display** - Instance count, practice attempts, improvement rate, last occurrence date
- **Sorting Options** - Sort by urgency, frequency, or recency
- **Exercise System** - 5 progressive exercises per weakness (Level 1-5)
- **Exercise Types** - Fill-blank, rewrite, choose-correct, identify-and-fix, scenario-based
- **Show/Hide Answers** - Button to reveal expected answers and explanations

---

## Development Guide

### Setting Up Local Development

#### **Prerequisites**

```bash
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
postgres --version  # PostgreSQL should be running
```

#### **1. Initial Setup**

```bash
# Clone and install
git clone <repo>
cd PaperOne
npm install

# Environment setup
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET
```

#### **2. Database Setup**

```bash
# Generate Prisma Client (makes database types)
npx prisma generate

# Create initial schema in database
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

#### **3. Development Server**

```bash
npm run dev
# Server running at http://localhost:3000
```

### Common Development Tasks

#### **Adding a New Feature**

1. **Update Prisma Schema**

```prisma
model NewFeature {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... fields
  createdAt DateTime @default(now())
}
```

2. **Generate Migration**

```bash
npx prisma migrate dev --name add_new_feature
```

3. **Create API Route** (`/app/api/new-feature/route.ts`)

```typescript
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const features = await prisma.newFeature.findMany({
    where: { userId: session.user.id },
  });

  return Response.json(features);
}
```

4. **Create UI Component** (in relevant dashboard page)

5. **Test API** with `npx prisma studio`

#### **Running Database Migrations**

```bash
# After schema changes
npx prisma migrate dev --name migration_name

# Deploy to production
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

#### **Debugging Database Issues**

```bash
# View all data interactively
npx prisma studio

# Check if all migrations applied
npx prisma migrate status

# Reset database (development only!)
npx prisma migrate reset
```

### Code Style & Conventions

**TypeScript Usage:**

- Always type function parameters and returns
- Use interface for data structures
- Avoid `any` type

**Naming Conventions:**

- Files: camelCase (studySession.ts)
- Components: PascalCase (StudySessionForm.tsx)
- Databases: PascalCase models (StudySession)
- Variables: camelCase

**Error Handling:**

```typescript
try {
  // Operation
} catch (error) {
  console.error("Operation failed:", error);
  return new Response("Error message", { status: 500 });
}
```

---

## Deployment Guide

### Deploying to Vercel (Recommended)

#### **1. Prepare Repository**

```bash
# Ensure all changes are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### **2. Create Vercel Project**

- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your GitHub repository
- Select PaperOne project

#### **3. Configure Environment Variables**

In Vercel dashboard, add to Environment Variables:

```
DATABASE_URL=postgresql://...  (from Vercel Postgres)
NEXTAUTH_SECRET=generated-secret-here
NEXTAUTH_URL=https://yourdomain.vercel.app
```

#### **4. Deploy**

```bash
# Push to main branch triggers automatic deployment
git push origin main
```

#### **5. Run Migrations**

After first deploy:

```bash
# Via Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy
```

### Setting Up Vercel Postgres

#### **1. Add Vercel Postgres**

- Go to Vercel Project > Storage
- Click "Create Database"
- Select PostgreSQL
- Accept terms
- Copy connection string to DATABASE_URL

#### **2. Verify Connection**

```bash
psql <connection-string>
# Should connect successfully
```

### Alternative Hosting Options

#### **Railway.app**

```
1. Sign up at railway.app
2. Create PostgreSQL database
3. Copy connection string
4. Deploy Next.js app
5. Set environment variables
```

#### **Neon PostgreSQL + Vercel**

```
1. Create account at neon.tech
2. Create new project
3. Copy connection string
4. Connect to Vercel
5. Deploy
```

---

## Troubleshooting & Common Issues

### Issue: "Column does not exist" Error

**Symptom:**

```
Invalid `prisma.studySession.create()` invocation:
The column `createdAt` does not exist in the current database.
```

**Root Cause:**
Database schema doesn't match Prisma schema. Likely migrations weren't applied.

**Solution:**

```bash
# View migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy
```

### Issue: "Can't reach database server"

**Symptom:**

```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Causes & Solutions:**

1. **PostgreSQL not running:**

   ```bash
   # macOS
   brew services start postgresql

   # Windows
   # Start PostgreSQL service from Services app

   # Linux
   sudo systemctl start postgresql
   ```

2. **Wrong DATABASE_URL:**

   ```bash
   # Check .env file
   echo $DATABASE_URL

   # Format should be:
   # postgresql://username:password@localhost:5432/dbname
   ```

3. **Database doesn't exist:**
   ```bash
   createdb paperone
   ```

### Issue: "NextAuth_URL or NEXTAUTH_SECRET not set"

**Symptom:**
Authentication pages not working, redirects failing.

**Solution:**

```env
# .env file
NEXTAUTH_URL="http://localhost:3000"  (for dev)
NEXTAUTH_URL="https://yourdomain.com" (for production)
NEXTAUTH_SECRET="openssl rand -base64 32"
```

### Issue: Type Errors After Schema Changes

**Symptom:**

```
Property 'newField' does not exist on type 'StudySession'
```

**Solution:**

```bash
# Regenerate Prisma Client with new types
npx prisma generate
```

### Issue: Prisma Client Generator Issues

**Symptom:**

```
@prisma/client was not installed
```

**Solution:**

```bash
# Reinstall packages
rm -rf node_modules
npm install

# Regenerate client
npx prisma generate
```

### Performance Optimization

#### **Slow Queries**

```typescript
// Bad - fetches all data
const sessions = await prisma.studySession.findMany({
  where: { userId },
});

// Good - only fetch needed fields
const sessions = await prisma.studySession.findMany({
  where: { userId },
  select: {
    id: true,
    date: true,
    subject: true,
    accuracy: true, // Only fields needed
  },
  take: 50, // Limit results
});
```

#### **N+1 Query Problem**

```typescript
// Bad - loads user for each session (N+1 queries)
const sessions = await prisma.studySession.findMany({ where: { userId } });
const sessionUsers = sessions.map((s) => s.user); // Additional query per session

// Good - include relation in one query
const sessions = await prisma.studySession.findMany({
  where: { userId },
  include: { user: true }, // Loaded in same query
});
```

#### **Database Indexes**

Ensure all frequently-filtered fields have indexes:

```prisma
model StudySession {
  // These are indexed for fast queries
  @@index([userId])
  @@index([date])
  @@index([subject])
}
```

---

## Summary & Key Takeaways

### Project Philosophy

PaperOne is built on the principle that **data-driven learning beats guesswork**. Every system (session logging, mistake analysis, weekly scoring) is designed to create visibility into learning patterns.

### Technical Highlights

- **Serverless Architecture** - Scales automatically, no server management
- **Type Safety** - TypeScript + Prisma prevents runtime errors
- **Database Integrity** - PostgreSQL ensures data consistency
- **Authentication** - JWT-based, secure, scalable

### Key Models to Understand

1. **StudySession** - The core data entry point (everything else derives from this)
2. **TopicMastery** - Tracks learning progress per topic
3. **WeeklyPerformance** - Aggregated metrics with 5-component scoring
4. **MistakeLog** - Forces reflective learning

### Development Workflow

1. Identify feature requirements
2. Update Prisma schema
3. Create migration
4. Build API routes
5. Create UI components
6. Test with Prisma Studio
7. Deploy and monitor

---

**For questions or issues, refer to the README.md, ARCHITECTURE.md, or QUICKSTART.md files in the repository root.**

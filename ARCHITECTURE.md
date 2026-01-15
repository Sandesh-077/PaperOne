# PaperOne Architecture Documentation

## Overview

PaperOne is a minimalist A-Level English General Paper (EGP) exam preparation web application built with modern, production-ready technologies. The architecture prioritizes simplicity, scalability, and data integrity for long-term student use.

---

## Technology Stack

### Core Framework

- **Next.js 14.2.35** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 3.4.0** - Utility-first styling

### Database & ORM

- **PostgreSQL** - Relational database
- **Prisma 5.10.0** - Type-safe database ORM

### Authentication

- **NextAuth.js 4.24.0** - Authentication with JWT sessions
- **bcryptjs** - Password hashing

### Deployment

- **Vercel** - Serverless deployment platform
- **Vercel Postgres** - Managed PostgreSQL database

---

## Architecture Principles

### 1. Simplicity

- No unnecessary dependencies
- Standard Next.js patterns
- Clear separation of concerns
- Minimal abstraction layers

### 2. Scalability

- Serverless API routes (auto-scaling)
- Connection pooling with Prisma
- Stateless authentication (JWT)
- Efficient database queries

### 3. Data Integrity

- PostgreSQL ACID compliance
- Foreign key constraints
- Type-safe schema with Prisma
- User data isolation via userId
- No cascading deletes (prevents accidental data loss)

### 4. Code Quality

- TypeScript strict mode
- ESLint configuration
- Consistent naming conventions
- Modular component structure
- Clear API boundaries

---

## Database Schema (Prisma)

### Complete Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// User Authentication
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())

  // Relations (1:Many)
  grammarRules   GrammarRule[]
  vocabulary     Vocabulary[]
  essays         Essay[]
  errors         Error[]
  studySessions  StudySession[]
}

// Grammar Rules with Status Tracking
model GrammarRule {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  title       String
  explanation String   @db.Text
  examples    String[]  // Array of example sentences
  category    String?
  status      Status   @default(needs_work)  // Enum: understood | needs_work
  createdAt   DateTime @default(now())
  learnedAt   DateTime?
}

// Vocabulary with Multiple Example Sentences
model Vocabulary {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  word       String
  definition String   @db.Text
  sentences  String[]  // Array of example sentences
  category   String?
  learned    Boolean  @default(false)
  createdAt  DateTime @default(now())
  learnedAt  DateTime?
}

// Essay Writing with Topics
model Essay {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  title      String
  topic      String?   // Daily GP topic prompt
  prompt     String?   @db.Text
  content    String   @db.Text
  wordCount  Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// Error Tracking for Learning
model Error {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  category    String   // Grammar, Spelling, Punctuation, etc.
  description String   @db.Text
  correction  String   @db.Text
  context     String?  @db.Text  // Where the error occurred
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
}

// Study Session Logging for Streak Tracking
model StudySession {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  date       DateTime @default(now())
  duration   Int?     // minutes (optional)
  activities String[] // Array of activities
}

// Status enum for grammar rules
enum Status {
  understood
  needs_work
}
```

### Schema Design Decisions

1. **User Isolation**: All models have `userId` foreign key for data separation
2. **Array Fields**: `examples[]`, `sentences[]`, `activities[]` for flexible data storage
3. **Text Fields**: `@db.Text` for long-form content (no 255 char limit)
4. **Timestamps**: `createdAt`, `updatedAt`, `learnedAt`, `resolvedAt` for tracking
5. **Status Enum**: Type-safe status tracking instead of boolean flags
6. **Optional Fields**: `?` for fields that may be empty (category, context, topic)
7. **CUID**: `@default(cuid())` for secure, collision-resistant IDs

---

## Next.js Folder Structure

```
PaperOne/
├── app/                              # App Router directory
│   ├── (dashboard)/                  # Layout group for authenticated pages
│   │   ├── layout.tsx                # Shared layout with Navigation
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main dashboard with stats
│   │   ├── grammar/
│   │   │   └── page.tsx              # Grammar rules management
│   │   ├── vocabulary/
│   │   │   └── page.tsx              # Vocabulary tracking
│   │   ├── essays/
│   │   │   ├── page.tsx              # Essay list
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Create new essay
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Edit specific essay
│   │   └── errors/
│   │       └── page.tsx              # Error log with filtering
│   │
│   ├── api/                          # API Routes (serverless functions)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts          # NextAuth endpoints
│   │   ├── register/
│   │   │   └── route.ts              # User registration
│   │   ├── grammar/
│   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts          # PATCH (update), DELETE
│   │   ├── vocabulary/
│   │   │   ├── route.ts              # GET, POST
│   │   │   └── [id]/
│   │   │       └── route.ts          # PATCH, DELETE
│   │   ├── essays/
│   │   │   ├── route.ts              # GET, POST
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET (single), PATCH, DELETE
│   │   ├── errors/
│   │   │   ├── route.ts              # GET, POST
│   │   │   └── [id]/
│   │   │       └── route.ts          # PATCH, DELETE
│   │   ├── study-sessions/
│   │   │   └── route.ts              # POST (log session)
│   │   ├── stats/
│   │   │   └── route.ts              # GET (dashboard statistics)
│   │   └── daily-topic/
│   │       └── route.ts              # GET (daily essay prompt)
│   │
│   ├── login/
│   │   └── page.tsx                  # Login page
│   ├── register/
│   │   └── page.tsx                  # Registration page
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing page (redirects to login)
│
├── components/
│   └── Navigation.tsx                # Main nav with mobile menu
│
├── lib/
│   ├── auth.ts                       # NextAuth configuration
│   ├── prisma.ts                     # Prisma client singleton
│   └── topics.ts                     # Daily GP topic generator
│
├── prisma/
│   └── schema.prisma                 # Database schema
│
├── public/                           # Static assets
├── .env.local                        # Environment variables (not in git)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.ts
└── README.md
```

### File Organization Principles

1. **Route Groups**: `(dashboard)` for shared layouts without affecting URL
2. **Dynamic Routes**: `[id]` for parameterized pages
3. **API Co-location**: API routes mirror data structure
4. **Shared Components**: Minimal component library (only Navigation)
5. **Lib Utilities**: Database and auth logic separated from routes

---

## Key Components & API Routes

### 1. Authentication System

#### `lib/auth.ts`

```typescript
// NextAuth configuration
// - JWT session strategy
// - Credentials provider with bcrypt
// - User session data structure
```

#### `app/api/auth/[...nextauth]/route.ts`

```typescript
// Handles: /api/auth/signin, /api/auth/signout, /api/auth/session
// Uses authOptions from lib/auth.ts
```

#### `app/api/register/route.ts`

```typescript
POST / api / register;
// - Validates email uniqueness
// - Hashes password with bcryptjs
// - Creates new user in database
```

### 2. Grammar System

#### `app/(dashboard)/grammar/page.tsx`

- Multi-example input (dynamic fields)
- Status toggle (understood ↔ needs_work)
- Category filtering
- Visual status indicators

#### `app/api/grammar/route.ts`

```typescript
GET  /api/grammar              // List all rules for user
POST /api/grammar              // Create new rule
  Body: { title, explanation, examples[], category?, status? }
```

#### `app/api/grammar/[id]/route.ts`

```typescript
PATCH  /api/grammar/:id        // Update rule (partial)
DELETE /api/grammar/:id        // Delete rule
```

### 3. Vocabulary System

#### `app/(dashboard)/vocabulary/page.tsx`

- Multi-sentence input (dynamic fields)
- Learn/unlearn toggle
- Weekly stats display

#### `app/api/vocabulary/route.ts`

```typescript
GET  /api/vocabulary           // List all vocab for user
POST /api/vocabulary           // Create new word
  Body: { word, definition, sentences[], category? }
```

### 4. Essay/Writing System

#### `app/(dashboard)/essays/new/page.tsx`

- Daily GP topic integration
- Word count tracker
- Auto-save on submit

#### `app/api/essays/route.ts`

```typescript
GET  /api/essays               // List all essays
POST /api/essays               // Create essay
  Body: { title, topic?, prompt?, content, wordCount }
```

#### `app/api/daily-topic/route.ts`

```typescript
GET /api/daily-topic           // Date-based topic
GET /api/daily-topic?type=random  // Random topic
```

### 5. Error Logging System

#### `app/(dashboard)/errors/page.tsx`

- Time-based filtering (all/month/week)
- Resolved/unresolved toggle
- Category badges

#### `app/api/errors/route.ts`

```typescript
GET  /api/errors               // List all errors
POST /api/errors               // Log new error
  Body: { category, description, correction, context? }
```

### 6. Dashboard & Statistics

#### `app/api/stats/route.ts`

```typescript
GET /api/stats
Returns:
{
  grammar: { total, understood, needsWork },
  vocabulary: { total, learned, thisWeek },
  essays: { total, wordCountTrend: [{date, wordCount}] },
  errors: { total, unresolved },
  streak: { current, longest, totalDays, daysMissed }
}
```

#### Streak Calculation Logic

- Groups study sessions by date
- Calculates consecutive days (current streak)
- Tracks longest streak ever
- Counts total study days and days missed

---

## Database Connection & Prisma Client

### `lib/prisma.ts` (Connection Pooling)

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Why this pattern?**

- Prevents connection exhaustion in development (hot reload)
- Single client instance in production
- Error logging enabled
- Serverless-friendly

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # or production URL
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
```

---

## API Security Patterns

### Session Verification

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // User is authenticated - proceed
}
```

### Data Isolation

```typescript
// Always filter by userId
const rules = await prisma.grammarRule.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: "desc" },
});

// Use updateMany/deleteMany for safety
await prisma.grammarRule.updateMany({
  where: {
    id: params.id,
    userId: session.user.id, // Critical: user can only modify their own data
  },
  data: updateData,
});
```

---

## Deployment to Vercel

### Prerequisites

1. GitHub account with repository
2. Vercel account (free tier sufficient)
3. PostgreSQL database (Vercel Postgres or external)

### Step 1: Database Setup

**Option A: Vercel Postgres (Recommended)**

1. Go to Vercel Dashboard → Storage → Create Database
2. Select PostgreSQL
3. Copy connection string (format: `postgres://...`)

**Option B: External PostgreSQL**

- Railway, Supabase, Neon, or any PostgreSQL provider
- Get connection string with pooling enabled

### Step 2: Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

### Step 3: Database Migration

**Local migration first (recommended):**

```bash
# With DATABASE_URL set to production database
npx prisma migrate deploy
```

**Or add to package.json:**

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

### Step 4: Deploy

**Method 1: GitHub Integration (Recommended)**

1. Push code to GitHub
2. Import repository in Vercel
3. Configure environment variables
4. Deploy automatically on push

**Method 2: Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel
# Follow prompts
```

### Step 5: Post-Deployment

1. Test authentication flow
2. Create test user via /register
3. Verify all CRUD operations
4. Check database in Vercel Dashboard

### Build Configuration

**vercel.json** (optional):

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sin1"]
}
```

---

## Production Checklist

### Security

- [ ] `NEXTAUTH_SECRET` is strong random string (32+ chars)
- [ ] Database credentials not in git
- [ ] CORS configured if needed
- [ ] Rate limiting considered for API routes

### Performance

- [ ] Database indexes on userId for all models
- [ ] Connection pooling enabled (Prisma default)
- [ ] Static pages cached appropriately
- [ ] Image optimization if added later

### Data Integrity

- [ ] Database backups enabled (Vercel Postgres auto-backups)
- [ ] Soft delete considered for critical data
- [ ] User data export capability (GDPR)
- [ ] No cascading deletes (prevents accidental data loss)

### Monitoring

- [ ] Vercel Analytics enabled
- [ ] Database query performance monitored
- [ ] Error tracking (Vercel logs or Sentry)
- [ ] Uptime monitoring

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your database URL

# Generate Prisma client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

### Database Updates

```bash
# After schema changes
npx prisma migrate dev --name descriptive_name

# View database in browser
npx prisma studio
```

### Type Safety

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build test (catches type errors)
npm run build
```

---

## Scalability Considerations

### Current Architecture (Sufficient for 1000s of users)

- Serverless functions (auto-scaling)
- Connection pooling
- Stateless authentication
- Efficient Prisma queries

### Future Optimizations (if needed)

1. **Caching**: Redis for stats endpoint
2. **CDN**: Static assets on edge network
3. **Database**: Read replicas for analytics
4. **Search**: Elasticsearch for content search
5. **File Storage**: S3 for essay exports

### When to Scale

- Response time > 500ms consistently
- Database CPU > 80%
- Memory limits reached
- Concurrent users > 10,000

---

## Maintenance

### Regular Tasks

- Update dependencies monthly: `npm update`
- Review Prisma logs for slow queries
- Monitor Vercel analytics
- Backup database weekly (automatic with Vercel Postgres)

### Breaking Changes

- Database migrations: Always test locally first
- NextAuth updates: Check breaking changes
- Next.js upgrades: Follow upgrade guide

---

## Code Quality Standards

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Interfaces for all data structures
- Type imports separated

### Naming Conventions

- Components: PascalCase (`Navigation.tsx`)
- Files: kebab-case or camelCase
- API routes: lowercase with hyphens
- Database fields: camelCase

### Component Structure

```typescript
'use client'  // Only when needed (useState, useEffect)

import statements
interface definitions
export default function ComponentName() {
  // State
  // Effects
  // Handlers
  // Render
}
```

### API Route Structure

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // 1. Auth check
  // 2. Parse request
  // 3. Database query
  // 4. Return response
}
```

---

## Common Patterns

### Loading States

```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center h-64">Loading...</div>
  );
}
```

### Error Handling

```typescript
try {
  const response = await fetch("/api/endpoint");
  if (response.ok) {
    // Success
  }
} catch (error) {
  console.error("Failed:", error);
}
```

### Form Submission

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const response = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (response.ok) {
      setFormData(initialState);
      fetchData();
    }
  } catch (error) {
    console.error("Failed:", error);
  }
};
```

---

## Conclusion

PaperOne follows Next.js best practices with a focus on:

- **Simplicity**: No over-engineering, clear structure
- **Scalability**: Serverless, stateless, efficient queries
- **Data Integrity**: Type-safe schema, user isolation, ACID compliance
- **Code Quality**: TypeScript strict mode, consistent patterns, clean code

The architecture is production-ready for immediate deployment and can scale to thousands of concurrent users without major refactoring.

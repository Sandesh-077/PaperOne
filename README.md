# PaperOne - A-Level EGP Exam Training System

A systematic English General Paper (EGP) exam preparation web application built with Next.js, TypeScript, and PostgreSQL. Designed to help A-Level students improve from D → A/A\* through structured tracking of grammar rules, vocabulary, essays, errors, and daily study consistency.

## Features

### 📚 Core Learning Modules

- **Grammar Rules Tracker** - Log and master essential grammar rules with examples
- **Vocabulary Builder** - Learn new words with definitions and contextual sentences
- **Essay Practice** - Write, store, and review essays with word count tracking
- **Error Log** - Document mistakes and corrections to avoid repeating them

### 📝 Practice Paper System

- **Practice Paper Tracking** - Add, organize, and log practice papers by topic or as full papers
- **Auto-completion** - Papers are auto-marked complete when all questions are logged
- **Rework Functionality** - Reset completed papers to allow new attempts
- **Question Tracking** - Mark individual questions as redo, focus, or review later
- **Status Badges** - Visual indicators for tracked questions (redo/focus/later/completed)
- **Comprehensive Logs** - View all practice sessions and progress

### 📊 Progress Tracking

- **Study Streak System** - Track daily study consistency with streak counter
- **Progress Dashboard** - Visual overview of learning progress across all modules
- **Statistics** - Comprehensive stats on learned content and study habits

### 🔐 User Management

- Secure email/password authentication
- Personal learning environment for each student

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Hosting**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd PaperOne
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/paperone"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

4. Set up the database:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

#### Database Reset (Development/Production)

- **Reset all data for a user (recommended for production):**
  - Call the API endpoint `/api/reset-user-data` (POST) while logged in. This deletes all your data but keeps your account.
  - Example:
    ```bash
    curl -X POST https://your-app-url.vercel.app/api/reset-user-data
    ```
- **Reset the entire database (development only):**
  - Run the script:
    ```bash
    npx tsx scripts/reset-db.ts
    ```
  - This deletes ALL users and data. Do not use in production!

## Database Schema

The application uses the following main models:

- **User** - User accounts with authentication
- **Subject** - Main subject (e.g., Physics, SAT Math)
- **Topic** - Topics within a subject
- **Subtopic** - Subtopics for granular tracking
- **PracticePaper** - Practice papers (full or topical)
- **PracticePaperLog** - Individual practice sessions for a paper
- **PracticePaperQuestion** - Tracked questions (redo/focus/later/completed)
- **GrammarRule** - Grammar rules with learning status
- **Vocabulary** - Vocabulary entries with example sentences
- **Essay** - Written essays with metadata
- **Error** - Error log entries with corrections
- **StudySession** - Daily study session tracking for streak calculation

## Deployment

### Vercel Deployment

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Import your project in Vercel:

   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository

3. Configure environment variables in Vercel:

   - Add all variables from `.env`
   - Set `DATABASE_URL` to your production PostgreSQL connection string
   - Generate a secure `NEXTAUTH_SECRET`
   - Set `NEXTAUTH_URL` to your production domain

4. Deploy!

### PostgreSQL Setup

For production, you can use:

- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Neon](https://neon.tech)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

After setting up your database, run migrations:

```bash
npx prisma migrate deploy
```

## Project Structure

```
PaperOne/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── grammar/          # Grammar rules page
│   │   ├── vocabulary/       # Vocabulary page
│   │   ├── essays/           # Essays listing & detail pages
│   │   └── errors/           # Error log page
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth API routes
│   │   ├── grammar/          # Grammar CRUD endpoints
│   │   ├── vocabulary/       # Vocabulary CRUD endpoints
│   │   ├── essays/           # Essays CRUD endpoints
│   │   ├── errors/           # Errors CRUD endpoints
│   │   ├── study-sessions/   # Study session tracking
│   │   ├── stats/            # Statistics endpoint
│   │   └── register/         # User registration
│   ├── login/                # Login page
│   ├── register/             # Registration page
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page (redirects)
│   └── globals.css           # Global styles
├── components/               # Reusable components
├── lib/                      # Utility functions
│   └── prisma.ts            # Prisma client
├── prisma/
│   └── schema.prisma        # Database schema
├── types/                    # TypeScript type definitions
└── public/                   # Static assets
```

## Usage Guide

### For Students

1. **Register** - Create an account with your email
2. **Dashboard** - View your progress and study streak
3. **Grammar** - Add grammar rules you're learning with explanations and examples
4. **Vocabulary** - Build your word bank with definitions and sentences
5. **Essays** - Write practice essays and track your progress
6. **Errors** - Log mistakes to learn from them
7. **Daily Practice** - Log study sessions to maintain your streak

### Exam Preparation Tips

- Write at least one essay per day
- Review your error log weekly
- Master 5 new grammar rules per week
- Learn 10 new vocabulary words per week
- Use new vocabulary in your essays
- Track your progress consistently

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own learning or teaching purposes.

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for A-Level students preparing for English General Paper exams.

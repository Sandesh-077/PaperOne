# PaperOne - Project Summary

## Overview

**PaperOne** is a comprehensive web application designed to help A-Level students systematically improve their English General Paper (EGP) performance from D → A/A\*. It provides structured tracking of grammar rules, vocabulary, essays, errors, and daily study consistency.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js with credential provider
- **Deployment**: Vercel-ready

## Key Features

### 1. Grammar Rules Tracker

- Add and manage grammar rules
- Include explanations and examples
- Categorize rules (syntax, punctuation, etc.)
- Mark rules as learned
- Track learning progress

### 2. Vocabulary Builder

- Add new vocabulary words
- Include definitions and contextual sentences
- Categorize words (academic, formal, etc.)
- Mark vocabulary as learned
- Build a personal word bank

### 3. Essay Practice System

- Write and save practice essays
- Include essay prompts
- Automatic word count tracking
- Add grades and teacher feedback
- View, edit, and delete essays
- Full essay history

### 4. Error Log

- Document mistakes by category
- Record error descriptions and corrections
- Add context (where the error occurred)
- Mark errors as resolved
- Review unresolved errors
- Learn from past mistakes

### 5. Progress Tracking

- **Study Streak System**: Track consecutive days of study
- **Dashboard Analytics**: Visual progress overview
- **Statistics**:
  - Grammar rules learned/total
  - Vocabulary learned/total
  - Essays written
  - Errors logged/resolved
  - Total study days
- **Session Logging**: Record daily study activities

### 6. User Authentication

- Secure email/password authentication
- Personal learning environment per user
- Protected routes
- Session management

## Project Structure

```
PaperOne/
├── app/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/            # Main dashboard with stats
│   │   ├── grammar/              # Grammar rules management
│   │   ├── vocabulary/           # Vocabulary management
│   │   ├── essays/               # Essay practice
│   │   │   ├── new/              # Write new essay
│   │   │   └── [id]/             # View/edit essay
│   │   └── errors/               # Error log
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/   # NextAuth endpoints
│   │   ├── register/             # User registration
│   │   ├── grammar/              # Grammar CRUD
│   │   ├── vocabulary/           # Vocabulary CRUD
│   │   ├── essays/               # Essays CRUD
│   │   ├── errors/               # Errors CRUD
│   │   ├── study-sessions/       # Session tracking
│   │   └── stats/                # Dashboard statistics
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home (redirects)
│   ├── providers.tsx             # Session provider wrapper
│   └── globals.css               # Global styles
├── components/
│   └── Navigation.tsx            # Main navigation component
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   └── auth.ts                   # NextAuth configuration
├── prisma/
│   └── schema.prisma             # Database schema
├── types/
│   └── next-auth.d.ts            # NextAuth type extensions
├── public/                       # Static assets
├── .env                          # Environment variables (not committed)
├── .env.example                  # Environment template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind config
├── next.config.js                # Next.js config
├── README.md                     # Full documentation
├── QUICKSTART.md                 # Quick setup guide
└── DEPLOYMENT.md                 # Deployment instructions
```

## Database Schema

### User

- id, email, password (hashed), name
- Relations: grammarRules, vocabulary, essays, errors, studySessions

### GrammarRule

- id, userId, title, explanation, example, learned, learnedAt, category
- Tracks grammar concepts with learning status

### Vocabulary

- id, userId, word, definition, sentence, learned, learnedAt, category
- Words with contextual examples

### Essay

- id, userId, title, prompt, content, wordCount, grade, notes
- Practice essays with metadata

### Error

- id, userId, category, description, correction, context, resolved, resolvedAt
- Mistake tracking system

### StudySession

- id, userId, date, duration, activities
- Daily study logging for streak calculation

## API Endpoints

### Authentication

- `POST /api/register` - User registration
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Grammar Rules

- `GET /api/grammar` - List all grammar rules
- `POST /api/grammar` - Create new grammar rule
- `PATCH /api/grammar/[id]` - Update grammar rule
- `DELETE /api/grammar/[id]` - Delete grammar rule

### Vocabulary

- `GET /api/vocabulary` - List all vocabulary
- `POST /api/vocabulary` - Create new vocabulary
- `PATCH /api/vocabulary/[id]` - Update vocabulary
- `DELETE /api/vocabulary/[id]` - Delete vocabulary

### Essays

- `GET /api/essays` - List all essays
- `GET /api/essays/[id]` - Get single essay
- `POST /api/essays` - Create new essay
- `PATCH /api/essays/[id]` - Update essay
- `DELETE /api/essays/[id]` - Delete essay

### Errors

- `GET /api/errors` - List all errors
- `POST /api/errors` - Create new error log
- `PATCH /api/errors/[id]` - Update error
- `DELETE /api/errors/[id]` - Delete error

### Study Sessions & Stats

- `GET /api/study-sessions` - List all sessions
- `POST /api/study-sessions` - Log new session
- `GET /api/stats` - Get dashboard statistics

## Security Features

- Password hashing with bcrypt
- JWT-based session management
- Protected API routes with authentication checks
- User-scoped data (users can only access their own data)
- CSRF protection via NextAuth

## UI/UX Design

- Clean, distraction-free interface
- Responsive design (mobile, tablet, desktop)
- Color-coded categories
- Visual progress indicators
- Streak gamification
- Quick actions and shortcuts

## Development Workflow

### Setup

1. Install dependencies: `npm install`
2. Configure environment variables
3. Generate Prisma client: `npx prisma generate`
4. Run migrations: `npx prisma migrate dev`
5. Start dev server: `npm run dev`

### Building

1. Run build: `npm run build`
2. Test production: `npm start`

### Deployment

1. Push to Git repository
2. Connect to Vercel
3. Configure environment variables
4. Deploy automatically

## Future Enhancement Ideas

- Export data (PDF reports, CSV)
- Essay analytics (readability scores, common errors)
- AI-powered feedback suggestions
- Collaborative features (teacher dashboard)
- Mobile app version
- Spaced repetition for vocabulary
- Quiz system for grammar rules
- Essay templates and prompts library
- Progress charts and visualizations
- Email reminders for daily practice

## License

MIT License - Free for educational use

## Support

- Documentation: README.md, QUICKSTART.md, DEPLOYMENT.md
- Issues: GitHub Issues
- Email: [Contact information]

---

**Built for A-Level students preparing for English General Paper exams.**
**Goal: Systematic improvement from D → A/A\* through structured practice and tracking.**

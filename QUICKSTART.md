# PaperOne - Quick Start Guide

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database (local or cloud)
- npm or yarn

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/paperone"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secret-key-here"
```

To generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 3. Set Up Database

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev --name init
```

(Optional) Open Prisma Studio to view your database:

```bash
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First Account

1. Click "Register" on the login page
2. Enter your email, name, and password
3. Log in and start tracking your EGP preparation!

## Building for Production

```bash
npm run build
npm start
```

## Database Providers

If you don't have PostgreSQL installed locally, here are some free cloud options:

### Neon (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to your `.env` file

### Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Get the connection string from Settings > Database

### Railway

1. Sign up at [railway.app](https://railway.app)
2. Create a PostgreSQL database
3. Copy the connection string

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm start               # Start production server
npm run lint            # Run ESLint

# Prisma
npx prisma generate     # Generate Prisma Client
npx prisma migrate dev  # Run migrations (dev)
npx prisma migrate deploy # Run migrations (production)
npx prisma studio       # Open database GUI
npx prisma db push      # Push schema changes without migration
```

## Troubleshooting

### Build Errors

- Make sure you've run `npx prisma generate`
- Check that all dependencies are installed: `npm install`
- Verify your `.env` file is properly configured

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Check that PostgreSQL is running (if local)
- Ensure your database user has proper permissions

### Authentication Issues

- Make sure `NEXTAUTH_SECRET` is set in `.env`
- Verify `NEXTAUTH_URL` matches your development URL

## Features Overview

### Dashboard

- View your current study streak
- See progress across all learning modules
- Quick access to all features

### Grammar Rules

- Add grammar rules with explanations
- Mark rules as learned
- Organize by category

### Vocabulary

- Add new words with definitions
- Include example sentences
- Track learned vocabulary

### Essays

- Write practice essays with prompts
- Track word count automatically
- Add grades and teacher notes
- View and edit past essays

### Error Log

- Document mistakes by category
- Record corrections
- Mark errors as resolved

## Next Steps

1. Set up a production database (see Database Providers above)
2. Deploy to Vercel (see DEPLOYMENT.md)
3. Invite students to use the platform

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

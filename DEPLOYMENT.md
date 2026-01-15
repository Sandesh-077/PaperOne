# PaperOne Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Variables

- [ ] Set `DATABASE_URL` to production PostgreSQL connection string
- [ ] Generate secure `NEXTAUTH_SECRET` (use: `openssl rand -base64 32`)
- [ ] Set `NEXTAUTH_URL` to production domain (e.g., https://paperone.vercel.app)

### 2. Database Setup

- [ ] Create production PostgreSQL database
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify database connection

### 3. Code Preparation

- [ ] Test all features locally
- [ ] Run build: `npm run build`
- [ ] Fix any build errors
- [ ] Commit all changes to Git

## Vercel Deployment

1. **Connect Repository**

   - Push code to GitHub/GitLab/Bitbucket
   - Import project in Vercel dashboard

2. **Configure Settings**

   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Set Environment Variables**

   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your-secret-here
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your live site!

## Post-Deployment

- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test all CRUD operations (grammar, vocab, essays, errors)
- [ ] Verify study session logging
- [ ] Check dashboard statistics
- [ ] Test on mobile devices

## Monitoring

- Monitor Vercel dashboard for errors
- Check database connection health
- Review application logs

## Database Providers

### Recommended Options:

1. **Vercel Postgres** (Easiest)

   - Integrated with Vercel
   - https://vercel.com/docs/storage/vercel-postgres

2. **Neon** (Serverless)

   - Free tier available
   - https://neon.tech

3. **Supabase**

   - Includes auth options
   - https://supabase.com

4. **Railway**
   - Simple setup
   - https://railway.app

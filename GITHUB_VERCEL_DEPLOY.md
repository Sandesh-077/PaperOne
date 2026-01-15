# GitHub & Vercel Deployment Guide

## ✅ Local Git Setup Complete

Your repository has been initialized with:

- 51 files committed
- Proper `.gitignore` configured
- Initial commit created

---

## Step 1: Create GitHub Repository

### Option A: Using GitHub Desktop (Easiest)

1. Download and install [GitHub Desktop](https://desktop.github.com/)
2. Open GitHub Desktop
3. Click **File** → **Add Local Repository**
4. Browse to: `G:\Web_Development\PaperOne`
5. Click **Publish repository**
6. Uncheck "Keep this code private" (if you want it public)
7. Click **Publish Repository**

### Option B: Using GitHub Website

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `paperone` or `paper-one`
3. Description: _A-Level English General Paper exam preparation app_
4. Leave "Public" selected
5. **DO NOT** check "Initialize with README" (we already have files)
6. Click **Create repository**

Then run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/paperone.git
git branch -M main
git push -u origin main
```

### Option C: Using GitHub CLI (If installed)

```bash
gh repo create paperone --public --source=. --remote=origin --push
```

---

## Step 2: Deploy to Vercel

### Quick Deploy (Recommended)

1. **Go to Vercel**: [vercel.com/new](https://vercel.com/new)

2. **Sign in** with GitHub (if not already)

3. **Import Git Repository**:

   - Click "Import Git Repository"
   - Select your `paperone` repository
   - Click "Import"

4. **Configure Project**:

   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (keep as is)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

5. **Add Environment Variables**:
   Click "Environment Variables" and add these 3 variables:

   ```
   DATABASE_URL
   postgresql://your-connection-string-here

   NEXTAUTH_URL
   https://your-app.vercel.app

   NEXTAUTH_SECRET
   (generate one - see below)
   ```

   **Generate NEXTAUTH_SECRET**:

   - Option 1: Run `openssl rand -base64 32` in terminal
   - Option 2: Use [generate-secret.vercel.app](https://generate-secret.vercel.app/)
   - Copy the output

6. **Deploy**: Click "Deploy"

---

## Step 3: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. In your Vercel project dashboard:

   - Go to **Storage** tab
   - Click **Create Database**
   - Select **Postgres**
   - Choose region close to your users (e.g., Singapore for Asia)
   - Click **Create**

2. **Connect Database**:

   - Click **Connect**
   - Copy the `DATABASE_URL` connection string
   - Go to **Settings** → **Environment Variables**
   - Update `DATABASE_URL` with the copied value
   - Click **Save**

3. **Redeploy**:
   - Go to **Deployments** tab
   - Click the three dots (...) on latest deployment
   - Click **Redeploy**

### Option B: External PostgreSQL

**Free Options:**

- [Neon](https://neon.tech) - Serverless Postgres (Free tier: 512 MB)
- [Supabase](https://supabase.com) - (Free tier: 500 MB)
- [Railway](https://railway.app) - (Free tier with credit)

After creating database:

1. Get connection string (format: `postgresql://user:pass@host:5432/db`)
2. Add to Vercel environment variables
3. Redeploy

---

## Step 4: Run Database Migration

### After deployment, run migration:

**Option A: Using Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel env pull .env.local
npx prisma migrate deploy
```

**Option B: Using Prisma Data Platform**

1. Install Vercel Integration for Prisma
2. Or manually run migration in Vercel project settings

**Option C: Local Migration to Production DB**

```bash
# Set DATABASE_URL to production in .env.local
DATABASE_URL="your-production-url"

# Run migration
npx prisma migrate deploy
```

---

## Step 5: Verify Deployment

1. **Visit your app**: `https://your-app.vercel.app`

2. **Test registration**:

   - Go to `/register`
   - Create a test account
   - Login

3. **Test features**:
   - Add a grammar rule
   - Add vocabulary
   - Write an essay
   - Log an error
   - Check dashboard stats

---

## Environment Variables Summary

Your Vercel project needs these 3 variables:

| Variable          | Value                         | How to Get                           |
| ----------------- | ----------------------------- | ------------------------------------ |
| `DATABASE_URL`    | `postgresql://...`            | Vercel Postgres or external provider |
| `NEXTAUTH_URL`    | `https://your-app.vercel.app` | Your Vercel deployment URL           |
| `NEXTAUTH_SECRET` | Random 32+ char string        | `openssl rand -base64 32`            |

---

## Automatic Deployments

Once set up, every push to GitHub will:

1. ✅ Trigger automatic deployment
2. ✅ Run build checks
3. ✅ Deploy to production
4. ✅ Update live site

### Preview Deployments

- Every branch gets its own preview URL
- Test changes before merging to main

---

## Custom Domain (Optional)

1. In Vercel project → **Settings** → **Domains**
2. Add your domain (e.g., `paperone.com`)
3. Follow DNS configuration instructions
4. Vercel provides free SSL certificate

---

## Common Issues & Solutions

### Issue: Build Fails

**Solution**: Check build logs in Vercel dashboard

- Usually missing environment variables
- Or TypeScript errors

### Issue: Database Connection Error

**Solution**:

```bash
# Check DATABASE_URL format
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

- Ensure `?sslmode=require` is at the end
- Check database is accessible from internet

### Issue: "Unauthorized" on all API routes

**Solution**:

- Verify `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your deployment URL
- Clear cookies and login again

### Issue: Prisma Client Not Generated

**Solution**: Add build script override in `package.json`:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

---

## GitHub Workflows (Optional)

### Enable Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Add Status Badge to README

After first deployment:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/paperone)
```

---

## Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Database migration completed successfully
- [ ] Test user registration and login
- [ ] Test all CRUD operations (Grammar, Vocab, Essays, Errors)
- [ ] Verify dashboard stats load correctly
- [ ] Test mobile responsiveness
- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics (optional)
- [ ] Configure database backups

---

## Next Steps

1. **Push to GitHub**: Follow Step 1 above
2. **Deploy to Vercel**: Follow Step 2-4 above
3. **Share the link**: Your app is live!

Your app will be available at: `https://paperone-[random].vercel.app`

---

## Support

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Next.js Deployment: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- Prisma with Vercel: [pris.ly/d/vercel](https://pris.ly/d/vercel)

---

## Current Status

✅ Git repository initialized
✅ All files committed
✅ Ready to push to GitHub
⏳ Waiting for GitHub repository creation
⏳ Waiting for Vercel deployment

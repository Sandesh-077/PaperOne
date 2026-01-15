# Complete Beginner's Guide: Vercel Environment Variables

## 🎯 What You Need to Set Up

PaperOne needs **3 environment variables** to work:

1. **DATABASE_URL** - Where your database lives
2. **NEXTAUTH_URL** - Your app's web address
3. **NEXTAUTH_SECRET** - A secret password for security

---

## 📋 Step-by-Step Setup Guide

### Part 1: Push to GitHub First

If you haven't already:

```bash
# Option 1: Use GitHub Desktop (easiest)
# Download from: https://desktop.github.com
# Then: File → Add Local Repository → Browse to PaperOne → Publish

# Option 2: Command line
# Go to github.com/new and create a repo called "paperone"
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/paperone.git
git branch -M main
git push -u origin main
```

---

### Part 2: Start Vercel Deployment

1. **Go to:** [vercel.com/new](https://vercel.com/new)

2. **Sign in with GitHub**

3. **Import your repository:**

   - Click "Import Git Repository"
   - Find and select your `paperone` repository
   - Click "Import"

4. **You'll see the "Configure Project" screen**

   - Project Name: `paperone` (or anything you want)
   - Framework: Next.js (auto-detected) ✅
   - Root Directory: `./` (leave as is) ✅
   - Build Command: `npm run build` (auto-detected) ✅

5. **STOP HERE! Don't click Deploy yet!**
   - We need to add environment variables first

---

### Part 3: Set Environment Variable #1 - NEXTAUTH_URL

**What is this?** Your app's web address on Vercel

#### Steps:

1. Look at the **"Project Name"** field on your screen

   - Example: If it says `paperone`, your URL will be `https://paperone.vercel.app`
   - Example: If it says `paperone-abc`, your URL will be `https://paperone-abc.vercel.app`

2. Scroll down to **"Environment Variables"** section

3. Click inside the first input box labeled **"Key"**

4. Type exactly: `NEXTAUTH_URL`

5. Click in the **"Value"** box

6. Type: `https://paperone.vercel.app` (replace `paperone` with YOUR project name)

7. Leave all checkboxes checked (Production, Preview, Development)

8. Click the **"Add"** button

✅ **You should now see:**

```
NEXTAUTH_URL = https://paperone.vercel.app
```

---

### Part 4: Set Environment Variable #2 - NEXTAUTH_SECRET

**What is this?** A random secret key for security (like a super strong password)

#### Steps to Generate the Secret:

**🪟 For Windows (Easiest Method):**

1. Press `Windows + R`
2. Type `powershell` and press Enter
3. Copy and paste this command:
   ```powershell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```
4. Press Enter
5. You'll see random text like: `Kj8mN2pQ5rTvWx9Yz3bC7dE1fG4hI6j`
6. **Copy this text** (select and Ctrl+C)

**🌐 Alternative: Online Generator**

1. Go to: https://generate-secret.vercel.app/32
2. Copy the generated secret

#### Steps to Add to Vercel:

1. Back in Vercel, in the **Environment Variables** section

2. In the **"Key"** field, type: `NEXTAUTH_SECRET`

3. In the **"Value"** field, paste your secret (Ctrl+V)

4. Click **"Add"**

✅ **You should now see:**

```
NEXTAUTH_URL = https://paperone.vercel.app
NEXTAUTH_SECRET = Kj8mN2pQ5rTvWx9Yz3bC7dE1fG4hI6j
```

⚠️ **IMPORTANT:** Never share this secret with anyone!

---

### Part 5: Set Up Database & Get DATABASE_URL

**What is this?** Connection to your PostgreSQL database where all data is stored

#### 🟢 Recommended: Use Vercel Postgres (Easiest)

##### Step 5.1: Create Database

1. **Open a new browser tab** (keep Vercel deploy page open)

2. **Go to:** [vercel.com/dashboard](https://vercel.com/dashboard)

3. **Click "Storage"** in the top navigation menu

4. **Click "Create Database"** button

5. **Select "Postgres"**

   - You'll see a card that says "Postgres"
   - Click "Continue"

6. **Configure your database:**

   - **Database Name:** Type `paperone-db`
   - **Region:** Select closest to you:
     - Asia/Singapore: `sin1`
     - USA East: `iad1`
     - Europe/Frankfurt: `fra1`
   - Click **"Create"**

7. **Wait 10-20 seconds** while it creates

##### Step 5.2: Connect Database to Project

1. After creation, you'll see **"Connect to Project"**

2. **Select your project:**

   - Find `paperone` (or whatever you named your project)
   - Click it to select

3. Click **"Connect"**

##### Step 5.3: Get Connection String

1. You'll see several tabs: **Quickstart, .env.local, Prisma**

2. Click the **".env.local"** tab

3. You'll see something like:

   ```
   POSTGRES_URL="postgresql://default:abc123xyz@hostname.vercel-storage.com:5432/verceldb"
   ```

4. **Copy ONLY the value** (the part in quotes, without the quotes):
   ```
   postgresql://default:abc123xyz@hostname.vercel-storage.com:5432/verceldb
   ```

##### Step 5.4: Add to Vercel Environment Variables

1. **Go back to your Vercel deployment tab** (the one where you were adding variables)

2. In **Environment Variables** section:
   - **Key:** Type `DATABASE_URL`
   - **Value:** Paste the connection string you just copied
   - Click **"Add"**

✅ **You should now have all 3 variables:**

```
NEXTAUTH_URL = https://paperone.vercel.app
NEXTAUTH_SECRET = Kj8mN2pQ5rTvWx9Yz3bC7dE1fG4hI6j
DATABASE_URL = postgresql://default:abc123...
```

---

### Part 6: Deploy!

1. **Verify you have all 3 variables** listed above

2. **Click the "Deploy" button** 🚀

3. **Wait 2-3 minutes** while Vercel builds your app

   - You'll see logs scrolling
   - Don't close the page!

4. **When finished**, you'll see:

   - ✅ "Congratulations!"
   - Your app URL: `https://paperone.vercel.app`

5. **Click "Visit"** to see your app

---

### Part 7: Set Up Database Tables (CRITICAL!)

Your app is deployed, but the database is empty. We need to create the tables.

#### Option A: Automatic Setup (Add to package.json)

1. **Go back to your code** in VS Code

2. **Open `package.json`**

3. **Find the "scripts" section** and add this line:

   ```json
   "scripts": {
     "dev": "next dev",
     "build": "prisma generate && prisma migrate deploy && next build",
     "start": "next start",
     "lint": "next lint"
   }
   ```

4. **Save, commit, and push:**

   ```bash
   git add package.json
   git commit -m "Add prisma migration to build"
   git push
   ```

5. **Vercel will auto-deploy** and run migrations

#### Option B: Manual Migration (If Option A doesn't work)

1. **Open PowerShell** in your PaperOne folder

2. **Install Vercel CLI:**

   ```bash
   npm i -g vercel
   ```

3. **Login to Vercel:**

   ```bash
   vercel login
   ```

   - Follow the prompts to login

4. **Pull environment variables:**

   ```bash
   vercel env pull .env.local
   ```

   - This downloads your production DATABASE_URL

5. **Run migration:**

   ```bash
   npx prisma migrate deploy
   ```

6. **Done!** Your database tables are created

---

### Part 8: Test Your App

1. **Go to your app:** `https://paperone.vercel.app`

2. **Click "Register"** (or go to `/register`)

3. **Create a test account:**

   - Email: `test@example.com`
   - Password: `password123`
   - Name: `Test User`

4. **Click "Sign Up"**

5. **You should be redirected to login**

6. **Login with your test account**

7. **You should see the dashboard!** 🎉

---

## ✅ Success Checklist

If everything worked:

- [ ] You can visit your app at `https://your-app.vercel.app`
- [ ] Registration page loads
- [ ] You can create an account
- [ ] You can login
- [ ] Dashboard shows with 0 stats
- [ ] You can add a grammar rule
- [ ] You can add vocabulary
- [ ] You can write an essay

---

## 🆘 Troubleshooting

### Problem: "Unauthorized" on all pages

**Solution:**

1. Check environment variables in Vercel Dashboard
2. Go to your project → Settings → Environment Variables
3. Verify all 3 are set correctly
4. Make sure NEXTAUTH_URL matches your actual URL
5. Redeploy: Deployments → ... → Redeploy

### Problem: "Cannot connect to database"

**Solution:**

1. Check DATABASE_URL in environment variables
2. Make sure it ends with `?sslmode=require` for production
3. Test connection: Go to Vercel Storage → Your database → Test connection

### Problem: "Table does not exist"

**Solution:**
You forgot to run migrations! Follow Part 7 above.

### Problem: Build fails

**Solution:**

1. Check build logs in Vercel
2. Usually means environment variables are missing
3. Add all 3 variables and redeploy

---

## 📝 Quick Reference

### Your 3 Environment Variables:

```bash
# 1. Your app's URL
NEXTAUTH_URL=https://paperone.vercel.app

# 2. Secret key (generate new for each project)
NEXTAUTH_SECRET=your-32-character-random-string

# 3. Database connection (from Vercel Postgres)
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Commands You Might Need:

```bash
# Generate secret (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Deploy from local
vercel deploy --prod

# Pull environment variables
vercel env pull .env.local

# Run database migration
npx prisma migrate deploy

# View database
npx prisma studio
```

---

## 🎓 What You Learned

- ✅ How to create environment variables in Vercel
- ✅ How to set up a PostgreSQL database
- ✅ How to deploy a Next.js app
- ✅ How to run database migrations
- ✅ How to troubleshoot common issues

---

## Next Steps

1. ✅ App is deployed and working
2. Add custom domain (optional): Vercel → Settings → Domains
3. Enable Vercel Analytics: Project → Analytics → Enable
4. Set up monitoring: Check Vercel logs regularly
5. Share your app with friends!

**Your app is LIVE at:** `https://paperone.vercel.app` 🎉

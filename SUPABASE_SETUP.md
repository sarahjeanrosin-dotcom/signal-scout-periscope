# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **"New Project"**
3. Fill in:
   - **Organization**: your org (or personal)
   - **Project name**: `signal-scout-periscope` (or any name you prefer)
   - **Database password**: choose a strong password and **save it somewhere safe**
   - **Region**: pick closest to you
4. Click **"Create new project"** and wait ~2 minutes for it to provision

## Step 2: Run the Database Schema

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase/schema.sql` from this repo
4. Paste it into the SQL editor and click **"Run"**
5. You should see "Success. No rows returned" for each statement

## Step 3: Get Your API Keys

1. In your Supabase dashboard, go to **Settings → API**
2. You'll find:
   - **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
   - **anon/public key** — safe for browser use
   - **service_role key** — secret, server-side only (keep this private!)

## Step 4: Set Up Environment Variables

Create a `.env.local` file in the root of this project:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

> **Important**: Never commit `.env.local` to git — it's already in `.gitignore`

## Step 5: Enable Email Auth

1. In your Supabase dashboard, go to **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. Optionally, under **Authentication → Email Templates**, you can customize the confirmation email

## Step 6: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the Sign Up page.

## Weekly Refresh (Optional - Production)

To enable weekly automated data refreshes, set up a cron job that calls:
```
POST /api/cron/refresh
Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY
```

On Vercel, add this to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/refresh",
    "schedule": "0 9 * * 1"
  }]
}
```

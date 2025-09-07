# Shopping List App

A Next.js shopping list app with real-time synchronization using Supabase and AI-powered categorization using Claude 3 Haiku.

## Features

- ✅ Single page scrollable shopping list
- ✅ Items organized by categories
- ✅ Toggle items as completed (crossed out)
- ✅ Auto-removal of completed items after 12 hours
- ✅ Real-time sync with Supabase
- ✅ AI-powered category detection using Claude 3 Haiku
- ✅ Responsive design

## Setup Instructions

### 1. Database Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. In the SQL Editor, run the contents of `supabase-schema.sql` to create the database schema
3. Note your project URL and anon key from the project settings

### 2. Environment Variables

The environment variables are already set up in `.env.local`:
- `NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `CLAUDE_API_KEY`: Your Claude API key

### 3. Deployment on Vercel

1. Push this code to a GitHub repository
2. Connect your GitHub repository to Vercel
3. Add the environment variables in Vercel project settings
4. Deploy!

The app includes:
- CRON jobs for database keep-alive (every 2 days)
- Automated cleanup of old completed items (every 6 hours)

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## CRON Jobs

The app includes two CRON jobs configured in `vercel.json`:

1. **Keep-alive** (`/api/keep-alive`): Runs every 2 days to keep the database connection alive
2. **Cleanup** (`/api/cleanup`): Runs every 6 hours to remove items that have been completed for more than 12 hours

## API Endpoints

- `POST /api/categorize`: Categorizes items using Claude 3 Haiku
- `POST /api/cleanup`: Removes old completed items
- `GET /api/keep-alive`: Database keep-alive endpoint

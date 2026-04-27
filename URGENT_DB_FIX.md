# 🚨 URGENT: Database Schema Must Be Applied

## Issue
You're getting PGRST200 errors because the database schema hasn't been applied yet. The foreign key relationships don't exist in your Supabase database.

## Immediate Fix Required

### Step 1: Apply Schema in Supabase
1. Go to your Supabase Dashboard → SQL Editor
2. Copy the entire content of `supabase/fix_chat_schema.sql`
3. Paste and run the SQL script

### Step 2: Verify Tables Created
After running the script, verify these tables exist:
- ✅ `messages` (with proper foreign key to `profiles`)
- ✅ `notifications` 
- ✅ `chat_polls`
- ✅ `chat_poll_options`
- ✅ `chat_poll_votes`
- ✅ `typing_status`
- ✅ `event_checkins`

### Step 3: Restart Your App
After applying the schema, restart your Expo app:
```bash
expo start --clear
```

## What the Schema Fixes
- **PGRST200 Error**: Creates proper `messages.sender_id → profiles.id` foreign key
- **Missing Columns**: Adds `created_at` to `chat_poll_votes`
- **RLS Policies**: Enables proper access control
- **Indexes**: Optimizes query performance

## Quick Test After Fix
Once schema is applied:
1. Open the chat screen
2. Try sending a message
3. Try creating a poll
4. All errors should be resolved

## If Issues Persist
Check Supabase logs for any SQL execution errors and ensure:
- Your Supabase project has proper permissions
- No existing data conflicts (schema drops tables first)
- All foreign key references are valid

---

**This is required before any chat functionality will work!**

-- ============================================================
-- LinkLoop — Real-World Fix v7 (Final Storage Fix)
-- FIXES: Image upload failures (Bucket & Policies)
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- ── 1. Force Bucket to be Public ─────────────────────────────
-- This ensures the bucket exists and is public for chat media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── 2. Storage Policies ──────────────────────────────────────
-- We drop and recreate to ensure they are correct and not duplicated
DO $$ BEGIN
  -- Upload Policy
  EXECUTE 'DROP POLICY IF EXISTS "Users can upload own media" ON storage.objects';
  CREATE POLICY "Users can upload own media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- View Policy
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects';
  CREATE POLICY "Anyone can view chat media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-media');

  -- Delete Policy (Owner only)
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects';
  CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
END $$;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✅ LinkLoop v7 Applied! Storage bucket is now PUBLIC and policies are enforced.';
END $$;

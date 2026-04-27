-- ============================================================
-- LinkLoop Final Fix — Run this ONCE in Supabase SQL Editor
-- Idempotent: safe to run multiple times
-- ============================================================

-- ── 1. Ensure profiles has is_online and last_seen ──────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ── 2. Drop & Recreate messages with message_type column ─────
-- (Safe: add column if not exists)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' 
  CHECK (message_type IN ('text', 'image', 'video', 'location', 'poll'));

-- ── 3. Media table (for privacy-aware image/video sharing) ──
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    permission_type TEXT DEFAULT 'allow' 
        CHECK (permission_type IN ('view_only', 'request', 'allow')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_event ON public.media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_sender ON public.media(sender_id);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Drop old conflicting policies before creating new ones
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='media' AND policyname='Media access for event participants') THEN
    EXECUTE 'DROP POLICY "Media access for event participants" ON public.media';
  END IF;
END $$;

CREATE POLICY "Event participants can view media" ON public.media
FOR SELECT USING (
    sender_id = auth.uid() OR
    permission_type = 'allow' OR
    (permission_type = 'view_only' AND (expires_at IS NULL OR expires_at > now())) OR
    (permission_type = 'request' AND EXISTS (
        SELECT 1 FROM public.media_access_requests
        WHERE media_id = media.id
        AND requester_id = auth.uid()
        AND status = 'approved'
    ))
);

CREATE POLICY "Authenticated users can insert media" ON public.media
FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ── 4. Fix media_access_requests to reference media.id (UUID) ──
-- Drop old table if it has wrong schema and recreate
DROP TABLE IF EXISTS public.media_access_requests CASCADE;

CREATE TABLE public.media_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(media_id, requester_id)
);

ALTER TABLE public.media_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own access requests" ON public.media_access_requests
FOR ALL USING (requester_id = auth.uid());

CREATE POLICY "Media owners can update requests" ON public.media_access_requests
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.media 
        WHERE id = media_access_requests.media_id 
        AND sender_id = auth.uid()
    )
);

-- ── 5. Typing Status — ensure correct RLS ───────────────────
CREATE TABLE IF NOT EXISTS public.typing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Drop old conflicting policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='typing_status' AND policyname='Participants can view typing status') THEN
    EXECUTE 'DROP POLICY "Participants can view typing status" ON public.typing_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='typing_status' AND policyname='Users can update their own typing status') THEN
    EXECUTE 'DROP POLICY "Users can update their own typing status" ON public.typing_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='typing_status' AND policyname='Anyone can view typing status') THEN
    EXECUTE 'DROP POLICY "Anyone can view typing status" ON public.typing_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='typing_status' AND policyname='Users can update own typing status') THEN
    EXECUTE 'DROP POLICY "Users can update own typing status" ON public.typing_status';
  END IF;
END $$;

CREATE POLICY "Anyone can view typing status" ON public.typing_status
FOR SELECT USING (true);

CREATE POLICY "Users can upsert own typing status" ON public.typing_status
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own typing status" ON public.typing_status
FOR UPDATE USING (user_id = auth.uid());

-- ── 6. Screenshot logs — event creator can view ─────────────
ALTER TABLE public.screenshot_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='screenshot_logs' AND policyname='Users can insert own screenshot logs') THEN
    EXECUTE 'DROP POLICY "Users can insert own screenshot logs" ON public.screenshot_logs';
  END IF;
END $$;

CREATE POLICY "Users can insert screenshot logs" ON public.screenshot_logs
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event creators can view screenshot logs" ON public.screenshot_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE id = screenshot_logs.event_id AND creator_id = auth.uid()
    ) OR user_id = auth.uid()
);

-- ── 7. Notifications — ensure all types are allowed ─────────
-- Re-create notifications type constraint with all types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'message', 'invitation', 'request_accepted', 'request_rejected',
    'reminder', 'join_request', 'media_request', 'approval',
    'social_activity', 'screenshot_detected', 'poll_created', 'poll_vote'
));

-- Ensure INSERT is allowed (for in-app notification creation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='System can insert notifications') THEN
    EXECUTE 'CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- ── 8. Ensure Storage bucket exists ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- ── 9. Force PostgREST schema reload ────────────────────────
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✅ LinkLoop Final Fix applied successfully!';
    RAISE NOTICE '✅ media table created with correct FK';
    RAISE NOTICE '✅ media_access_requests fixed to UUID references';
    RAISE NOTICE '✅ typing_status RLS policies corrected';
    RAISE NOTICE '✅ notifications type constraint updated';
    RAISE NOTICE '✅ profiles columns (is_online, last_seen) added';
END $$;

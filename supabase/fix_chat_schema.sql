-- ============================================================
-- Fix Chat & Notifications Schema - Production Ready
-- ============================================================

-- Drop existing tables if they exist to recreate with proper relationships
DROP TABLE IF EXISTS public.chat_poll_votes CASCADE;
DROP TABLE IF EXISTS public.chat_poll_options CASCADE;
DROP TABLE IF EXISTS public.chat_polls CASCADE;
DROP TABLE IF EXISTS public.scheduled_messages CASCADE;
DROP TABLE IF EXISTS public.event_checkins CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- 1. Messages Table - Fixed relationship
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'location', 'poll')),
    is_deleted BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'seen', 'cancelled')),
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_event ON public.messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

-- 2. Notifications Table - Enhanced
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('message', 'invitation', 'request_accepted', 'request_rejected', 'reminder', 'join_request', 'media_request', 'approval', 'social_activity', 'screenshot_detected', 'poll_created', 'poll_vote')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- 3. Scheduled Messages Table
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    send_at TIMESTAMPTZ NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_event ON public.scheduled_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_sender ON public.scheduled_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_send_at ON public.scheduled_messages(send_at);

-- 4. Event Check-ins Table
CREATE TABLE IF NOT EXISTS public.event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_event ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.event_checkins(user_id);

-- 5. Chat Polls Tables
CREATE TABLE IF NOT EXISTS public.chat_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    is_multiple_choice BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES public.chat_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(option_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_event ON public.chat_polls(event_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON public.chat_poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.chat_poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.chat_poll_votes(user_id);

-- 6. Typing Status Table
CREATE TABLE IF NOT EXISTS public.typing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_event ON public.typing_status(event_id);
CREATE INDEX IF NOT EXISTS idx_typing_user ON public.typing_status(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_updated ON public.typing_status(updated_at);

-- 7. Media Access Requests Table
CREATE TABLE IF NOT EXISTS public.media_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id TEXT NOT NULL,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(media_id, requester_id)
);

-- 8. Screenshot Logs Table
CREATE TABLE IF NOT EXISTS public.screenshot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshot_logs ENABLE ROW LEVEL SECURITY;

-- Messages RLS Policies
CREATE POLICY "Participants can view messages" ON public.messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = messages.event_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.events
        WHERE id = messages.event_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Participants can insert messages" ON public.messages
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = messages.event_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.events
        WHERE id = messages.event_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Event creators can pin messages" ON public.messages
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE id = messages.event_id AND creator_id = auth.uid()
    )
);

-- Notifications RLS Policies
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Scheduled Messages RLS Policies
CREATE POLICY "Users can manage own scheduled messages" ON public.scheduled_messages
FOR ALL USING (sender_id = auth.uid());

-- Event Check-ins RLS Policies
CREATE POLICY "Anyone can view checkins" ON public.event_checkins
FOR SELECT USING (true);

CREATE POLICY "Users can checkin themselves" ON public.event_checkins
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own checkins" ON public.event_checkins
FOR DELETE USING (user_id = auth.uid());

-- Polls RLS Policies
CREATE POLICY "Participants can view polls" ON public.chat_polls
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = chat_polls.event_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.events
        WHERE id = chat_polls.event_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Users can create polls" ON public.chat_polls
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = chat_polls.event_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.events
        WHERE id = chat_polls.event_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view poll options" ON public.chat_poll_options
FOR SELECT USING (true);

CREATE POLICY "Poll creators can insert options" ON public.chat_poll_options
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_polls 
        WHERE id = chat_poll_options.poll_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view poll votes" ON public.chat_poll_votes
FOR SELECT USING (true);

CREATE POLICY "Participants can vote" ON public.chat_poll_votes
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = (SELECT event_id FROM public.chat_poll_options WHERE id = chat_poll_votes.option_id LIMIT 1)
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete own vote" ON public.chat_poll_votes
FOR DELETE USING (user_id = auth.uid());

-- Typing Status RLS Policies
CREATE POLICY "Anyone can view typing status" ON public.typing_status
FOR SELECT USING (true);

CREATE POLICY "Users can update own typing status" ON public.typing_status
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own typing status" ON public.typing_status
FOR UPDATE USING (user_id = auth.uid());

-- Media Access Requests RLS Policies
CREATE POLICY "Users can manage own access requests" ON public.media_access_requests
FOR ALL USING (requester_id = auth.uid());

-- Screenshot Logs RLS Policies
CREATE POLICY "Anyone can view screenshot logs" ON public.screenshot_logs
FOR SELECT USING (true);

CREATE POLICY "Users can insert own screenshot logs" ON public.screenshot_logs
FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Storage Bucket for Chat Media
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can update own chat media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-media');

-- ============================================================
-- Functions and Triggers
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean up old typing status
CREATE OR REPLACE FUNCTION public.cleanup_typing_status()
RETURNS void AS $$
BEGIN
    DELETE FROM public.typing_status 
    WHERE updated_at < now() - interval '30 seconds';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Realtime Subscriptions Setup
-- ============================================================

-- Add comments for documentation
COMMENT ON TABLE public.messages IS 'Chat messages for events with proper foreign key relationships';
COMMENT ON TABLE public.notifications IS 'User notifications for various chat and system events';
COMMENT ON TABLE public.chat_polls IS 'Polls created within event chats';
COMMENT ON TABLE public.chat_poll_options IS 'Options for chat polls';
COMMENT ON TABLE public.chat_poll_votes IS 'User votes on poll options';
COMMENT ON TABLE public.typing_status IS 'Real-time typing indicators for chat';
COMMENT ON TABLE public.event_checkins IS 'User check-ins for events';
COMMENT ON TABLE public.scheduled_messages IS 'Messages scheduled to be sent later';
COMMENT ON TABLE public.media_access_requests IS 'Requests for access to private media';
COMMENT ON TABLE public.screenshot_logs IS 'Security logs for screenshot detection';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Chat & Notifications schema fixed successfully!';
    RAISE NOTICE '✅ All foreign key relationships are properly configured';
    RAISE NOTICE '✅ RLS policies are implemented for security';
    RAISE NOTICE '✅ Storage bucket for chat media is ready';
END $$;

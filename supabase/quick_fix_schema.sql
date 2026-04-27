-- QUICK FIX: Apply this immediately to resolve PGRST200 errors
-- Run this in Supabase SQL Editor first

-- Fix messages table with proper foreign key
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
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

CREATE INDEX idx_messages_event ON public.messages(event_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- Fix chat polls tables
DROP TABLE IF EXISTS public.chat_poll_votes CASCADE;
DROP TABLE IF EXISTS public.chat_poll_options CASCADE;
DROP TABLE IF EXISTS public.chat_polls CASCADE;

CREATE TABLE public.chat_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    is_multiple_choice BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES public.chat_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(option_id, user_id)
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for messages
CREATE POLICY "Event participants can view messages" ON public.messages
    FOR SELECT USING (
        event_id IN (
            SELECT event_id FROM public.event_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Event participants can insert messages" ON public.messages
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT event_id FROM public.event_participants 
            WHERE user_id = auth.uid()
        ) AND sender_id = auth.uid()
    );

-- Basic RLS policies for polls
CREATE POLICY "Event participants can view polls" ON public.chat_polls
    FOR SELECT USING (
        event_id IN (
            SELECT event_id FROM public.event_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Event participants can create polls" ON public.chat_polls
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT event_id FROM public.event_participants 
            WHERE user_id = auth.uid()
        ) AND creator_id = auth.uid()
    );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

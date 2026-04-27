-- Schema for Chat and Notifications module

-- 1. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    is_pinned BOOLEAN DEFAULT false,
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'seen', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages of events they are participants in"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.event_checkins WHERE event_id = public.messages.event_id AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.events WHERE id = public.messages.event_id AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in events they participate in"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.event_checkins WHERE event_id = public.messages.event_id AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.events WHERE id = public.messages.event_id AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages or pin messages if they are the creator"
    ON public.messages FOR UPDATE
    USING (
        sender_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.events WHERE id = public.messages.event_id AND creator_id = auth.uid()
        )
    );

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "System or authenticated users can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true); -- Usually triggered via Edge Functions or Triggers, but allowing authenticated for now

-- 3. Scheduled Messages Table
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    send_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS for scheduled_messages
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled messages"
    ON public.scheduled_messages FOR ALL
    USING (sender_id = auth.uid());


-- 4. Event Checkins Table
CREATE TABLE IF NOT EXISTS public.event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(event_id, user_id)
);

-- Enable RLS for event_checkins
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see event checkins"
    ON public.event_checkins FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own checkins"
    ON public.event_checkins FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own checkins"
    ON public.event_checkins FOR DELETE
    USING (user_id = auth.uid());


-- 5. Chat Polls Table
CREATE TABLE IF NOT EXISTS public.chat_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS for chat_polls
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone in event can read polls"
    ON public.chat_polls FOR SELECT
    USING (true); -- Further restriction by event membership can be added if strict privacy is needed

CREATE POLICY "Users can insert polls in events"
    ON public.chat_polls FOR INSERT
    WITH CHECK (creator_id = auth.uid());


-- 6. Chat Poll Options Table
CREATE TABLE IF NOT EXISTS public.chat_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS for chat_poll_options
ALTER TABLE public.chat_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poll options"
    ON public.chat_poll_options FOR SELECT
    USING (true);

CREATE POLICY "Users can insert poll options"
    ON public.chat_poll_options FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_polls WHERE id = public.chat_poll_options.poll_id AND creator_id = auth.uid()
        )
    );


-- 7. Chat Poll Votes Table
CREATE TABLE IF NOT EXISTS public.chat_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES public.chat_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(option_id, user_id)
);

-- Enable RLS for chat_poll_votes
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poll votes"
    ON public.chat_poll_votes FOR SELECT
    USING (true);

CREATE POLICY "Users can vote once"
    ON public.chat_poll_votes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their vote"
    ON public.chat_poll_votes FOR DELETE
    USING (user_id = auth.uid());

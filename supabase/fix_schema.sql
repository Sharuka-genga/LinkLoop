-- Fix for PGRST200: Could not find a relationship between 'messages' and 'sender_id'
-- We explicitly define the foreign key to auth.users to ensure PostgREST can resolve profiles and users.

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Delete any existing mock messages that violate the constraint
DELETE FROM public.messages WHERE sender_id = '00000000-0000-0000-0000-000000000001';

-- PostgREST needs the foreign key to point DIRECTLY to the 'profiles' table 
-- in order for the query `.select('*, profiles:sender_id(...)')` to work.
ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Fix for Poll Creation failing due to missing INSERT RLS policies
CREATE POLICY "Participants can insert polls" ON public.chat_polls
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = chat_polls.event_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.events
        WHERE id = chat_polls.event_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Participants can insert poll options" ON public.chat_poll_options
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_polls
        WHERE id = chat_poll_options.poll_id AND creator_id = auth.uid()
    )
);

-- Scheduled Messages RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view scheduled messages" ON public.scheduled_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = scheduled_messages.event_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.events
        WHERE id = scheduled_messages.event_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Participants can insert scheduled messages" ON public.scheduled_messages
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = scheduled_messages.event_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.events
        WHERE id = scheduled_messages.event_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Users can update own scheduled messages" ON public.scheduled_messages
FOR UPDATE USING (sender_id = auth.uid());

-- Force PostgREST to reload the schema cache so the new relationships are recognized immediately
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- LinkLoop Master Database Repair & Relationship Enforcer
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. DROP and RECREATE to ensure a clean slate
-- This removes old broken relationships and clears the cache
DROP TABLE IF EXISTS public.event_invitations CASCADE;

-- 2. CREATE Table with explicit Foreign Key Names
CREATE TABLE public.event_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, receiver_id)
);

-- 3. ENFORCE specific relationship names for the PostgREST API
-- The name of the constraint is what Supabase uses as the "hint"
ALTER TABLE public.event_invitations DROP CONSTRAINT IF EXISTS sender_id;
ALTER TABLE public.event_invitations ADD CONSTRAINT sender_id FOREIGN KEY (sender_id) REFERENCES public.profiles(id);

ALTER TABLE public.event_invitations DROP CONSTRAINT IF EXISTS receiver_id;
ALTER TABLE public.event_invitations ADD CONSTRAINT receiver_id FOREIGN KEY (receiver_id) REFERENCES public.profiles(id);

-- 4. Re-enable Security (RLS)
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- Select: Both sender and receiver can see it
CREATE POLICY "Users can view their invitations" ON public.event_invitations 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Insert: Only the sender can create it
CREATE POLICY "Users can insert invitations" ON public.event_invitations 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Update: Only the receiver can accept/decline
CREATE POLICY "Receivers can update invitation status" ON public.event_invitations 
FOR UPDATE USING (auth.uid() = receiver_id);

-- 5. Atomic Accept Invitation Function (RPC)
CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID)
RETURNS VOID AS $$
DECLARE
    v_event_id UUID;
    v_user_id UUID;
BEGIN
    -- Get details and ensure pending
    SELECT event_id, receiver_id INTO v_event_id, v_user_id
    FROM public.event_invitations 
    WHERE id = p_invitation_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found or already processed';
    END IF;

    -- Mark as accepted
    UPDATE public.event_invitations SET status = 'accepted' WHERE id = p_invitation_id;

    -- Add to participants
    INSERT INTO public.event_participants (event_id, user_id)
    VALUES (v_event_id, v_user_id)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

RAISE NOTICE '✅ MASTER DATABASE REPAIR COMPLETE';

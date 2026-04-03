-- ============================================================
-- LinkLoop Database Fix: Data Cleanup & Relationship Repair
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. CLEANUP: Delete any events that point to non-existent profiles
-- This fixes the "violates foreign key constraint" error
DELETE FROM public.events 
WHERE creator_id NOT IN (SELECT id FROM public.profiles);

-- 2. REPAIR: Ensure the Foreign Key relationship exists for the feed join
DO $$
BEGIN
    -- Drop the constraint if it exists to recreate it cleanly
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_creator_id_fkey;
    
    -- Add the clean constraint
    ALTER TABLE public.events 
    ADD CONSTRAINT events_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
END $$;

-- 3. STRUCTURE: Create Event Participants table (if not exists)
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON event_participants(user_id);

-- 4. STRUCTURE: Create Event Join Requests table (if not exists)
CREATE TABLE IF NOT EXISTS event_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 5. SECURITY: Enable RLS and add Policies
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;

-- Participants Policies
DROP POLICY IF EXISTS "Anyone can view participants" ON event_participants;
CREATE POLICY "Anyone can view participants" ON event_participants FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can join events" ON event_participants;
CREATE POLICY "Users can join events" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave events" ON event_participants;
CREATE POLICY "Users can leave events" ON event_participants FOR DELETE USING (auth.uid() = user_id);

-- Requests Policies
DROP POLICY IF EXISTS "Users can view own requests" ON event_requests;
CREATE POLICY "Users can view own requests" ON event_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own requests" ON event_requests;
CREATE POLICY "Users can insert own requests" ON event_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts can view/update requests" ON event_requests;
CREATE POLICY "Hosts can view/update requests" ON event_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND creator_id = auth.uid())
);

-- 6. AUTOMATION: Award points on joining
CREATE OR REPLACE FUNCTION public.handle_event_join()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET engagement_score = engagement_score + 10,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_join ON event_participants;
CREATE TRIGGER on_event_join
  AFTER INSERT ON event_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_join();

RAISE NOTICE '✅ Database cleaned and relationship repair successful!';

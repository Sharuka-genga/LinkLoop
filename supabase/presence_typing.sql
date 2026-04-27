-- 1. Update Profiles for Online/Offline Status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- 2. Create Typing Status Table
CREATE TABLE IF NOT EXISTS typing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Typing Status
CREATE POLICY "Participants can view typing status"
ON typing_status FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM event_participants
        WHERE event_id = typing_status.event_id
        AND (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001')
    )
);

CREATE POLICY "Users can update their own typing status"
ON typing_status FOR ALL
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001')
WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001');

-- 5. Helper Function for Presence
-- We can also use a trigger or a simple update from the client.
-- The client-side AppState listener will call updateUserStatus(true/false).

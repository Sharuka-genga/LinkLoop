-- ============================================================
-- LinkLoop Supabase Database Schema
-- Run this SQL in Supabase SQL Editor to set up all tables
-- ============================================================

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}',
  profile_picture_url TEXT DEFAULT '',
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Activities table (tracks all user activities for engagement scoring)
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('event', 'sport', 'booking', 'social', 'study')),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);

-- 3. Courts table (facility booking)
CREATE TABLE IF NOT EXISTS courts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tennis', 'volleyball', 'basketball')),
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed some courts
INSERT INTO courts (name, type, location) VALUES
  ('Tennis Court A', 'tennis', 'Sports Complex - West Wing'),
  ('Tennis Court B', 'tennis', 'Sports Complex - West Wing'),
  ('Basketball Court 1', 'basketball', 'Sports Complex - Main Hall'),
  ('Basketball Court 2', 'basketball', 'Sports Complex - Outdoor'),
  ('Volleyball Court 1', 'volleyball', 'Sports Complex - East Wing'),
  ('Volleyball Court 2', 'volleyball', 'Sports Complex - Outdoor')
ON CONFLICT DO NOTHING;

-- 4. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE NOT NULL,
  booked_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(court_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings(court_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(booked_by);

-- 5. SOS Alerts table
CREATE TABLE IF NOT EXISTS sos_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT DEFAULT '',
  student_email TEXT DEFAULT '',
  message TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_alerts(status);

-- 6. Trusted Contacts table (for SOS notifications)
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON trusted_contacts(user_id);

-- 7. Function to increment engagement score
CREATE OR REPLACE FUNCTION increment_engagement_score(user_id_input UUID, points_input INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET engagement_score = engagement_score + points_input,
      updated_at = now()
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Activities: users can read/insert their own activities
CREATE POLICY "Users can view own activities" ON activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Courts: anyone authenticated can read courts
CREATE POLICY "Authenticated users can view courts" ON courts FOR SELECT USING (auth.role() = 'authenticated');

-- Bookings: users can manage their own bookings, view all for availability
CREATE POLICY "Users can view all bookings" ON bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = booked_by);
CREATE POLICY "Users can delete own bookings" ON bookings FOR DELETE USING (auth.uid() = booked_by);

-- SOS Alerts: users can insert their own alerts
CREATE POLICY "Users can insert SOS alerts" ON sos_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own SOS alerts" ON sos_alerts FOR SELECT USING (auth.uid() = user_id);

-- Trusted Contacts: users manage their own contacts
CREATE POLICY "Users can view own contacts" ON trusted_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON trusted_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON trusted_contacts FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE  —  Avatar bucket for profile pictures
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update (overwrite) their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');


-- ============================================================
-- SEED DATA  —  Creates demo users directly in auth.users
-- ============================================================
-- Just run this entire file in Supabase SQL Editor.
-- No need to create users manually in the Dashboard!
--
-- Demo Logins:
--   Email                          Password
--   ─────────────────────────────  ────────────
--   IT23100001@my.sliit.lk         Demo@1234
--   IT23100002@my.sliit.lk         Demo@1234
--   IT23100003@my.sliit.lk         Demo@1234
-- ============================================================

DO $$
DECLARE
  u1 UUID := gen_random_uuid();
  u2 UUID := gen_random_uuid();
  u3 UUID := gen_random_uuid();

  court_tennis_a  UUID;
  court_tennis_b  UUID;
  court_basket_1  UUID;
  court_basket_2  UUID;
  court_volley_1  UUID;
  court_volley_2  UUID;
BEGIN

  -- ────────────────────────────────────────
  -- Create auth users (so you can sign in directly)
  -- ────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change
  ) VALUES
    (
      u1,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'it23100001@my.sliit.lk',
      crypt('Demo@1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Nimasha Ranawana"}'::jsonb,
      now(), now(), '', '', '', ''
    ),
    (
      u2,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'it23100002@my.sliit.lk',
      crypt('Demo@1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Kavindu Perera"}'::jsonb,
      now(), now(), '', '', '', ''
    ),
    (
      u3,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'it23100003@my.sliit.lk',
      crypt('Demo@1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Sanduni Fernando"}'::jsonb,
      now(), now(), '', '', '', ''
    )
  ON CONFLICT (id) DO NOTHING;

  -- Also add identities (required by Supabase Auth)
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES
    (u1, u1::text, u1, jsonb_build_object('sub', u1::text, 'email', 'it23100001@my.sliit.lk'), 'email', now(), now(), now()),
    (u2, u2::text, u2, jsonb_build_object('sub', u2::text, 'email', 'it23100002@my.sliit.lk'), 'email', now(), now(), now()),
    (u3, u3::text, u3, jsonb_build_object('sub', u3::text, 'email', 'it23100003@my.sliit.lk'), 'email', now(), now(), now())
  ON CONFLICT (provider_id, provider) DO NOTHING;

  -- ────────────────────────────────────────
  -- Profiles
  -- ────────────────────────────────────────
  INSERT INTO profiles (id, full_name, student_id, phone, bio, interests, engagement_score)
  VALUES
    (u1, 'Nimasha Ranawana',  'IT23100001', '+94771234567',
     'CS undergraduate passionate about mobile dev & volleyball',
     ARRAY['Volleyball','Mobile Dev','Hackathons','Campus Events','Gym','Music'],
     275),
    (u2, 'Kavindu Perera',    'IT23100002', '+94779876543',
     'Sport enthusiast & part-time gamer. Always up for a game!',
     ARRAY['Cricket','Basketball','PC Gaming','E-sports','Hiking','Cooking'],
     180),
    (u3, 'Sanduni Fernando',  'IT23100003', '+94775551234',
     'UI/UX design lover. Cafe hopper & bookworm.',
     ARRAY['UI/UX Design','Web Dev','Cafe Hopping','Reading','Photography','Yoga'],
     95)
  ON CONFLICT (id) DO UPDATE SET
    full_name        = EXCLUDED.full_name,
    student_id       = EXCLUDED.student_id,
    phone            = EXCLUDED.phone,
    bio              = EXCLUDED.bio,
    interests        = EXCLUDED.interests,
    engagement_score = EXCLUDED.engagement_score;

  -- ────────────────────────────────────────
  -- Grab court IDs
  -- ────────────────────────────────────────
  SELECT id INTO court_tennis_a FROM courts WHERE name = 'Tennis Court A'     LIMIT 1;
  SELECT id INTO court_tennis_b FROM courts WHERE name = 'Tennis Court B'     LIMIT 1;
  SELECT id INTO court_basket_1 FROM courts WHERE name = 'Basketball Court 1' LIMIT 1;
  SELECT id INTO court_basket_2 FROM courts WHERE name = 'Basketball Court 2' LIMIT 1;
  SELECT id INTO court_volley_1 FROM courts WHERE name = 'Volleyball Court 1' LIMIT 1;
  SELECT id INTO court_volley_2 FROM courts WHERE name = 'Volleyball Court 2' LIMIT 1;

  -- ────────────────────────────────────────
  -- Activities  (past 2 weeks of demo data)
  -- ────────────────────────────────────────
  INSERT INTO activities (user_id, title, description, type, points, created_at) VALUES
    -- Nimasha (u1)
    (u1, 'Joined SLIIT Hackathon 2026',        'Led a team of 4 in the annual hackathon',            'event',   50, now() - interval '1 day'),
    (u1, 'Volleyball practice session',         'Evening practice at Sports Complex',                  'sport',   15, now() - interval '2 days'),
    (u1, 'Booked Tennis Court A',               'Reserved for Friday morning game',                    'booking',  5, now() - interval '2 days'),
    (u1, 'Attended AI/ML Workshop',             'Guest lecture by Dr. Silva on neural networks',       'study',   20, now() - interval '3 days'),
    (u1, 'Basketball pickup game',              'Found companions through LinkLoop',                   'sport',   15, now() - interval '4 days'),
    (u1, 'Study group — Data Structures',       'Prepared for mid-sem with 5 classmates',              'study',   10, now() - interval '5 days'),
    (u1, 'Booked Volleyball Court 1',           'Weekend tournament prep',                             'booking',  5, now() - interval '5 days'),
    (u1, 'SLIIT Cultural Night',                'Performed with the dance crew',                       'event',   30, now() - interval '7 days'),
    (u1, 'Morning jog — campus track',          'Ran 5K around the campus perimeter',                  'sport',   10, now() - interval '8 days'),
    (u1, 'Movie night with friends',            'Watched a film at the student lounge',                'social',  10, now() - interval '9 days'),
    (u1, 'Gym session',                         'Chest and back day at campus gym',                    'sport',   10, now() - interval '10 days'),
    (u1, 'Attended Tech Fest opening',          'Keynote by industry professionals',                   'event',   25, now() - interval '12 days'),
    (u1, 'Booked Basketball Court 1',           'Mid-week game with Kavindu',                          'booking',  5, now() - interval '13 days'),
    (u1, 'Volunteered at orientation',          'Helped guide new first-year students',                'social',  20, now() - interval '14 days'),

    -- Kavindu (u2)
    (u2, 'Cricket match — inter-faculty',       'Scored 45 runs for Faculty of Computing',             'sport',   20, now() - interval '1 day'),
    (u2, 'Booked Basketball Court 2',           'Evening game with hostel mates',                      'booking',  5, now() - interval '1 day'),
    (u2, 'E-sports tournament registration',    'Registered for VALORANT campus cup',                  'event',   15, now() - interval '3 days'),
    (u2, 'Basketball 3v3 pickup',               'Outdoor court, won 3 games in a row',                 'sport',   15, now() - interval '4 days'),
    (u2, 'Cooking club meetup',                 'Made Sri Lankan rice & curry together',               'social',  10, now() - interval '5 days'),
    (u2, 'Booked Tennis Court B',               'First-time trying tennis with friends',               'booking',  5, now() - interval '6 days'),
    (u2, 'Hiking — Ambuluwawa trip',            'Weekend hike organised via LinkLoop',                  'social',  15, now() - interval '7 days'),
    (u2, 'PC gaming marathon',                  'Played with campus gaming club',                       'social',  10, now() - interval '8 days'),
    (u2, 'Attended career guidance seminar',    'Resume writing & LinkedIn tips',                       'study',   15, now() - interval '10 days'),
    (u2, 'Cricket nets practice',               'Bowled 6 overs at the practice nets',                 'sport',   10, now() - interval '11 days'),
    (u2, 'Joined SLIIT Hackathon 2026',        'Participated as backend developer',                   'event',   50, now() - interval '13 days'),

    -- Sanduni (u3)
    (u3, 'UI/UX design workshop',               'Figma masterclass by senior designer',                'study',   20, now() - interval '1 day'),
    (u3, 'Cafe hopping — Colombo 7',           'Visited 3 new cafes for reviews',                     'social',  10, now() - interval '2 days'),
    (u3, 'Yoga class — wellness week',          'Morning session at campus garden',                     'sport',   10, now() - interval '3 days'),
    (u3, 'Booked Volleyball Court 2',           'Casual game after design meetup',                     'booking',  5, now() - interval '4 days'),
    (u3, 'Photography walk — campus',           'Golden hour shots around SLIIT',                       'social',  10, now() - interval '5 days'),
    (u3, 'Web dev study session',               'Built a portfolio site with React',                    'study',   10, now() - interval '6 days'),
    (u3, 'Attended book club meeting',          'Discussed "Atomic Habits" with 8 people',             'social',  10, now() - interval '8 days'),
    (u3, 'Joined campus cleanup drive',         'Environmental club volunteering',                      'event',   20, now() - interval '10 days');

  -- ────────────────────────────────────────
  -- Bookings  (upcoming + recent)
  -- ────────────────────────────────────────
  INSERT INTO bookings (court_id, booked_by, date, start_time, end_time, status) VALUES
    -- Tomorrow's bookings
    (court_tennis_a, u1, CURRENT_DATE + 1, '08:00', '09:00', 'confirmed'),
    (court_basket_1, u2, CURRENT_DATE + 1, '16:00', '17:00', 'confirmed'),
    (court_volley_1, u1, CURRENT_DATE + 1, '17:00', '18:00', 'confirmed'),

    -- Day after tomorrow
    (court_tennis_b, u2, CURRENT_DATE + 2, '07:00', '08:00', 'confirmed'),
    (court_basket_2, u1, CURRENT_DATE + 2, '15:00', '16:00', 'confirmed'),
    (court_volley_2, u3, CURRENT_DATE + 2, '10:00', '11:00', 'confirmed'),

    -- 3 days out
    (court_basket_1, u1, CURRENT_DATE + 3, '09:00', '10:00', 'confirmed'),
    (court_tennis_a, u3, CURRENT_DATE + 3, '14:00', '15:00', 'confirmed'),

    -- 5 days out
    (court_volley_1, u2, CURRENT_DATE + 5, '11:00', '12:00', 'confirmed'),
    (court_basket_2, u3, CURRENT_DATE + 5, '16:00', '17:00', 'confirmed')
  ON CONFLICT (court_id, date, start_time) DO NOTHING;

  -- ────────────────────────────────────────
  -- Trusted Contacts
  -- ────────────────────────────────────────
  INSERT INTO trusted_contacts (user_id, name, phone) VALUES
    (u1, 'Kavindu Perera',    '+94779876543'),
    (u1, 'Sanduni Fernando',  '+94775551234'),
    (u1, 'Mom',               '+94771112233'),

    (u2, 'Nimasha Ranawana',  '+94771234567'),
    (u2, 'Ashan (Roommate)',  '+94776667788'),

    (u3, 'Nimasha Ranawana',  '+94771234567'),
    (u3, 'Dad',               '+94774445566');

  -- ────────────────────────────────────────
  -- SOS Alerts  (one resolved example)
  -- ────────────────────────────────────────
  INSERT INTO sos_alerts (user_id, student_name, student_email, message, status, resolved_at, created_at) VALUES
    (u2, 'Kavindu Perera', 'IT23100002@my.sliit.lk',
     'Stuck in elevator - Building C, 3rd floor',
     'resolved', now() - interval '4 days', now() - interval '4 days');

  RAISE NOTICE '✅ Seed data inserted successfully!';
END $$;

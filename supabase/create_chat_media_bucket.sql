-- ============================================================
-- LinkLoop: Create 'chat-media' Storage Bucket
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create the bucket (public so media URLs are accessible)
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (should already be enabled)
-- alter table storage.objects enable row level security;

-- 2. Allow anyone to read objects in the bucket
create policy "Public Read Access"
  on storage.objects for select
  using ( bucket_id = 'chat-media' );

-- 3. Allow inserts (required for createSignedUploadUrl + XHR upload flow)
create policy "Allow Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'chat-media' );

-- 4. Allow updates (for upsert)
create policy "Allow Updates"
  on storage.objects for update
  using ( bucket_id = 'chat-media' );

-- 5. Allow deletes
create policy "Allow Deletes"
  on storage.objects for delete
  using ( bucket_id = 'chat-media' );


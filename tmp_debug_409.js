const { createClient } = require('@supabase/supabase-js');

// Read from .env
require('dotenv').config({ path: 'c:\\Users\\SITHUMINI\\OneDrive\\Desktop\\linkloopgit\\linkloopgit\\LinkLoop\\linkloop\\.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConstraints() {
  console.log("Checking indexing and constraints on messages table...");
  
  // Actually, we can't directly query pg_class from the anon role.
  // Instead, let's try to trigger the 409 to see the exact error message.
  
  const eventId = "550e8400-e29b-41d4-a716-446655440000"; // Mock event id
  const senderId = "00000000-0000-0000-0000-000000000001"; // TEST_USER_ID
  
  console.log("Inserting message 1...");
  const msg1 = await supabase.from('messages').insert({
    event_id: eventId,
    sender_id: senderId,
    content: "test unique constraint duplicate"
  }).select();
  console.log("Msg 1:", msg1.error || msg1.data);
  
  console.log("Inserting message 2 (exact duplicate)...");
  const msg2 = await supabase.from('messages').insert({
    event_id: eventId,
    sender_id: senderId,
    content: "test unique constraint duplicate"
  }).select();
  console.log("Msg 2:", msg2.error || msg2.data);
}

checkConstraints();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://diqggfoxvxojdyavgeru.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpcWdnZm94dnhvamR5YXZnZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDA0ODQsImV4cCI6MjA4NzgxNjQ4NH0.GHhcsn9fSses5mKmxavxWWR5vhPkYfiGfQmcpWlk04Y'
);

async function check() {
  const { data: events } = await supabase.from('events').select('creator_id').limit(5);
  console.log("Creators:", events);
}

check();

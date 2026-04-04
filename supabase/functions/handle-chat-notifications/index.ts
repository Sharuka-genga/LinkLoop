// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    // 1. Ignore `pending` or `cancelled` messages
    if (record.status === 'pending' || record.status === 'cancelled') {
      return new Response(JSON.stringify({ message: "Ignored pending/cancelled state" }), { status: 200 });
    }

    // 2. Ignore Updates that were already notified (e.g. delivered/seen statuses)
    // Only process inserts or updates where status changes *to* 'sent' from 'pending'
    if (payload.type === 'UPDATE' && payload.old_record.status !== 'pending') {
      return new Response(JSON.stringify({ message: "Already notified" }), { status: 200 });
    }

    // 3. Fetch Event info
    const { data: event } = await supabase
      .from('events')
      .select('name')
      .eq('id', record.event_id)
      .single();

    // 4. Format Sender Identity for Anonymous Mode
    let senderName = "Someone";
    if (record.is_anonymous) {
      senderName = "Anonymous";
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', record.sender_id)
        .single();
      if (profile) senderName = profile.full_name;
    }

    // 5. Notify all other event participants (excluding sender)
    // (Assuming there is an `event_checkins` or `event_participants` table that stores user fcm tokens)
    
    // For demonstration purposes, we form the FCM Payload:
    const fcmPayload = {
      notification: {
        title: `${senderName} in ${event?.name || 'Group'}`,
        body: record.is_anonymous ? "New message from Anonymous" : record.content,
      },
      data: {
        eventId: record.event_id,
        messageId: record.id
      }
    };

    console.log("Dispatching FCM Push:", fcmPayload);
    // TODO: Call your FCM HTTP v1 API logic here

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

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
    if (payload.type === 'UPDATE' && payload.old_record.status !== 'pending') {
      return new Response(JSON.stringify({ message: "Already notified" }), { status: 200 });
    }

    // 3. Fetch Event info
    const { data: event } = await supabase
      .from('events')
      .select('title, creator_id')
      .eq('id', record.event_id)
      .single();

    // 4. Format Sender Identity
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

    // 5. Fetch all participants to notify
    const { data: participants } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', record.event_id);

    const recipientIds = new Set((participants || []).map(p => p.user_id));
    recipientIds.add(event.creator_id);
    recipientIds.delete(record.sender_id); // Exclude sender

    // 6. Create notifications in DB for all recipients
    if (recipientIds.size > 0) {
      const notificationRows = Array.from(recipientIds).map(userId => ({
        user_id: userId,
        actor_id: record.sender_id,
        event_id: record.event_id,
        type: 'message',
        title: `New message in ${event?.title || 'Group'}`,
        body: record.is_anonymous ? "Someone sent a message" : `${senderName}: ${record.content.substring(0, 100)}`,
        data: { eventId: record.event_id, messageId: record.id }
      }));

      await supabase.from('notifications').insert(notificationRows);
    }

    return new Response(JSON.stringify({ success: true, notified_count: recipientIds.size }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error in handle-chat-notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

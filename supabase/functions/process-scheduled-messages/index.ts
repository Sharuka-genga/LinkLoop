// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Use service role to bypass RLS and insert system-level sent messages
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // 1. Fetch all pending scheduled messages whose send_at is past or equal to NOW()
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .lte('send_at', new Date().toISOString())
      .eq('status', 'pending');

    if (fetchError) throw fetchError;
    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ message: "No pending scheduled messages" }), { status: 200 });
    }

    // 2. Loop through and create actual messages
    const processedIds = [];
    for (const msg of pendingMessages) {
      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          event_id: msg.event_id,
          sender_id: msg.sender_id,
          content: msg.content,
          is_anonymous: msg.is_anonymous,
          status: 'sent'
        });

      if (insertError) {
        // Log error and mark as failed
        await supabase
            .from('scheduled_messages')
            .update({ status: 'failed' })
            .eq('id', msg.id);
        console.error("Error sending scheduled message", msg.id, insertError);
        continue;
      }

      // Mark the scheduled item as sent
      await supabase
        .from('scheduled_messages')
        .update({ status: 'sent' })
        .eq('id', msg.id);
        
      processedIds.push(msg.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed_count: processedIds.length,
      processed_ids: processedIds 
    }), { headers: { "Content-Type": "application/json" } });
    
  } catch (error: any) {
    console.error("Error in process-scheduled-messages:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

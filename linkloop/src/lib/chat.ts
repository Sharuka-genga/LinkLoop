import { supabase } from "./supabase";

export type MessageMetadata = {
  type: 'text' | 'image' | 'video' | 'location';
  text?: string;
  latitude?: number;
  longitude?: number;
  permission_type?: 'view_only' | 'request' | 'allow';
  expires_at?: string;
};

export type Message = {
  id: string;
  event_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  created_at: string;
  is_pinned?: boolean;
  status: 'sent' | 'delivered' | 'seen';
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    is_online?: boolean;
    last_seen?: string;
  };
};

export type TypingStatus = {
    user_id: string;
    is_typing: boolean;
    updated_at: string;
    full_name?: string;
};

export function parseMessageContent(dbContent: string): { text: string; type: 'text' | 'image' | 'video' | 'location'; metadata?: any } {
  if (typeof dbContent === 'string' && dbContent.startsWith('[META]:')) {
    try {
      const meta = JSON.parse(dbContent.replace('[META]:', ''));
      return { text: meta.text || '', type: meta.type || 'text', metadata: meta };
    } catch (e) {}
  }
  // Detect old mock media messages without specific metadata format
  if (dbContent === 'Shared an image') return { text: dbContent, type: 'image' };
  return { text: dbContent, type: 'text' };
}


export type PresenceState = {
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  status: 'active' | 'idle' | 'offline';
  last_active: string;
};

export type Poll = {
  id: string;
  question: string;
  options: PollOption[];
};

export type PollOption = {
  id: string;
  option_text: string;
  votes: { user_id: string }[];
};

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// ── Messages ─────────────────────────────────────────────────────

export async function sendMessage(eventId: string, content: string, mediaUrl?: string, metadata?: MessageMetadata) {
  let finalContent = content;
  if (metadata && metadata.type !== 'text') {
    finalContent = `[META]:${JSON.stringify({ ...metadata, text: content })}`;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      event_id: eventId,
      sender_id: TEST_USER_ID,
      content: finalContent,
      media_url: mediaUrl,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23503') {
      console.warn("Mock Event ID detected (FK Violation). Falling back to local mock message.");
      return {
        id: `mock-msg-${Date.now()}`,
        event_id: eventId,
        sender_id: TEST_USER_ID,
        content: finalContent,
        media_url: mediaUrl,
        created_at: new Date().toISOString(),
        status: 'sent'
      };
    }
    throw error;
  }
  return data;
}

export async function uploadChatMediaDirectly(eventId: string, fileUri: string, mimeType: string): Promise<string> {
  const ext = mimeType.split('/').pop()?.split('+')[0] || fileUri.split('.').pop() || 'jpg';
  const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  // Step 1: Get a signed upload URL from Supabase
  const { data: signedData, error: signedError } = await supabase.storage
    .from('chat-media')
    .createSignedUploadUrl(fileName);

  if (signedError) {
    console.error("Failed to get signed upload URL:", signedError);
    throw signedError;
  }

  // Step 2: Upload using XMLHttpRequest — the only reliable way to upload
  // local file:// URIs in React Native (fetch() fails on local URIs)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedData.signedUrl);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with HTTP ${xhr.status}: ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during XHR upload'));
    // React Native XHR can natively resolve local file:// URIs
    xhr.send({ uri: fileUri, type: mimeType, name: 'upload' } as any);
  });

  // Step 3: Return the public URL
  const { data: publicUrlData } = supabase.storage
    .from('chat-media')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}


export async function deleteMessageForEveryone(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ content: "[[DELETED]]", media_url: null })
    .eq("id", messageId);
    
  if (error) throw error;
}

export async function getMessages(eventId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select(`*`)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export function subscribeToMessages(eventId: string, onMessage: (message: Message, eventType: string) => void) {
  return supabase
    .channel(`messages:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `event_id=eq.${eventId}`,
      },
      async (payload) => {
        // Fetch the full message (for INSERT or UPDATE)
        const recordId = payload.eventType === 'DELETE' ? payload.old.id : payload.new.id;
        
        if (payload.eventType === 'DELETE') {
           // We're handling soft deletes for "Delete for Everyone" via UPDATE, 
           // but if a hard delete happens, we can pass it along.
           onMessage({ id: recordId } as Message, payload.eventType);
           return;
        }

        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("id", recordId)
          .single();
        
        if (data) onMessage(data as Message, payload.eventType);
      }
    )
    .subscribe();
}

// ── Media ────────────────────────────────────────────────────────

export async function uploadChatMedia(eventId: string, fileUri: string, mimeType: string, permissionType: 'view_only' | 'request' | 'allow') {
  const publicUrl = await uploadChatMediaDirectly(eventId, fileUri, mimeType);
  
  const expiresAt = permissionType === 'view_only' 
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
    : null;

  const { data, error } = await supabase
    .from("media")
    .insert({
      event_id: eventId,
      sender_id: TEST_USER_ID,
      file_url: publicUrl,
      permission_type: permissionType,
      expires_at: expiresAt
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01') { // Table not found (mock environment)
        return {
            id: `mock-media-${Date.now()}`,
            event_id: eventId,
            sender_id: TEST_USER_ID,
            file_url: publicUrl,
            permission_type: permissionType,
            expires_at: expiresAt,
            created_at: new Date().toISOString()
        };
    }
    throw error;
  }
  return data;
}

export async function logScreenshot(eventId: string, mediaId?: string) {
    const { data, error } = await supabase
        .from("screenshot_logs")
        .insert({
            event_id: eventId,
            user_id: TEST_USER_ID,
            media_id: mediaId
        })
        .select()
        .single();
    
    // Notification logic would ideally be in a DB trigger or Edge Function,
    // but we can trigger it here for demonstration.
    if (!error || error.code === '42P01') {
        const { error: notifError } = await supabase
            .from("notifications")
            .insert({
                user_id: TEST_USER_ID, // In reality, notify the media owner/participants
                type: 'screenshot_detected',
                title: 'Screenshot Detected',
                body: `A screenshot was taken in event ${eventId}`,
                data: { eventId, mediaId }
            });
    }

    if (error && error.code !== '42P01') throw error;
    return data || { id: 'mock-log' };
}

export async function respondToMediaAccessRequest(requestId: string, status: 'approved' | 'rejected') {
    const { data, error } = await supabase
        .from("media_access_requests")
        .update({ status })
        .eq("id", requestId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function requestMediaAccess(mediaId: string) {
    const { data, error } = await supabase
        .from("media_access_requests")
        .insert({
            media_id: mediaId,
            requester_id: TEST_USER_ID,
            status: 'pending'
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ── Polls ────────────────────────────────────────────────────────

export async function createPoll(eventId: string, question: string, options: string[]) {
    const { data: poll, error: pollError } = await supabase
        .from("chat_polls")
        .insert({ event_id: eventId, creator_id: TEST_USER_ID, question })
        .select()
        .single();
    
    if (pollError) {
        if (pollError.code === '23503') {
            console.warn("Mock Event ID detected (FK Violation). Returning mock poll.");
            return {
                id: `mock-poll-${Date.now()}`,
                question: question,
                options: options.map(opt => ({
                    id: `mock-opt-${Date.now()}-${Math.random()}`,
                    option_text: opt,
                    votes: []
                }))
            };
        }
        throw pollError;
    }

    const optionRows = options.map(opt => ({ poll_id: poll.id, option_text: opt }));
    const { error: optionsError } = await supabase.from("chat_poll_options").insert(optionRows);
    
    if (optionsError) throw optionsError;
    return poll;
}

export async function voteInPoll(optionId: string) {
    const { error } = await supabase
        .from("chat_poll_votes")
        .insert({ option_id: optionId, user_id: TEST_USER_ID });
    
    if (error) throw error;
}

export async function getPolls(eventId: string) {
    const { data, error } = await supabase
        .from("chat_polls")
        .select(`
            id,
            question,
            options:chat_poll_options (
                id,
                option_text,
                votes:chat_poll_votes (user_id)
            )
        `)
        .eq("event_id", eventId);
    
    if (error) throw error;
    return data as Poll[];
}

// ── Real-Time Presence & Activities ──────────────────────────

export function trackPresence(channel: any, userId: string, profile: { full_name?: string; avatar_url?: string }, status: 'active' | 'idle' | 'offline' = 'active') {
    return channel.track({
        user_id: userId,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        status,
        last_active: new Date().toISOString()
    });
}

export function broadcastTyping(channel: any, userId: string, fullName: string, isTyping: boolean) {
    return channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, fullName, isTyping }
    });
}

export function broadcastReadReceipt(channel: any, userId: string, messageId: string) {
    return channel.send({
        type: 'broadcast',
        event: 'read_receipt',
        payload: { userId, messageId }
    });
}

// ── Pinned Messages & Check-Ins ─────────────────────────────

export async function pinMessage(messageId: string, isPinned: boolean) {
  const { error } = await supabase
    .from("messages")
    .update({ is_pinned: isPinned })
    .eq("id", messageId);
    
  if (error) throw error;
}

export async function checkInToEvent(eventId: string, userId: string) {
  // First check if already checked in to avoid 409 console errors
  const { data: existing } = await supabase
    .from("event_checkins")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();
  
  if (existing) return;

  const { error } = await supabase
    .from("event_checkins")
    .insert({ event_id: eventId, user_id: userId });
    
  // Handle 403/FK violations (Event doesn't exist in DB yet)
  // 23503: Foreign key violation (event doesn't exist in 'events' table)
  if (error && error.code !== '23505' && error.code !== '23503') throw error;
}

export async function getCheckInCount(eventId: string) {
  const { count, error } = await supabase
    .from("event_checkins")
    .select("*", { count: 'exact', head: true })
    .eq("event_id", eventId);
    
  if (error) throw error;
  return count || 0;
}

export async function getEventSummary(eventId: string) {
  const { data: messages, error: mError } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("event_id", eventId);
    
  if (mError) throw mError;

  const uniqueParticipants = new Set(messages?.map(m => m.sender_id)).size;
  const totalMessages = messages?.length || 0;

  return {
    uniqueParticipants,
    totalMessages,
    status: 'Completed' // Mock status
  };
}
// ── Presence & Typing ───────────────────────────────────────────

export async function updateUserStatus(isOnline: boolean) {
    const { error } = await supabase
        .from('profiles')
        .update({ 
            is_online: isOnline, 
            last_seen: new Date().toISOString() 
        })
        .eq('id', TEST_USER_ID);
    
    if (error) console.error("Error updating status:", error);
}

export async function updateTypingStatus(eventId: string, isTyping: boolean) {
    const { error } = await supabase
        .from('typing_status')
        .upsert({
            event_id: eventId,
            user_id: TEST_USER_ID,
            is_typing: isTyping,
            updated_at: new Date().toISOString()
        }, { onConflict: 'event_id,user_id' });

    if (error && error.code !== '23503') { // Ignore FK errors for mock events
        console.error("Error updating typing status:", error);
    }
}

export function subscribeToTypingStatus(eventId: string, onUpdate: (users: TypingStatus[]) => void) {
    return supabase
        .channel(`typing:${eventId}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'typing_status',
            filter: `event_id=eq.${eventId}`
        }, async () => {
            // Fetch all current typers for this event
            const { data, error } = await supabase
                .from('typing_status')
                .select(`
                    user_id,
                    is_typing,
                    updated_at,
                    profiles:user_id (full_name)
                `)
                .eq('event_id', eventId)
                .eq('is_typing', true)
                // Only typing within last 10 seconds
                .gt('updated_at', new Date(Date.now() - 10000).toISOString());

            if (data) {
                const typers = data.map((d: any) => ({
                    user_id: d.user_id,
                    is_typing: d.is_typing,
                    updated_at: d.updated_at,
                    full_name: d.profiles?.full_name || 'Someone'
                }));
                onUpdate(typers);
            }
        })
        .subscribe();
}

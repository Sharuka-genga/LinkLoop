import { supabase } from "./supabase";

export type MessageMetadata = {
  type: 'text' | 'image' | 'video' | 'location' | 'poll';
  text?: string;
  latitude?: number;
  longitude?: number;
  permission_type?: 'view_only' | 'request' | 'allow';
  expires_at?: string;
  pollId?: string;
};

export type Message = {
  id: string;
  event_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  message_type?: 'text' | 'image' | 'video' | 'location' | 'poll';
  created_at: string;
  is_deleted?: boolean;
  is_pinned?: boolean;
  is_anonymous?: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'seen' | 'cancelled';
  edited_at?: string;
  profiles?: {
    id?: string;
    full_name?: string;
    profile_picture_url?: string;
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

export type PresenceState = {
  user_id: string;
  full_name?: string;
  profile_picture_url?: string;
  status: 'active' | 'idle' | 'offline';
  last_active: string;
};

export type DbPresence = {
  id: string;
  is_online: boolean;
  last_seen: string;
  full_name: string;
  profile_picture_url?: string;
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

export function parseMessageContent(dbContent: string): { text: string; type: 'text' | 'image' | 'video' | 'location'; metadata?: any } {
  if (typeof dbContent === 'string' && dbContent.startsWith('[META]:')) {
    try {
      const meta = JSON.parse(dbContent.replace('[META]:', ''));
      return { text: meta.text || '', type: meta.type || 'text', metadata: meta };
    } catch (e) {}
  }
  return { text: dbContent, type: 'text' };
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ── Profiles ──────────────────────────────────────────────────

/**
 * Fetches DB-backed presence (is_online, last_seen) for a list of user IDs.
 * Used as a fallback when Realtime channel presence is empty.
 */
export async function getDbPresenceStatus(userIds: string[]): Promise<Record<string, DbPresence>> {
  if (!userIds || userIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, is_online, last_seen, full_name, profile_picture_url')
    .in('id', userIds);

  if (error) {
    console.error('Failed to fetch DB presence:', error.message);
    return {};
  }

  const result: Record<string, DbPresence> = {};
  (data || []).forEach((p: any) => {
    result[p.id] = p;
  });
  return result;
}

// ── Access Control ────────────────────────────────────────────

export async function verifyChatAccess(eventId: string): Promise<boolean> {
  const userId = await getCurrentUserId();

  const { data: event } = await supabase
    .from('events')
    .select('creator_id')
    .eq('id', eventId)
    .single();

  if (event && event.creator_id === userId) return true;

  const { data: participant } = await supabase
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  return !!participant;
}

// ── Messages ──────────────────────────────────────────────────

// ── Profile fields joined on message queries ─────────────────
// Note: is_online and last_seen are fetched separately via getDbPresenceStatus()
// to avoid Realtime publication conflicts and keep queries simple.
const PROFILE_SELECT = `
  profiles (
    id,
    full_name,
    profile_picture_url
  )
`;

export async function sendMessage(
  eventId: string,
  content: string,
  mediaUrl?: string,
  metadata?: MessageMetadata,
  isAnonymous: boolean = false,
  status: 'pending' | 'sent' | 'delivered' | 'seen' | 'cancelled' = 'sent'
) {
  let finalContent = content;

  if (metadata && metadata.type !== 'text') {
    finalContent = `[META]:${JSON.stringify({ ...metadata, text: content })}`;
  }

  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      event_id: eventId,
      sender_id: userId,
      content: finalContent,
      media_url: mediaUrl,
      is_anonymous: isAnonymous,
      status: status,
    })
    .select(`*, ${PROFILE_SELECT}`)
    .single();

  if (error) {
    console.error("Message send failed:", error.message);
    throw error;
  }
  return data;
}

export async function confirmMessageSent(messageId: string) {
  const { data, error } = await supabase
    .from("messages")
    .update({ status: 'sent' })
    .eq('id', messageId)
    .select().single();

  // Non-critical: don't throw if update fails (message still delivered)
  if (error) {
    console.warn("confirmMessageSent soft error:", error.message);
  }
  return data;
}

export async function cancelPendingMessage(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ status: 'cancelled' })
    .eq('id', messageId);

  if (error) throw error;
}

export async function scheduleMessage(eventId: string, content: string, sendAt: Date, isAnonymous: boolean = false) {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("scheduled_messages")
    .insert({
      event_id: eventId,
      sender_id: userId,
      content: content,
      send_at: sendAt.toISOString(),
      is_anonymous: isAnonymous,
    })
    .select()
    .single();

  if (error) {
    console.error("Schedule message failed:", error.message);
    throw error;
  }
  return data;
}

export async function flushScheduledMessages(eventId: string) {
  const { error } = await supabase.rpc('process_scheduled_messages', {
    target_event_id: eventId
  });
  if (error) {
    console.error("Failed to flush scheduled messages:", error.message);
  }
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
    .select(`*, ${PROFILE_SELECT}`)
    .eq("event_id", eventId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw error;
  // Return all messages that are not hard-deleted (is_deleted = true).
  // This allows the UI to handle [[DELETED]] content placeholders.
  return (data as Message[]).filter(m => !m.is_deleted);
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
        const recordId = payload.eventType === 'DELETE' ? payload.old.id : payload.new.id;

        if (payload.eventType === 'DELETE') {
          onMessage({ id: recordId } as Message, payload.eventType);
          return;
        }

        const { data } = await supabase
          .from("messages")
          .select(`*, ${PROFILE_SELECT}`)
          .eq("id", recordId)
          .single();

        if (data) onMessage(data as Message, payload.eventType);
      }
    )
    .subscribe();
}

// ── Media ─────────────────────────────────────────────────────

export async function uploadChatMediaDirectly(eventId: string, fileUri: string, mimeType: string): Promise<string> {
  const userId = await getCurrentUserId();
  const ext = mimeType.split('/').pop()?.split('+')[0] || fileUri.split('.').pop() || 'jpg';
  const fileName = `${userId}/${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  // Use FormData for the most robust React Native compatibility
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const { data, error } = await supabase.storage
    .from('chat-media')
    .upload(fileName, formData, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error("Failed to upload media:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('chat-media')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export async function uploadChatMedia(
  eventId: string,
  fileUri: string,
  mimeType: string,
  permissionType: 'view_only' | 'request' | 'allow'
) {
  const publicUrl = await uploadChatMediaDirectly(eventId, fileUri, mimeType);
  const userId = await getCurrentUserId();

  const expiresAt = permissionType === 'view_only'
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("media")
    .insert({
      event_id: eventId,
      sender_id: userId,
      file_url: publicUrl,
      permission_type: permissionType,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data; // Returns { id, file_url, permission_type, expires_at, ... }
}

export async function logScreenshot(eventId: string, mediaId?: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("screenshot_logs")
    .insert({
      event_id: eventId,
      user_id: userId,
      media_id: mediaId,
    })
    .select()
    .single();

  if (!error) {
    const { data: event } = await supabase
      .from("events")
      .select("creator_id, title")
      .eq("id", eventId)
      .single();

    if (event && event.creator_id !== userId) {
      await supabase
        .from("notifications")
        .insert({
          user_id: event.creator_id,
          actor_id: userId,
          event_id: eventId,
          type: 'screenshot_detected',
          title: 'Security Alert 🔐',
          body: `Someone took a screenshot in your event: ${event.title}`,
          data: { eventId, mediaId },
        });
    }
  }

  if (error) throw error;
  return data;
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
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("media_access_requests")
    .insert({
      media_id: mediaId,
      requester_id: userId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Polls ──────────────────────────────────────────────────────

export async function createPoll(eventId: string, question: string, options: string[]) {
  const userId = await getCurrentUserId();

  const { data: poll, error: pollError } = await supabase
    .from("chat_polls")
    .insert({
      event_id: eventId,
      creator_id: userId,
      question,
      is_multiple_choice: false,
    })
    .select()
    .single();

  if (pollError) {
    console.error('Poll creation error:', pollError);
    throw pollError;
  }

  const optionRows = options.map(opt => ({
    poll_id: poll.id,
    option_text: opt.trim(),
  }));

  const { error: optionsError } = await supabase
    .from("chat_poll_options")
    .insert(optionRows);

  if (optionsError) {
    console.error('Poll options error:', optionsError);
    throw optionsError;
  }

  // NOTE: Do NOT call sendMessage here — the caller screen handles it
  // to avoid duplicate messages.
  return poll;
}

export async function voteInPoll(optionId: string, pollId: string) {
  const userId = await getCurrentUserId();

  // The database UNIQUE(user_id, poll_id) constraint will handle single-choice logic.
  // We just need to insert or replace. 
  // To replace, we can delete the old vote first if we want to be explicit.
  await supabase
    .from('chat_poll_votes')
    .delete()
    .eq('user_id', userId)
    .eq('poll_id', pollId);

  const { error } = await supabase
    .from("chat_poll_votes")
    .insert({ option_id: optionId, user_id: userId, poll_id: pollId });

  if (error) {
    console.error('Vote error:', error);
    throw error;
  }
}

export async function getPolls(eventId: string) {
  const { data, error } = await supabase
    .from("chat_polls")
    .select(`
      id,
      question,
      is_multiple_choice,
      created_at,
      options:chat_poll_options (
        id,
        option_text,
        votes:chat_poll_votes (
          id,
          user_id,
          created_at
        )
      )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error('Get polls error:', error);
    throw error;
  }

  return data as Poll[];
}

// ── Real-Time Presence & Typing ────────────────────────────────

export function trackPresence(
  channel: any,
  userId: string,
  profile: { full_name?: string; profile_picture_url?: string },
  status: 'active' | 'idle' | 'offline' = 'active'
) {
  return channel.track({
    user_id: userId,
    full_name: profile.full_name,
    profile_picture_url: profile.profile_picture_url,
    status,
    last_active: new Date().toISOString(),
  });
}

export function broadcastTyping(channel: any, userId: string, fullName: string, isTyping: boolean) {
  return channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId, fullName, isTyping },
  });
}

export function broadcastReadReceipt(channel: any, userId: string, messageId: string) {
  return channel.send({
    type: 'broadcast',
    event: 'read_receipt',
    payload: { userId, messageId },
  });
}

// ── Pinned Messages & Check-Ins ────────────────────────────────

export async function pinMessage(messageId: string, isPinned: boolean) {
  const { error } = await supabase
    .from("messages")
    .update({ is_pinned: isPinned })
    .eq("id", messageId);

  if (error) throw error;
}

export async function checkInToEvent(eventId: string, userId: string) {
  const { data: existing } = await supabase
    .from("event_checkins")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (existing) return { success: true };

  const { error } = await supabase
    .from("event_checkins")
    .insert({ event_id: eventId, user_id: userId });

  if (error && error.code !== '23505') throw error;
  return { success: true };
}

export async function checkIfUserCheckedIn(eventId: string, userId: string) {
  const { data, error } = await supabase
    .from('event_checkins')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Check-in verification error:", error.message);
  }
  return !!data;
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

  const { data: event } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single();

  return {
    uniqueParticipants,
    totalMessages,
    status: event?.status || 'active',
  };
}

// ── Presence & Typing (DB-backed) ──────────────────────────────

export async function updateUserStatus(isOnline: boolean) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('profiles')
    .update({
      is_online: isOnline,
      last_seen: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error("Status update failed:", error.message);
  }
}

export async function updateTypingStatus(eventId: string, isTyping: boolean) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('typing_status')
    .upsert({
      event_id: eventId,
      user_id: userId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,user_id' });

  if (error) {
    console.error(`Typing status update failed: ${error.message}`);
  }
}

export function subscribeToTypingStatus(eventId: string, onUpdate: (users: TypingStatus[]) => void) {
  return supabase
    .channel(`typing:${eventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'typing_status',
      filter: `event_id=eq.${eventId}`,
    }, async () => {
      const { data } = await supabase
        .from('typing_status')
        .select(`
          user_id,
          is_typing,
          updated_at,
          profiles!typing_status_user_id_fkey (full_name)
        `)
        .eq('event_id', eventId)
        .eq('is_typing', true)
        .gt('updated_at', new Date(Date.now() - 10000).toISOString());

      if (data) {
        const typers = data.map((d: any) => ({
          user_id: d.user_id,
          is_typing: d.is_typing,
          updated_at: d.updated_at,
          full_name: d.profiles?.full_name || 'Someone',
        }));
        onUpdate(typers);
      }
    })
    .subscribe();
}

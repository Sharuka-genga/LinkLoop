import { supabase } from "./supabase";
import { acceptInvitation, declineInvitation, acceptJoinRequest, declineJoinRequest } from "./events";

export type NotificationType =
  | 'message'
  | 'invitation'
  | 'request_accepted'
  | 'request_rejected'
  | 'reminder'
  | 'join_request'
  | 'media_request'
  | 'approval'
  | 'social_activity'
  | 'screenshot_detected'
  | 'poll_created'
  | 'poll_vote';

export type Notification = {
    id: string;
    user_id: string;
    actor_id?: string;
    event_id?: string;
    type: NotificationType;
    title: string;
    body: string;
    is_read: boolean;
    data?: {
        route?: string;
        avatar?: string;
        eventId?: string;
        senderName?: string;
        count?: number;
        invitationId?: string;
        requestId?: string;
        mediaRequestId?: string;
        [key: string]: any;
    };
    created_at: string;
    // Joined actor profile (when fetched with actor join)
    actor?: {
        full_name?: string;
        profile_picture_url?: string;
    };
};

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function getNotifications(): Promise<Notification[]> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("notifications")
        .select(`
            *,
            actor:actor_id (
                full_name,
                profile_picture_url
            )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Notification[];
}

export async function createNotification(params: {
    userId: string;
    actorId?: string;
    eventId?: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
}) {
    const { error } = await supabase
        .from("notifications")
        .insert({
            user_id: params.userId,
            actor_id: params.actorId,
            event_id: params.eventId,
            type: params.type,
            title: params.title,
            body: params.body,
            data: params.data || {},
        });

    if (error) {
        console.error("Failed to create notification:", error.message);
        throw error;
    }
}

export async function handleNotificationAction(notification: Notification, action: 'accept' | 'reject' | 'view') {
    const { id, type, data } = notification;

    try {
        if (type === 'invitation') {
            const invitationId = data?.invitationId;
            if (invitationId) {
                if (action === 'accept') await acceptInvitation(invitationId);
                else if (action === 'reject') await declineInvitation(invitationId);
            }
        } else if (type === 'join_request') {
            const requestId = data?.requestId;
            if (requestId) {
                if (action === 'accept') await acceptJoinRequest(requestId);
                else if (action === 'reject') await declineJoinRequest(requestId);
            }
        } else if (type === 'media_request') {
            const mediaRequestId = data?.mediaRequestId;
            if (mediaRequestId) {
                const { respondToMediaAccessRequest } = await import("./chat");
                if (action === 'accept') await respondToMediaAccessRequest(mediaRequestId, 'approved');
                else if (action === 'reject') await respondToMediaAccessRequest(mediaRequestId, 'rejected');
            }
        }

        await markNotificationAsRead(id);
        return { success: true };
    } catch (error) {
        console.error("Error handling notification action:", error);
        throw error;
    }
}

export async function markNotificationAsRead(id: string) {
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

    if (error) throw error;
}

export async function markAllAsRead() {
    const userId = await getCurrentUserId();
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) throw error;
}

export async function deleteNotification(id: string) {
    const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return { success: true };
}

export function subscribeToNotifications(onNotification: (notification: Notification) => void) {
    const channelId = Math.random().toString(36).substring(7);
    const subscriptionWrapper = {
        channel: null as any,
        unsubscribe: () => {
            if (subscriptionWrapper.channel) {
                subscriptionWrapper.channel.unsubscribe();
            }
        }
    };

    getCurrentUserId().then(userId => {
        subscriptionWrapper.channel = supabase
            .channel(`notifications:${userId}:${channelId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    // Re-fetch with actor profile join so avatars work in real-time
                    const notifId = payload.new?.id;
                    if (!notifId) {
                        onNotification(payload.new as Notification);
                        return;
                    }
                    try {
                        const { data } = await supabase
                            .from("notifications")
                            .select(`
                                *,
                                actor:actor_id (
                                    full_name,
                                    profile_picture_url
                                )
                            `)
                            .eq("id", notifId)
                            .single();
                        if (data) {
                            onNotification(data as Notification);
                        } else {
                            onNotification(payload.new as Notification);
                        }
                    } catch {
                        onNotification(payload.new as Notification);
                    }
                }
            )
            .subscribe();
    }).catch(console.error);

    return subscriptionWrapper;
}


export async function getUnreadCount(): Promise<number> {
    const userId = await getCurrentUserId();
    const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) throw error;
    return count || 0;
}

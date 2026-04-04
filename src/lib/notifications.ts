import { supabase } from "./supabase";

export type NotificationType = 'message' | 'invitation' | 'request_accepted' | 'request_rejected' | 'reminder' | 'join_request' | 'media_request' | 'approval' | 'social_activity' | 'screenshot_detected';

export type Notification = {
    id: string;
    user_id: string;
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
        [key: string]: any;
    };
    created_at: string;
};

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function getNotifications() {
    try {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", TEST_USER_ID)
            .order("created_at", { ascending: false });
        
        if (error) throw error;
        return (data && data.length > 0) ? data as Notification[] : getMockNotifications();
    } catch (e) {
        console.warn("Supabase fetch failed, using mock data:", e);
        return getMockNotifications();
    }
}

export function getMockNotifications(): Notification[] {
    const now = Date.now();
    return [
        {
            id: "e4da6128-76c2-421b-85d7-8495040e2410",
            user_id: TEST_USER_ID,
            type: "invitation",
            title: "Event Invitation",
            body: "You’re invited to Cricket Match at Ella",
            is_read: false,
            data: { 
                avatar: "https://i.pravatar.cc/150?u=kavindya",
                senderName: "Kavindya",
                route: "/chat/550e8400-e29b-41d4-a716-446655440000",
                eventId: "550e8400-e29b-41d4-a716-446655440000"
            },
            created_at: new Date(now - 1000 * 60 * 2).toISOString(), // 2m ago (New)
        },
        {
            id: "e4da6128-76c2-421b-85d7-8495040e2415",
            user_id: TEST_USER_ID,
            type: "social_activity",
            title: "Social Activity",
            body: "Saran and 32 others liked your event",
            is_read: false,
            data: { 
                avatar: "https://i.pravatar.cc/150?u=saran",
                count: 32,
                route: "/events/550e8400-e29b-41d4-a716-446655440000"
            },
            created_at: new Date(now - 1000 * 60 * 5).toISOString(), // 5m ago (New)
        },
        {
            id: "e4da6128-76c2-421b-85d7-8495040e2411",
            user_id: TEST_USER_ID,
            type: "request_accepted",
            title: "Request Accepted",
            body: "Kavindya accepted your request",
            is_read: false,
            data: { 
                avatar: "https://i.pravatar.cc/150?u=kavindya",
                route: "/events/550e8400-e29b-41d4-a716-446655440001"
            },
            created_at: new Date(now - 1000 * 60 * 45).toISOString(), // 45m ago (Today)
        },
        {
            id: "e4da6128-76c2-421b-85d7-8495040e2416",
            user_id: TEST_USER_ID,
            type: "social_activity",
            title: "Social Activity",
            body: "Akmal commented on your post",
            is_read: true,
            data: { 
                avatar: "https://i.pravatar.cc/150?u=akmal",
                route: "/events/550e8400-e29b-41d4-a716-446655440000"
            },
            created_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(), // 3h ago (Today)
        },
        {
            id: "e4da6128-76c2-421b-85d7-8495040e2412",
            user_id: TEST_USER_ID,
            type: "message",
            title: "Chat Message",
            body: "Nirmala: Hey, are we still on for the match?",
            is_read: true,
            data: { 
                avatar: "https://i.pravatar.cc/150?u=nirmala",
                route: "/chat/550e8400-e29b-41d4-a716-446655440000"
            },
            created_at: new Date(now - 1000 * 60 * 60 * 8).toISOString(), // 8h ago (Today)
        },
        {
            id: "e4da6128-76c2-421b-85d7-8495040e2413",
            user_id: TEST_USER_ID,
            type: "reminder",
            title: "Reminder",
            body: "Event 'Fun in Ella' starts in 30 minutes",
            is_read: false,
            data: { 
                route: "/events/550e8400-e29b-41d4-a716-446655440002"
            },
            created_at: new Date(now - 1000 * 60 * 60 * 25).toISOString(), // yesterday (Earlier)
        },
        {
            id: "e4da6128-76c2-421b-85d7-8495040e2414",
            user_id: TEST_USER_ID,
            type: "request_rejected",
            title: "Request Rejected",
            body: "Your request was rejected for the Hiking trip",
            is_read: true,
            data: { 
                route: "/events/550e8400-e29b-41d4-a716-446655440003"
            },
            created_at: new Date(now - 1000 * 60 * 60 * 48).toISOString(), // 2d ago (Earlier)
        }
    ];
}

export async function handleNotificationAction(id: string, action: 'join' | 'reject') {
    console.log(`Notification ${id} action: ${action}`);
    // In a real app, this would call a Supabase RPC or edge function
    // For now, we simulate success and mark as read
    await markNotificationAsRead(id);
    return { success: true };
}

export async function markNotificationAsRead(id: string) {
    try {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id);
        
        if (error) console.error("Supabase markRead failed:", error);
    } catch (e) {
        console.warn("Supabase markRead exception:", e);
    }
}

export async function deleteNotification(id: string) {
    try {
        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("id", id);
        
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error("Supabase delete failed:", e);
        // Fallback for mock data (pretend it's deleted)
        return { success: true };
    }
}

export function subscribeToNotifications(onNotification: (notification: Notification) => void) {
    return supabase
        .channel(`notifications:${TEST_USER_ID}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${TEST_USER_ID}`,
            },
            (payload) => {
                onNotification(payload.new as Notification);
            }
        )
        .subscribe();
}

export async function getUnreadCount() {
    try {
        const { count, error } = await supabase
            .from("notifications")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", TEST_USER_ID)
            .eq("is_read", false);
        
        if (error) throw error;
        return count || 0;
    } catch (e) {
        return getMockNotifications().filter(n => !n.is_read).length;
    }
}

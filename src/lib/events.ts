import { supabase } from "./supabase";

async function getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return user.id;
}

// ── Save event to Supabase ──────────────────────────────────────
export async function createEvent(data: {
    title: string;
    categoryId: string;
    categoryLabel: string;
    categoryColor: string;
    subcategoryId?: string;
    subcategoryLabel?: string;
    customActivity?: string;
    locationType: string;
    location: string;
    eventDate: Date;
    eventTime: Date;
    peopleNeeded: number;
    joinMode: string;
}) {
    const creatorId = await getCurrentUserId();
    const { data: event, error } = await supabase
        .from("events")
        .insert({
            creator_id: creatorId,
            title: data.title,
            category_id: data.categoryId,
            category_label: data.categoryLabel,
            category_color: data.categoryColor,
            subcategory_id: data.subcategoryId,
            subcategory_label: data.subcategoryLabel,
            custom_activity: data.customActivity,
            location_type: data.locationType,
            location: data.location,
            event_date: data.eventDate.toISOString().split("T")[0],
            event_time: data.eventTime.toTimeString().split(" ")[0],
            people_needed: data.peopleNeeded,
            join_mode: data.joinMode,
            status: "active",
        })
        .select()
        .single();

    if (error) throw error;
    return event;
}

// ── Read all active events from Supabase ───────────────────────
export async function getEvents() {
    const { data, error } = await supabase
        .from("events")
        .select(`
            *,
            host:profiles!creator_id (
                full_name,
                profile_picture_url
            ),
            participants:event_participants(count)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Flatten data for easier consumption
    return data.map(event => ({
        ...event,
        creatorName: event.host?.full_name || "Unknown User",
        creatorAvatar: event.host?.profile_picture_url,
        participantsCount: event.participants?.[0]?.count || 0
    }));
}

// ── Join an event (Direct mode) ───────────────────────────────
export async function joinEvent(eventId: string) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("event_participants")
        .insert({ event_id: eventId, user_id: userId })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ── Request to join an event (Request mode) ────────────────────
export async function requestToJoin(eventId: string) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("event_requests")
        .insert({ event_id: eventId, user_id: userId, status: "pending" })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ── Check if user joined or requested ──────────────────────────
export async function checkIfJoined(eventId: string) {
    const userId = await getCurrentUserId();
    
    const { data: participant } = await supabase
        .from("event_participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();

    if (participant) return "joined";

    const { data: request } = await supabase
        .from("event_requests")
        .select("status")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();

    if (request) return request.status === "pending" ? "requested" : "idle";
    
    return "idle";
}

// ── Get Suggested Participants based on category ──────────────
export async function getSuggestedUsers(categoryId: string, limit = 10) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch users who share interests with this category
    // but exclude the current user
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .contains("interests", [categoryId])
        .neq("id", user?.id)
        .limit(limit);

    if (error) throw error;
    return data;
}

// ── Save invitation to Supabase ────────────────────────────────
export async function sendInvitation(eventId: string, receiverId: string) {
    const senderId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("event_invitations")
        .insert({
            event_id: eventId,
            sender_id: senderId,
            receiver_id: receiverId,
            status: "pending",
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}
export async function deleteEvent(eventId: string) {
    const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);
    if (error) throw error;
}



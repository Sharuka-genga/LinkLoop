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

export async function getEventById(eventId: string) {
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (error) throw error;
    return data;
}

export async function updateEvent(eventId: string, data: {
    title: string;
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
        .update({
            title: data.title,
            custom_activity: data.customActivity,
            location_type: data.locationType,
            location: data.location,
            event_date: data.eventDate.toISOString().split("T")[0],
            event_time: data.eventTime.toTimeString().split(" ")[0],
            people_needed: data.peopleNeeded,
            join_mode: data.joinMode,
        })
        .eq("id", eventId)
        .eq("creator_id", creatorId)
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
        .insert({ event_id: eventId, user_id: userId, status: "joined", joined_via: "direct" })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') return { alreadyJoined: true };
        throw error;
    }

    // Notify the event creator that someone joined their event directly
    try {
        const { data: event } = await supabase
            .from("events")
            .select("creator_id, title")
            .eq("id", eventId)
            .single();

        if (event && event.creator_id !== userId) {
            const { data: joiner } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", userId)
                .single();

            await supabase.from("notifications").insert({
                user_id: event.creator_id,
                actor_id: userId,
                event_id: eventId,
                type: "approval",
                title: "New Participant 🎉",
                body: `${joiner?.full_name || "Someone"} joined your event "${event.title}"`,
                data: {
                    eventId,
                    route: `/chat/${eventId}`,
                },
            });
        }
    } catch (notifError) {
        // Don't block joining if notification fails
        console.warn("Join notification failed:", notifError);
    }

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

    if (error) {
        if (error.code === '23505') return { alreadyRequested: true };
        throw error;
    }
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

    if (request) {
        if (request.status === "accepted") return "joined";
        if (request.status === "pending") return "requested";
    }
    
    return "idle";
}

// ── Get Ranked Suggestions using Database Engine ─────────────
export async function getSuggestedUsers(eventId: string, limit = 10) {
    if (!eventId) return [];
    
    const { data, error } = await supabase.rpc('get_ranked_suggestions', {
        p_event_id: eventId,
        p_limit: limit
    });

    if (error) {
        console.error("Error fetching ranked suggestions:", error);
        // Fallback to simple matching if RPC fails
        return [];
    }
    
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

    if (error) {
        if (error.code === '23505') {
            // Silence duplicate key errors — the invitation already exists
            return { alreadySent: true };
        }
        console.error("Supabase error sending invitation:", error);
        throw error;
    }
    return data;
}

// ── Get pending invitations for current user ───────────────────
export async function getInvitations() {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("event_invitations")
        .select(`
            id,
            status,
            created_at,
            events:events!event_invitations_event_id_fkey (
                id,
                title,
                category_id,
                location,
                event_date,
                event_time
            ),
            sender:profiles!event_invitations_sender_id_fkey (
                full_name,
                profile_picture_url
            )
        `)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase error fetching invitations:", error);
        throw error;
    }
    return data;
}

// ── Accept an invitation ──────────────────────────────────────
export async function acceptInvitation(invitationId: string) {
    const { error } = await supabase.rpc('accept_invitation', {
        p_invitation_id: invitationId
    });

    if (error) throw error;
}

// ── Decline an invitation ─────────────────────────────────────
export async function declineInvitation(invitationId: string) {
    const { error } = await supabase
        .from("event_invitations")
        .update({ status: "declined" })
        .eq("id", invitationId);

    if (error) throw error;
}
// ── Get pending join requests for events the current user hosts ──
export async function getJoinRequests() {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
        .from("event_requests")
        .select(`
            id,
            status,
            created_at,
            events:events!event_requests_event_id_fkey (
                id,
                title,
                category_id,
                location,
                event_date,
                event_time
            ),
            requester:profiles!event_requests_user_id_fkey (
                full_name,
                profile_picture_url
            )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase error fetching join requests:", error);
        throw error;
    }

    // Filter to only events the current user created
    const { data: myEvents } = await supabase
        .from("events")
        .select("id")
        .eq("creator_id", userId);

    const myEventIds = new Set((myEvents || []).map(e => e.id));
    return (data || []).filter((r: any) => {
        const eventId = Array.isArray(r.events) ? r.events[0]?.id : r.events?.id;
        return myEventIds.has(eventId);
    });
}

// ── Accept a join request ────────────────────────────────────────
export async function acceptJoinRequest(requestId: string) {
    const { error } = await supabase.rpc('accept_join_request', {
        p_request_id: requestId
    });
    if (error) throw error;
}

// ── Decline a join request ───────────────────────────────────────
export async function declineJoinRequest(requestId: string) {
    const { error } = await supabase
        .from("event_requests")
        .update({ status: "declined" })
        .eq("id", requestId);
    if (error) throw error;
}

export async function deleteEvent(eventId: string) {
    const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);
    if (error) throw error;
}

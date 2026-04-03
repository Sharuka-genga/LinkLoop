import { supabase } from "./supabase";

const TEST_USER_ID = "8d30902c-c3ca-470a-8f4b-b1b545e8f452"; // Kavindu = YOU

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
    const { data: event, error } = await supabase
        .from("events")
        .insert({
            creator_id: TEST_USER_ID,
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
        .select(`*`)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

// ── Save invitation to Supabase ────────────────────────────────
export async function sendInvitation(eventId: string, receiverId: string) {
    const { data, error } = await supabase
        .from("event_invitations")
        .insert({
            event_id: eventId,
            sender_id: TEST_USER_ID,
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



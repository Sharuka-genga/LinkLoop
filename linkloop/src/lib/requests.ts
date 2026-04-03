import { supabase } from "./supabase";

export async function sendJoinRequest(eventId: string) {
  const { data, error } = await supabase
    .from("join_requests")
    .insert([
      {
        event_id: eventId,
        user_id: "demo-user",
        status: "pending",
      },
    ])
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }

  return data;
}

export async function cancelJoinRequest(eventId: string) {
  const { data, error } = await supabase
    .from("join_requests")
    .update({ status: "cancelled" })
    .eq("event_id", eventId)
    .eq("user_id", "demo-user")
    .eq("status", "pending")
    .select();

  if (error) {
    console.error("Supabase cancel error:", error);
    throw error;
  }

  return data;
}
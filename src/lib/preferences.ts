import { supabase } from "./supabase";

export async function savePreference(
  interests: string[],
  date: string,
  timeSlot: string,
) {
  const { data, error } = await supabase
    .from("ai_preferences")
    .insert([
      {
        user_id: "demo-user",
        interests: JSON.stringify(interests),
        selected_date: date,
        time_slot: timeSlot,
      },
    ])
    .select();

  if (error) {
    console.error("Save preference error:", error);
    throw error;
  }

  return data;
}
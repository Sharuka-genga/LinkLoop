import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
/*import {
  getEventsForSuggestions,
  getTimeSlotFromEventTime,
} from "@/lib/events";*/
import { supabase } from "@/lib/supabase";



type EventItem = {
  id: string;
  title: string;
  category_label: string;
  location: string;
  event_date: string;
  event_time: string;
  people_needed: number;
  status: string;
  join_mode: string;   // ← Add this line (line 27)
  description?: string;
};

export default function Suggestions() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const rawInterests =
    typeof params.interests === "string" ? params.interests : "[]";

  const selectedInterests: string[] = JSON.parse(rawInterests);
  const selectedTime = typeof params.time === "string" ? params.time : "";
  const selectedDate = typeof params.date === "string" ? params.date : "";

  useEffect(() => {
    loadEvents();
  }, []);

  function getTimeSlotFromEventTime(eventTime: string): string {
    if (!eventTime) return "";
    const hour = parseInt(eventTime.split(":")[0], 10);
    if (hour >= 6 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
  }

  async function getEventsForSuggestions() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "active")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      return [];
    }
    return data || [];
  }

  const loadEvents = async () => {
    try {
      const data = await getEventsForSuggestions();
      setEvents((data as EventItem[]) || []);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-CA");

  const filteredEvents = events.filter((event) => {
    return event.event_date >= today;
  });


  const MAX_SCORE = 12;

  const scoredEvents = filteredEvents
    .map((event) => {
      let score = 0;

      if (selectedInterests.includes(event.category_label)) score += 5;

      const eventTimeSlot = getTimeSlotFromEventTime(event.event_time);
      if (selectedTime === eventTimeSlot) score += 3;

      if (selectedDate && event.event_date === selectedDate) score += 4;
      
      const percentage = Math.round((score / MAX_SCORE) * 100);

      let reason = "Suggested based on available events";

      if (
        selectedInterests.includes(event.category_label) &&
        selectedTime === eventTimeSlot &&
        selectedDate &&
        event.event_date === selectedDate
      ) {
        reason = "Best match for your interest, time, and selected date";
      } else if (
        selectedInterests.includes(event.category_label) &&
        selectedTime === eventTimeSlot
      ) {
        reason = "Best match for your interest and time";
      } else if (selectedInterests.includes(event.category_label)) {
        reason = "Matches your selected interest";
      } else if (selectedTime === eventTimeSlot) {
        reason = "Matches your selected time";
      } else if (selectedDate && event.event_date === selectedDate) {
        reason = "Happens on your selected date";
      }

      return { ...event, score, percentage, reason, eventTimeSlot };
    })
    .filter((event) => event.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.event_date.localeCompare(b.event_date);
    });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#080E1C" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#818CF8" />
          <Text style={styles.loaderText}>Loading suggestions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080E1C" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Suggested for You</Text>
          <Text style={styles.info}>
            Based on your preferences, here are the most relevant upcoming events.
          </Text>

          {scoredEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching events found</Text>
              <Text style={styles.emptyText}>
                Try changing your interest, time slot, or date.
              </Text>
            </View>
          ) : (
            scoredEvents.map((item, index) => (
              <View key={item.id} style={styles.card}>
                {index === 0 && <Text style={styles.badge}>🔥 Top Pick</Text>}

                <Text style={styles.cardTitle}>{item.title}</Text>

                <Text style={styles.cardSub}>
                  {item.category_label} • {item.eventTimeSlot}
                </Text>

                <Text style={styles.slot}>📍 {item.location}</Text>
                <Text style={styles.slot}>📅 {item.event_date}</Text>
                <Text style={styles.slot}>👥 Needs {item.people_needed} people</Text>

                <Text style={styles.match}>Match: {item.percentage}%</Text>
                <Text style={styles.reason}>{item.reason}</Text>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    router.push(
                      `/event-details?id=${item.id}&title=${encodeURIComponent(
                        item.title
                      )}&category=${encodeURIComponent(
                        item.category_label
                      )}&time=${encodeURIComponent(
                        item.event_time
                      )}&location=${encodeURIComponent(
                        item.location || "Campus"
                      )}&description=${encodeURIComponent(
                        item.description || "No description available"
                      )}&joined=0&total=${item.people_needed}&joinMode=${item.join_mode || "request"}`
                    )
                  }
                >
                  <Text style={styles.viewText}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.tryBtn} onPress={() => router.back()}>
            <Text style={styles.tryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#080E1C",
  },
  container: {
    flex: 1,
    backgroundColor: "#080E1C",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 420,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#080E1C",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: "#CBD5E1",
    marginTop: 12,
    fontSize: 14,
  },
  back: {
    color: "#818CF8",
    marginBottom: 10,
    fontWeight: "700",
    fontSize: 14,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 6,
  },
  info: {
    color: "#94A3B8",
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: "#141B2D",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E2A40",
    marginTop: 10,
  },
  emptyTitle: {
    color: "#F1F5F9",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 6,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#141B2D",
    padding: 16,
    borderRadius: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#1E2A40",
    width: "100%",
  },
  badge: {
    color: "#FBBF24",
    fontWeight: "700",
    marginBottom: 6,
    fontSize: 13,
  },
  cardTitle: {
    color: "#F1F5F9",
    fontWeight: "700",
    fontSize: 17,
  },
  cardSub: {
    color: "#CBD5E1",
    marginTop: 4,
    fontSize: 13,
  },
  slot: {
    color: "#38BDF8",
    marginTop: 8,
    fontSize: 13,
  },
  match: {
    color: "#34D399",
    marginTop: 8,
    fontWeight: "700",
    fontSize: 13,
  },
  reason: {
    color: "#CBD5E1",
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
  },
  viewBtn: {
    marginTop: 12,
    backgroundColor: "#818CF8",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  viewText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 14,
  },
  tryBtn: {
    marginTop: 20,
    backgroundColor: "#34D399",
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    width: "100%",
  },
  tryText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
  },
});
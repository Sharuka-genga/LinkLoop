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
import { ArrowLeft, Sparkles, MapPin, Calendar, Users, ChevronRight, TrendingUp } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  join_mode: string;
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

  const navigateToDetails = (item: any) => {
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
    );
  };

  const today = new Date().toLocaleDateString("en-CA");
  const filteredEvents = events.filter((event) => event.event_date >= today);
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
      if (selectedInterests.includes(event.category_label) && selectedTime === eventTimeSlot && selectedDate && event.event_date === selectedDate) {
        reason = "Best match for your interest, time, and selected date";
      } else if (selectedInterests.includes(event.category_label) && selectedTime === eventTimeSlot) {
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
          <Text style={styles.loaderText}>CRAFTING SUGGESTIONS...</Text>
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
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#CBD5E1" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.smallTitle}>MATCHING ENGINE</Text>
              <Text style={styles.title}>Your Best Matches</Text>
            </View>
          </View>

          <Text style={styles.info}>
            We've analyzed your preferences against upcoming campus activities to find your perfect fit.
          </Text>

          {scoredEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching events found</Text>
              <Text style={styles.emptyText}>
                Try changing your interest, time slot, or date to see more suggestions.
              </Text>
              <TouchableOpacity style={styles.tryBtn} onPress={() => router.back()}>
                <Text style={styles.tryText}>Adjust Preferences</Text>
              </TouchableOpacity>
            </View>
          ) : (
            scoredEvents.map((item, index) => {
              const isTopPick = index === 0;
              
              if (isTopPick) {
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.9}
                    onPress={() => navigateToDetails(item)}
                  >
                    <LinearGradient
                      colors={["#818CF8", "#6366F1"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.topPickCard}
                    >
                      <View style={styles.topPickBadge}>
                        <Sparkles size={12} color="#818CF8" fill="#818CF8" />
                        <Text style={styles.topPickBadgeText}>{item.percentage}% MATCH • TOP PICK</Text>
                      </View>

                      <Text style={styles.topPickTitle}>{item.title}</Text>
                      <Text style={styles.topPickReason}>{item.reason}</Text>

                      <View style={styles.topPickDivider} />

                      <View style={styles.topPickFooter}>
                        <View style={styles.topPickInfo}>
                          <MapPin size={12} color="rgba(255,255,255,0.8)" />
                          <Text style={styles.topPickInfoText}>{item.location}</Text>
                        </View>
                        <View style={styles.topPickInfo}>
                          <Calendar size={12} color="rgba(255,255,255,0.8)" />
                          <Text style={styles.topPickInfoText}>{item.event_date}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => navigateToDetails(item)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardMain}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardSub}>
                        {item.category_label} • {item.eventTimeSlot}
                      </Text>
                    </View>
                    <View style={styles.matchCircle}>
                      <TrendingUp size={12} color="#34D399" />
                      <Text style={styles.matchPercent}>{item.percentage}%</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <MapPin size={14} color="#64748B" />
                        <Text style={styles.metaText}>{item.location}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Users size={14} color="#64748B" />
                        <Text style={styles.metaText}>{item.people_needed} spots</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.reason} numberOfLines={1}>{item.reason}</Text>
                    <ChevronRight size={16} color="#475569" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {scoredEvents.length > 0 && (
            <TouchableOpacity style={styles.tryBtnSecondary} onPress={() => router.back()}>
              <Text style={styles.tryTextSecondary}>Not what you're looking for?</Text>
            </TouchableOpacity>
          )}
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
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  wrapper: {
    width: "100%",
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#080E1C",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: "#475569",
    marginTop: 16,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#141B2D",
    borderWidth: 1.5,
    borderColor: "#1E2A40",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  smallTitle: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  info: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: "#141B2D",
    padding: 32,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "#1E2A40",
    alignItems: "center",
    marginTop: 20,
  },
  emptyTitle: {
    color: "#F1F5F9",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  topPickCard: {
    padding: 24,
    borderRadius: 32,
    marginBottom: 24,
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  topPickBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 16,
  },
  topPickBadgeText: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  topPickTitle: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
    lineHeight: 28,
  },
  topPickReason: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  topPickDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 18,
  },
  topPickFooter: {
    flexDirection: "row",
    gap: 16,
  },
  topPickInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topPickInfoText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#141B2D",
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#1E2A40",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    color: "#F1F5F9",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardSub: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  matchCircle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchPercent: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "800",
  },
  cardBody: {
    marginTop: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1E2A40",
  },
  reason: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  tryBtn: {
    backgroundColor: "#818CF8",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
  },
  tryText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 15,
  },
  tryBtnSecondary: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  tryTextSecondary: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
});
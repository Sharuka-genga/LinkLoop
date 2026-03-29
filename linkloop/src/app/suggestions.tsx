import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";

const eventsData = [
  { id: 1, title: "Football Match", category: "Sports", time: "evening", popularity: 4, joined: 7, total: 11 },
  { id: 2, title: "Study Group", category: "Study", time: "morning", popularity: 5, joined: 3, total: 5 },
  { id: 3, title: "Gaming Night", category: "Gaming", time: "night", popularity: 3, joined: 5, total: 8 },
  { id: 4, title: "Campus Meetup", category: "Campus Events", time: "afternoon", popularity: 2, joined: 10, total: 20 },
  { id: 5, title: "Gym Session", category: "Fitness", time: "evening", popularity: 4, joined: 4, total: 6 },
  { id: 6, title: "Coffee Hangout", category: "Food & Hangouts", time: "afternoon", popularity: 3, joined: 2, total: 4 },
];

export default function Suggestions() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const rawInterests =
    typeof params.interests === "string" ? params.interests : "[]";

  const selectedInterests = JSON.parse(rawInterests);
  const selectedTime = typeof params.time === "string" ? params.time : "";

  const results = eventsData
    .map((event) => {
      let score = 0;

      if (selectedInterests.includes(event.category)) score += 5;
      if (selectedTime === event.time) score += 3;
      score += event.popularity;

      if (event.total - event.joined <= 2) score += 2;

      let reason = "Suggested based on popularity";

      if (selectedInterests.includes(event.category) && selectedTime === event.time) {
        reason = "Highly recommended based on your interest and time";
      } else if (selectedInterests.includes(event.category)) {
        reason = "Recommended based on your selected interest";
      } else if (selectedTime === event.time) {
        reason = "Recommended because it matches your time";
      }

      return { ...event, score, reason };
    })
    .filter((event) => event.score > 0)
    .sort((a, b) => b.score - a.score);

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
            Based on your preferences, we found the best matching events for you.
          </Text>

          {results.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No events found 😔</Text>
              <Text style={styles.emptyText}>
                Try changing your interest or time slot.
              </Text>
            </View>
          ) : (
            results.map((item, index) => {
              const percent = Math.min((item.score / 12) * 100, 100);

              return (
                <View key={item.id} style={styles.card}>
                  {index === 0 && (
                    <Text style={styles.badge}>🔥 Top Pick</Text>
                  )}

                  <Text style={styles.cardTitle}>{item.title}</Text>

                  <Text style={styles.cardSub}>
                    {item.category} • {item.time}
                  </Text>

                  <Text style={styles.slot}>
                    👥 {item.joined}/{item.total} joined
                  </Text>
                  <Text style={styles.slotLeft}>
                    {item.total - item.joined} spots left
                  </Text>

                  <Text style={styles.match}>Match: {Math.round(percent)}%</Text>

                  <Text style={styles.reason}>{item.reason}</Text>

                  <TouchableOpacity style={styles.viewBtn}>
                    <Text style={styles.viewText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              );
            })
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
  slotLeft: {
    color: "#FBBF24",
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
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
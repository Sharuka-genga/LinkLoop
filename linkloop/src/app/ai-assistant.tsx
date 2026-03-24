import { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type EventItem = {
  id: string;
  title: string;
  category: string;
  time: string;
  location: string;
  peopleNeeded: number;
  joined: number;
};

const events: EventItem[] = [
  {
    id: "1",
    title: "Badminton Match",
    category: "Sports",
    time: "evening",
    location: "Sports Complex",
    peopleNeeded: 4,
    joined: 2,
  },
  {
    id: "2",
    title: "Study Session",
    category: "Study",
    time: "afternoon",
    location: "Library",
    peopleNeeded: 6,
    joined: 4,
  },
  {
    id: "3",
    title: "Coffee Meetup",
    category: "Food & Hangouts",
    time: "evening",
    location: "Cafeteria",
    peopleNeeded: 3,
    joined: 1,
  },
  {
    id: "4",
    title: "Gaming Night",
    category: "Gaming",
    time: "night",
    location: "Innovation Lab",
    peopleNeeded: 5,
    joined: 3,
  },
  {
    id: "5",
    title: "Campus Club Meetup",
    category: "Campus Events",
    time: "morning",
    location: "Auditorium",
    peopleNeeded: 10,
    joined: 7,
  },
];

const categoryColors: Record<string, string> = {
  Sports: "#FF6B35",
  Study: "#818CF8",
  "Food & Hangouts": "#FBBF24",
  Fitness: "#F87171",
  Gaming: "#34D399",
  "Trips & Outdoors": "#38BDF8",
  "Campus Events": "#A78BFA",
  "Social / Chill": "#F472B6",
  Other: "#94A3B8",
};

export default function AIAssistant() {
  const [interest, setInterest] = useState("");
  const [time, setTime] = useState("");
  const [results, setResults] = useState<(EventItem & { score: number; reason: string })[]>([]);
  const [error, setError] = useState("");

  const availableInterests = useMemo(
    () => ["Sports", "Study", "Food & Hangouts", "Gaming", "Campus Events"],
    []
  );

  const availableTimes = useMemo(
    () => ["morning", "afternoon", "evening", "night"],
    []
  );

  const getScore = (event: EventItem) => {
    let score = 0;

    if (event.category === interest) score += 5;
    if (event.time === time) score += 3;
    if (event.joined >= 3) score += 1;

    return score;
  };

  const getReason = (score: number, event: EventItem) => {
    if (event.category === interest && event.time === time) {
      return "Matches your interest and available time";
    }
    if (event.category === interest) {
      return "Based on your selected interest";
    }
    if (event.time === time) {
      return "Fits your selected time";
    }
    return "Suggested from available event activity";
  };

  const generate = () => {
    if (!interest || !time) {
      setError("Please select both interest and time");
      return;
    }

    setError("");

    const sorted = events
      .map((event) => {
        const score = getScore(event);
        return {
          ...event,
          score,
          reason: getReason(score, event),
        };
      })
      .sort((a, b) => b.score - a.score);

    setResults(sorted);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>AI EVENT SUGGESTION</Text>
      <Text style={styles.title}>Find events for you</Text>
      <Text style={styles.subtitle}>
        Select your interest and free time to get personalized suggestions
      </Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Interest</Text>
        <View style={styles.chipWrap}>
          {availableInterests.map((item) => {
            const active = interest === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setInterest(item)}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: categoryColors[item] || "#94A3B8",
                    borderColor: categoryColors[item] || "#94A3B8",
                  },
                ]}
              >
                <Text style={[styles.chipText, active && styles.activeChipText]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Available Time</Text>
        <View style={styles.chipWrap}>
          {availableTimes.map((item) => {
            const active = time === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setTime(item)}
                style={[styles.chip, active && styles.activeTimeChip]}
              >
                <Text style={[styles.chipText, active && styles.activeChipText]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.generateButton} onPress={generate}>
        <Text style={styles.generateButtonText}>Generate Suggestions</Text>
      </TouchableOpacity>

      <Text style={styles.resultsHeading}>Suggested for You</Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const accent = categoryColors[item.category] || "#94A3B8";

          return (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={[styles.badge, { backgroundColor: `${accent}22` }]}>
                  <Text style={[styles.badgeText, { color: accent }]}>
                    {item.category}
                  </Text>
                </View>
                <Text style={styles.score}>Score {item.score}</Text>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardReason}>{item.reason}</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>LOCATION</Text>
                  <Text style={styles.infoValue}>{item.location}</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>TIME</Text>
                  <Text style={styles.infoValue}>{item.time}</Text>
                </View>
              </View>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>
                  {item.peopleNeeded} people needed
                </Text>
                <Text style={styles.bottomText}>
                  {item.joined}/{item.peopleNeeded} joined
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.skipButton}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No suggestions yet</Text>
            <Text style={styles.emptySubtitle}>
              Choose your preferences and tap Generate Suggestions
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080E1C",
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  greeting: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    marginBottom: 18,
  },
  sectionCard: {
    backgroundColor: "#141B2D",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  sectionLabel: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E2A40",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  activeTimeChip: {
    backgroundColor: "#818CF8",
    borderColor: "#818CF8",
  },
  chipText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
  activeChipText: {
    color: "#F1F5F9",
  },
  error: {
    color: "#F87171",
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "600",
  },
  generateButton: {
    backgroundColor: "#818CF8",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  generateButtonText: {
    color: "#080E1C",
    fontSize: 15,
    fontWeight: "800",
  },
  resultsHeading: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  card: {
    backgroundColor: "#141B2D",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  score: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    color: "#F1F5F9",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  cardReason: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  infoBox: {
    width: "48%",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E2A40",
    padding: 14,
  },
  infoLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 1,
  },
  infoValue: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bottomText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skipButton: {
    width: "47%",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E2A40",
    paddingVertical: 14,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },
  joinButton: {
    width: "47%",
    backgroundColor: "#818CF8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#080E1C",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#141B2D",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  emptyTitle: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
});
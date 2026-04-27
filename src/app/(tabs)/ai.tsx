import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { CalendarDays, Sparkles } from "lucide-react-native";
import { savePreference } from "@/lib/preferences";
import { BG } from "@/constants/theme";

export default function AIScreen() {
  const router = useRouter();

  const [selectedInterest, setSelectedInterest] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const interests = [
    { label: "Sports", emoji: "⚽" },
    { label: "Study", emoji: "📚" },
    { label: "Social", emoji: "👥" },
    { label: "Food & Hangouts", emoji: "🍔" },
    { label: "Gaming", emoji: "🎮" },
    { label: "Campus Events", emoji: "🎉" },
  ];

  const timeSlots = ["morning", "afternoon", "evening", "night"];

  const toggleInterest = (item: string) => {
    if (selectedInterest.includes(item)) {
      setSelectedInterest(selectedInterest.filter((i) => i !== item));
    } else {
      setSelectedInterest([...selectedInterest, item]);
    }
  };

  const formatDateLabel = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatDateParam = (d: Date) => {
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isFutureOrToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);

    return picked >= today;
  };

  const handleGenerate = async () => {
    if (selectedInterest.length === 0) {
      setError("Please select at least one interest");
      return;
    }

    if (!isFutureOrToday(selectedDate)) {
      setError("Past dates are not allowed");
      return;
    }

    if (!selectedTimeSlot) {
      setError("Please select a time slot");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await savePreference(
        selectedInterest,
        formatDateParam(selectedDate),
        selectedTimeSlot,
      );

      router.push({
        pathname: "/suggestions",
        params: {
          interests: JSON.stringify(selectedInterest),
          date: formatDateParam(selectedDate),
          time: selectedTimeSlot,
        },
      });
    } catch (err: any) {
      console.error("Failed to save preferences:", err);
      Alert.alert(
        "Error",
        `Failed to save preferences: ${err?.message || "Unknown error"}`
      );
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080E1C" />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
           <Sparkles size={24} color="#A78BFA" strokeWidth={2.5} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.smallHeading}>AI EVENT SUGGESTION</Text>
          <Text style={styles.title}>Find events for you</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>INTEREST</Text>

        <View style={styles.grid}>
          {interests.map((item) => {
            const active = selectedInterest.includes(item.label);

            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => toggleInterest(item.label)}
                activeOpacity={0.85}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.cardText}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.section}>DATE</Text>

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowDate(true)}
          activeOpacity={0.85}
        >
          <CalendarDays size={18} color="#818CF8" strokeWidth={2.3} />
          <Text style={styles.dateText}>{formatDateLabel(selectedDate)}</Text>
        </TouchableOpacity>

        <Text style={styles.section}>AVAILABLE TIME</Text>

        <View style={styles.timeRow}>
          {timeSlots.map((time) => {
            const active = selectedTimeSlot === time;

            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeBtn, active && styles.timeActive]}
                onPress={() => setSelectedTimeSlot(time)}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeText, active && styles.timeTextActive]}>
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGenerate}
          activeOpacity={0.9}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Generating..." : "Generate Suggestions"}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <Modal visible={showDate} transparent animationType="slide">
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDate(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>

              <Text style={styles.pickerTitle}>Select Date</Text>

              <TouchableOpacity onPress={() => setShowDate(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS !== "ios") {
                  setShowDate(false);
                }

                if (d) {
                  setSelectedDate(d);
                  setError("");
                }
              }}
              style={{ alignSelf: "center", width: "100%" }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#080E1C",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#080E1C",
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(167, 139, 250, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  smallHeading: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  container: {
    flex: 1,
    backgroundColor: "#080E1C",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 150,
  },
  section: {
    color: "#475569",
    marginBottom: 14,
    marginTop: 10,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginBottom: 24,
  },
  card: {
    width: "47%",
    backgroundColor: "#141B2D",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  cardActive: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(129, 140, 248, 0.08)",
  },
  emoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  cardText: {
    color: "#F1F5F9",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  dateBtn: {
    backgroundColor: "#141B2D",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E2A40",
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  dateText: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  timeBtn: {
    backgroundColor: "#141B2D",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  timeActive: {
    backgroundColor: "#818CF8",
    borderColor: "#818CF8",
  },
  timeText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timeTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#818CF8",
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#818CF8",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  pickerModalContent: {
    backgroundColor: "#141B2D",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2A40",
  },
  pickerCancel: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerTitle: {
    color: "#F1F5F9",
    fontSize: 17,
    fontWeight: "800",
  },
  pickerDone: {
    color: "#818CF8",
    fontSize: 16,
    fontWeight: "800",
  },
  bottomSpace: {
    height: 100,
  },
});

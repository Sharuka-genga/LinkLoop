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

      {/* Background Accents */}
      <View style={styles.bgGlow} />
      <View style={styles.bgGlowSecondary} />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
           <Sparkles size={24} color="#A78BFA" strokeWidth={2.5} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.smallHeading}>AI RECOMMENDATIONS</Text>
          <Text style={styles.title}>Tailored for You</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.section}>YOUR INTERESTS</Text>
          <Text style={styles.badgeCount}>{selectedInterest.length} selected</Text>
        </View>

        <View style={styles.grid}>
          {interests.map((item) => {
            const active = selectedInterest.includes(item.label);

            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => toggleInterest(item.label)}
                activeOpacity={0.8}
              >
                <View style={[styles.cardEmojiBg, active && styles.cardEmojiBgActive]}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
                <Text style={[styles.cardText, active && styles.cardTextActive]}>{item.label}</Text>
                {active && <View style={styles.checkDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.section}>PREFERRED DATE</Text>

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowDate(true)}
          activeOpacity={0.8}
        >
          <View style={styles.iconCircle}>
            <CalendarDays size={18} color="#818CF8" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>Selection</Text>
            <Text style={styles.dateText}>{formatDateLabel(selectedDate)}</Text>
          </View>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        <Text style={styles.section}>BEST TIME TO JOIN</Text>

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
            {loading ? "Crunching events..." : "Generate Matches"}
          </Text>
          <Sparkles size={18} color="#0F172A" strokeWidth={2.5} />
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
  bgGlow: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(129, 140, 248, 0.05)",
    zIndex: -1,
  },
  bgGlowSecondary: {
    position: "absolute",
    bottom: 100,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(167, 139, 250, 0.03)",
    zIndex: -1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "transparent",
    gap: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  smallHeading: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
    opacity: 0.8,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 150,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  section: {
    color: "#475569",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  badgeCount: {
    fontSize: 10,
    fontWeight: "800",
    color: "#818CF8",
    backgroundColor: "rgba(129, 140, 248, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
    marginBottom: 32,
  },
  card: {
    width: "47.5%",
    backgroundColor: "#141B2D",
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#1E2A40",
    position: "relative",
    overflow: "hidden",
  },
  cardActive: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(129, 140, 248, 0.05)",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardEmojiBg: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardEmojiBgActive: {
    backgroundColor: "rgba(129, 140, 248, 0.12)",
  },
  emoji: {
    fontSize: 28,
  },
  cardText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
  cardTextActive: {
    color: "#F1F5F9",
    fontWeight: "800",
  },
  checkDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#818CF8",
  },
  dateBtn: {
    backgroundColor: "#141B2D",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#1E2A40",
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(129, 140, 248, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  dateText: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "700",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#818CF8",
    opacity: 0.8,
  },
  timeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 40,
    marginTop: 16,
  },
  timeBtn: {
    backgroundColor: "#141B2D",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#1E2A40",
  },
  timeActive: {
    backgroundColor: "#818CF8",
    borderColor: "#818CF8",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  timeText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timeTextActive: {
    color: "#0F172A",
    fontWeight: "900",
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#818CF8",
    paddingVertical: 22,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#818CF8",
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 0.2,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  pickerModalContent: {
    backgroundColor: "#141B2D",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2A40",
  },
  pickerCancel: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerTitle: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "900",
  },
  pickerDone: {
    color: "#818CF8",
    fontSize: 16,
    fontWeight: "900",
  },
  bottomSpace: {
    height: 100,
  },
});

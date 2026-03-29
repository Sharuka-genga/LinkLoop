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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { ArrowLeft, CalendarDays } from "lucide-react-native";

export default function AIAssistant() {
  const router = useRouter();

  const [selectedInterest, setSelectedInterest] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState("");

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

  const handleGenerate = () => {
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

    router.push({
      pathname: "/suggestions",
      params: {
        interests: JSON.stringify(selectedInterest),
        time: selectedTimeSlot,
        date: formatDateParam(selectedDate),
      },
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080E1C" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#CBD5E1" strokeWidth={2.5} />
        </TouchableOpacity>

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
          style={styles.button}
          onPress={handleGenerate}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Generate Suggestions</Text>
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
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#080E1C",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#141B2D",
    borderWidth: 1,
    borderColor: "#1E2A40",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 4,
  },
  headerTextWrap: {
    flex: 1,
    paddingTop: 2,
  },
  smallHeading: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  container: {
    flex: 1,
    backgroundColor: "#080E1C",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 130,
  },
  section: {
    color: "#CBD5E1",
    marginBottom: 12,
    marginTop: 8,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 20,
  },
  card: {
    width: "48%",
    backgroundColor: "#141B2D",
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  cardActive: {
    borderColor: "#818CF8",
    backgroundColor: "#1B2440",
  },
  emoji: {
    fontSize: 34,
    marginBottom: 10,
  },
  cardText: {
    color: "#F1F5F9",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  dateBtn: {
    backgroundColor: "#141B2D",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E2A40",
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  dateText: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  timeBtn: {
    backgroundColor: "#141B2D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  timeActive: {
    backgroundColor: "#818CF8",
    borderColor: "#818CF8",
  },
  timeText: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "500",
  },
  timeTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#818CF8",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 16,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  pickerModalContent: {
    backgroundColor: "#141B2D",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2A40",
  },
  pickerCancel: {
    color: "#94A3B8",
    fontSize: 16,
  },
  pickerTitle: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "700",
  },
  pickerDone: {
    color: "#818CF8",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomSpace: {
    height: Platform.OS === "ios" ? 40 : 28,
  },
});
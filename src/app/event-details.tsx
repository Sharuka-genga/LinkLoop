import { useLocalSearchParams, useRouter } from "expo-router";
import { sendJoinRequest, cancelJoinRequest } from "@/lib/requests";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";

type RequestStatus = "none" | "pending";

export default function EventDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const eventId = typeof params.id === "string" ? params.id : undefined;

  const title = typeof params.title === "string" ? params.title : "Event";
  const category =
    typeof params.category === "string" ? params.category : "General";
  const time = typeof params.time === "string" ? params.time : "N/A";
  const location =
    typeof params.location === "string" ? params.location : "Campus";
  const description =
    typeof params.description === "string"
      ? params.description
      : "No description available";
  const total = Number(params.total ?? 0);
  const initialJoined = Number(params.joined ?? 0);

  const [requestStatus, setRequestStatus] = useState<RequestStatus>("none");

  const handleRequest = async () => {
  if (!eventId) {
    alert("Invalid event ID");
    return;
  }

  try {
    console.log("Sending request for event:", eventId);
    const result = await sendJoinRequest(eventId);
    console.log("Join request success:", result);
    setRequestStatus("pending");
    alert("Request sent!");
  } catch (err: any) {
    console.error("Join request failed:", err);
    alert(`Failed to send request: ${err?.message || "Unknown error"}`);
  }
};
  const handleCancelRequest = async () => {
    if (!eventId) {
      Alert.alert("Error", "Event ID not found");
      return;
    }

    try {
      await cancelJoinRequest(eventId);
      setRequestStatus("none");
      Alert.alert("Success", "Request cancelled!");
    } catch (err) {
      console.error("Failed to cancel request:", err);
      Alert.alert("Error", "Failed to cancel request");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080E1C" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>
          {category} • {time}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{location}</Text>

          <Text style={styles.label}>Participants</Text>
          <Text style={styles.value}>
            👥 {initialJoined}/{total} joined
          </Text>

          <Text style={styles.slots}>
            {Math.max(total - initialJoined, 0)} spots left
          </Text>

          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{description}</Text>
        </View>

        {requestStatus === "none" ? (
          <TouchableOpacity style={styles.requestBtn} onPress={handleRequest}>
            <Text style={styles.requestText}>Request to Join</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.pendingCard}>
              <Text style={styles.pendingText}>
                Request sent successfully. The event owner will review it.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelRequest}
            >
              <Text style={styles.cancelText}>Cancel Request</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.tryBtn} onPress={() => router.back()}>
          <Text style={styles.tryText}>Back to Suggestions</Text>
        </TouchableOpacity>
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
  },
  back: {
    color: "#818CF8",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 14,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  sub: {
    color: "#CBD5E1",
    fontSize: 14,
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#141B2D",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  label: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    color: "#F1F5F9",
    fontSize: 14,
    lineHeight: 20,
  },
  slots: {
    color: "#FBBF24",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  requestBtn: {
    marginTop: 18,
    backgroundColor: "#34D399",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  requestText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 14,
  },
  pendingCard: {
    marginTop: 18,
    backgroundColor: "#141B2D",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FBBF24",
  },
  pendingText: {
    color: "#F1F5F9",
    fontSize: 14,
    lineHeight: 20,
  },
  cancelBtn: {
    marginTop: 12,
    backgroundColor: "#F87171",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 14,
  },
  tryBtn: {
    marginTop: 20,
    backgroundColor: "#818CF8",
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
  },
  tryText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 14,
  },
});
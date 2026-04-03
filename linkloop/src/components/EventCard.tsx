import { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { MapPin, Clock, Users, ChevronRight, Zap, MessageCircle, CheckCircle, Pencil, Trash2 } from "lucide-react-native";
import { deleteEvent } from "@/lib/events";
import { useRouter } from "expo-router";

const TEST_USER_ID = "8d30902c-c3ca-470a-8f4b-b1b545e8f452"; // Kavindu = YOU

type Props = {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  peopleNeeded: number;
  category: string;
  creatorId?: string;
  creatorName?: string;
  creatorAvatar?: string;
  joinMode?: "direct" | "request";
  spotsLeft?: number;
  totalSpots?: number;
  subcategoryLabel?: string;
  onDelete?: () => void;
};

const CATEGORY_CONFIG: Record<string, { color: string; darkColor: string; label: string }> = {
  sports: { color: "#FF6B35", darkColor: "#3D1500", label: "Sports" },
  study: { color: "#818CF8", darkColor: "#1E1B4B", label: "Study" },
  social: { color: "#F472B6", darkColor: "#3D0A24", label: "Social" },
  food: { color: "#FBBF24", darkColor: "#3D2000", label: "Food" },
  gaming: { color: "#34D399", darkColor: "#052E1C", label: "Gaming" },
  fitness: { color: "#F87171", darkColor: "#3D0F0F", label: "Fitness" },
  trips: { color: "#38BDF8", darkColor: "#052030", label: "Trips" },
  campus: { color: "#A78BFA", darkColor: "#1E0F3D", label: "Campus Events" },
  custom: { color: "#94A3B8", darkColor: "#1E2A3D", label: "Custom" },
  other: { color: "#94A3B8", darkColor: "#1E2A3D", label: "Other" },
};

type JoinState = "idle" | "requested" | "joined";

export default function EventCard({
  id, title, location, date, time, peopleNeeded, category,
  creatorId, creatorName, creatorAvatar,
  joinMode = "direct", spotsLeft, totalSpots, subcategoryLabel, onDelete,
}: Props) {
  const cat = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  const isHost = creatorId === TEST_USER_ID;
  const router = useRouter();
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [showDropdown, setShowDropdown] = useState(false);

  const fillPct = spotsLeft != null && totalSpots != null && totalSpots > 0
    ? ((totalSpots - spotsLeft) / totalSpots) * 100 : 0;

  const handleDelete = async () => {
    setShowDropdown(false);
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(id);
              onDelete?.();
            } catch (err) {
              Alert.alert("Error", "Could not delete event. Try again.");
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setShowDropdown(false);
    Alert.alert("Coming Soon", "Edit event feature coming soon.");
  };

  const handleJoinNow = () => {
    setJoinState("joined");
    Alert.alert("Joined!", "You have joined this event.");
  };

  const handleRequestJoin = () => {
    setJoinState("requested");
    Alert.alert("Request Sent!", "Your request has been sent to the host.");
  };

  const handleOpenChat = () => {
    router.push(`/chat/${id}`);
  };

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.catRow}>
          <View style={[styles.catPill, { backgroundColor: cat.darkColor }]}>
            <Zap size={10} color={cat.color} strokeWidth={0} fill={cat.color} />
            <Text style={[styles.catPillText, { color: cat.color }]}>{cat.label.toUpperCase()}</Text>
          </View>
          {subcategoryLabel && (
            <View style={styles.subCatPill}>
              <Text style={styles.subCatText}>{subcategoryLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.topRight}>
          {!isHost && (
            <View style={[
              styles.modePill,
              { backgroundColor: joinMode === "direct" ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)" }
            ]}>
              <View style={[styles.modeDot, { backgroundColor: joinMode === "direct" ? "#34D399" : "#FBBF24" }]} />
              <Text style={[styles.modeText, { color: joinMode === "direct" ? "#34D399" : "#FBBF24" }]}>
                {joinMode === "direct" ? "Open" : "By Request"}
              </Text>
            </View>
          )}

          {isHost && (
            <View style={styles.hostControls}>
              {/* 3-dot button */}
              <View style={{ position: "relative", zIndex: 1000 }}>
                <TouchableOpacity
                  style={styles.threeDotBtn}
                  onPress={() => setShowDropdown(!showDropdown)}
                >
                  <Text style={styles.threeDotText}>•••</Text>
                </TouchableOpacity>

                {/* Dropdown menu - rendered here to be inside the zIndex container */}
                {showDropdown && (
                  <View style={styles.dropdown}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={handleEdit}>
                      <Pencil size={14} color="#CBD5E1" strokeWidth={2.5} />
                      <Text style={styles.dropdownItemText}>Edit Event</Text>
                    </TouchableOpacity>
                    <View style={styles.dropdownDivider} />
                    <TouchableOpacity style={styles.dropdownItem} onPress={handleDelete}>
                      <Trash2 size={14} color="#F87171" strokeWidth={2.5} />
                      <Text style={[styles.dropdownItemText, { color: "#F87171" }]}>Delete Event</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Tap outside to close dropdown - moved here so it can be behind the dropdown z-index if needed */}
      {showDropdown && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}
          onPress={() => setShowDropdown(false)}
          activeOpacity={0}
        />
      )}

      {/* Creator row */}
      {creatorName && (
        <View style={styles.creatorRow}>
          <Image
            source={{ uri: creatorAvatar || (creatorId === TEST_USER_ID ? "https://i.pravatar.cc/150?img=12" : `https://i.pravatar.cc/150?u=${creatorId}`) }}
            style={styles.avatar}
          />
          <Text style={styles.creatorName}>{creatorName}</Text>
          <Text style={styles.hostLabel}>{isHost ? "YOU" : "HOST"}</Text>
        </View>
      )}

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      <View style={styles.divider} />

      {/* Info grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <View style={[styles.infoIcon, { backgroundColor: "rgba(129,140,248,0.15)" }]}>
            <MapPin size={13} color="#818CF8" strokeWidth={2.5} />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>LOCATION</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{location}</Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <View style={[styles.infoIcon, { backgroundColor: "rgba(129,140,248,0.15)" }]}>
            <Clock size={13} color="#818CF8" strokeWidth={2.5} />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoValue}>{date}</Text>
            <Text style={styles.infoValueSub}>{time}</Text>
          </View>
        </View>
      </View>

      {/* Spots row */}
      <View style={styles.spotsRow}>
        <View style={styles.spotsLeft}>
          <Users size={13} color="#64748B" strokeWidth={2} />
          <Text style={styles.spotsText}>{peopleNeeded} people needed</Text>
        </View>
        {totalSpots != null && spotsLeft != null && (
          <Text style={styles.spotsCount}>{totalSpots - spotsLeft}/{totalSpots} joined</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${fillPct}%` as any, backgroundColor: cat.color }]} />
      </View>

      {/* HOST — Open Chat */}
      {isHost && (
        <TouchableOpacity style={styles.openChatBtn} onPress={handleOpenChat} activeOpacity={0.8}>
          <MessageCircle size={16} color="#F1F5F9" strokeWidth={2.5} />
          <Text style={styles.openChatBtnText}>Open Chat</Text>
        </TouchableOpacity>
      )}

      {/* GUEST — Open to Join */}
      {!isHost && joinMode === "direct" && joinState === "idle" && (
        <TouchableOpacity style={styles.actionBtn} onPress={handleJoinNow} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>Join Now</Text>
          <ChevronRight size={16} color="#F1F5F9" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
      {!isHost && joinMode === "direct" && joinState === "joined" && (
        <TouchableOpacity style={[styles.actionBtn, styles.joinedBtn]} onPress={handleOpenChat} activeOpacity={0.8}>
          <MessageCircle size={16} color="#34D399" strokeWidth={2.5} />
          <Text style={[styles.actionBtnText, { color: "#34D399" }]}>Open Chat</Text>
        </TouchableOpacity>
      )}

      {/* GUEST — By Request */}
      {!isHost && joinMode === "request" && joinState === "idle" && (
        <TouchableOpacity style={[styles.actionBtn, styles.requestBtn]} onPress={handleRequestJoin} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>Request to Join</Text>
          <ChevronRight size={16} color="#F1F5F9" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
      {!isHost && joinMode === "request" && joinState === "requested" && (
        <View style={[styles.actionBtn, styles.sentBtn]}>
          <CheckCircle size={16} color="#475569" strokeWidth={2.5} />
          <Text style={[styles.actionBtnText, { color: "#475569" }]}>Request Sent</Text>
        </View>
      )}
      {!isHost && joinMode === "request" && joinState === "joined" && (
        <TouchableOpacity style={[styles.actionBtn, styles.joinedBtn]} onPress={handleOpenChat} activeOpacity={0.8}>
          <MessageCircle size={16} color="#34D399" strokeWidth={2.5} />
          <Text style={[styles.actionBtnText, { color: "#34D399" }]}>Open Chat</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: "#141B2D", borderRadius: 24, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: "#1E2A40",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 }, elevation: 8, overflow: "visible",
  },
  accentBar: {
    position: "absolute", top: 0, left: 0, right: 0, height: 3,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    backgroundColor: "#1E2A40",
  },
  topRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 4, marginBottom: 14,
  },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  catPill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5,
  },
  catPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  subCatPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  subCatText: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  modePill: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, gap: 5,
  },
  modeDot: { width: 6, height: 6, borderRadius: 3 },
  modeText: { fontSize: 11, fontWeight: "700" },
  hostControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  yourEventBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    backgroundColor: "rgba(129,140,248,0.15)",
    borderWidth: 1, borderColor: "rgba(129,140,248,0.3)",
  },
  yourEventText: { fontSize: 9, fontWeight: "800", color: "#818CF8", letterSpacing: 1 },
  threeDotBtn: {
    padding: 8, marginRight: -8,
    alignItems: "center", justifyContent: "center",
  },
  threeDotText: { fontSize: 18, color: "rgba(148,163,184,0.6)", letterSpacing: 1.5, fontWeight: "900" },

  // Dropdown
  dropdown: {
    position: "absolute", top: 38, right: 0,
    backgroundColor: "#1E2A40", borderRadius: 14,
    borderWidth: 1, borderColor: "#2D3E55",
    width: 160, zIndex: 999,
    shadowColor: "#000", shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 20,
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  dropdownItemText: { fontSize: 14, fontWeight: "700", color: "#CBD5E1" },
  dropdownDivider: { height: 1, backgroundColor: "#2D3E55", marginHorizontal: 14 },

  creatorRow: {
    flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10,
  },
  avatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5 },
  creatorName: { fontSize: 13, fontWeight: "700", color: "#CBD5E1", flex: 1 },
  hostLabel: {
    fontSize: 9, fontWeight: "800", color: "#475569",
    backgroundColor: "#0F172A", paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 6, letterSpacing: 0.8,
  },
  title: {
    fontSize: 20, fontWeight: "800", color: "#F1F5F9",
    lineHeight: 26, letterSpacing: -0.3, marginBottom: 14,
  },
  divider: { height: 1, backgroundColor: "#1E2A40", marginBottom: 14 },
  infoGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoItem: {
    flex: 1, flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#0F172A", borderRadius: 12,
    padding: 10, gap: 8, borderWidth: 1, borderColor: "#1E2A40",
  },
  infoIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: "800", color: "#475569", letterSpacing: 0.8, marginBottom: 3 },
  infoValue: { fontSize: 12, fontWeight: "700", color: "#CBD5E1" },
  infoValueSub: { fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 },
  spotsRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  spotsLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  spotsText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  spotsCount: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  progressTrack: {
    height: 4, backgroundColor: "#1E2A40",
    borderRadius: 10, overflow: "hidden", marginBottom: 14,
  },
  progressFill: { height: "100%", borderRadius: 10 },
  openChatBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 13, borderRadius: 14, gap: 8,
    backgroundColor: "#1E2A40", borderWidth: 1, borderColor: "#334155",
  },
  openChatBtnText: { fontSize: 14, fontWeight: "800", color: "#F1F5F9" },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 13, borderRadius: 14, gap: 6,
    backgroundColor: "#1E2A40", borderWidth: 1, borderColor: "#334155",
  },
  actionBtnText: { fontSize: 14, fontWeight: "800", color: "#F1F5F9" },
  requestBtn: { borderColor: "#334155" },
  sentBtn: { backgroundColor: "#0F172A", borderColor: "#1E2A40" },
  joinedBtn: { backgroundColor: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.3)" },
});
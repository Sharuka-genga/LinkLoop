import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Image, Alert, Animated, Dimensions, Easing,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { RefreshCw, Check, Star, Zap, ChevronRight, X, Users } from "lucide-react-native";
import { getSuggestedUsers, sendInvitation } from "@/lib/events";

const { width: W, height: H } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
type User = {
  id: string;
  full_name: string;
  profile_picture_url: string;
  interests: string[];
  engagement_score: number;
  faculty: string;
  match_reason: string;
};

// ─── Bubble positions: 6 in a circle ─────────────────────────────────────────
const BUBBLE_SIZE = 78;
const RADIUS = 120;
const CANVAS_CX = W / 2;
const CANVAS_CY = H * 0.37;

const POSITIONS = Array.from({ length: 6 }, (_, i) => {
  const angle = (i * 60 - 90) * (Math.PI / 180);
  return {
    x: CANVAS_CX + RADIUS * Math.cos(angle) - BUBBLE_SIZE / 2,
    y: CANVAS_CY + RADIUS * Math.sin(angle) - BUBBLE_SIZE / 2,
  };
});

// ─── Single Bubble Component ──────────────────────────────────────────────────
function Bubble({
  user, index, color, isSent, isSelected, onPress,
}: {
  user: User; index: number; color: string;
  isSent: boolean; isSelected: boolean; onPress: () => void;
}) {
  const pos = POSITIONS[index];

  // Entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;
  // Float animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  // Pulse ring when selected
  const pulseAnim = useRef(new Animated.Value(0)).current;
  // Success pop when invited
  const successAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.spring(entranceAnim, {
      toValue: 1,
      delay: index * 80,
      useNativeDriver: true,
      tension: 70,
      friction: 6,
    }).start();

    // Continuous float
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1, duration: 2000 + index * 300,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, duration: 2000 + index * 300,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    );
    float.start();
    return () => float.stop();
  }, []);

  // Pulse ring when selected
  useEffect(() => {
    if (isSelected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isSelected]);

  // Success pop
  useEffect(() => {
    if (isSent) {
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 5 }),
      ]).start();
    }
  }, [isSent]);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  const hasAvatar = !!user.profile_picture_url;
  const initial = (user.full_name || "?").charAt(0).toUpperCase();

  return (
    <Animated.View
      style={[
        styles.bubbleOuter,
        {
          left: pos.x,
          top: pos.y,
          transform: [
            { scale: entranceAnim },
            { translateY: floatY },
          ],
        },
      ]}
    >
      {/* Pulse ring */}
      {isSelected && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              borderColor: color,
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
              width: BUBBLE_SIZE + 24,
              height: BUBBLE_SIZE + 24,
              borderRadius: (BUBBLE_SIZE + 24) / 2,
              left: -12,
              top: -12,
            },
          ]}
        />
      )}

      {/* Bubble */}
      <Animated.View style={{ transform: [{ scale: successAnim }] }}>
        <TouchableOpacity
          style={[
            styles.bubble,
            {
              borderColor: isSent
                ? color
                : isSelected
                  ? color
                  : "#1E2A40",
              borderWidth: isSelected || isSent ? 3 : 2,
            },
          ]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          {hasAvatar ? (
            <Image source={{ uri: user.profile_picture_url }} style={styles.bubbleImg} />
          ) : (
            <View style={styles.bubbleFallback}>
              <Text style={[styles.bubbleFallbackLetter, { color }]}>{initial}</Text>
            </View>
          )}

          {/* Sent overlay */}
          {isSent && (
            <Animated.View style={[styles.sentOverlay, { backgroundColor: color + "EE" }]}>
              <Check size={24} color="#000" strokeWidth={3} />
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Name */}
      <Text style={[styles.bubbleName, isSent && { color, fontWeight: "800" }]} numberOfLines={1}>
        {user.full_name.split(" ")[0]}
      </Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SuggestedParticipants() {
  const router = useRouter();
  const { categoryId, categoryLabel, categoryColor, eventTitle, eventId } = useLocalSearchParams<{
    categoryId: string;
    categoryLabel: string;
    categoryColor: string;
    eventTitle: string;
    eventId: string;
  }>();

  const color = categoryColor || "#818CF8";
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [inviteStatus, setInviteStatus] = useState<Record<string, "idle" | "sent">>({});
  const [selected, setSelected] = useState<string | null>(null);

  // Center pulse
  const centerPulse = useRef(new Animated.Value(1)).current;
  // Info panel
  const infoPanelY = useRef(new Animated.Value(80)).current;
  const infoPanelOpacity = useRef(new Animated.Value(0)).current;
  // Refresh spin
  const refreshSpin = useRef(new Animated.Value(0)).current;

  const loadSuggested = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await getSuggestedUsers(eventId, 6);
      setUsers((data || []).slice(0, 6));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggested();
  }, [eventId]);

  const sentCount = Object.values(inviteStatus).filter((s) => s === "sent").length;

  // Center pulse loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(centerPulse, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(centerPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Info panel slide
  useEffect(() => {
    if (selected) {
      Animated.parallel([
        Animated.spring(infoPanelY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 8 }),
        Animated.timing(infoPanelOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(infoPanelY, { toValue: 80, duration: 200, useNativeDriver: true }),
        Animated.timing(infoPanelOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [selected]);

  const handleRefresh = () => {
    setSelected(null);
    loadSuggested();
    Animated.sequence([
      Animated.timing(refreshSpin, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(refreshSpin, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();
  };

  const handleInvite = async (userId: string, userName: string) => {
    if (!eventId) {
      Alert.alert("Error", "Missing Event ID. Please go back and try again.");
      return;
    }
    try {
      await sendInvitation(eventId, userId);
      setInviteStatus((p) => ({ ...p, [userId]: "sent" }));
      setSelected(null);
    } catch (err: any) {
      if (err?.code === "23505") {
        setInviteStatus((p) => ({ ...p, [userId]: "sent" }));
        setSelected(null);
      } else {
        Alert.alert("Error", "Could not send invitation. Try again.");
      }
    }
  };

  const handleDone = () => {
    router.replace("/(tabs)");
  };

  const selectedUser = users.find((u) => u.id === selected);

  const spinDeg = refreshSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080E1C" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Invite Participants</Text>
          <Text style={styles.headerSub}>
            Tap a bubble to invite  ·  <Text style={{ color, fontWeight: "800" }}>{sentCount}</Text> sent
          </Text>
        </View>
        <View style={[styles.catPill, { backgroundColor: color + "22", borderColor: color + "55" }]}>
          <Zap size={10} color={color} fill={color} strokeWidth={0} />
          <Text style={[styles.catPillText, { color }]}>{categoryLabel || "Category"}</Text>
        </View>
      </View>

      {/* Event strip */}
      <View style={[styles.eventStrip, { borderColor: color + "44" }]}>
        <View style={[styles.eventDot, { backgroundColor: color }]} />
        <Text style={styles.eventStripTitle} numberOfLines={1}>{eventTitle || "Your Event"}</Text>
        <View style={styles.eventSpotsPill}>
          <Users size={11} color="#475569" strokeWidth={2} />
          <Text style={styles.eventSpotsText}>{sentCount} invited</Text>
        </View>
      </View>

      {/* Canvas */}
      <View style={styles.canvas}>

        {/* Outer decorative rings */}
        <View style={[styles.ringOuter, { borderColor: color + "10" }]} />
        <View style={[styles.ringMid, { borderColor: color + "18", borderStyle: "dashed" }]} />

        {/* Center pulsing badge */}
        <Animated.View style={[styles.centerBadge, { transform: [{ scale: centerPulse }] }]}>
          <View style={[styles.centerBadgeInner, { borderColor: color + "40", backgroundColor: color + "12" }]}>
            <Text style={[styles.centerNum, { color }]}>{sentCount}</Text>
            <Text style={styles.centerSub}>invited</Text>
          </View>
        </Animated.View>

        {/* Bubbles */}
        {!loading && users.map((user, i) => (
          <Bubble
            key={`${user.id}`}
            user={user}
            index={i % 6} // Keep within 6 positions
            color={color}
            isSent={inviteStatus[user.id] === "sent"}
            isSelected={selected === user.id}
            onPress={() => {
              if (inviteStatus[user.id] === "sent") return;
              setSelected(selected === user.id ? null : user.id);
            }}
          />
        ))}
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Finding participants...</Text>
          </View>
        )}
      </View>

      {/* Info panel — slides up when bubble tapped */}
      <Animated.View
        style={[
          styles.infoPanel,
          { borderColor: color + "55" },
          { opacity: infoPanelOpacity, transform: [{ translateY: infoPanelY }] },
        ]}
        pointerEvents={selected ? "auto" : "none"}
      >
        {selectedUser && (
          <>
            {selectedUser.profile_picture_url ? (
              <Image
                source={{ uri: selectedUser.profile_picture_url }}
                style={[styles.infoPanelAvatar, { borderColor: color }]}
              />
            ) : (
              <View style={[styles.infoPanelAvatar, styles.infoPanelAvatarFallback, { borderColor: color }]}>
                <Text style={[styles.infoPanelAvatarLetter, { color }]}>{(selectedUser.full_name || "?").charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.infoPanelInfo}>
              <Text style={styles.infoPanelName}>{selectedUser.full_name}</Text>
              <View style={styles.infoPanelMeta}>
                <Star size={10} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
                <Text style={styles.infoPanelRating}>{(selectedUser.engagement_score / 10).toFixed(1)}</Text>
                <Text style={styles.infoPanelSep}>·</Text>
                <Text style={styles.infoPanelMetaText}>
                  {selectedUser.faculty}
                </Text>
              </View>
              <View style={styles.matchReasonPill}>
                <Zap size={9} color="#818CF8" fill="#818CF8" />
                <Text style={styles.matchReasonText}>{selectedUser.match_reason}</Text>
              </View>
            </View>
            <View style={styles.infoPanelActions}>
              <TouchableOpacity
                style={[styles.inviteBtn, { backgroundColor: color }]}
                onPress={() => handleInvite(selectedUser.id, selectedUser.full_name)}
                activeOpacity={0.85}
              >
                <Text style={styles.inviteBtnText}>Invite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => setSelected(null)}
              >
                <X size={13} color="#475569" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.refreshRow} onPress={handleRefresh} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
            <RefreshCw size={15} color="#475569" strokeWidth={2.5} />
          </Animated.View>
          <Text style={styles.refreshText}>Show different people</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.doneBtn,
            { backgroundColor: sentCount > 0 ? color : "#141B2D", borderColor: sentCount > 0 ? color : "#1E2A40" },
          ]}
          onPress={handleDone}
          activeOpacity={0.85}
          testID="done-button"
          accessibilityLabel="done-button"
        >
          <Text style={[styles.doneBtnText, { color: sentCount > 0 ? "#000" : "#334155" }]}>
            {sentCount > 0 ? `Done  ·  ${sentCount} invited` : "Skip for now"}
          </Text>
          <ChevronRight size={17} color={sentCount > 0 ? "#000" : "#334155"} strokeWidth={3} />
        </TouchableOpacity>

        <Text style={styles.footerNote}>Invited people will receive a notification</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const RING_SIZE = RADIUS * 2 + BUBBLE_SIZE + 30;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080E1C" },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#F1F5F9", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: "#475569", fontWeight: "500", marginTop: 3 },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  catPillText: { fontSize: 11, fontWeight: "800" },

  eventStrip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, padding: 12,
    backgroundColor: "#141B2D", borderRadius: 14, borderWidth: 1, marginBottom: 4,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventStripTitle: { fontSize: 13, fontWeight: "800", color: "#CBD5E1", flex: 1 },
  eventSpotsPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventSpotsText: { fontSize: 11, color: "#475569", fontWeight: "600" },

  canvas: { flex: 1, position: "relative" },

  ringOuter: {
    position: "absolute",
    width: RING_SIZE + 60, height: RING_SIZE + 60,
    borderRadius: (RING_SIZE + 60) / 2, borderWidth: 1,
    left: CANVAS_CX - (RING_SIZE + 60) / 2,
    top: CANVAS_CY - (RING_SIZE + 60) / 2,
  },
  ringMid: {
    position: "absolute",
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2, borderWidth: 1,
    left: CANVAS_CX - RING_SIZE / 2,
    top: CANVAS_CY - RING_SIZE / 2,
  },

  centerBadge: {
    position: "absolute",
    left: CANVAS_CX - 40,
    top: CANVAS_CY - 40,
  },
  centerBadgeInner: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
  },
  centerNum: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  centerSub: { fontSize: 10, color: "#475569", fontWeight: "600", marginTop: 1 },

  bubbleOuter: {
    position: "absolute",
    alignItems: "center",
    width: BUBBLE_SIZE,
  },
  pulseRing: {
    position: "absolute",
    borderWidth: 2,
  },
  bubble: {
    width: BUBBLE_SIZE, height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "#141B2D",
  },
  bubbleImg: { width: "100%", height: "100%" },
  bubbleFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A" },
  bubbleFallbackLetter: { fontSize: 28, fontWeight: "900" },
  sentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
  },
  onlineDot: {
    position: "absolute", bottom: 3, right: 3,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#34D399", borderWidth: 2.5, borderColor: "#141B2D",
  },
  bubbleName: {
    fontSize: 10, fontWeight: "700", color: "#475569",
    marginTop: 6, textAlign: "center",
  },

  infoPanel: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 18, padding: 14,
    backgroundColor: "#141B2D", borderRadius: 18, borderWidth: 1.5,
    marginBottom: 10,
  },
  infoPanelAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5 },
  infoPanelAvatarFallback: { backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" },
  infoPanelAvatarLetter: { fontSize: 20, fontWeight: "900" },
  infoPanelInfo: { flex: 1 },
  infoPanelName: { fontSize: 15, fontWeight: "800", color: "#F1F5F9", marginBottom: 3 },
  infoPanelMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  infoPanelRating: { fontSize: 11, color: "#FBBF24", fontWeight: "700" },
  infoPanelSep: { fontSize: 11, color: "#334155" },
  infoPanelMetaText: { fontSize: 11, color: "#475569", fontWeight: "500" },
  matchReasonPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(129,140,248,0.1)", paddingHorizontal: 6,
    paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start", marginTop: 2
  },
  matchReasonText: { fontSize: 10, color: "#818CF8", fontWeight: "700", textTransform: "uppercase" },
  infoPanelInterests: { fontSize: 10, color: "#334155", fontWeight: "500" },
  infoPanelActions: { flexDirection: "column", gap: 6, alignItems: "center" },
  inviteBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
  },
  inviteBtnText: { fontSize: 13, fontWeight: "800", color: "#000" },
  dismissBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#1E2A40",
    alignItems: "center", justifyContent: "center",
  },

  footer: { paddingHorizontal: 18, paddingBottom: 28, gap: 6 },
  refreshRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 6,
  },
  refreshText: { fontSize: 13, color: "#334155", fontWeight: "600" },
  doneBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: 16, gap: 8, borderWidth: 1.5,
  },
  doneBtnText: { fontSize: 15, fontWeight: "800" },
  footerNote: { fontSize: 11, color: "#1E2A40", textAlign: "center", fontWeight: "500" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#475569", fontSize: 14, fontWeight: "600" },
});

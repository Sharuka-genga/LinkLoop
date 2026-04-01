import { useState, useEffect, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, StatusBar, Image, RefreshControl,
} from "react-native";
import { Search, SlidersHorizontal, Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import EventCard from "../components/EventCard";
import { getEvents } from "@/lib/events";

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "sports", label: "Sports" },
  { key: "study", label: "Study" },
  { key: "social", label: "Social" },
  { key: "food", label: "Food" },
  { key: "gaming", label: "Gaming" },
];

const TAB_ACCENT: Record<string, string> = {
  all: "#818CF8", sports: "#FF6B35", study: "#818CF8",
  social: "#F472B6", food: "#FBBF24", gaming: "#34D399",
};

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minStr} ${ampm}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function Page() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data || []);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);
  useFocusEffect(useCallback(() => { loadEvents(); }, []));
  const onRefresh = () => { setRefreshing(true); loadEvents(); };

  const filteredEvents = events.filter((e) => {
    const matchesCategory = activeFilter === "all" || e.category_id === activeFilter;
    const matchesSearch = e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080E1C" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818CF8" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>GOOD DAY</Text>
            <Text style={styles.greeting}>Hey, Dinuka </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn} onPress={() => router.push("/notifications")}>
              <Bell size={20} color="#CBD5E1" strokeWidth={2} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?img=12" }}
                style={styles.userAvatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stat strip */}
        <View style={styles.statStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{events.length}</Text>
            <Text style={styles.statLabel}>Active Events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>3</Text>
            <Text style={styles.statLabel}>You Joined</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#34D399" }]}>5</Text>
            <Text style={styles.statLabel}>Near You</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color="#475569" strokeWidth={2.5} />
            <TextInput
              placeholder="Search events, people..."
              placeholderTextColor="#334155"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <SlidersHorizontal size={18} color="#0F172A" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const accent = TAB_ACCENT[tab.key] ?? "#818CF8";
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Happening Near You</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {/* Events */}
        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Loading events...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{searchQuery ? "No results found" : "No events here yet"}</Text>
            <Text style={styles.emptySub}>{searchQuery ? "Try adjusting your search or filters" : "Be the first to create one!"}</Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              location={event.location}
              date={formatDate(event.event_date)}
              time={formatTime(event.event_time)}
              peopleNeeded={event.people_needed}
              category={event.category_id}
              creatorId={event.creator_id}
              creatorName={event.profiles?.name || "Unknown"}
              creatorAvatar={
                event.profiles?.avatar_url || "https://i.pravatar.cc/80?img=1"
              }
              joinMode={event.join_mode}
              spotsLeft={event.people_needed}
              totalSpots={event.people_needed}
              onDelete={loadEvents}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080E1C" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 100 },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  greetingSmall: {
    fontSize: 10, fontWeight: "800", color: "#475569",
    letterSpacing: 2, marginBottom: 3,
  },
  greeting: { fontSize: 26, fontWeight: "800", color: "#F1F5F9", letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  notifBtn: {
    position: "relative", width: 40, height: 40, backgroundColor: "#141B2D",
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1E2A40",
  },
  notifDot: {
    position: "absolute", top: 8, right: 8, width: 8, height: 8,
    borderRadius: 4, backgroundColor: "#F472B6",
    borderWidth: 1.5, borderColor: "#080E1C",
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: "#818CF8",
  },
  statStrip: {
    flexDirection: "row", backgroundColor: "#141B2D",
    borderRadius: 18, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: "#1E2A40",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: "#F1F5F9", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: "#475569", fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#1E2A40" },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#141B2D", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: "#1E2A40", gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#CBD5E1", fontWeight: "500" },
  filterBtn: {
    backgroundColor: "#818CF8", width: 48, height: 48,
    borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  tabsScroll: { marginBottom: 20 },
  tabs: { gap: 8, paddingRight: 8 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "#141B2D", borderWidth: 1.5, borderColor: "#1E2A40",
  },
  tabText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  tabTextActive: { color: "#0F172A" },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: "800", color: "#F1F5F9", letterSpacing: -0.3,
  },
  seeAll: { fontSize: 13, color: "#818CF8", fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#334155", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#1E2A40" },

});

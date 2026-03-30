import { useState, useEffect, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, StatusBar, Image, RefreshControl,
} from "react-native";
import { Search, SlidersHorizontal, Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import EventCard from "../components/EventCard";
import { CategoryScroll } from "../components/CategoryScroll";
import { getEvents } from "@/lib/events";

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "sports", label: "Sports" },
  { key: "study", label: "Study" },
  { key: "social", label: "Social" },
  { key: "food", label: "Food" },
  { key: "gaming", label: "Gaming" },
  { key: "fitness", label: "Fitness" },
  { key: "trips", label: "Trips" },
  { key: "campus", label: "Campus" },
];

const TAB_ACCENT: Record<string, string> = {
  all: "#818CF8", sports: "#FF6B35", study: "#818CF8",
  social: "#F472B6", food: "#FBBF24", gaming: "#34D399",
  fitness: "#F87171", trips: "#38BDF8", campus: "#A78BFA",
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
            <Text style={styles.greeting}>Hey, Kavindu </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
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


        {/* Search & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={14} color="#475569" strokeWidth={2.5} />
            <TextInput
              placeholder="Search events, people..."
              placeholderTextColor="#334155"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.filterWrapper}>
            <TouchableOpacity 
              style={styles.filterBtn}
              onPress={() => setIsFilterOpen(!isFilterOpen)}
              activeOpacity={0.8}
            >
              <SlidersHorizontal size={16} color="#0F172A" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Category Dropdown */}
            {isFilterOpen && (
              <>
                <TouchableOpacity 
                  style={styles.dropdownOverlay} 
                  onPress={() => setIsFilterOpen(false)} 
                  activeOpacity={1} 
                />
                <View style={styles.dropdown}>
                  <Text style={styles.dropdownTitle}>FILTER BY CATEGORY</Text>
                  <View style={styles.dropdownDivider} />
                  <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                    {FILTER_TABS.map((tab) => {
                      const isActive = activeFilter === tab.key;
                      const accent = TAB_ACCENT[tab.key];
                      return (
                        <TouchableOpacity
                          key={tab.key}
                          style={[styles.dropdownItem, isActive && { backgroundColor: "rgba(129,140,248,0.1)" }]}
                          onPress={() => {
                            setActiveFilter(tab.key);
                            setIsFilterOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isActive && { color: "#F1F5F9", fontWeight: "800" }]}>
                            {tab.label}
                          </Text>
                          {isActive && <View style={[styles.activeIndicator, { backgroundColor: "#818CF8" }]} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        </View>

        <CategoryScroll />

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
              creatorName={event.creatorName || "Unknown"}
              creatorAvatar={
                event.creatorAvatar || (event.creator_id === "8d30902c-c3ca-470a-8f4b-b1b545e8f452" ? "https://i.pravatar.cc/150?img=12" : "https://i.pravatar.cc/150?u=diverse")
              }
              joinMode={event.join_mode}
              spotsLeft={event.people_needed}
              totalSpots={event.people_needed}
              subcategoryLabel={event.subcategory_label}
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
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 18, zIndex: 1000 },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#141B2D", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#1E2A40", gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#CBD5E1", fontWeight: "500" },
  filterWrapper: { position: "relative" },
  filterBtn: {
    backgroundColor: "#818CF8", width: 42, height: 42,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  dropdownOverlay: {
    position: "absolute", top: -500, left: -500, right: -500, bottom: -500,
    zIndex: 998,
  },
  dropdown: {
    position: "absolute", top: 50, right: 0,
    backgroundColor: "#141B2D", borderRadius: 16,
    borderWidth: 1, borderColor: "#1E2A40",
    width: 200, zIndex: 999, paddingVertical: 10,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
  },
  dropdownTitle: { fontSize: 9, fontWeight: "800", color: "#475569", letterSpacing: 1.5, marginLeft: 16, marginBottom: 8 },
  dropdownDivider: { height: 1, backgroundColor: "#1E2A40", marginBottom: 4 },
  dropdownScroll: { maxHeight: 300 },
  dropdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  dropdownItemText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  activeIndicator: { width: 4, height: 4, borderRadius: 2, marginLeft: "auto" },
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

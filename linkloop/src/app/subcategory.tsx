import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Image, Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronRight, Check } from "lucide-react-native";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 18 * 2 - 12) / 2;

type SubItem = { id: string; label: string; desc: string };

const SUBCATEGORIES: Record<string, SubItem[]> = {
  sports: [
    { id: "badminton", label: "Badminton", desc: "Singles or doubles" },
    { id: "cricket", label: "Cricket", desc: "Casual or serious" },
    { id: "football", label: "Football", desc: "5-a-side or full" },
    { id: "basketball", label: "Basketball", desc: "Half or full court" },
    { id: "rugby", label: "Rugby", desc: "Casual or serious" },
    { id: "swimming", label: "Swimming", desc: "Laps or leisure" },
    { id: "tabletennis", label: "Table Tennis", desc: "Quick rally games" },
    { id: "volleyball", label: "Volleyball", desc: "Beach or indoor" },
    { id: "netball", label: "Netball", desc: "Casual or serious" },
    { id: "carrom", label: "Carrom", desc: "1v1 or 2v2" },
    { id: "chess", label: "Chess", desc: "1v1" },
  ],
  study: [
    { id: "groupstudy", label: "Group Study", desc: "Study together" },
    { id: "assignment", label: "Assignment Help", desc: "Work it out" },
    { id: "examprep", label: "Exam Prep", desc: "Revision session" },
    { id: "coding", label: "Coding Session", desc: "Build something" },
    { id: "librarystudy", label: "Library Study", desc: "Quiet focus" },
    { id: "projectwork", label: "Project Work", desc: "Work on projects" },
    { id: "research", label: "Research", desc: "Research together" },
    { id: "presentation", label: "Presentation", desc: "Presentation prep" },
  ],
  food: [
    { id: "breakfast", label: "Breakfast", desc: "Morning meal" },
    { id: "lunch", label: "Lunch", desc: "Midday meal" },
    { id: "brunch", label: "Brunch", desc: "Late morning meal" },
    { id: "dinner", label: "Dinner", desc: "Evening eat" },
    { id: "coffee", label: "Coffee", desc: "Cafe meetup" },
    { id: "tea", label: "Tea", desc: "Tea time" },
    { id: "juice", label: "Juice", desc: "Juice bar" },
    { id: "short-eats", label: "Short Eats", desc: "Quick bites" },
    { id: "bubbletea", label: "Bubble Tea", desc: "Boba run" },
    { id: "dessert", label: "Dessert Run", desc: "Sweet treats" },
  ],
  fitness: [
    { id: "gymsession", label: "Gym Session", desc: "Lift together" },
    { id: "morningrun", label: "Morning Run", desc: "Early miles" },
    { id: "cycling", label: "Cycling", desc: "Ride together" },
    { id: "yoga", label: "Yoga", desc: "Flow session" },
    { id: "workout", label: "Workout Partner", desc: "Push each other" },
    { id: "running", label: "Running", desc: "Run together" },
  ],
  gaming: [
    { id: "fifa", label: "FIFA", desc: "Console match" },
    { id: "pubg", label: "PUBG", desc: "Battle Royale" },
    { id: "uno", label: "UNO", desc: "Card game" },
    { id: "poker", label: "Poker", desc: "Card game" },
    { id: "cod", label: "Call of Duty", desc: "FPS session" },
    { id: "boardgames", label: "Board Games", desc: "Classic fun" },
    { id: "cs2", label: "CS2", desc: "FPS session" },
    { id: "dota", label: "DOTA", desc: "MOBA session" },
    { id: "lan", label: "LAN Gaming", desc: "PC multiplayer" },
    { id: "snooker", label: "Pool / Snooker", desc: "Cue sports" },
  ],
  trips: [
    { id: "camping", label: "Camping", desc: "Overnight trip" },
    { id: "hiking", label: "Hiking", desc: "Trail walk" },
    { id: "mountains", label: "Mountains", desc: "Mountain trip" },
    { id: "waterfalls", label: "Waterfalls", desc: "Waterfall trip" },
    { id: "beach", label: "Beach Trip", desc: "Sun and sea" },
    { id: "roadtrip", label: "Road Trip", desc: "Hit the road" },
    { id: "citywalk", label: "City Walk", desc: "City walk" },
    { id: "photowalk", label: "Photography Walk", desc: "Shoot together" },
  ],
  campus: [
    { id: "festivals", label: "Festivals", desc: "Cultural events" },
    { id: "musical", label: "Musical Shows", desc: "Live music" },
    { id: "clubevents", label: "Club Events", desc: "Society meets" },
    { id: "workshops", label: "Workshops", desc: "Learn something" },
    { id: "competitions", label: "Competitions", desc: "Win together" },
    { id: "techtalks", label: "Tech Talks", desc: "Speaker events" },
    { id: "drama", label: "Drama / Stage", desc: "Performing arts" },
    { id: "concerts", label: "Concerts", desc: "Live music" },
    { id: "exhibitions", label: "Exhibitions", desc: "Exhibitions" },
    { id: "seminars", label: "Seminars", desc: "Seminars" },
    { id: "conferences", label: "Conferences", desc: "Conferences" },
    { id: "hackathons", label: "Hackathons", desc: "Hackathons" },
    { id: "workshops", label: "Workshops", desc: "Workshops" },
    { id: "talentshow", label: "Talent Show", desc: "Show your talent" },
    { id: "cultural", label: "Cultural Events", desc: "Cultural events" },
  ],
  social: [
    { id: "campuswalk", label: "Campus Walk", desc: "Stroll around" },
    { id: "movienight", label: "Movie Night", desc: "Watch together" },
    { id: "karaoke", label: "Karaoke", desc: "Sing together" },
    { id: "photography", label: "Photography", desc: "Shoot content" },
    { id: "justchill", label: "Just Hangout", desc: "No plans needed" },
  ],
};

const CAT_IMAGES: Record<string, string> = {
  sports: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80",
  study: "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  gaming: "https://images.unsplash.com/photo-1605902711622-cfb43c4437b5?w=800&q=80",
  trips: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
  campus: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  social: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
};

export default function SubcategorySelect() {
  const router = useRouter();
  const { categoryId, categoryLabel, categoryColor } = useLocalSearchParams<{
    categoryId: string; categoryLabel: string; categoryColor: string;
  }>();
  const [selected, setSelected] = useState("");
  const color = categoryColor || "#818CF8";
  const subs = SUBCATEGORIES[categoryId] ?? [];
  const selectedSub = subs.find((s) => s.id === selected);

  const handleContinue = () => {
    if (!selected) return;
    router.push({
      pathname: "/event-form",
      params: {
        categoryId, categoryLabel, categoryColor,
        subcategoryId: selected,
        subcategoryLabel: selectedSub?.label ?? "",
      },
    });
  };

  const rows: SubItem[][] = [];
  for (let i = 0; i < subs.length; i += 2) {
    rows.push(subs.slice(i, i + 2));
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header photo */}
      <View style={styles.header}>
        <Image
          source={{ uri: CAT_IMAGES[categoryId] }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <View style={styles.headerOverlay} />
        <View style={styles.headerFade} />

        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.navCenter}>
            <Text style={styles.navStep}>STEP 2 OF 3</Text>
            <Text style={styles.navTitle}>Choose Activity</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Header text */}
        <View style={styles.headerContent}>
          <View style={[styles.catPill, { backgroundColor: color }]}>
            <Text style={styles.catPillText}>{categoryLabel.toUpperCase()}</Text>
          </View>
          <Text style={styles.headerTitle}>What kind of activity?</Text>
          <Text style={styles.headerSub}>{subs.length} options available</Text>
        </View>
      </View>

      {/* Grid */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((sub) => {
              const isActive = selected === sub.id;
              return (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.card,
                    { width: CARD_W },
                    isActive && styles.cardActive,
                  ]}
                  onPress={() => setSelected(sub.id)}
                  activeOpacity={0.75}
                >
                  {/* Check badge */}
                  {isActive && (
                    <View style={styles.checkBadge}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </View>
                  )}

                  {/* Number */}
                  <Text style={[styles.cardNum, isActive && styles.cardNumActive]}>
                    {String(subs.indexOf(sub) + 1).padStart(2, "0")}
                  </Text>

                  {/* Label */}
                  <Text style={[styles.cardLabel, isActive && styles.cardLabelActive]}>
                    {sub.label}
                  </Text>

                  {/* Description */}
                  <Text style={styles.cardDesc}>{sub.desc}</Text>
                </TouchableOpacity>
              );
            })}
            {row.length === 1 && <View style={{ width: CARD_W }} />}
          </View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {selected && (
          <Text style={styles.selectedHint}>
            Selected: <Text style={styles.selectedName}>{selectedSub?.label}</Text>
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            { backgroundColor: selected ? "#818CF8" : "#1E2A40" },
          ]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueBtnText, { color: selected ? "#0F172A" : "#475569" }]}>
            {selected ? "Continue" : "Select an activity"}
          </Text>
          {selected && <ChevronRight size={18} color="#0F172A" strokeWidth={3} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const RING_SIZE = 120 * 2 + 80 + 30;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080E1C" },

  header: { height: 280, position: "relative" },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  headerFade: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
    backgroundColor: "#080E1C", opacity: 0.95,
  },
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingTop: 60,
  },
  navBtn: {
    width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  navCenter: { alignItems: "center" },
  navStep: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: 2 },
  navTitle: { fontSize: 15, fontWeight: "800", color: "#fff", marginTop: 2 },

  headerContent: { paddingHorizontal: 20, paddingTop: 16 },
  catPill: {
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 10,
  },
  catPillText: { fontSize: 10, fontWeight: "900", color: "#000", letterSpacing: 1.5 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5, marginBottom: 4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: "600" },

  scroll: { flex: 1 },
  grid: { paddingHorizontal: 18, paddingTop: 20 },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },

  card: {
    backgroundColor: "#141B2D",
    borderRadius: 20, borderWidth: 1.5, borderColor: "#1E2A40",
    padding: 18, position: "relative", overflow: "hidden",
    minHeight: 110, justifyContent: "flex-end",
  },
  cardActive: {
    borderColor: "#818CF8",
    backgroundColor: "#1E2A40",
  },
  checkBadge: {
    position: "absolute", top: 12, right: 12,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#818CF8",
    alignItems: "center", justifyContent: "center",
  },
  cardNum: {
    fontSize: 11, fontWeight: "800", color: "#2D3E55",
    letterSpacing: 1, marginBottom: 8,
  },
  cardNumActive: { color: "#818CF8" },
  cardLabel: {
    fontSize: 16, fontWeight: "800", color: "#F1F5F9",
    letterSpacing: -0.3, marginBottom: 4,
  },
  cardLabelActive: { color: "#F1F5F9" },
  cardDesc: { fontSize: 11, color: "#475569", fontWeight: "500" },

  footer: {
    paddingHorizontal: 18, paddingBottom: 36, paddingTop: 12,
    backgroundColor: "#080E1C",
    borderTopWidth: 1, borderTopColor: "#141B2D",
  },
  selectedHint: {
    fontSize: 12, color: "#475569", fontWeight: "600",
    textAlign: "center", marginBottom: 10,
  },
  selectedName: { color: "#818CF8", fontWeight: "800" },
  continueBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: 16, gap: 8,
  },
  continueBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
});
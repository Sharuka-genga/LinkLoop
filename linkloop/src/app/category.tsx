import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Dimensions, FlatList, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, ChevronLeft, Plus } from "lucide-react-native";

const W = Dimensions.get("window").width;
const H = Dimensions.get("window").height;

const CATEGORIES = [
  { id: "sports", label: "Sports", color: "#FF6B35", tagline: "Cricket, badminton, football\nand more — find your team", image: require("../../assets/categories/sports.jpeg") },
  { id: "study", label: "Study", color: "#818CF8", tagline: "Group sessions, exam prep\nand coding together", image: require("../../assets/categories/study.jpeg") },
  { id: "food", label: "Food & Hangouts", color: "#FBBF24", tagline: "Lunch, coffee, dinner\nand bubble tea runs", image: require("../../assets/categories/food.jpeg") },
  { id: "fitness", label: "Fitness", color: "#F87171", tagline: "Gym partners, morning runs\nyoga and cycling crew", image: require("../../assets/categories/fitness.jpeg") },
  { id: "gaming", label: "Gaming", color: "#34D399", tagline: "FIFA, board games\nLAN parties and more", image: require("../../assets/categories/gaming.jpeg") },
  { id: "trips", label: "Trips & Outdoors", color: "#38BDF8", tagline: "Camping, hiking, beach trips\nand photography walks", image: require("../../assets/categories/trips.jpeg") },
  { id: "campus", label: "Campus Events", color: "#A78BFA", tagline: "Festivals, musical shows\nworkshops and club events", image: require("../../assets/categories/campus.jpeg") },
  { id: "social", label: "Social / Chill", color: "#F472B6", tagline: "Movie nights, campus walks\nand just hanging out", image: require("../../assets/categories/social.jpeg") },
];

const CUSTOM_CARD = {
  id: "custom", label: "Something Else", color: "#94A3B8",
  tagline: "Avurudu party, debate practice,\nphotography meetup — anything",
};

const ALL_ITEMS = [...CATEGORIES, CUSTOM_CARD as any];

export default function CategorySelect() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const isCustom = activeIndex === ALL_ITEMS.length - 1;
  const cat = ALL_ITEMS[activeIndex];

  const goTo = (idx: number) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setActiveIndex(idx);
  };

  const handleSelect = (item: any, isLast: boolean) => {
    if (isLast) {
      router.push({
        pathname: "/event-form",
        params: {
          categoryId: "custom", categoryLabel: "Custom",
          categoryColor: "#94A3B8", subcategoryId: "custom",
          subcategoryLabel: "", isCustom: "true",
        },
      });
    } else {
      router.push({
        pathname: "/subcategory",
        params: { categoryId: item.id, categoryLabel: item.label, categoryColor: item.color },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Nav overlay */}
      <View style={styles.navOverlay}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navStep}>STEP 1 OF 3</Text>
          <Text style={styles.navTitle}>Choose Category</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatRef}
        data={ALL_ITEMS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          setActiveIndex(idx);
        }}
        style={StyleSheet.absoluteFill}
        renderItem={({ item, index }) => {
          const isLast = index === ALL_ITEMS.length - 1;

          if (isLast) {
            return (
              <TouchableOpacity
                style={[styles.customCard, { width: W, height: H }]}
                onPress={() => handleSelect(item, true)}
                activeOpacity={0.95}
              >
                <View style={styles.customIconWrap}>
                  <View style={styles.customIconRing}>
                    <Plus size={40} color="#94A3B8" strokeWidth={1.5} />
                  </View>
                </View>

                <Text style={styles.cardCounter}>
                  {String(index + 1).padStart(2, "0")} / {String(ALL_ITEMS.length).padStart(2, "0")}
                </Text>
                <View style={[styles.accentLine, { backgroundColor: "#818CF8" }]} />
                <Text style={[styles.cardLabel, { color: "#F1F5F9" }]}>Something{"\n"}Else?</Text>
                <Text style={styles.cardTagline}>
                  Avurudu party, debate practice,{"\n"}photography meetup — anything goes
                </Text>
                <View style={styles.customHint}>
                  <Text style={styles.customHintText}>
                    Tap anywhere to create a custom event
                  </Text>
                </View>

                <View style={styles.controlsRow}>
                  <View style={styles.dotsRow}>
                    {ALL_ITEMS.map((_, i) => (
                      <TouchableOpacity key={i} onPress={() => goTo(i)}>
                        <View style={[styles.dot, i === activeIndex && { backgroundColor: "#818CF8", width: 20 }]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.arrowsRow}>
                    <TouchableOpacity style={styles.arrowBtn} onPress={() => goTo(activeIndex - 1)}>
                      <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={[styles.arrowBtn, { opacity: 0.3 }]}>
                      <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
                    </View>
                  </View>
                </View>

                {/* Tap hint */}
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>TAP CARD TO SELECT</Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              style={{ width: W, height: H }}
              onPress={() => handleSelect(item, false)}
              activeOpacity={0.95}
            >
              <Image
                source={typeof item.image === "string" ? { uri: item.image } : item.image}
                style={[StyleSheet.absoluteFill, { top: -200 }]}
                resizeMode="cover"
              />
              <View style={styles.topFade} />
              <View style={styles.cardContent}>
                <Text style={styles.cardCounter}>
                  {String(index + 1).padStart(2, "0")} / {String(ALL_ITEMS.length).padStart(2, "0")}
                </Text>
                <View style={[styles.accentLine, { backgroundColor: "#818CF8" }]} />
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardTagline}>{item.tagline}</Text>

                <View style={styles.controlsRow}>
                  <View style={styles.dotsRow}>
                    {ALL_ITEMS.map((_, i) => (
                      <TouchableOpacity key={i} onPress={() => goTo(i)}>
                        <View style={[styles.dot, i === activeIndex && { backgroundColor: "#818CF8", width: 20 }]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.arrowsRow}>
                    <TouchableOpacity
                      style={[styles.arrowBtn, { opacity: activeIndex === 0 ? 0.3 : 1 }]}
                      onPress={() => goTo(activeIndex - 1)}
                      disabled={activeIndex === 0}
                    >
                      <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.arrowBtn, { opacity: activeIndex === ALL_ITEMS.length - 1 ? 0.3 : 1 }]}
                      onPress={() => goTo(activeIndex + 1)}
                      disabled={activeIndex === ALL_ITEMS.length - 1}
                    >
                      <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Tap hint */}
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>TAP CARD TO SELECT</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },

  navOverlay: {
    position: "absolute", top: 50, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  navBtn: {
    width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  navCenter: { alignItems: "center" },
  navStep: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: 2 },
  navTitle: { fontSize: 15, fontWeight: "800", color: "#fff", marginTop: 2 },

  topFade: {
    position: "absolute", top: 0, left: 0, right: 0, height: 120,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  cardContent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 28, paddingBottom: 48,
    backgroundColor: "rgba(0,0,0,0.55)", paddingTop: 40,
  },
  cardCounter: {
    fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.4)",
    letterSpacing: 2, marginBottom: 14,
  },
  accentLine: { width: 40, height: 3, borderRadius: 2, marginBottom: 16 },
  cardLabel: {
    fontSize: 44, fontWeight: "900", color: "#fff",
    letterSpacing: -1.5, lineHeight: 48, marginBottom: 12,
  },
  cardTagline: {
    fontSize: 16, color: "rgba(255,255,255,0.65)",
    lineHeight: 24, fontWeight: "500", marginBottom: 28,
  },
  controlsRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  arrowsRow: { flexDirection: "row", gap: 10 },
  arrowBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  tapHint: {
    alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tapHintText: {
    fontSize: 10, fontWeight: "800",
    color: "rgba(255,255,255,0.5)", letterSpacing: 1.5,
  },

  // Custom card
  customCard: {
    backgroundColor: "#080E1C", justifyContent: "flex-end",
    paddingHorizontal: 28, paddingBottom: 48,
  },
  customIconWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 320,
    alignItems: "center", justifyContent: "center",
  },
  customIconRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5, borderColor: "#1E2A40",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#141B2D",
  },
  customHint: {
    backgroundColor: "#141B2D", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#1E2A40", marginBottom: 24,
  },
  customHintText: {
    fontSize: 13, color: "#475569", fontWeight: "500",
    lineHeight: 20, textAlign: "center",
  },
});
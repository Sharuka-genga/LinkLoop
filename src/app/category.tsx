import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Dimensions, FlatList, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";

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

const CUSTOM_ITEM = {
  id: "custom", label: "Something Else?", color: "#94A3B8",
  tagline: "Avurudu party, debate practice,\nphotography meetup — anything goes",
};

const ALL_ITEMS = [...CATEGORIES, CUSTOM_ITEM as any];

export default function CategorySelect() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const goTo = (idx: number) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setActiveIndex(idx);
  };

  const handleSelect = (item: any, isLast: boolean) => {
    if (isLast) {
      router.push({
        pathname: "/event-form" as any,
        params: {
          categoryId: "custom", categoryLabel: "Custom",
          categoryColor: "#94A3B8", subcategoryId: "custom",
          subcategoryLabel: "", isCustom: "true",
        },
      });
    } else {
      router.push({
        pathname: "/subcategory" as any,
        params: { categoryId: item.id, categoryLabel: item.label, categoryColor: item.color },
      });
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isCustom = index === ALL_ITEMS.length - 1;

    return (
      <TouchableOpacity
        style={[styles.cardContainer, { width: W }]}
        onPress={() => handleSelect(item, isCustom)}
        activeOpacity={0.9}
        testID={`category-card-${item.id}`}
        accessibilityLabel={`category-card-${item.id}`}
      >
        <View style={isCustom ? [styles.imageWrap, { backgroundColor: "#141B2D", justifyContent: "center", alignItems: "center" }] : styles.imageWrap}>
          {isCustom ? (
            <View style={styles.customIconRing}>
              <Plus size={48} color="#818CF8" strokeWidth={2} />
            </View>
          ) : (
            <>
              <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.imageDivider} />
            </>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardCounter}>
            {String(index + 1).padStart(2, "0")} / {String(ALL_ITEMS.length).padStart(2, "0")}
          </Text>
          <Text style={styles.cardLabel}>{item.label}</Text>
          <Text style={styles.cardTagline}>{item.tagline}</Text>

          <View style={styles.controlsRow}>
            <View style={styles.dotsRow}>
              {ALL_ITEMS.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goTo(i)}>
                  <View style={[styles.dot, i === activeIndex && { backgroundColor: "#818CF8", width: 22, height: 6 }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
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
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080E1C" },
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
  navTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginTop: 2 },

  cardContainer: { flex: 1 },
  imageWrap: {
    width: "100%", height: H * 0.7,
    position: "relative", backgroundColor: "#000",
  },
  cardImage: { width: "100%", height: "100%" },
  imageDivider: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  cardInfo: { flex: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40 },
  cardCounter: {
    fontSize: 10, fontWeight: "800", color: "#475569",
    letterSpacing: 2, marginBottom: 10,
  },
  cardLabel: {
    fontSize: 34, fontWeight: "900", color: "#fff",
    letterSpacing: -1, lineHeight: 40, marginBottom: 8,
  },
  cardTagline: {
    fontSize: 14, color: "#94A3B8",
    lineHeight: 20, fontWeight: "500", marginBottom: "auto",
  },
  controlsRow: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", paddingTop: 20,
  },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  
  customIconRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: "#1E2A40",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  customHint: {
    backgroundColor: "#141B2D", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#1E2A40", marginTop: 16,
  },
  customHintText: {
    fontSize: 13, color: "#475569", fontWeight: "500",
    lineHeight: 18, textAlign: "center",
  },
});

import { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Dimensions, Animated, Easing
} from "react-native";
import { useRouter } from "expo-router";

const { width: W } = Dimensions.get("window");

const CATEGORIES = [
  { id: "sports",  label: "Sports",  image: require("../../assets/categories/sports.jpeg"), color: "#FF6B35" },
  { id: "study",   label: "Study",   image: require("../../assets/categories/study.jpeg"),  color: "#818CF8" },
  { id: "food",    label: "Food",    image: require("../../assets/categories/food.jpeg"),   color: "#FBBF24" },
  { id: "fitness", label: "Fitness", image: require("../../assets/categories/fitness.jpeg"),color: "#F87171" },
  { id: "gaming",  label: "Gaming",  image: require("../../assets/categories/gaming.jpeg"), color: "#34D399" },
  { id: "trips",   label: "Trips",   image: require("../../assets/categories/trips.jpeg"),  color: "#38BDF8" },
  { id: "campus",  label: "Campus",  image: require("../../assets/categories/campus.jpeg"), color: "#A78BFA" },
  { id: "social",  label: "Social",  image: require("../../assets/categories/social.jpeg"), color: "#F472B6" },
];

const TILE_SIZE = 90;
const TILE_GAP = 12;
const TILE_STEP = TILE_SIZE + TILE_GAP;
const TOTAL_WIDTH = CATEGORIES.length * TILE_STEP;
const TILES = [...CATEGORIES, ...CATEGORIES];

export function CategoryScroll({ onSelectCategory }: { onSelectCategory?: (id: string) => void }) {
  const router = useRouter();
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run1 = () => {
      anim1.setValue(0);
      Animated.timing(anim1, {
        toValue: -TOTAL_WIDTH,
        duration: 35000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => run1());
    };
    const run2 = () => {
      anim2.setValue(-TOTAL_WIDTH);
      Animated.timing(anim2, {
        toValue: 0,
        duration: 40000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => run2());
    };
    run1();
    run2();
  }, []);

  const handleTap = (id: string, label: string, color: string) => {
    if (onSelectCategory) {
      onSelectCategory(id);
    } else {
      router.push({
        pathname: "/subcategory" as any,
        params: { categoryId: id, categoryLabel: label, categoryColor: color },
      });
    }
  };

  const renderTile = (item: typeof CATEGORIES[0], i: number) => (
    <TouchableOpacity
      key={`${item.id}-${i}`}
      style={styles.tile}
      onPress={() => handleTap(item.id, item.label, item.color)}
      activeOpacity={0.8}
    >
      <Image source={item.image} style={styles.tileImage} resizeMode="cover" />
      <View style={styles.tileOverlay} />
      <Text style={styles.tileLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Activities</Text>
        <Text style={styles.headerSub}>Tap to find events</Text>
      </View>

      <View style={styles.marqueeRow} pointerEvents="box-none">
        <Animated.View style={[styles.rowContent, { transform: [{ translateX: anim1 }] }]} pointerEvents="box-none">
          {TILES.map((item, i) => renderTile(item, i))}
        </Animated.View>
      </View>

      <View style={styles.marqueeRow} pointerEvents="box-none">
        <Animated.View style={[styles.rowContent, { transform: [{ translateX: anim2 }] }]} pointerEvents="box-none">
          {TILES.map((item, i) => renderTile(item, i + 100))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 28, overflow: "hidden" },
  header: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    marginBottom: 16, paddingHorizontal: 18,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#F1F5F9", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "#475569", fontWeight: "500" },
  marqueeRow: { marginBottom: 12, flexDirection: "row" },
  rowContent: { flexDirection: "row", gap: TILE_GAP },
  tile: { width: TILE_SIZE, height: TILE_SIZE, borderRadius: 16, overflow: "hidden", position: "relative" },
  tileImage: { width: "100%", height: "100%" },
  tileOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  tileLabel: { position: "absolute", bottom: 10, left: 10, fontSize: 11, fontWeight: "900", color: "#fff" },
});
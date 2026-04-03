import { BG, BR, FW, TX } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";

const { width, height } = Dimensions.get("window");

// ── Onboarding Data ──────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "1",
    image: require("@/assets/images/onboarding1.png"),
    title: "Find Your\nPerfect Companion",
    description:
      "Connect with fellow students who share your passion for sports and academic goals.",
    accent: "#818CF8", // indigo / purple
  },
  {
    id: "2",
    image: require("@/assets/images/onboarding2.png"),
    title: "Create events & Join\nEffortlessly",
    description: "Organise events, and grow your circle — all in one place.",
    accent: "#38BDF8", // sky blue
  },
  {
    id: "3",
    image: require("@/assets/images/onboarding3.png"),
    title: "Smart Picks &\nEpic Rewards",
    description:
      "Get AI-powered recommendations, timely reminders, and earn badges as you level up.",
    accent: "#FBBF24", // gold
  },
] as const;

type Slide = (typeof SLIDES)[number];

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Track visible slide
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  // Navigate to next slide
  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }

  // Mark onboarding as seen and navigate to login
  async function handleGetStarted() {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
    } catch (_) {
      // silently ignore storage errors
    }
    router.replace("/(auth)/login" as any);
  }

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const currentAccent = SLIDES[currentIndex].accent;

  // ── Render each slide ──
  function renderSlide({ item }: { item: Slide }) {
    return (
      <View style={styles.slide}>
        {/* Illustration */}
        <View style={styles.imageContainer}>
          <Image
            source={item.image}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Skip button (top-right) */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleGetStarted}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slide illustrations */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
      />

      {/* Bottom card */}
      <View style={styles.bottomCard}>
        {/* Title */}
        <Text style={styles.title}>{SLIDES[currentIndex].title}</Text>

        {/* Description */}
        <Text style={styles.description}>
          {SLIDES[currentIndex].description}
        </Text>

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: "clamp",
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: currentAccent,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentAccent }]}
          onPress={isLastSlide ? handleGetStarted : handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG.main,
  },

  // Skip button
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BR.pill,
    backgroundColor: BG.card,
    borderWidth: 1,
    borderColor: BG.border,
  },
  skipText: {
    color: TX.secondary,
    fontSize: 13,
    fontWeight: FW.body,
  },

  // FlatList fills top ~55% of screen
  flatList: {
    flex: 1,
  },

  slide: {
    width,
    alignItems: "center",
    justifyContent: "center",
  },

  imageContainer: {
    width: width * 0.85,
    height: height * 0.45,
    alignItems: "center",
    justifyContent: "center",
  },

  illustration: {
    width: "100%",
    height: "100%",
  },

  // ── Bottom card ──
  bottomCard: {
    backgroundColor: BG.card,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: BG.border,
    minHeight: height * 0.38,
  },

  title: {
    fontSize: 30,
    fontWeight: FW.hero,
    color: TX.primary,
    lineHeight: 38,
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  description: {
    fontSize: 15,
    fontWeight: FW.caption,
    color: TX.secondary,
    lineHeight: 23,
    marginBottom: 28,
  },

  // Dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 6,
  },

  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Button
  button: {
    paddingVertical: 17,
    borderRadius: BR.button,
    alignItems: "center",
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: FW.header,
    letterSpacing: 0.6,
  },
});

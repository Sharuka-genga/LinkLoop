import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken
} from "react-native";

const { width, height } = Dimensions.get("window");

// ── Onboarding Data ──────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "1",
    image: require("@/assets/images/onboarding1.png"),
    title: "Find Your\nPerfect Circle",
    highlight: "Circle",
    description: "Connect with students who share your passion for sports and academic goals.",
    color: "#818CF8",
  },
  {
    id: "2",
    image: require("@/assets/images/onboarding2.png"),
    title: "Events Made\nEffortless",
    highlight: "Effortless",
    description: "Organise games, study sessions, and social events — all in one place.",
    color: "#818CF8",
  },
  {
    id: "3",
    image: require("@/assets/images/onboarding3.png"),
    title: "Earn Rewards &\nLevel Up",
    highlight: "Rewards",
    description: "Get smart recommendations and earn badges as you grow your campus presence.",
    color: "#818CF8",
  },
] as const;

type Slide = (typeof SLIDES)[number];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

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

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[currentIndex] || SLIDES[0];

  function handleNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex < SLIDES.length) {
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      // Optionally update state immediately for better UI response
      setCurrentIndex(nextIndex);
    }
  }

  async function handleGetStarted() {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
    } catch (_) { }
    router.replace("/login" as any);
  }

  function renderSlide({ item, index }: { item: Slide; index: number }) {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [1.1, 1, 1.1],
      extrapolate: "clamp",
    });

    return (
      <View style={[styles.slide, { width, height }]}>
        <View style={styles.imageContainer}>
          <Animated.Image
            source={item.image}
            style={[styles.image, { transform: [{ scale }] }]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(8,14,28,0.4)", "#080E1C"]}
            style={styles.imageOverlay}
          />
        </View>

        <View style={styles.textSection}>
          <View style={styles.titleWrapper}>
            <Text style={styles.title}>
              {item.title.split(item.highlight)[0]}
              <Text style={{ color: item.color }}>{item.highlight}</Text>
              {item.title.split(item.highlight)[1]}
            </Text>
          </View>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Layer 1: Swipeable Content */}
      <View style={StyleSheet.absoluteFill}>
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
          scrollEventThrottle={16}
          bounces={false}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />
      </View>

      {/* Layer 2: Interactive UI */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleGetStarted}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Footer Controls */}
        <View style={styles.footer} pointerEvents="box-none">
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [6, 20, 6],
                extrapolate: "clamp",
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { width: dotWidth, opacity, backgroundColor: currentSlide.color }]}
                />
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: currentSlide.color }]}
            onPress={() => {
              if (isLastSlide) {
                handleGetStarted();
              } else {
                handleNext();
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.mainButtonText}>
              {isLastSlide ? "Get Started" : "Continue"}
            </Text>
            <ArrowRight size={20} color="#000" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080E1C",
  },
  slide: {
    width: width,
    height: height,
  },
  imageContainer: {
    width: width,
    height: height * 0.52,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  textSection: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
    alignItems: "center",
  },
  titleWrapper: {
    height: 100,
    justifyContent: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#F1F5F9",
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: -1,
  },
  description: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "600",
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 60,
    left: 40,
    right: 40,
    gap: 30,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  mainButton: {
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 0.5,
  },
  skipBtn: {
    position: "absolute",
    top: 60,
    right: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  skipText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },
});

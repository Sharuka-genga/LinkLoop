import { BG, BR, FW, TX } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
  useWindowDimensions,
} from "react-native";



// ── Onboarding Data ──────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "1",
    image: require("@/assets/images/onboarding1.png"),
    title: "Find Your\nPerfect Companion",
    description:
      "Connect with fellow students who share your passion for sports and academic goals.",
    accent: "#818CF8", // indigo
    gradient: ["rgba(8, 14, 28, 0)", "rgba(8, 14, 28, 0.8)", "#080E1C"],
  },
  {
    id: "2",
    image: require("@/assets/images/onboarding2.png"),
    title: "Create Events &\nJoin Effortlessly",
    description: "Organise events, and grow your circle — all in one place.",
    accent: "#38BDF8", // sky
    gradient: ["rgba(8, 14, 28, 0)", "rgba(8, 14, 28, 0.8)", "#080E1C"],
  },
  {
    id: "3",
    image: require("@/assets/images/onboarding3.png"),
    title: "Smart Picks &\nEpic Rewards",
    description:
      "Get AI-powered recommendations, timely reminders, and earn badges as you level up.",
    accent: "#FBBF24", // gold
    gradient: ["rgba(8, 14, 28, 0)", "rgba(8, 14, 28, 0.8)", "#080E1C"],
  },
] as const;

type Slide = (typeof SLIDES)[number];

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
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

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }

  async function handleGetStarted() {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
    } catch (_) {}
    router.replace("/(auth)/login" as any);
  }

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const currentAccent = SLIDES[currentIndex].accent;

  function renderSlide({ item, index }: { item: Slide; index: number }) {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [1.08, 1, 1.08],
      extrapolate: "clamp",
    });


    return (
      <View style={[styles.slide, { width }]}>
        <Animated.Image
          source={item.image}
          style={[
            styles.backgroundImage,
            { transform: [{ scale: imageScale }] }
          ]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={item.gradient as any}
          style={styles.gradientOverlay}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Skip Button */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleGetStarted}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Background Images */}
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
            { useNativeDriver: true },
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
        />
      </View>

      {/* Content Container */}
      <View style={styles.contentContainer} pointerEvents="box-none">
        <View style={styles.spacer} />
        
        <View style={styles.textSection}>
          {/* Animated Indicators */}
          <View style={styles.indicatorsContainer}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [1, 4, 1], // Scale factor
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
                  style={[
                    styles.indicator,
                    { 
                      transform: [{ scaleX: dotWidth }],
                      opacity,
                      backgroundColor: "#818CF8" // Use consistent theme color
                    },
                  ]}

                />
              );

            })}
          </View>

          {/* Title */}
          <Animated.Text style={styles.title}>
            {SLIDES[currentIndex].title}
          </Animated.Text>

          {/* Description */}
          <Text style={styles.description}>
            {SLIDES[currentIndex].description}
          </Text>

          {/* CTA Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: "#818CF8" }]}

              onPress={isLastSlide ? handleGetStarted : handleNext}
              activeOpacity={0.9}
            >
              <Text style={styles.mainButtonText}>
                {isLastSlide ? "Get Started" : "Next Step"}
              </Text>
              <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG.main,
  },
  slide: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },

  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    zIndex: 10,
  },
  spacer: {
    flex: 1,
  },
  textSection: {
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  indicatorsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  indicator: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },

  title: {
    fontSize: 40,
    fontWeight: FW.hero,
    color: TX.primary,
    lineHeight: 48,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17,
    color: TX.secondary,
    lineHeight: 26,
    fontWeight: FW.caption,
    marginBottom: 40,
    opacity: 0.9,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainButton: {
    flex: 1,
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: FW.header,
    letterSpacing: 0.5,
  },
  skipBtn: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  skipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: FW.body,
  },
});

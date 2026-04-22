import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Exit animation after delay
    const timeout = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: opacity,
            transform: [{ scale: scale }]
          }
        ]}
      >
        <View style={styles.logoColumn}>
          <View style={styles.row}>
            {/* Extremely Tall Geometric L */}
            <View style={styles.lContainer}>
              <View style={styles.lVertical} />
              <View style={styles.lHorizontal} />
            </View>

            {/* Stacked Text - Closer and less bold */}
            <View style={styles.textStack}>
              <Text style={styles.inkText}>INK</Text>
              <Text style={styles.oopText}>OOP</Text>
            </View>
          </View>

          {/* Tagline - Now below the big L */}
          <Text style={styles.tagline}>Make plans happen.</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#080E1C",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  logoWrapper: {
    padding: 20,
    marginTop: -60, // Centering adjustment for much taller design
  },
  logoColumn: {
    alignItems: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lContainer: {
    marginRight: -80, // Pull text very close to L stem
  },
  lVertical: {
    width: 6,
    height: 260,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
  },
  lHorizontal: {
    width: 100,
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    marginTop: -6,
  },
  textStack: {
    justifyContent: "center",
    paddingTop: 165, // Move text DOWN closer to the horizontal base
  },
  inkText: {
    fontSize: 36,
    fontWeight: "600",
    color: "#F1F5F9",
    lineHeight: 40,
    letterSpacing: -1.5,
  },
  oopText: {
    fontSize: 36,
    fontWeight: "600",
    color: "#818CF8",
    lineHeight: 40,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    marginTop: 20,
    marginLeft: 2,
    letterSpacing: 0.5,
  },
});

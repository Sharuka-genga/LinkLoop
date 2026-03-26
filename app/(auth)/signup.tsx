import { BG, BR, FW, TX } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

function showToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert("Select your Interests", message);
  }
}

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    const sub = Linking.addEventListener("url", (e) => handleDeepLink(e.url));
    return () => sub.remove();
  }, []);

  async function handleDeepLink(url: string) {
    if (!url) return;
    const fragment = url.split("#")[1];
    if (fragment) {
      const params = fragment.split("&").reduce(
        (acc, curr) => {
          const [key, value] = curr.split("=");
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );
      if (params["access_token"] && params["refresh_token"]) {
        showToast("Account verified! Please log in.");
        router.replace("./login" as any);
      }
    }
  }

  const isValidSliitEmail = (e: string) =>
    /^[iI][tT]\d+@my\.sliit\.lk$/.test(e.trim());

  async function handleSignup() {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name.");
      return;
    }
    if (!email) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    if (!isValidSliitEmail(email)) {
      Alert.alert(
        "Invalid Email",
        "Use a valid SLIIT student email.\nExample: IT23229952@my.sliit.lk",
      );
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    const deepLinkUrl = Linking.createURL("/");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: deepLinkUrl,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    } else {
      showToast("");
      router.push("./interests" as any);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>LinkLoop</Text>
          <Text style={styles.tagline}>Create your campus identity</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign Up</Text>
          <Text style={styles.cardSub}>Join your university community</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={TX.label}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>University Email</Text>
            <TextInput
              style={styles.input}
              placeholder="ITxxxxxx@my.sliit.lk"
              placeholderTextColor={TX.label}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              placeholderTextColor={TX.label}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={TX.label}
              secureTextEntry
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => router.push("./login" as any)}
          >
            <Text style={styles.toggleText}>
              Already have an account?{" "}
              <Text style={styles.toggleHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingVertical: 60,
  },
  hero: { alignItems: "center", marginBottom: 32 },
  logo: {
    fontSize: 42,
    fontWeight: FW.hero,
    color: "#818CF8",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    fontWeight: FW.caption,
    color: TX.secondary,
    marginTop: 6,
  },
  card: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 28,
    width: width * 0.9,
    maxWidth: 420,
    borderWidth: 1,
    borderColor: BG.border,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: FW.header,
    color: TX.primary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    fontWeight: FW.caption,
    color: TX.secondary,
    marginBottom: 24,
  },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: FW.body,
    color: TX.label,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: BG.input,
    borderRadius: BR.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: TX.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: BG.border,
  },
  button: {
    backgroundColor: "#818CF8",
    paddingVertical: 16,
    borderRadius: BR.button,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: FW.header,
    letterSpacing: 0.5,
  },
  toggleBtn: { marginTop: 20, alignItems: "center" },
  toggleText: {
    color: TX.secondary,
    fontSize: 14,
    fontWeight: FW.body,
  },
  toggleHighlight: { color: "#818CF8" },
});

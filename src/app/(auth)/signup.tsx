import { BG, BR, FW, TX } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Lock, Mail, User } from "lucide-react-native";
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

const { width, height } = Dimensions.get("window");

function showToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert("Registration", message);
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
        "Please use your university email (e.g., ITxxxxxx@my.sliit.lk)",
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
      showToast("Registration successful! Check your email to verify.");
      router.push("./interests" as any);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Decorative Background Elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logoText}>
              Link<Text style={{ color: '#818CF8' }}>Loop</Text>
            </Text>
            <Text style={styles.tagline}>Create your campus identity</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Join Community</Text>
            <Text style={styles.subText}>Connect with students like you</Text>

            {/* Name Input */}
            <View style={styles.inputWrapper}>
              <User size={20} color={TX.label} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={TX.label}
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Mail size={20} color={TX.label} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="University Email"
                placeholderTextColor={TX.label}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Lock size={20} color={TX.label} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password (Min 6 chars)"
                placeholderTextColor={TX.label}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputWrapper}>
              <Lock size={20} color={TX.label} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={TX.label}
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={handleSignup}
              activeOpacity={0.9}
              disabled={loading}
            >
              <LinearGradient
                colors={['#818CF8', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("./login" as any)}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG.main 
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(129, 140, 248, 0.07)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(129, 140, 248, 0.05)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 42,
    fontWeight: FW.hero,
    color: TX.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: TX.secondary,
    opacity: 0.6,
    marginTop: 8,
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: FW.header,
    color: TX.primary,
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: TX.secondary,
    marginBottom: 24,
    opacity: 0.7,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    color: TX.primary,
    fontSize: 16,
    fontWeight: FW.body,
  },
  signupButton: {
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: FW.header,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: TX.secondary,
    fontSize: 15,
    opacity: 0.7,
  },
  footerLink: {
    color: '#818CF8',
    fontSize: 15,
    fontWeight: FW.header,
  },
});


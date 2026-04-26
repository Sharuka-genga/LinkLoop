import { BG, BR, FW, TX } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
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
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidSliitEmail = (e: string) =>
    /^[iI][tT]\d+@my\.sliit\.lk$/.test(e.trim());

  async function handleLogin() {
    if (!email) {
      Alert.alert("Hold on!", "Please enter your email.");
      return;
    }
    if (!isValidSliitEmail(email)) {
      Alert.alert(
        "Invalid Email",
        "Please use your university email (e.g., ITxxxxxx@my.sliit.lk)",
      );
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Authentication Failed", error.message);
    } else {
      router.replace("/(tabs)" as any);
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
            <Text style={styles.tagline}>Connect. Engage. Thrive.</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subText}>Login to continue your journey</Text>

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
                placeholder="Password"
                placeholderTextColor={TX.label}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity style={styles.forgotPass}>
              <Text style={styles.forgotPassText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
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
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New here? </Text>
              <TouchableOpacity onPress={() => router.push("./signup" as any)}>
                <Text style={styles.footerLink}>Create Account</Text>
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
    paddingTop: height * 0.1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
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
    marginBottom: 32,
    opacity: 0.7,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 64,
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
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPassText: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: FW.body,
  },
  loginButton: {
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
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

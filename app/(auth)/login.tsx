import { BG, BR, FW, TX } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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
} from 'react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidSliitEmail = (e: string) =>
    /^[iI][tT]\d+@my\.sliit\.lk$/.test(e.trim());

  async function handleLogin() {
    if (!email) {
      Alert.alert('Hold on!', 'Please enter your email.');
      return;
    }
    if (!isValidSliitEmail(email)) {
      Alert.alert(
        'Invalid University Email',
        'You must use a valid SLIIT student email.\nExample: IT23229952@my.sliit.lk',
      );
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Authentication Failed', error.message);
    } else {
      // Navigate to tabs on success (fallback if auth listener doesn't redirect)
      router.replace('/(tabs)' as any);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.logo}>LinkLoop</Text>
          <Text style={styles.tagline}>Connect. Engage. Thrive.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSub}>Sign in to your university account</Text>

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
              placeholder="Enter your password"
              placeholderTextColor={TX.label}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => router.push('./signup' as any)}>
            <Text style={styles.toggleText}>
              Don't have an account?{' '}
              <Text style={styles.toggleHighlight}>Sign Up</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  hero: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontSize: 48,
    fontWeight: FW.hero,
    color: '#818CF8',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    fontWeight: FW.caption,
    color: TX.secondary,
    marginTop: 8,
    letterSpacing: 0.5,
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
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: FW.body,
    color: TX.label,
    marginBottom: 6,
    textTransform: 'uppercase',
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
    backgroundColor: '#818CF8',
    paddingVertical: 16,
    borderRadius: BR.button,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: FW.header,
    letterSpacing: 0.5,
  },
  toggleBtn: { marginTop: 20, alignItems: 'center' },
  toggleText: {
    color: TX.secondary,
    fontSize: 14,
    fontWeight: FW.body,
  },
  toggleHighlight: { color: '#818CF8' },
});

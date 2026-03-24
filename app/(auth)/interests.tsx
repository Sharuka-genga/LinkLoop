import { Accent, BG, BR, FW, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

type InterestCategory = {
  name: string;
  color: string;
  items: string[];
};

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    name: 'Sports',
    color: Accent.sports,
    items: ['Cricket', 'Football', 'Basketball', 'Volleyball', 'Tennis', 'Badminton', 'Swimming', 'Table Tennis', 'Athletics'],
  },
  {
    name: 'Study & Academics',
    color: Accent.study,
    items: ['AI / ML', 'Web Dev', 'Mobile Dev', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'UI/UX Design', 'Research'],
  },
  {
    name: 'Food & Hangouts',
    color: Accent.food,
    items: ['Cafe Hopping', 'Cooking', 'Food Reviews', 'Canteen Meetups', 'Baking'],
  },
  {
    name: 'Fitness',
    color: Accent.fitness,
    items: ['Gym', 'Yoga', 'Running', 'Cycling', 'Martial Arts', 'CrossFit', 'Home Workouts'],
  },
  {
    name: 'Gaming',
    color: Accent.gaming,
    items: ['Mobile Gaming', 'PC Gaming', 'Console Gaming', 'E-sports', 'Board Games', 'Chess'],
  },
  {
    name: 'Trips & Outdoors',
    color: Accent.trips,
    items: ['Hiking', 'Camping', 'Beach Trips', 'Road Trips', 'Photography Walks', 'Nature Exploring'],
  },
  {
    name: 'Campus Events',
    color: Accent.campus,
    items: ['Hackathons', 'Workshops', 'Guest Lectures', 'Cultural Events', 'Tech Fests', 'Competitions', 'Club Activities'],
  },
  {
    name: 'Social & Chill',
    color: Accent.social,
    items: ['Movie Nights', 'Music', 'Art & Drawing', 'Reading', 'Volunteering', 'Debating', 'Photography'],
  },
];

export default function InterestsScreen() {
  const { user, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(item: string) {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  }

  async function handleSave() {
    if (selected.length < 3) {
      Alert.alert('Select More', 'Please select at least 3 interests to personalize your experience.');
      return;
    }

    setSaving(true);

    if (user) {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          interests: selected,
        });
      await refreshProfile();
    }

    setSaving(false);
    router.replace('/(tabs)' as any);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>What are you into?</Text>
        <Text style={styles.subtitle}>
          Select your interests to find the best companions and events for you.
          Pick at least 3.
        </Text>

        <View style={styles.counter}>
          <Text style={styles.counterText}>{selected.length} selected</Text>
        </View>

        {INTEREST_CATEGORIES.map((cat) => (
          <View key={cat.name} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text style={styles.sectionTitle}>{cat.name}</Text>
            </View>
            <View style={styles.chipContainer}>
              {cat.items.map((item) => {
                const isSelected = selected.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.7}
                    onPress={() => toggle(item)}
                    style={[
                      styles.chip,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: '#fff' },
                      ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, selected.length < 3 && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving || selected.length < 3}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              Continue ({selected.length} selected)
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: FW.hero,
    color: TX.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: FW.caption,
    color: TX.secondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  counter: {
    backgroundColor: BG.card,
    borderRadius: BR.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BG.border,
  },
  counterText: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: FW.body,
  },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: FW.header,
    color: TX.primary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: BG.card,
    borderRadius: BR.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BG.border,
  },
  chipText: {
    color: TX.secondary,
    fontSize: 14,
    fontWeight: FW.body,
  },
  saveBtn: {
    backgroundColor: '#818CF8',
    paddingVertical: 16,
    borderRadius: BR.button,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: FW.header,
  },
  skipBtn: { marginTop: 16, alignItems: 'center' },
  skipText: {
    color: TX.label,
    fontSize: 14,
    fontWeight: FW.body,
  },
});

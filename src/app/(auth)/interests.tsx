import { Accent, BG, BR, FW, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Check, X } from 'lucide-react-native';
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
  const { user, signOut } = useAuth();
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
    }
    setSaving(false);
    await signOut();
    router.replace('/(auth)/login' as any);
  }

  async function handleSkip() {
    await signOut();
    router.replace('/(auth)/login' as any);
  }

  const progress = Math.min(selected.length / 3, 1);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={styles.title}>What are you{"\n"}into?</Text>
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtnSmall}>
            <Text style={styles.skipTextSmall}>Skip</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>
          Pick at least 3 to help us find your tribe.
        </Text>

        {/* Custom Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: selected.length >= 3 ? '#34D399' : '#818CF8' }]} />
          <View style={styles.progressLabelRow}>
             <Text style={styles.progressLabel}>
               {selected.length < 3 ? `${3 - selected.length} more to go` : 'You\'re all set!'}
             </Text>
             <Text style={styles.progressCount}>{selected.length} Selected</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {INTEREST_CATEGORIES.map((cat) => (
          <View key={cat.name} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat.name}</Text>
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
                      isSelected && { backgroundColor: `${cat.color}20`, borderColor: cat.color },
                    ]}>
                    {isSelected && <Check size={14} color={cat.color} style={{ marginRight: 6 }} />}
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: cat.color, fontWeight: '700' },
                      ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Action Button / Bottom Bar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton, 
            selected.length < 3 && styles.continueButtonDisabled,
            { backgroundColor: selected.length >= 3 ? '#818CF8' : BG.card }
          ]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving || selected.length < 3}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={[styles.continueButtonText, selected.length < 3 && { color: TX.label }]}>
                Continue to Login
              </Text>
              {selected.length >= 3 && <ArrowRight size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG.main 
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: BG.main,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: FW.hero,
    color: TX.primary,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  skipBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skipTextSmall: {
    color: TX.secondary,
    fontSize: 14,
    fontWeight: FW.body,
  },
  subtitle: {
    fontSize: 16,
    color: TX.secondary,
    opacity: 0.7,
    marginBottom: 24,
  },
  progressContainer: {
    height: 60,
    justifyContent: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: TX.secondary,
    fontWeight: FW.body,
  },
  progressCount: {
    fontSize: 14,
    color: '#818CF8',
    fontWeight: FW.header,
  },
  scroll: { 
    paddingHorizontal: 24, 
    paddingBottom: 120 
  },
  section: { 
    marginBottom: 32 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: FW.header,
    color: TX.primary,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    color: TX.secondary,
    fontSize: 14,
    fontWeight: FW.body,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: BG.main,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  continueButton: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  continueButtonDisabled: { 
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: FW.header,
  },
});


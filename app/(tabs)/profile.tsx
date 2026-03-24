import Sidebar from '@/components/sidebar';
import { Accent, BG, BR, FW, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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

const PROFILE_FIELDS = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'student_id', label: 'Student ID' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'bio', label: 'Bio' },
] as const;

const INTEREST_CATEGORIES = [
  { name: 'Sports',           color: Accent.sports,  items: ['Cricket','Football','Basketball','Volleyball','Tennis','Badminton','Swimming','Table Tennis','Athletics'] },
  { name: 'Study & Academics',color: Accent.study,   items: ['AI / ML','Web Dev','Mobile Dev','Data Science','Cybersecurity','Cloud Computing','UI/UX Design','Research'] },
  { name: 'Food & Hangouts',  color: Accent.food,    items: ['Cafe Hopping','Cooking','Food Reviews','Canteen Meetups','Baking'] },
  { name: 'Fitness',          color: Accent.fitness, items: ['Gym','Yoga','Running','Cycling','Martial Arts','CrossFit','Home Workouts'] },
  { name: 'Gaming',           color: Accent.gaming,  items: ['Mobile Gaming','PC Gaming','Console Gaming','E-sports','Board Games','Chess'] },
  { name: 'Trips & Outdoors', color: Accent.trips,   items: ['Hiking','Camping','Beach Trips','Road Trips','Photography Walks','Nature Exploring'] },
  { name: 'Campus Events',    color: Accent.campus,  items: ['Hackathons','Workshops','Guest Lectures','Cultural Events','Tech Fests','Competitions','Club Activities'] },
  { name: 'Social & Chill',   color: Accent.social,  items: ['Movie Nights','Music','Art & Drawing','Reading','Volunteering','Debating','Photography'] },
];

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [draftInterests, setDraftInterests] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    student_id: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        student_id: profile.student_id || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  // Profile strength calculation
  function getProfileStrength(): { percentage: number; missing: string[] } {
    const checks: { field: string; label: string; filled: boolean }[] = [
      { field: 'full_name', label: 'Full Name', filled: !!profile?.full_name },
      { field: 'student_id', label: 'Student ID', filled: !!profile?.student_id },
      { field: 'phone', label: 'Phone Number', filled: !!profile?.phone },
      { field: 'bio', label: 'Bio', filled: !!profile?.bio },
      { field: 'interests', label: 'Interests (3+)', filled: (profile?.interests?.length ?? 0) >= 3 },
      { field: 'profile_picture_url', label: 'Profile Picture', filled: !!profile?.profile_picture_url },
    ];
    const filled = checks.filter((c) => c.filled).length;
    const missing = checks.filter((c) => !c.filled).map((c) => c.label);
    return { percentage: Math.round((filled / checks.length) * 100), missing };
  }

  async function pickAndUploadPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const uri = asset.uri;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const filePath = `${user!.id}/avatar.${ext}`;

      // Use FormData — works reliably on Android Expo Go
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `avatar.${ext}`,
        type: mimeType,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, { contentType: mimeType, upsert: true });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ profile_picture_url: publicUrl }).eq('id', user!.id);
      await refreshProfile();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function startEditInterests() {
    setDraftInterests(profile?.interests ? [...profile.interests] : []);
    setEditingInterests(true);
  }

  function toggleDraftInterest(item: string) {
    setDraftInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  }

  async function saveInterests() {
    if (draftInterests.length < 1) {
      Alert.alert('At least 1 interest required');
      return;
    }
    setSavingInterests(true);
    const { error } = await supabase
      .from('profiles')
      .update({ interests: draftInterests })
      .eq('id', user!.id);
    setSavingInterests(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditingInterests(false);
      await refreshProfile();
    }
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user!.id,
        full_name: form.full_name.trim(),
        student_id: form.student_id.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
      });

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditing(false);
      await refreshProfile();
    }
  }

  const { percentage, missing } = getProfileStrength();

  const strengthColor =
    percentage >= 80 ? '#34D399' : percentage >= 50 ? '#FBBF24' : '#F87171';

  const TIERS = [
    { min: 1000, emoji: '👑', name: 'Diamond',  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { min: 500,  emoji: '💎', name: 'Platinum', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
    { min: 250,  emoji: '🥇', name: 'Gold',     color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },
    { min: 100,  emoji: '🥈', name: 'Silver',   color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
    { min: 0,    emoji: '🟤', name: 'Bronze',   color: '#B45309', bg: 'rgba(180,83,9,0.15)' },
  ];
  const getTier = (score: number) => TIERS.find((t) => score >= t.min) ?? TIERS[4];
  const getNextTier = (score: number) => {
    const idx = TIERS.findIndex((t) => score >= t.min);
    return idx > 0 ? TIERS[idx - 1] : null;
  };
  const engScore = profile?.engagement_score ?? 0;
  const currentTier = getTier(engScore);
  const nextTier = getNextTier(engScore);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setSidebarOpen(true)}
              activeOpacity={0.7}>
              <MaterialIcons name="menu" size={24} color={TX.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={pickAndUploadPhoto}
              activeOpacity={0.8}
              disabled={uploadingPhoto}>
              {profile?.profile_picture_url ? (
                <Image
                  source={{ uri: profile.profile_picture_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="camera-alt" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{profile?.full_name || 'Student'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            <View style={[styles.profileTierBadge, { backgroundColor: currentTier.bg }]}>
              <Text style={styles.profileTierEmoji}>{currentTier.emoji}</Text>
              <Text style={[styles.profileTierName, { color: currentTier.color }]}>{currentTier.name}</Text>
            </View>
          </View>

          {/* Profile Strength Indicator */}
          <View style={styles.card}>
            <View style={styles.strengthHeader}>
              <Text style={styles.cardTitle}>Profile Strength</Text>
              <Text style={[styles.percentText, { color: strengthColor }]}>{percentage}%</Text>
            </View>

            <View style={styles.strengthBar}>
              <View style={[styles.strengthFill, { width: `${percentage}%`, backgroundColor: strengthColor }]} />
            </View>

            {missing.length > 0 && (
              <View style={styles.missingSection}>
                <Text style={styles.missingLabel}>Complete to boost your profile:</Text>
                {missing.map((item) => (
                  <View key={item} style={styles.missingRow}>
                    <Text style={styles.missingDot}>○</Text>
                    <Text style={styles.missingText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Profile Details / Edit */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Profile Details</Text>
              <TouchableOpacity onPress={() => setEditing(!editing)}>
                <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            {PROFILE_FIELDS.map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {editing ? (
                  <TextInput
                    style={[styles.fieldInput, field.key === 'bio' && styles.bioInput]}
                    value={form[field.key]}
                    onChangeText={(text) => setForm({ ...form, [field.key]: text })}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor={TX.label}
                    multiline={field.key === 'bio'}
                  />
                ) : (
                  <Text style={styles.fieldValue}>
                    {form[field.key] || 'Not set'}
                  </Text>
                )}
              </View>
            ))}

            {editing && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Interests */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Interests</Text>
              {!editingInterests ? (
                <TouchableOpacity onPress={startEditInterests}>
                  <Text style={styles.editBtn}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setEditingInterests(false)}>
                  <Text style={styles.editBtn}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {!editingInterests ? (
              // View mode
              profile?.interests && profile.interests.length > 0 ? (
                <View style={styles.chipContainer}>
                  {profile.interests.map((interest) => (
                    <View key={interest} style={styles.chip}>
                      <Text style={styles.chipText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noInterests}>No interests selected yet. Tap Edit to add some!</Text>
              )
            ) : (
              // Edit mode
              <View>
                <Text style={styles.interestEditHint}>
                  Tap to add or remove interests. Selected: {draftInterests.length}
                </Text>
                {INTEREST_CATEGORIES.map((cat) => (
                  <View key={cat.name} style={styles.interestCatBlock}>
                    <Text style={[styles.interestCatLabel, { color: cat.color }]}>{cat.name}</Text>
                    <View style={styles.interestCatChips}>
                      {cat.items.map((item) => {
                        const selected = draftInterests.includes(item);
                        return (
                          <TouchableOpacity
                            key={item}
                            onPress={() => toggleDraftInterest(item)}
                            style={[
                              styles.interestChip,
                              selected && { backgroundColor: cat.color, borderColor: cat.color },
                            ]}
                            activeOpacity={0.7}>
                            <Text style={[styles.interestChipText, selected && { color: '#fff' }]}>
                              {item}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveInterests}
                  disabled={savingInterests}
                  activeOpacity={0.8}>
                  {savingInterests ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Interests</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Engagement Stats */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Engagement</Text>
            <View style={styles.engagementRow}>
              <View style={styles.engagementItem}>
                <Text style={[styles.engNum, { color: currentTier.color }]}>{engScore}</Text>
                <Text style={styles.engLabel}>Total Points</Text>
              </View>
              <View style={[styles.engTierBlock, { backgroundColor: currentTier.bg }]}>
                <Text style={styles.engTierEmoji}>{currentTier.emoji}</Text>
                <View>
                  <Text style={[styles.engTierName, { color: currentTier.color }]}>{currentTier.name}</Text>
                  <Text style={styles.engTierLabel}>Current Tier</Text>
                </View>
              </View>
            </View>
            {nextTier ? (
              <View style={styles.tierProgressWrap}>
                <View style={styles.tierProgressHeader}>
                  <Text style={styles.tierProgressLabel}>
                    {nextTier.min - engScore} pts to {nextTier.emoji} {nextTier.name}
                  </Text>
                  <Text style={styles.tierProgressPct}>
                    {Math.round(((engScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100)}%
                  </Text>
                </View>
                <View style={styles.tierProgressBar}>
                  <View
                    style={[
                      styles.tierProgressFill,
                      {
                        width: `${Math.min(((engScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)}%`,
                        backgroundColor: nextTier.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <Text style={styles.maxTierText}>🎉 You've reached the highest tier!</Text>
            )}
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 110 },

  profileHeader: { alignItems: 'center', marginBottom: 24, position: 'relative' },
  menuBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG.border,
    zIndex: 10,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#818CF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  avatarText: { fontSize: 32, fontWeight: FW.hero, color: '#fff' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#818CF8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BG.main,
  },
  name: { fontSize: 24, fontWeight: FW.header, color: TX.primary },
  email: { fontSize: 14, fontWeight: FW.caption, color: TX.label, marginTop: 4 },

  card: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BG.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: FW.cardTitle,
    color: TX.primary,
    marginBottom: 12,
  },
  editBtn: {
    fontSize: 14,
    fontWeight: FW.body,
    color: '#818CF8',
    marginBottom: 12,
  },

  // Strength
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentText: { fontSize: 24, fontWeight: FW.hero, marginBottom: 12 },
  strengthBar: {
    height: 10,
    backgroundColor: BG.input,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  strengthFill: { height: '100%', borderRadius: 5 },
  missingSection: { marginTop: 4 },
  missingLabel: {
    fontSize: 13,
    fontWeight: FW.body,
    color: TX.secondary,
    marginBottom: 8,
  },
  missingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  missingDot: { color: TX.label, marginRight: 8, fontSize: 14 },
  missingText: { fontSize: 13, fontWeight: FW.caption, color: TX.label },

  // Fields
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: FW.body,
    color: TX.label,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldValue: { fontSize: 15, fontWeight: FW.body, color: TX.primary },
  fieldInput: {
    backgroundColor: BG.input,
    borderRadius: BR.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TX.primary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: BG.border,
  },
  bioInput: { height: 80, textAlignVertical: 'top' },

  saveBtn: {
    backgroundColor: '#818CF8',
    paddingVertical: 14,
    borderRadius: BR.button,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: FW.header },

  // Interests
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: BG.input,
    borderRadius: BR.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BG.border,
  },
  chipText: { color: TX.secondary, fontSize: 13, fontWeight: FW.body },
  noInterests: { fontSize: 14, fontWeight: FW.caption, color: TX.label },

  interestEditHint: { fontSize: 12, color: TX.label, fontWeight: FW.caption, marginBottom: 16 },
  interestCatBlock: { marginBottom: 16 },
  interestCatLabel: { fontSize: 13, fontWeight: FW.header, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  interestCatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: {
    backgroundColor: BG.input,
    borderRadius: BR.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: BG.border,
  },
  interestChipText: { color: TX.secondary, fontSize: 13, fontWeight: FW.body },

  // Profile header tier badge
  profileTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BR.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  profileTierEmoji: { fontSize: 16 },
  profileTierName: { fontSize: 14, fontWeight: FW.header },

  // Engagement
  engagementRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  engagementItem: { alignItems: 'center' },
  engNum: { fontSize: 32, fontWeight: FW.hero },
  engLabel: { fontSize: 12, fontWeight: FW.caption, color: TX.label, marginTop: 4 },
  engTierBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BR.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  engTierEmoji: { fontSize: 28 },
  engTierName: { fontSize: 16, fontWeight: FW.hero },
  engTierLabel: { fontSize: 11, color: TX.label, fontWeight: FW.caption, marginTop: 2 },
  tierProgressWrap: { marginTop: 4 },
  tierProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tierProgressLabel: { fontSize: 12, color: TX.secondary, fontWeight: FW.body },
  tierProgressPct: { fontSize: 12, color: TX.label, fontWeight: FW.caption },
  tierProgressBar: { height: 6, backgroundColor: BG.input, borderRadius: 3, overflow: 'hidden' },
  tierProgressFill: { height: '100%', borderRadius: 3 },
  maxTierText: { fontSize: 13, color: '#F59E0B', fontWeight: FW.body, textAlign: 'center', marginTop: 8 },

  // Sign out
  signOutBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingVertical: 14,
    borderRadius: BR.button,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: { color: '#F87171', fontSize: 16, fontWeight: FW.header },
});

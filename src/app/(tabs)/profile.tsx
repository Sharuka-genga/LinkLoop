import Sidebar from '@/components/sidebar';
import { Accent, BG, BR, FW, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Camera, 
  Menu, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Info, 
  Edit3, 
  LogOut, 
  Trophy, 
  Star, 
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
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
  { key: 'full_name', label: 'Full Name', icon: UserIcon },
  { key: 'student_id', label: 'Student ID', icon: Star },
  { key: 'phone', label: 'Phone Number', icon: Phone },
  { key: 'bio', label: 'Bio', icon: Info },
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
    { min: 0,    emoji: '🥉', name: 'Bronze',   color: '#CD7F32', bg: 'rgba(205,127,50,0.15)' },
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
        <ScrollView 
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Header ── */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerSubtitle}>YOUR CAMPUS PROFILE</Text>
              <Text style={styles.headerTitle}>My Identity</Text>
            </View>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setSidebarOpen(true)}
              activeOpacity={0.7}>
              <Menu size={22} color={TX.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Profile Hero Card ── */}
          <LinearGradient
            colors={['#141B2D', '#0F172A']}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={pickAndUploadPhoto}
                activeOpacity={0.9}
              >
                <View style={styles.avatarBorder}>
                  {profile?.profile_picture_url ? (
                    <Image
                      source={{ uri: profile.profile_picture_url }}
                      style={styles.heroAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder]}>
                      <Text style={styles.avatarInitial}>
                        {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cameraBtn}>
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Camera size={14} color="#fff" strokeWidth={2.5} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.heroInfo}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {profile?.full_name || 'Student'}
                </Text>
                <Text style={styles.heroEmail} numberOfLines={1}>
                  {user?.email || ''}
                </Text>
                <View style={[styles.tierBadge, { backgroundColor: currentTier.bg }]}>
                  <Text style={styles.tierEmoji}>{currentTier.emoji}</Text>
                  <Text style={[styles.tierName, { color: currentTier.color }]}>
                    {currentTier.name.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* ── Engagement Score (Membership Card Style) ── */}
          <LinearGradient
            colors={['#818CF8', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.engCard}
          >
            <View style={styles.engHeader}>
              <Trophy size={20} color="#fff" />
              <Text style={styles.engTitle}>ENGAGEMENT STATUS</Text>
            </View>
            
            <View style={styles.engBody}>
              <View>
                <Text style={styles.engPoints}>{engScore}</Text>
                <Text style={styles.engPointsLabel}>EXPERIENCE POINTS</Text>
              </View>
              <View style={styles.engTierWrap}>
                <Text style={styles.engTierEmojiLarge}>{currentTier.emoji}</Text>
                <Text style={styles.engTierNameLarge}>{currentTier.name.toUpperCase()}</Text>
              </View>
            </View>

            {nextTier && (
              <View style={styles.engProgressSection}>
                <View style={styles.engProgressHeader}>
                  <Text style={styles.engProgressLabel}>Next Rank: {nextTier.name}</Text>
                  <Text style={styles.engProgressValue}>{nextTier.min - engScore} pts left</Text>
                </View>
                <View style={styles.engProgressBar}>
                  <View 
                    style={[
                      styles.engProgressFill, 
                      { width: `${Math.min(((engScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)}%` }
                    ]} 
                  />
                </View>
              </View>
            )}
          </LinearGradient>

          {/* ── Profile Details ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleWithIcon}>
                <Edit3 size={18} color="#F472B6" />
                <Text style={styles.cardTitle}>Profile Details</Text>
              </View>
              <TouchableOpacity onPress={() => setEditing(!editing)}>
                <Text style={styles.editAction}>{editing ? 'CANCEL' : 'EDIT'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldsContainer}>
              {PROFILE_FIELDS.map((field) => {
                const Icon = field.icon;
                return (
                  <View key={field.key} style={styles.fieldRow}>
                    <View style={styles.fieldIconBox}>
                      <Icon size={16} color={TX.label} />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>{field.label.toUpperCase()}</Text>
                      {editing ? (
                        <TextInput
                          style={[styles.fieldInput, field.key === 'bio' && styles.bioInput]}
                          value={form[field.key]}
                          onChangeText={(text) => setForm({ ...form, [field.key]: text })}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          placeholderTextColor={TX.subtle}
                          multiline={field.key === 'bio'}
                        />
                      ) : (
                        <Text style={styles.fieldValue} numberOfLines={field.key === 'bio' ? 0 : 1}>
                          {form[field.key] || 'Not provided'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {editing && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Update Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── Interests ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleWithIcon}>
                <Star size={18} color="#FBBF24" />
                <Text style={styles.cardTitle}>Your Interests</Text>
              </View>
              <TouchableOpacity onPress={editingInterests ? () => setEditingInterests(false) : startEditInterests}>
                <Text style={styles.editAction}>{editingInterests ? 'CANCEL' : 'EDIT'}</Text>
              </TouchableOpacity>
            </View>

            {!editingInterests ? (
              <View style={styles.interestsGrid}>
                {profile?.interests && profile.interests.length > 0 ? (
                  profile.interests.map((interest) => (
                    <View key={interest} style={styles.interestPill}>
                      <Text style={styles.interestPillText}>{interest}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Add interests to find better matches!</Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.editHint}>Select at least one interest to save.</Text>
                {INTEREST_CATEGORIES.map((cat) => (
                  <View key={cat.name} style={styles.categoryGroup}>
                    <Text style={[styles.categoryTitle, { color: cat.color }]}>{cat.name}</Text>
                    <View style={styles.categoryItems}>
                      {cat.items.map((item) => {
                        const isSelected = draftInterests.includes(item);
                        return (
                          <TouchableOpacity
                            key={item}
                            onPress={() => toggleDraftInterest(item)}
                            style={[
                              styles.categoryItem,
                              isSelected && { backgroundColor: cat.color, borderColor: cat.color }
                            ]}
                          >
                            <Text style={[styles.categoryItemText, isSelected && { color: '#fff' }]}>
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
                    <>
                      <CheckCircle2 size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Save Interests</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Profile Strength ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleWithIcon}>
                <Sparkles size={18} color="#818CF8" />
                <Text style={styles.cardTitle}>Profile Strength</Text>
              </View>
              <Text style={[styles.percentValue, { color: strengthColor }]}>{percentage}%</Text>
            </View>
            <View style={styles.strengthTrack}>
              <View style={[styles.strengthFill, { width: `${percentage}%`, backgroundColor: strengthColor }]} />
            </View>
            {missing.length > 0 && (
              <View style={styles.missingBox}>
                <Text style={styles.missingTitle}>TIPS TO IMPROVE</Text>
                <View style={styles.missingList}>
                  {missing.map((item, idx) => (
                    <View key={idx} style={styles.missingItem}>
                      <View style={styles.missingBullet} />
                      <Text style={styles.missingText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* ── Footer Actions ── */}
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.7}>
            <LogOut size={18} color="#F87171" />
            <Text style={styles.signOutText}>Sign Out of LinkLoop</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scroll: { paddingHorizontal: 20, paddingTop: 60 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: TX.label,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: TX.primary,
    letterSpacing: -0.5,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BG.card,
    borderWidth: 1,
    borderColor: BG.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  heroAvatarPlaceholder: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '900',
    color: '#818CF8',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#818CF8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#141B2D',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: TX.primary,
    letterSpacing: -0.5,
  },
  heroEmail: {
    fontSize: 14,
    color: TX.secondary,
    opacity: 0.6,
    marginTop: 2,
    marginBottom: 10,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  tierEmoji: { fontSize: 14 },
  tierName: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  card: {
    backgroundColor: BG.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BG.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TX.primary,
    letterSpacing: -0.2,
  },
  percentValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  strengthTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  missingBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
  },
  missingTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: TX.label,
    letterSpacing: 1,
    marginBottom: 10,
  },
  missingList: {
    gap: 8,
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  missingBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#818CF8',
  },
  missingText: {
    fontSize: 13,
    fontWeight: '600',
    color: TX.secondary,
  },

  editAction: {
    fontSize: 11,
    fontWeight: '900',
    color: '#818CF8',
    letterSpacing: 1,
  },
  fieldsContainer: {
    gap: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  fieldIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: TX.label,
    letterSpacing: 1,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: TX.primary,
  },
  fieldInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TX.primary,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 4,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#818CF8',
    height: 54,
    borderRadius: 16,
    marginTop: 24,
    shadowColor: '#818CF8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  interestPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: TX.secondary,
  },
  emptyState: {
    paddingVertical: 10,
  },
  emptyText: {
    fontSize: 14,
    color: TX.label,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  editHint: {
    fontSize: 12,
    color: TX.label,
    fontWeight: '600',
    marginBottom: 20,
  },
  categoryGroup: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  categoryItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: TX.secondary,
  },

  engCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  engHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    opacity: 0.9,
  },
  engTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  engBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  engPoints: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 48,
  },
  engPointsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginTop: 4,
  },
  engTierWrap: {
    alignItems: 'center',
  },
  engTierEmojiLarge: {
    fontSize: 36,
    marginBottom: 4,
  },
  engTierNameLarge: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  engProgressSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 20,
    padding: 16,
  },
  engProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  engProgressLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  engProgressValue: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  engProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  engProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F87171',
  },
});

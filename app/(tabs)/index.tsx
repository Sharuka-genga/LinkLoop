import { Accent, BG, BR, FW, Status, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

import WeeklyReport, { fetchWeeklyStats, WeeklyStats } from '@/components/weekly-report';

type RecentActivity = {
  id: string;
  title: string;
  type: string;
  points: number;
  date: string;
};

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    eventsJoined: 0,
    sportsPlayed: 0,
    bookingsMade: 0,
    pointsEarned: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [engagementScore, setEngagementScore] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, [user]);

  async function loadDashboard() {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('engagement_score')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setEngagementScore(profileData.engagement_score ?? 0);
    }

    const fetchedStats = await fetchWeeklyStats(user.id);
    setWeeklyStats(fetchedStats);

    const { data: recent } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recent) {
      setRecentActivities(
        recent.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          points: a.points ?? 0,
          date: new Date(a.created_at).toLocaleDateString(),
        })),
      );
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const typeColor: Record<string, string> = {
    event: Accent.campus,
    sport: Accent.sports,
    booking: Accent.trips,
    social: Accent.social,
    study: Accent.study,
  };

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TX.secondary} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.userName}>{profile?.full_name || 'Student'}</Text>
        </View>

        {/* Engagement Score Card */}
        <View style={styles.scoreCard}>
          <View style={[styles.scoreCircle, { borderColor: getTier(engagementScore).color }]}>
            <Text style={[styles.scoreNumber, { color: getTier(engagementScore).color }]}>{engagementScore}</Text>
            <Text style={styles.scoreLabel}>pts</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Engagement Score</Text>
            <Text style={styles.scoreDesc}>
              Earn points by joining events, playing sports, and participating in campus life
            </Text>
            <View style={[styles.tierBadge, { backgroundColor: getTier(engagementScore).bg }]}>
              <Text style={styles.tierEmoji}>{getTier(engagementScore).emoji}</Text>
              <Text style={[styles.tierText, { color: getTier(engagementScore).color }]}>
                {getTier(engagementScore).name}
              </Text>
            </View>
            {(() => {
              const next = getNextTier(engagementScore);
              return next ? (
                <Text style={styles.nextTierText}>
                  {next.min - engagementScore} pts to {next.emoji} {next.name}
                </Text>
              ) : (
                <Text style={styles.nextTierText}>🎉 Top tier reached!</Text>
              );
            })()}
          </View>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 110 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 16, fontWeight: FW.caption, color: TX.secondary },
  userName: { fontSize: 28, fontWeight: FW.hero, color: TX.primary, marginTop: 2 },

  scoreCard: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BG.border,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BG.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#818CF8',
    marginRight: 16,
  },
  scoreNumber: { fontSize: 22, fontWeight: FW.hero, color: '#818CF8' },
  scoreLabel: { fontSize: 11, fontWeight: FW.body, color: TX.label, marginTop: -2 },
  scoreInfo: { flex: 1 },
  scoreTitle: { fontSize: 18, fontWeight: FW.cardTitle, color: TX.primary, marginBottom: 4 },
  scoreDesc: { fontSize: 12, fontWeight: FW.caption, color: TX.secondary, lineHeight: 18, marginBottom: 8 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BR.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    gap: 4,
  },
  tierEmoji: { fontSize: 13 },
  tierText: { fontSize: 12, fontWeight: FW.header },
  nextTierText: { fontSize: 11, color: TX.label, fontWeight: FW.caption },

  sectionCard: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BG.border,
  },
  sectionTitle: { fontSize: 20, fontWeight: FW.header, color: TX.primary, marginBottom: 2 },
  sectionSub: { fontSize: 13, fontWeight: FW.caption, color: TX.label, marginBottom: 16 },

  // Weekly Report styles have been extracted into WeeklyReport component for reusability

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BG.border,
  },
  activityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 15, fontWeight: FW.body, color: TX.primary },
  activityDate: { fontSize: 12, fontWeight: FW.caption, color: TX.label, marginTop: 2 },
  pointsBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderRadius: BR.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: { color: Status.open, fontSize: 13, fontWeight: FW.header },

  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: FW.cardTitle, color: TX.secondary, marginBottom: 6 },
  emptyDesc: { fontSize: 13, fontWeight: FW.caption, color: TX.label, textAlign: 'center', lineHeight: 20 },
});

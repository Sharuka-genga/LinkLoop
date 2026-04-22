import { Accent, BG, BR, FW, Status, TX } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type WeeklyStats = {
  eventsJoined: number;
  sportsPlayed: number;
  bookingsMade: number;
  pointsEarned: number;
};

export async function fetchWeeklyStats(userId: string): Promise<WeeklyStats> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false });

  if (activities) {
    return {
      eventsJoined: activities.filter((a) => a.type === 'event').length,
      sportsPlayed: activities.filter((a) => a.type === 'sport').length,
      bookingsMade: activities.filter((a) => a.type === 'booking').length,
      pointsEarned: activities.reduce((sum, a) => sum + (a.points ?? 0), 0),
    };
  }
  return { eventsJoined: 0, sportsPlayed: 0, bookingsMade: 0, pointsEarned: 0 };
}

export default function WeeklyReport({ stats }: { stats: WeeklyStats }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Weekly Activity Report</Text>
      <Text style={styles.sectionSub}>Last 7 days</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Accent.campus }]}>{stats.eventsJoined}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Accent.sports }]}>{stats.sportsPlayed}</Text>
          <Text style={styles.statLabel}>Sports</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Accent.trips }]}>{stats.bookingsMade}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Status.open }]}>{stats.pointsEarned}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Weekly Goal: 100 pts</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((stats.pointsEarned / 100) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{stats.pointsEarned}/100 points</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: BG.input,
    borderRadius: BR.smallButton,
    paddingVertical: 14,
    marginHorizontal: 3,
  },
  statNum: { fontSize: 22, fontWeight: FW.hero },
  statLabel: { fontSize: 11, fontWeight: FW.body, color: TX.label, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  progressSection: { marginTop: 4 },
  progressLabel: { fontSize: 13, fontWeight: FW.body, color: TX.secondary, marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: BG.input, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Status.open, borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: FW.caption, color: TX.label, marginTop: 6, textAlign: 'right' },
});

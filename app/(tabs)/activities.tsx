import { Accent, BG, BR, FW, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Activity = {
  id: string;
  title: string;
  type: string;
  points: number;
  created_at: string;
  description?: string;
};

type FilterType = 'all' | 'event' | 'sport' | 'booking' | 'social' | 'study';

const FILTERS: { key: FilterType; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: TX.primary },
  { key: 'event', label: 'Events', color: Accent.campus },
  { key: 'sport', label: 'Sports', color: Accent.sports },
  { key: 'booking', label: 'Bookings', color: Accent.trips },
  { key: 'social', label: 'Social', color: Accent.social },
  { key: 'study', label: 'Study', color: Accent.study },
];

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [user]);

  async function loadActivities() {
    if (!user) return;
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setActivities(data);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  }

  const filtered =
    filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  const typeColor: Record<string, string> = {
    event: Accent.campus,
    sport: Accent.sports,
    booking: Accent.trips,
    social: Accent.social,
    study: Accent.study,
  };

  // Group by month
  const grouped = filtered.reduce(
    (acc, activity) => {
      const d = new Date(activity.created_at);
      const key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    },
    {} as Record<string, Activity[]>,
  );

  const totalPoints = activities.reduce((sum, a) => sum + (a.points ?? 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TX.secondary} />
        }>
        <Text style={styles.title}>Past Activities</Text>
        <Text style={styles.subtitle}>
          Your complete activity history & earned points
        </Text>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNum}>{activities.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNum, { color: '#34D399' }]}>{totalPoints}</Text>
            <Text style={styles.summaryLabel}>Points</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                filter === f.key && { backgroundColor: f.color, borderColor: f.color },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && { color: '#fff' },
                ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Activity List grouped by month */}
        {Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No activities found</Text>
            <Text style={styles.emptyDesc}>
              {filter === 'all'
                ? 'Start participating in events and sports to see your history here!'
                : `No ${filter} activities recorded yet.`}
            </Text>
          </View>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <View key={month}>
              <Text style={styles.monthHeader}>{month}</Text>
              {items.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityLeft}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: `${typeColor[activity.type] || Accent.other}20` },
                      ]}>
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: typeColor[activity.type] || Accent.other },
                        ]}>
                        {activity.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.actTitle}>{activity.title}</Text>
                    {activity.description && (
                      <Text style={styles.actDesc}>{activity.description}</Text>
                    )}
                    <Text style={styles.actDate}>
                      {new Date(activity.created_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.pointsCol}>
                    <Text style={styles.pointsNum}>+{activity.points}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 110 },
  title: { fontSize: 28, fontWeight: FW.hero, color: TX.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: FW.caption, color: TX.secondary, marginBottom: 20 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryBox: {
    flex: 1,
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG.border,
  },
  summaryNum: { fontSize: 24, fontWeight: FW.hero, color: TX.primary },
  summaryLabel: { fontSize: 12, fontWeight: FW.caption, color: TX.label, marginTop: 4 },

  filterScroll: { marginBottom: 20 },
  filterContainer: { gap: 8 },
  filterChip: {
    backgroundColor: BG.card,
    borderRadius: BR.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BG.border,
  },
  filterText: { fontSize: 13, fontWeight: FW.body, color: TX.secondary },

  monthHeader: {
    fontSize: 16,
    fontWeight: FW.header,
    color: TX.label,
    marginBottom: 12,
    marginTop: 8,
  },

  activityCard: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG.border,
  },
  activityLeft: { flex: 1 },
  typeBadge: {
    borderRadius: BR.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  typeBadgeText: { fontSize: 10, fontWeight: FW.header, letterSpacing: 0.8 },
  actTitle: { fontSize: 16, fontWeight: FW.cardTitle, color: TX.primary, marginBottom: 2 },
  actDesc: { fontSize: 13, fontWeight: FW.caption, color: TX.secondary, marginBottom: 4 },
  actDate: { fontSize: 12, fontWeight: FW.caption, color: TX.label },

  pointsCol: { alignItems: 'center', marginLeft: 12 },
  pointsNum: { fontSize: 18, fontWeight: FW.hero, color: '#34D399' },
  pointsLabel: { fontSize: 11, fontWeight: FW.caption, color: TX.label },

  emptyState: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: FW.cardTitle, color: TX.secondary, marginBottom: 8 },
  emptyDesc: { fontSize: 13, fontWeight: FW.caption, color: TX.label, textAlign: 'center', lineHeight: 20 },
});

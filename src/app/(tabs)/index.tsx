import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Search, SlidersHorizontal, Bell, BookOpen } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';

import { Accent, BG, BR, FW, TX } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { getEvents } from '@/lib/events';
import { supabase } from '@/lib/supabase';
import EventCard from '@/components/EventCard';
import { CategoryScroll } from '@/components/CategoryScroll';
import { getUnreadCount, subscribeToNotifications } from '@/lib/notifications';

// ── Constants ──────────────────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'sports',  label: 'Sports' },
  { key: 'study',   label: 'Study' },
  { key: 'social',  label: 'Social' },
  { key: 'food',    label: 'Food' },
  { key: 'gaming',  label: 'Gaming' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'trips',   label: 'Trips' },
  { key: 'campus',  label: 'Campus' },
];

const TAB_ACCENT: Record<string, string> = {
  all: '#818CF8', sports: '#FF6B35', study: '#818CF8',
  social: '#F472B6', food: '#FBBF24', gaming: '#34D399',
  fitness: '#F87171', trips: '#38BDF8', campus: '#A78BFA',
};

const TIERS = [
  { min: 1000, emoji: '👑', name: 'Diamond',  color: '#F59E0B' },
  { min: 500,  emoji: '💎', name: 'Platinum', color: '#60A5FA' },
  { min: 250,  emoji: '🥇', name: 'Gold',     color: '#FBBF24' },
  { min: 100,  emoji: '🥈', name: 'Silver',   color: '#94A3B8' },
  { min: 0,    emoji: '🥉', name: 'Bronze',   color: '#CD7F32' },
];

// ── Helpers ────────────────────────────────────────────────────
function getTier(score: number) {
  return TIERS.find((t) => score >= t.min) ?? TIERS[4];
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minStr} ${ampm}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

// ── Screen ─────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const engagementScore = profile?.engagement_score ?? 0;

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();

    // Subscribe to realtime changes with a unique channel name to avoid reuse errors
    const channel = supabase
      .channel(`index-events-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => loadEvents()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_participants' },
        () => loadEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Initial unread count
    const fetchUnread = async () => {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };
    fetchUnread();

    // Subscribe to notification updates
    const subscription = subscribeToNotifications(() => {
      fetchUnread();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useFocusEffect(useCallback(() => { 
    loadEvents(); 
    // Re-fetch unread count when screen comes into focus
    getUnreadCount().then(setUnreadCount).catch(console.error);
  }, []));

  const onRefresh = () => { setRefreshing(true); loadEvents(); };

  const filteredEvents = events.filter((e) => {
    const matchesCategory = activeFilter === 'all' || e.category_id === activeFilter;
    const matchesSearch =
      e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const tier = getTier(engagementScore);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818CF8" />
        }
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>{getGreeting()}</Text>
            <Text style={styles.greetingName}>
              {profile?.full_name ? `Hey, ${profile.full_name.split(' ')[0]}` : 'Hey there'}
            </Text>
            <View style={styles.compactScore}>
              <Text style={styles.scoreEmoji}>{tier.emoji}</Text>
              <Text style={styles.scoreText}>{engagementScore}</Text>
              <Text style={styles.scorePointsLabel}>pts</Text>
              <View style={styles.scoreDot} />
              <Text style={[styles.scoreTier, { color: tier.color }]}>{tier.name}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => router.push('/bookings' as any)}
              activeOpacity={0.7}
            >
              <BookOpen size={20} color="#CBD5E1" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.notifBtn}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
            >
              <Bell size={20} color="#CBD5E1" strokeWidth={2} />
              {unreadCount > 0 && <View style={styles.notifDot} />}
            </TouchableOpacity>
            {profile?.profile_picture_url ? (
              <Image source={{ uri: profile.profile_picture_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>
        </View>



        {/* ── Search & Filter ─────────────────────────────── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={14} color="#475569" strokeWidth={2.5} />
            <TextInput
              placeholder="Search events, people..."
              placeholderTextColor="#334155"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.filterWrapper}>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setIsFilterOpen(!isFilterOpen)}
              activeOpacity={0.8}
            >
              <SlidersHorizontal size={16} color="#0F172A" strokeWidth={2.5} />
            </TouchableOpacity>
            {isFilterOpen && (
              <>
                <TouchableOpacity
                  style={styles.dropdownOverlay}
                  onPress={() => setIsFilterOpen(false)}
                  activeOpacity={1}
                />
                <View style={styles.dropdown}>
                  <Text style={styles.dropdownTitle}>FILTER BY CATEGORY</Text>
                  <View style={styles.dropdownDivider} />
                  <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                    {FILTER_TABS.map((tab) => {
                      const isActive = activeFilter === tab.key;
                      return (
                        <TouchableOpacity
                          key={tab.key}
                          style={[
                            styles.dropdownItem,
                            isActive && { backgroundColor: 'rgba(129,140,248,0.1)' },
                          ]}
                          onPress={() => {
                            setActiveFilter(tab.key);
                            setIsFilterOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isActive && { color: '#F1F5F9', fontWeight: '800' },
                            ]}
                          >
                            {tab.label}
                          </Text>
                          {isActive && (
                            <View
                              style={[
                                styles.activeIndicator,
                                { backgroundColor: TAB_ACCENT[tab.key] },
                              ]}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Category Carousel ───────────────────────────── */}
        <CategoryScroll />

        {/* ── Events Feed ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Happening Near You</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Loading events...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No results found' : 'No events yet'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Hit + to create the first one!'}
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              location={event.location}
              date={formatDate(event.event_date)}
              time={formatTime(event.event_time)}
              peopleNeeded={event.people_needed}
              category={event.category_id}
              creatorId={event.creator_id}
              creatorName={event.creatorName || 'Unknown'}
              creatorAvatar={event.creatorAvatar ?? undefined}
              joinMode={event.join_mode}
              spotsJoined={event.participantsCount || 0}
              totalSpots={event.people_needed}
              subcategoryLabel={event.subcategory_label}
              currentUserId={user?.id}
              onDelete={loadEvents}
            />
          ))
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingSmall: {
    fontSize: 10,
    fontWeight: FW.header,
    color: '#475569',
    letterSpacing: 2,
    marginBottom: 3,
  },
  greetingName: { fontSize: 26, fontWeight: FW.hero, color: TX.primary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    backgroundColor: BG.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BG.border,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F472B6',
    borderWidth: 1.5,
    borderColor: BG.main,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  avatarPlaceholder: {
    backgroundColor: BG.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: FW.header, color: '#818CF8' },

  compactScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  scoreEmoji: { fontSize: 14, marginRight: 6 },
  scoreText: { fontSize: 13, fontWeight: '800', color: TX.primary },
  scorePointsLabel: { fontSize: 10, fontWeight: '600', color: TX.label, marginLeft: 2, textTransform: 'uppercase' },
  scoreDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#475569', marginHorizontal: 8 },
  scoreTier: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 18, zIndex: 1000 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BG.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: TX.secondary, fontWeight: '500' },
  filterWrapper: { position: 'relative' },
  filterBtn: {
    backgroundColor: '#818CF8',
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -500,
    left: -500,
    right: -500,
    bottom: -500,
    zIndex: 998,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: BG.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BG.border,
    width: 200,
    zIndex: 999,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  dropdownTitle: {
    fontSize: 9,
    fontWeight: FW.header,
    color: '#475569',
    letterSpacing: 1.5,
    marginLeft: 16,
    marginBottom: 8,
  },
  dropdownDivider: { height: 1, backgroundColor: BG.border, marginBottom: 4 },
  dropdownScroll: { maxHeight: 300 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dropdownItemText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  activeIndicator: { width: 4, height: 4, borderRadius: 2, marginLeft: 'auto' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: FW.header, color: TX.primary, letterSpacing: -0.3 },
  seeAll: { fontSize: 13, color: Accent.study, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: FW.header, color: '#334155', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#1E2A40' },
});

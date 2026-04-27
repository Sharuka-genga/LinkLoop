import { Accent, BG, BR, FW, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getInvitations, acceptInvitation, declineInvitation, getJoinRequests, acceptJoinRequest, declineJoinRequest, getMyEvents } from '@/lib/events';
import EventCard from '@/components/EventCard';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, Calendar, MapPin, Zap, Bell, UserPlus, Clock } from 'lucide-react-native';

type Activity = {
  id: string;
  title: string;
  type: string;
  points: number;
  created_at: string;
  description?: string;
};

type Invitation = {
    id: string;
    events: {
        id: string;
        title: string;
        location: string;
        event_date: string;
        event_time: string;
        category_id: string;
    };
    sender: {
        full_name: string;
        profile_picture_url: string;
    };
};

type JoinRequest = {
    id: string;
    events: {
        id: string;
        title: string;
        location: string;
        event_date: string;
        event_time: string;
        category_id: string;
    };
    requester: {
        full_name: string;
        profile_picture_url: string;
    };
};

type TabType = 'history' | 'invites' | 'requests';
type FilterType = 'all' | 'event' | 'sport' | 'booking' | 'social' | 'study';

const FILTERS: { key: FilterType; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#000' },
  { key: 'event', label: 'Events', color: Accent.campus },
  { key: 'sport', label: 'Sports', color: Accent.sports },
  { key: 'booking', label: 'Bookings', color: Accent.trips },
  { key: 'social', label: 'Social', color: Accent.social },
  { key: 'study', label: 'Study', color: Accent.study },
];

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setRefreshing(true);
    try {
        await Promise.all([loadActivities(), loadInvites(), loadJoinRequests(), loadUserEvents()]);
    } catch (e) {
        console.error("Load error:", e);
    } finally {
        setRefreshing(false);
    }
  }

  async function loadActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) setActivities(data);
  }

  async function loadInvites() {
    try {
        const data = await getInvitations();
        setInvites(data as any || []);
    } catch (e) {
        console.error("Fetch invites error:", e);
        // Error is likely due to missing FK in DB, instructions provided to user
    }
  }

  async function loadJoinRequests() {
    try {
        const data = await getJoinRequests();
        setJoinRequests(data as any || []);
    } catch (e) {
        console.error("Fetch join requests error:", e);
    }
  }

  async function loadUserEvents() {
    try {
        const data = await getMyEvents();
        setUserEvents(data || []);
    } catch (e) {
        console.error("Fetch user events error:", e);
    }
  }

  async function handleAccept(id: string) {
    try {
        await acceptInvitation(id);
        Alert.alert("Accepted!", "You've been added to the event.");
        loadData();
    } catch (e) {
        Alert.alert("Error", "Could not accept invitation.");
    }
  }

  async function handleDecline(id: string) {
    try {
        await declineInvitation(id);
        loadData();
    } catch (e) {
        Alert.alert("Error", "Could not decline invitation.");
    }
  }

  async function handleAcceptRequest(id: string) {
    try {
        await acceptJoinRequest(id);
        Alert.alert("Approved!", "The user has been added to your event.");
        loadData();
    } catch (e) {
        Alert.alert("Error", "Could not approve request.");
    }
  }

  async function handleDeclineRequest(id: string) {
    try {
        await declineJoinRequest(id);
        loadData();
    } catch (e) {
        Alert.alert("Error", "Could not decline request.");
    }
  }

  const filtered =
    filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${minStr} ${ampm}`;
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = userEvents.filter(e => new Date(e.event_date) >= today);
  const pastEvents = userEvents.filter(e => new Date(e.event_date) < today);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Sticky Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
            <View>
                <Text style={styles.title}>Activities</Text>
                <Text style={styles.subtitle}>Track performance & invites</Text>
            </View>
            <View style={styles.pointsBadge}>
                <Zap size={14} color="#34D399" fill="#34D399" />
                <Text style={styles.pointsText}>{totalPoints}</Text>
            </View>
        </View>

        {/* Tab Switcher (Segmented Control style) */}
        <View style={styles.tabBarContainer}>
            <View style={styles.tabBar}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabLabel, activeTab === 'history' && styles.activeTabLabel]}>
                        History
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'invites' && styles.activeTab]}
                    onPress={() => setActiveTab('invites')}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.tabLabel, activeTab === 'invites' && styles.activeTabLabel]}>
                            Invites
                        </Text>
                        {invites.length > 0 && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{invites.length}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                    onPress={() => setActiveTab('requests')}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.tabLabel, activeTab === 'requests' && styles.activeTabLabel]}>
                            Requests
                        </Text>
                        {joinRequests.length > 0 && (
                            <View style={[styles.countBadge, { backgroundColor: '#FBBF24' }]}>
                                <Text style={styles.countText}>{joinRequests.length}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={TX.secondary} />
        }>
        
        {activeTab === 'invites' ? (
            <View style={styles.inviteList}>
                {invites.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell size={48} color={TX.subtle} style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyTitle}>No pending invites</Text>
                        <Text style={styles.emptyDesc}>When someone invites you to an event, it will appear here.</Text>
                    </View>
                ) : (
                    invites.map((invite) => (
                        <View key={invite.id} style={styles.inviteCard}>
                            <View style={styles.inviteHeader}>
                                {invite.sender?.profile_picture_url ? (
                                    <Image 
                                        source={{ uri: invite.sender.profile_picture_url }} 
                                        style={styles.senderAvatar} 
                                    />
                                ) : (
                                    <View style={[styles.senderAvatar, styles.avatarFallback]}>
                                        <Text style={styles.avatarLetter}>{(invite.sender?.full_name || "?").charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.senderName}>{invite.sender?.full_name || "Unknown Sender"}</Text>
                                    <Text style={styles.inviteAction}>invited you to join:</Text>
                                </View>
                            </View>
                            <Text style={styles.eventTitle}>{invite.events?.title || "Unknown Event"}</Text>
                            <View style={styles.eventMeta}>
                                <View style={styles.metaItem}>
                                    <Calendar size={12} color={TX.label} />
                                    <Text style={styles.metaText}>{invite.events?.event_date}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Clock size={12} color={TX.label} />
                                    <Text style={styles.metaText}>{invite.events?.event_time?.substring(0, 5)}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <MapPin size={12} color={TX.label} />
                                    <Text style={styles.metaText} numberOfLines={1}>{invite.events?.location}</Text>
                                </View>
                            </View>
                            <View style={styles.inviteActions}>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, styles.declineBtn]}
                                    onPress={() => handleDecline(invite.id)}
                                >
                                    <X size={18} color="#F87171" />
                                    <Text style={styles.declineText}>Decline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, styles.acceptBtn]}
                                    onPress={() => handleAccept(invite.id)}
                                >
                                    <Check size={18} color="#000" />
                                    <Text style={styles.acceptText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </View>
        ) : activeTab === 'requests' ? (
            <View style={styles.inviteList}>
                {joinRequests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <UserPlus size={48} color={TX.subtle} style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyTitle}>No pending requests</Text>
                        <Text style={styles.emptyDesc}>When someone requests to join your event, it will appear here.</Text>
                    </View>
                ) : (
                    joinRequests.map((req) => (
                        <View key={req.id} style={styles.inviteCard}>
                            <View style={styles.inviteHeader}>
                                {req.requester?.profile_picture_url ? (
                                    <Image 
                                        source={{ uri: req.requester.profile_picture_url }} 
                                        style={[styles.senderAvatar, { borderColor: '#FBBF24' }]} 
                                    />
                                ) : (
                                    <View style={[styles.senderAvatar, styles.avatarFallback, { borderColor: '#FBBF24' }]}>
                                        <Text style={[styles.avatarLetter, { color: '#FBBF24' }]}>{(req.requester?.full_name || "?").charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.senderName}>{req.requester?.full_name || "Unknown User"}</Text>
                                    <Text style={styles.inviteAction}>wants to join:</Text>
                                </View>
                            </View>
                            <Text style={styles.eventTitle}>{req.events?.title || "Unknown Event"}</Text>
                            <View style={styles.eventMeta}>
                                <View style={styles.metaItem}>
                                    <Calendar size={12} color={TX.label} />
                                    <Text style={styles.metaText}>{req.events?.event_date}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Clock size={12} color={TX.label} />
                                    <Text style={styles.metaText}>{req.events?.event_time?.substring(0, 5)}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <MapPin size={12} color={TX.label} />
                                    <Text style={styles.metaText} numberOfLines={1}>{req.events?.location}</Text>
                                </View>
                            </View>
                            <View style={styles.inviteActions}>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, styles.declineBtn]}
                                    onPress={() => handleDeclineRequest(req.id)}
                                >
                                    <X size={18} color="#F87171" />
                                    <Text style={styles.declineText}>Decline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, styles.requestAcceptBtn]}
                                    onPress={() => handleAcceptRequest(req.id)}
                                >
                                    <Check size={18} color="#000" />
                                    <Text style={styles.acceptText}>Approve</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </View>
        ) : (
            <>
                {/* Summary Row */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryNum}>{activities.length}</Text>
                        <Text style={styles.summaryLabel}>Activities</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={[styles.summaryNum, { color: '#34D399' }]}>{totalPoints}</Text>
                        <Text style={styles.summaryLabel}>Total Points</Text>
                    </View>
                </View>

                {/* Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterContainer}
                >
                    {FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterChip,
                                filter === f.key && styles.filterChipActive,
                                filter === f.key && f.key !== 'all' && { backgroundColor: f.color, borderColor: f.color },
                            ]}
                            onPress={() => setFilter(f.key)}
                        >
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Grouped History List */}
                {filter === 'event' ? (
                    <View style={{ gap: 20 }}>
                        {upcomingEvents.length > 0 && (
                            <View>
                                <Text style={styles.monthHeader}>Upcoming Events</Text>
                                {upcomingEvents.map(event => (
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
                                        creatorName={event.creatorName}
                                        creatorAvatar={event.creatorAvatar}
                                        joinMode={event.join_mode}
                                        spotsJoined={event.participantsCount}
                                        totalSpots={event.people_needed}
                                        subcategoryLabel={event.subcategory_label}
                                        currentUserId={user?.id}
                                        onDelete={loadData}
                                    />
                                ))}
                            </View>
                        )}
                        {pastEvents.length > 0 && (
                            <View>
                                <Text style={styles.monthHeader}>Past Events</Text>
                                {pastEvents.map(event => (
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
                                        creatorName={event.creatorName}
                                        creatorAvatar={event.creatorAvatar}
                                        joinMode={event.join_mode}
                                        spotsJoined={event.participantsCount}
                                        totalSpots={event.people_needed}
                                        subcategoryLabel={event.subcategory_label}
                                        currentUserId={user?.id}
                                        onDelete={loadData}
                                    />
                                ))}
                            </View>
                        )}
                        {upcomingEvents.length === 0 && pastEvents.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>No events yet</Text>
                                <Text style={styles.emptyDesc}>Join campus events to start tracking your performance!</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    Object.keys(grouped).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>No activities yet</Text>
                            <Text style={styles.emptyDesc}>Join campus events to start tracking your performance!</Text>
                        </View>
                    ) : (
                        Object.entries(grouped).map(([month, items]) => (
                            <View key={month} style={styles.monthGroup}>
                                <Text style={styles.monthHeader}>{month}</Text>
                                {items.map((activity) => (
                                    <View key={activity.id} style={styles.activityCard}>
                                        <View style={styles.activityLeft}>
                                            <View style={[styles.typeBadge, { backgroundColor: `${typeColor[activity.type] || Accent.other}20` }]}>
                                                <Text style={[styles.typeBadgeText, { color: typeColor[activity.type] || Accent.other }]}>
                                                    {activity.type.toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={styles.actTitle}>{activity.title}</Text>
                                            <Text style={styles.actDate}>
                                                {new Date(activity.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
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
                    )
                )}
            </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  topHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, backgroundColor: BG.main, borderBottomWidth: 1, borderBottomColor: BG.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: FW.hero, color: TX.primary },
  subtitle: { fontSize: 13, color: TX.secondary, marginTop: 2 },
  pointsBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: '#34D39920', paddingHorizontal: 10, paddingVertical: 6, 
    borderRadius: 10, borderWidth: 1, borderColor: '#34D39930'
  },
  pointsText: { color: '#34D399', fontWeight: '800', fontSize: 15 },

  tabBarContainer: { marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: BG.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: BG.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  activeTab: { backgroundColor: '#1E293B' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: TX.label },
  activeTabLabel: { color: TX.primary },
  countBadge: { backgroundColor: '#818CF8', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  countText: { color: '#000', fontSize: 10, fontWeight: '800' },

  scrollContent: { padding: 20, paddingBottom: 120 },
  
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryBox: { flex: 1, backgroundColor: BG.card, borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: BG.border },
  summaryNum: { fontSize: 22, fontWeight: FW.hero, color: TX.primary },
  summaryLabel: { fontSize: 11, color: TX.label, marginTop: 2 },

  filterScroll: { marginBottom: 20 },
  filterContainer: { gap: 8 },
  filterChip: { backgroundColor: BG.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BG.border },
  filterText: { fontSize: 12, fontWeight: '600', color: TX.secondary },
  filterChipActive: { backgroundColor: '#000', borderColor: '#fff' },
  filterTextActive: { color: '#fff' },

  monthGroup: { marginBottom: 24 },
  monthHeader: { fontSize: 14, fontWeight: '800', color: TX.label, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },

  activityCard: { backgroundColor: BG.card, borderRadius: 20, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BG.border },
  activityLeft: { flex: 1 },
  typeBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  actTitle: { fontSize: 15, fontWeight: '700', color: TX.primary },
  actDate: { fontSize: 11, color: TX.label, marginTop: 4 },
  pointsCol: { alignItems: 'center', marginLeft: 12 },
  pointsNum: { fontSize: 16, fontWeight: '800', color: '#34D399' },
  pointsLabel: { fontSize: 10, color: TX.label },

  inviteList: { gap: 16 },
  inviteCard: { backgroundColor: BG.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: BG.border },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  senderAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#818CF8' },
  avatarFallback: { backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: '900', color: '#818CF8' },
  senderName: { fontSize: 16, fontWeight: '800', color: TX.primary },
  inviteAction: { fontSize: 12, color: TX.label },
  eventTitle: { fontSize: 20, fontWeight: '900', color: TX.primary, marginBottom: 10 },
  eventMeta: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: TX.label, fontWeight: '600' },
  inviteActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  declineBtn: { backgroundColor: '#F8717115', borderWidth: 1, borderColor: '#F8717130' },
  acceptBtn: { backgroundColor: '#818CF8' },
  requestAcceptBtn: { backgroundColor: '#FBBF24' },
  declineText: { color: '#F87171', fontWeight: '700' },
  acceptText: { color: '#000', fontWeight: '800' },

  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TX.primary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: TX.label, textAlign: 'center', lineHeight: 22 },
});

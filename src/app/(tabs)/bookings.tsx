import { Accent, BG, BR, FW, Status, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

type Court = {
  id: string;
  name: string;
  type: 'tennis' | 'volleyball' | 'basketball';
  location: string;
};

type TimeSlot = {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  booked_by?: string;
  booked_by_name?: string;
};

type Booking = {
  id: string;
  court_name: string;
  court_type: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
};

const COURT_TYPES = [
  { key: 'all', label: 'All Courts', color: '#818CF8' },
  { key: 'tennis', label: 'Tennis', color: Accent.sports },
  { key: 'basketball', label: 'Basketball', color: Accent.fitness },
  { key: 'volleyball', label: 'Volleyball', color: Accent.trips },
];

const TIME_SLOTS = [
  { start: '06:00', end: '07:00' },
  { start: '07:00', end: '08:00' },
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '12:00', end: '13:00' },
  { start: '13:00', end: '14:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' },
  { start: '17:00', end: '18:00' },
];

function getNext7Days(): { date: Date; label: string; dayName: string }[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }
  return days;
}

export default function BookingsScreen() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string>>({});
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [booking, setBooking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'book' | 'my'>('book');

  const days = getNext7Days();

  useEffect(() => {
    loadCourts();
    loadMyBookings();
  }, [user]);

  useEffect(() => {
    if (selectedCourt) {
      loadSlotAvailability();
    }
  }, [selectedCourt, selectedDate]);

  async function loadCourts() {
    const { data } = await supabase.from('courts').select('*').order('name');
    if (data) setCourts(data);
  }

  async function loadSlotAvailability() {
    if (!selectedCourt) return;
    const dateStr = days[selectedDate].date.toISOString().split('T')[0];

    const { data } = await supabase
      .from('bookings')
      .select('start_time, booked_by, profiles(full_name)')
      .eq('court_id', selectedCourt.id)
      .eq('date', dateStr)
      .eq('status', 'confirmed');

    const slotMap: Record<string, string> = {};
    if (data) {
      data.forEach((b: any) => {
        slotMap[b.start_time] = b.booked_by;
      });
    }
    setBookedSlots(slotMap);
  }

  async function loadMyBookings() {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('*, courts(name, type)')
      .eq('booked_by', user.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (data) {
      setMyBookings(
        data.map((b: any) => ({
          id: b.id,
          court_name: b.courts?.name ?? 'Court',
          court_type: b.courts?.type ?? '',
          date: b.date,
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status,
        })),
      );
    }
  }

  async function bookSlot(start: string, end: string) {
    if (!user || !selectedCourt) return;

    const dateStr = days[selectedDate].date.toISOString().split('T')[0];

    Alert.alert(
      'Confirm Booking',
      `Book ${selectedCourt.name}\n${days[selectedDate].label} ${start} - ${end}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book',
          onPress: async () => {
            setBooking(true);
            const { error } = await supabase.from('bookings').insert({
              court_id: selectedCourt.id,
              booked_by: user.id,
              date: dateStr,
              start_time: start,
              end_time: end,
              status: 'confirmed',
            });

            if (error) {
              Alert.alert('Booking Failed', error.message);
            } else {
              // Award points for booking
              await supabase.from('activities').insert({
                user_id: user.id,
                title: `Booked ${selectedCourt.name}`,
                type: 'booking',
                points: 5,
              });

              // Update engagement score
              await supabase.rpc('increment_engagement_score', {
                user_id_input: user.id,
                points_input: 5,
              });

              Alert.alert('Booked!', 'Court reserved successfully. +5 points earned!');
              loadSlotAvailability();
              loadMyBookings();
            }
            setBooking(false);
          },
        },
      ],
    );
  }

  async function cancelBooking(bookingId: string) {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('bookings').delete().eq('id', bookingId);
          loadMyBookings();
          if (selectedCourt) loadSlotAvailability();
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadCourts();
    await loadMyBookings();
    if (selectedCourt) await loadSlotAvailability();
    setRefreshing(false);
  }

  const filteredCourts =
    selectedType === 'all' ? courts : courts.filter((c) => c.type === selectedType);

  const courtTypeColor: Record<string, string> = {
    tennis: Accent.sports,
    basketball: Accent.fitness,
    volleyball: Accent.trips,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TX.secondary} />
        }>
        <Text style={styles.title}>Facility Booking</Text>
        <Text style={styles.subtitle}>Reserve courts in advance to avoid conflicts</Text>

        {/* Tab Switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'book' && styles.tabActive]}
            onPress={() => setTab('book')}>
            <Text style={[styles.tabText, tab === 'book' && styles.tabTextActive]}>Book Court</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'my' && styles.tabActive]}
            onPress={() => setTab('my')}>
            <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>My Bookings</Text>
          </TouchableOpacity>
        </View>

        {tab === 'book' ? (
          <>
            {/* Court Type Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              {COURT_TYPES.map((ct) => (
                <TouchableOpacity
                  key={ct.key}
                  style={[
                    styles.filterChip,
                    selectedType === ct.key && { backgroundColor: ct.color, borderColor: ct.color },
                  ]}
                  onPress={() => {
                    setSelectedType(ct.key);
                    setSelectedCourt(null);
                  }}>
                  <Text style={[styles.filterText, selectedType === ct.key && { color: '#fff' }]}>
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Court Selection */}
            {!selectedCourt ? (
              <View>
                <Text style={styles.sectionLabel}>Select a Court</Text>
                {filteredCourts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No courts available</Text>
                  </View>
                ) : (
                  filteredCourts.map((court) => (
                    <TouchableOpacity
                      key={court.id}
                      style={styles.courtCard}
                      onPress={() => setSelectedCourt(court)}
                      activeOpacity={0.7}>
                      <View
                        style={[
                          styles.courtIcon,
                          { backgroundColor: `${courtTypeColor[court.type] || Accent.other}20` },
                        ]}>
                        <Text style={[styles.courtIconText, { color: courtTypeColor[court.type] || Accent.other }]}>
                          {court.type === 'tennis' ? '🎾' : court.type === 'basketball' ? '🏀' : '🏐'}
                        </Text>
                      </View>
                      <View style={styles.courtInfo}>
                        <Text style={styles.courtName}>{court.name}</Text>
                        <Text style={styles.courtLocation}>{court.location}</Text>
                        <View
                          style={[
                            styles.courtTypeBadge,
                            { backgroundColor: `${courtTypeColor[court.type]}20` },
                          ]}>
                          <Text style={[styles.courtTypeText, { color: courtTypeColor[court.type] }]}>
                            {court.type}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              <View>
                {/* Back button */}
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setSelectedCourt(null)}>
                  <Text style={styles.backText}>← All Courts</Text>
                </TouchableOpacity>

                <View style={styles.selectedCourtHeader}>
                  <Text style={styles.selectedCourtName}>{selectedCourt.name}</Text>
                  <Text style={styles.selectedCourtLoc}>{selectedCourt.location}</Text>
                </View>

                {/* Date scrollbar */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateRow}>
                  {days.map((day, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dateChip, selectedDate === idx && styles.dateChipActive]}
                      onPress={() => setSelectedDate(idx)}>
                      <Text style={[styles.dateDayName, selectedDate === idx && styles.dateDayNameActive]}>
                        {day.dayName}
                      </Text>
                      <Text style={[styles.dateLabel, selectedDate === idx && styles.dateLabelActive]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Time Slots */}
                <Text style={styles.sectionLabel}>Available Slots</Text>
                <View style={styles.slotsGrid}>
                  {TIME_SLOTS.map((slot) => {
                    const isBooked = !!bookedSlots[slot.start];
                    const isMyBooking = bookedSlots[slot.start] === user?.id;
                    return (
                      <TouchableOpacity
                        key={slot.start}
                        style={[
                          styles.slotCard,
                          isBooked && !isMyBooking && styles.slotBooked,
                          isMyBooking && styles.slotMine,
                        ]}
                        disabled={isBooked || booking}
                        onPress={() => bookSlot(slot.start, slot.end)}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.slotTime,
                            isBooked && !isMyBooking && styles.slotTimeBooked,
                            isMyBooking && styles.slotTimeMine,
                          ]}>
                          {slot.start}
                        </Text>
                        <Text
                          style={[
                            styles.slotStatus,
                            isBooked && !isMyBooking && { color: '#F87171' },
                            isMyBooking && { color: '#818CF8' },
                            !isBooked && { color: Status.open },
                          ]}>
                          {isMyBooking ? 'Your Booking' : isBooked ? 'Taken' : 'Available'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Status.open }]} />
                    <Text style={styles.legendText}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
                    <Text style={styles.legendText}>Taken</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#818CF8' }]} />
                    <Text style={styles.legendText}>Your Booking</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          /* My Bookings Tab */
          <View>
            {myBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                <Text style={styles.emptyText}>
                  Book a court to reserve your playing time!
                </Text>
              </View>
            ) : (
              myBookings.map((b) => (
                <View key={b.id} style={styles.bookingCard}>
                  <View style={styles.bookingLeft}>
                    <Text style={styles.bookingCourt}>{b.court_name}</Text>
                    <Text style={styles.bookingDate}>
                      {new Date(b.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.bookingTime}>{b.start_time} - {b.end_time}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => cancelBooking(b.id)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
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

  tabRow: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BR.button,
    alignItems: 'center',
    backgroundColor: BG.card,
    borderWidth: 1,
    borderColor: BG.border,
  },
  tabActive: { backgroundColor: '#818CF8', borderColor: '#818CF8' },
  tabText: { fontSize: 15, fontWeight: FW.header, color: TX.secondary },
  tabTextActive: { color: '#fff' },

  filterRow: { gap: 8, marginBottom: 20 },
  filterChip: {
    backgroundColor: BG.card,
    borderRadius: BR.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BG.border,
  },
  filterText: { fontSize: 13, fontWeight: FW.body, color: TX.secondary },

  sectionLabel: { fontSize: 16, fontWeight: FW.header, color: TX.primary, marginBottom: 12, marginTop: 8 },

  courtCard: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BG.border,
  },
  courtIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  courtIconText: { fontSize: 22 },
  courtInfo: { flex: 1 },
  courtName: { fontSize: 16, fontWeight: FW.cardTitle, color: TX.primary, marginBottom: 2 },
  courtLocation: { fontSize: 12, fontWeight: FW.caption, color: TX.label, marginBottom: 6 },
  courtTypeBadge: { borderRadius: BR.pill, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' },
  courtTypeText: { fontSize: 11, fontWeight: FW.header, textTransform: 'capitalize' },
  chevron: { fontSize: 24, color: TX.label },

  backBtn: { marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: FW.body, color: '#818CF8' },

  selectedCourtHeader: { marginBottom: 16 },
  selectedCourtName: { fontSize: 22, fontWeight: FW.header, color: TX.primary },
  selectedCourtLoc: { fontSize: 13, fontWeight: FW.caption, color: TX.label, marginTop: 2 },

  dateRow: { gap: 8, marginBottom: 20 },
  dateChip: {
    backgroundColor: BG.card,
    borderRadius: BR.smallButton,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG.border,
    minWidth: 72,
  },
  dateChipActive: { backgroundColor: '#818CF8', borderColor: '#818CF8' },
  dateDayName: { fontSize: 12, fontWeight: FW.header, color: TX.secondary },
  dateDayNameActive: { color: '#fff' },
  dateLabel: { fontSize: 11, fontWeight: FW.caption, color: TX.label, marginTop: 2 },
  dateLabelActive: { color: 'rgba(255,255,255,0.8)' },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotCard: {
    backgroundColor: BG.card,
    borderRadius: BR.smallButton,
    padding: 12,
    width: (width - 56) / 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG.border,
  },
  slotBooked: { backgroundColor: 'rgba(248, 113, 113, 0.08)', borderColor: 'rgba(248,113,113,0.3)' },
  slotMine: { backgroundColor: 'rgba(129, 140, 248, 0.1)', borderColor: 'rgba(129,140,248,0.4)' },
  slotTime: { fontSize: 15, fontWeight: FW.cardTitle, color: TX.primary, marginBottom: 2 },
  slotTimeBooked: { color: TX.label },
  slotTimeMine: { color: '#818CF8' },
  slotStatus: { fontSize: 10, fontWeight: FW.body },

  legend: { flexDirection: 'row', gap: 16, marginTop: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: FW.caption, color: TX.label },

  // My Bookings
  bookingCard: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BG.border,
  },
  bookingLeft: { flex: 1 },
  bookingCourt: { fontSize: 16, fontWeight: FW.cardTitle, color: TX.primary, marginBottom: 4 },
  bookingDate: { fontSize: 13, fontWeight: FW.body, color: TX.secondary },
  bookingTime: { fontSize: 13, fontWeight: FW.caption, color: TX.label, marginTop: 2 },
  cancelBtn: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderRadius: BR.smallButton,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelText: { color: '#F87171', fontSize: 13, fontWeight: FW.header },

  emptyState: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BG.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: FW.cardTitle, color: TX.secondary, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: FW.caption, color: TX.label, textAlign: 'center' },
});

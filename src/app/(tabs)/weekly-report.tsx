import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BG, TX, FW } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import WeeklyReport, { fetchWeeklyStats, WeeklyStats } from '@/components/weekly-report';

export default function WeeklyReportScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState<WeeklyStats>({
        eventsJoined: 0,
        sportsPlayed: 0,
        bookingsMade: 0,
        pointsEarned: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        if (!user) return;
        const newStats = await fetchWeeklyStats(user.id);
        setStats(newStats);
    }

    async function onRefresh() {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TX.secondary} />
                }
            >
                <Text style={styles.title}>Weekly Activity Report</Text>
                <Text style={styles.subtitle}>See a complete summary of how you spent your last seven days.</Text>
                <WeeklyReport stats={stats} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG.main },
    scroll: { padding: 20, paddingTop: 60, paddingBottom: 110 },
    title: { fontSize: 28, fontWeight: FW.hero, color: TX.primary, marginBottom: 4 },
    subtitle: { fontSize: 14, fontWeight: FW.caption, color: TX.secondary, marginBottom: 20 },
});

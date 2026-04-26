import { Bell, ChevronLeft, MessageSquare, UserPlus, CheckCircle, Clock, X, Check, MoreHorizontal, Heart, MessageCircle, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { getNotifications, markNotificationAsRead, subscribeToNotifications, handleNotificationAction, deleteNotification, Notification as NotifType } from "@/lib/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SectionList, StatusBar, Dimensions, Pressable, Alert, Image, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const NOTIFICATION_ICONS: Record<string, any> = {
    message: { icon: MessageSquare, color: "#818CF8", bg: "rgba(129,140,248,0.15)", label: "Chat" },
    invitation: { icon: UserPlus, color: "#FBBF24", bg: "rgba(251,191,36,0.15)", label: "Event" },
    join_request: { icon: UserPlus, color: "#FBBF24", bg: "rgba(251,191,36,0.15)", label: "Event" },
    request_accepted: { icon: CheckCircle, color: "#34D399", bg: "rgba(52,211,153,0.15)", label: "Update" },
    approval: { icon: CheckCircle, color: "#34D399", bg: "rgba(52,211,153,0.15)", label: "Update" },
    request_rejected: { icon: X, color: "#F87171", bg: "rgba(248,113,113,0.15)", label: "Update" },
    reminder: { icon: Clock, color: "#94A3B8", bg: "rgba(148,163,184,0.15)", label: "Reminder" },
    social_activity: { icon: Heart, color: "#F472B6", bg: "rgba(244,114,182,0.15)", label: "Social" },
};

type SectionData = {
    title: string;
    data: NotifType[];
};

const NotificationItem = ({ 
    item, 
    onDelete, 
    onJoin, 
    onRead, 
    showOptions 
}: { 
    onJoin: (item: NotifType) => void; 
    onRead: (id: string, route?: string) => void;
    showOptions: (item: NotifType) => void;
}) => {
    const config = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.reminder;
    const Icon = config.icon;
    const isActionable = (item.type === 'invitation' || item.type === 'join_request') && !item.is_read;

    const renderRightActions = (progress: any, dragX: any) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity 
                style={styles.deleteSwipeBtn} 
                onPress={() => onDelete(item.id)}
                activeOpacity={0.9}
            >
                <Animated.View style={[styles.swipeIconContainer, { transform: [{ translateX: trans }] }]}>
                    <Trash2 size={22} color="#FFFFFF" strokeWidth={2.5} />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
        const trans = dragX.interpolate({
            inputRange: [0, 80],
            outputRange: [-80, 0],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity 
                style={styles.joinSwipeBtn} 
                onPress={() => onJoin(item)}
                activeOpacity={0.9}
            >
                <Animated.View style={[styles.swipeIconContainer, { transform: [{ translateX: trans }] }]}>
                    <Check size={24} color="#FFFFFF" strokeWidth={3} />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    return (
        <Swipeable
            renderRightActions={renderRightActions}
            renderLeftActions={item.type === 'invitation' ? renderLeftActions : undefined}
            friction={1.5}
            rightThreshold={40}
            leftThreshold={40}
            onSwipeableRightOpen={() => onDelete(item.id)}
        >
            <Pressable
                style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
                onPress={() => onRead(item.id, item.data?.route)}
                onLongPress={() => showOptions(item)}
            >
                <View style={styles.notifMain}>
                    <View style={styles.avatarContainer}>
                        {item.data?.avatar ? (
                            <Image source={{ uri: item.data.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                                <Icon size={18} color={config.color} strokeWidth={2.5} />
                            </View>
                        )}
                    </View>

                    <View style={styles.textContent}>
                        <Text style={styles.notifTitle} numberOfLines={2}>
                            {item.body}
                        </Text>
                        <Text style={styles.timestamp}>{getTimeAgo(item.created_at)}</Text>
                    </View>

                    <View style={styles.rightContent}>
                        {isActionable ? (
                            <TouchableOpacity 
                                style={styles.inlineJoinBtn}
                                onPress={() => onJoin(item)}
                            >
                                <Text style={styles.joinBtnText}>Join</Text>
                            </TouchableOpacity>
                        ) : (
                            !item.is_read && <View style={styles.unreadBlueDot} />
                        )}
                    </View>
                </View>
            </Pressable>
        </Swipeable>
    );
};

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotifType[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'All' | 'Updates' | 'Messages' | 'Reminders'>('All');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const TABS = ['All', 'Updates', 'Messages', 'Reminders'] as const;

    const loadNotifications = useCallback(async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();

        const subscription = subscribeToNotifications((newNotification) => {
            setNotifications(prev => [newNotification, ...prev]);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loadNotifications]);

    const handleRead = async (id: string, route?: string) => {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        if (route) {
            router.push(route as any);
        }
    };

    const handleDelete = async (id: string) => {
        const removedItem = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        
        try {
            await deleteNotification(id);
        } catch (error) {
            console.error("Delete failed:", error);
            if (removedItem) {
                setNotifications(prev => [removedItem, ...prev].sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
            }
        }
    };

    const onJoin = async (notification: NotifType) => {
        setActionLoading(notification.id);
        try {
            await handleNotificationAction(notification, 'accept');
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            if (notification.data?.eventId) {
                router.push(`/chat/${notification.data.eventId}` as any);
            }
        } catch (error) {
            console.error("Action failed:", error);
            Alert.alert("Action Failed", "Could not complete the request. Please try again.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const { markAllAsRead } = await import("@/lib/notifications");
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const showOptions = (item: NotifType) => {
        Alert.alert(
            "Notification Options",
            "Choose an action for this notification.",
            [
                { text: "Mark as Read", onPress: () => handleRead(item.id) },
                { text: "Delete", style: "destructive", onPress: () => handleDelete(item.id) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const groupedNotifications = useMemo(() => {
        const filtered = notifications.filter(n => {
            if (activeTab === 'All') return true;
            if (activeTab === 'Messages') return n.type === 'message';
            if (activeTab === 'Reminders') return n.type === 'reminder';
            if (activeTab === 'Updates') return ['invitation', 'join_request', 'request_accepted', 'request_rejected', 'approval'].includes(n.type);
            return true;
        });

        const now = new Date();
        const sections: SectionData[] = [
            { title: "Highlights", data: [] },
            { title: "New", data: [] },
            { title: "Today", data: [] },
            { title: "Earlier", data: [] },
        ];

        filtered.forEach(n => {
            const createdAt = new Date(n.created_at);
            const diffInMins = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
            const isToday = createdAt.toDateString() === now.toDateString();

            // Highlights: invitations, high-priority mentions, etc.
            if ((n.type === 'invitation' || n.type === 'join_request') && !n.is_read) {
                sections[0].data.push(n);
            } else if (diffInMins < 15) {
                sections[1].data.push(n);
            } else if (isToday) {
                sections[2].data.push(n);
            } else {
                sections[3].data.push(n);
            }
        });

        return sections.filter(s => s.data.length > 0);
    }, [notifications, activeTab]);

    const renderItem = ({ item }: { item: NotifType }) => (
        <NotificationItem 
            item={item} 
            onDelete={handleDelete} 
            onJoin={() => onJoin(item)} 
            onRead={handleRead}
            showOptions={showOptions}
        />
    );

    const renderSectionHeader = ({ section: { title } }: { section: SectionData }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Glassy Header */}
            <View style={styles.headerWrapper}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <ChevronLeft size={24} color="#F1F5F9" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleMarkAllAsRead}>
                        <CheckCircle size={24} color="#F1F5F9" />
                    </TouchableOpacity>
                </View>

                {/* Pill Tabs */}
                <View style={styles.tabBar}>
                    {TABS.map(tab => {
                        const active = activeTab === tab;
                        return (
                            <TouchableOpacity 
                                key={tab} 
                                onPress={() => setActiveTab(tab)}
                                style={styles.tabWrapper}
                            >
                                {active ? (
                                    <LinearGradient
                                        colors={["#818CF8", "#A78BFA"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.activeTabGradient}
                                    >
                                        <Text style={styles.activeTabText}>{tab}</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.inactiveTab}>
                                        <Text style={styles.inactiveTabText}>{tab}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <SectionList
                sections={groupedNotifications}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={loadNotifications}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Bell size={48} color="#1E2A40" strokeWidth={1.5} />
                            <Text style={styles.emptyText}>All caught up!</Text>
                            <Text style={styles.emptySubtext}>No new notifications at the moment.</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

function getTimeAgo(dateString: string) {
    const now = new Date();
    const then = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#020617",
    },
    headerWrapper: {
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.05)",
        zIndex: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    iconBtn: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#F1F5F9",
        letterSpacing: -0.5,
    },
    tabBar: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    tabWrapper: {
        flex: 1,
    },
    activeTabGradient: {
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    activeTabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    inactiveTab: {
        paddingVertical: 8,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    inactiveTabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#94A3B8",
    },
    listContent: {
        paddingBottom: 120,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
        backgroundColor: "#020617",
    },
    sectionHeaderText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#64748B",
        letterSpacing: 1,
    },
    notificationItem: {
        backgroundColor: "#020617",
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    unreadItem: {
        backgroundColor: "rgba(129,140,248,0.02)",
    },
    notifMain: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#1E2A40",
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    textContent: {
        flex: 1,
        justifyContent: "center",
    },
    notifTitle: {
        fontSize: 14,
        color: "#F1F5F9",
        lineHeight: 18,
        fontWeight: "500",
    },
    timestamp: {
        color: "#64748B",
        fontSize: 11,
        marginTop: 2,
    },
    rightContent: {
        width: 60,
        alignItems: "flex-end",
        justifyContent: "center",
    },
    inlineJoinBtn: {
        backgroundColor: "#818CF8",
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    joinBtnText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
    },
    unreadIndicator: {
        width: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    unreadBlueDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#3B82F6",
    },
    swipeActions: {
        flexDirection: "row",
    },
    swipeBtn: {
        width: 70,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    deleteSwipeBtn: {
        backgroundColor: "#EF4444",
        width: 80,
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
    },
    joinSwipeBtn: {
        backgroundColor: "#10B981",
        width: 80,
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
    },
    swipeIconContainer: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#F1F5F9",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#475569",
        marginTop: 8,
    },
});

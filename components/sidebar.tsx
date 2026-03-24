import { BG, BR, FW, TX } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

type SidebarProps = {
    visible: boolean;
    onClose: () => void;
};

type MenuItem = {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    description: string;
    route?: string;
    color: string;
    onPress?: () => void;
};

export default function Sidebar({ visible, onClose }: SidebarProps) {
    const router = useRouter();
    const { profile, user, signOut } = useAuth();
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 280,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 240,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 240,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    function navigate(route: string) {
        onClose();
        setTimeout(() => router.push(route as any), 250);
    }

    async function handleSignOut() {
        onClose();
        setTimeout(async () => {
            await signOut();
        }, 250);
    }

    const menuItems: MenuItem[] = [
        {
            icon: 'emergency',
            label: 'SOS',
            description: 'Emergency alert & contacts',
            route: '/sos',
            color: '#F87171',
        },
        {
            icon: 'event',
            label: 'Facility Booking',
            description: 'Reserve courts & facilities',
            route: '/bookings',
            color: '#38BDF8',
        },
        {
            icon: 'history',
            label: 'Past Activities',
            description: 'Your activity history & points',
            route: '/activities',
            color: '#34D399',
        },
        {
            icon: 'notifications',
            label: 'Notifications',
            description: 'Your alerts & updates',
            route: '/notifications',
            color: '#818CF8',
        },
        {
            icon: 'settings',
            label: 'Settings',
            description: 'App preferences',
            route: '/settings',
            color: '#818CF8',
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropAnim },
                    ]}
                />
            </TouchableWithoutFeedback>

            {/* Drawer */}
            <Animated.View
                style={[
                    styles.drawer,
                    { transform: [{ translateX: slideAnim }] },
                ]}>
                {/* Profile Header */}
                <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.profileName}>{profile?.full_name || 'Student'}</Text>
                    <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                    <View style={styles.scoreBadge}>
                        <MaterialIcons name="star" size={14} color="#FBBF24" />
                        <Text style={styles.scoreText}>{profile?.engagement_score ?? 0} pts</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.menuItem}
                            onPress={() => item.route && navigate(item.route)}
                            activeOpacity={0.7}>
                            <View style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}>
                                <MaterialIcons name={item.icon} size={22} color={item.color} />
                            </View>
                            <View style={styles.menuText}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuDesc}>{item.description}</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={TX.label} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.divider} />

                {/* Sign Out */}
                <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={handleSignOut}
                    activeOpacity={0.7}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(248,113,113,0.12)' }]}>
                        <MaterialIcons name="logout" size={22} color="#F87171" />
                    </View>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* App version */}
                <Text style={styles.version}>LinkLoop v1.0</Text>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: DRAWER_WIDTH,
        height: '100%',
        backgroundColor: BG.card,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        paddingTop: 56,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 6, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 24,
    },

    // Profile section
    profileSection: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#818CF8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: { fontSize: 26, fontWeight: FW.hero, color: '#fff' },
    profileName: { fontSize: 18, fontWeight: FW.header, color: TX.primary, marginBottom: 2 },
    profileEmail: { fontSize: 13, fontWeight: FW.caption, color: TX.label },
    scoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        backgroundColor: 'rgba(251,191,36,0.12)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BR.pill,
    },
    scoreText: { fontSize: 12, fontWeight: FW.header, color: '#FBBF24' },

    divider: {
        height: 1,
        backgroundColor: BG.border,
        marginHorizontal: 24,
        marginVertical: 8,
    },

    // Menu
    menuSection: { paddingHorizontal: 12, paddingVertical: 8 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: BR.smallButton,
        gap: 14,
        marginBottom: 2,
    },
    menuIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: { flex: 1 },
    menuLabel: { fontSize: 15, fontWeight: FW.cardTitle, color: TX.primary, marginBottom: 1 },
    menuDesc: { fontSize: 12, fontWeight: FW.caption, color: TX.label },

    // Sign out
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        gap: 14,
        marginTop: 4,
    },
    signOutText: { fontSize: 15, fontWeight: FW.cardTitle, color: '#F87171' },

    version: {
        position: 'absolute',
        bottom: 20,
        left: 24,
        fontSize: 11,
        fontWeight: FW.caption,
        color: TX.label,
    },
});

import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Home, Bell, User, Settings } from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { getUnreadCount, subscribeToNotifications } from "@/lib/notifications";

export default function NavBar() {
    const router = useRouter();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Initial count
        getUnreadCount().then(setUnreadCount);

        // Subscription for real-time updates
        const channel = subscribeToNotifications((notif) => {
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            channel.unsubscribe();
        };
    }, []);

    const navItems = [
        { icon: Home, label: "Home", route: "/", active: pathname === "/" },
        { icon: Bell, label: "Alerts", route: "/notifications", active: pathname === "/notifications", hasBadge: unreadCount > 0 },
        { icon: User, label: "Profile", route: "/profile", active: pathname === "/profile" },
        { icon: Settings, label: "Settings", route: "/settings", active: pathname === "/settings" },
    ];

    return (
        <View style={styles.wrapper}>
            <View style={styles.pill}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.navItem}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={0.7}
                        >
                            <View>
                                <Icon
                                    size={22}
                                    color={item.active ? "#818CF8" : "#475569"}
                                    strokeWidth={item.active ? 2.5 : 2}
                                />
                                {item.hasBadge && <View style={styles.badge} />}
                            </View>
                            {item.active && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        bottom: 24,
        left: 20,
        right: 20,
        alignItems: "center",
        zIndex: 100,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#141B2D",
        borderRadius: 40,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#1E2A40",
        gap: 4,
        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.4)",
        elevation: 20,
    },
    navItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 32,
        position: "relative",
    },
    activeDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#818CF8",
    },
    badge: {
        position: "absolute",
        top: -4,
        right: -4,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#F472B6",
        borderWidth: 1.5,
        borderColor: "#141B2D",
    },
});
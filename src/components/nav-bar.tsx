import { Home, Calendar, Plus, BookOpen, User } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type NavItem = {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  route: string;
  active: boolean;
  isCreate?: boolean;
};

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { icon: Home,     label: 'Home',       route: '/',           active: pathname === '/' },
    { icon: Calendar, label: 'Activities', route: '/activities', active: pathname === '/activities' },
    { icon: Plus,     label: 'Create',     route: '/category',   active: pathname === '/category', isCreate: true },
    { icon: BookOpen, label: 'Bookings',   route: '/bookings',   active: pathname === '/bookings' },
    { icon: User,     label: 'Profile',    route: '/profile',    active: pathname === '/profile' },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isCreate) {
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.createBtn}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.85}
              >
                <Icon size={22} color="#0F172A" strokeWidth={2.5} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Icon
                size={22}
                color={item.active ? '#818CF8' : '#475569'}
                strokeWidth={item.active ? 2.5 : 2}
              />
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
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141B2D',
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1E2A40',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 32,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#818CF8',
  },
  createBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#818CF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#818CF8',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});

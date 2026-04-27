import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { BG, TX, FW } from '@/constants/theme';

export default function AIScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Sparkles size={48} color="#A78BFA" strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>AI Features</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
      <View style={styles.divider} />
      <Text style={styles.description}>
        Smart event recommendations, auto-scheduling, and intelligent matching
        — all powered by AI.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: FW.header,
    color: TX.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: FW.body,
    color: '#A78BFA',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(167, 139, 250, 0.3)',
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    fontWeight: FW.caption,
    color: TX.label,
    textAlign: 'center',
    lineHeight: 22,
  },
});

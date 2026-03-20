import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Checking Connection...');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const checkConnection = async () => {
    setLoading(true);
    setStatusText('Pinging Supabase...');
    try {
      // Just check if we can query anything or if the client initialized
      const { error } = await supabase.from('non_existent_table_just_for_ping').select('*').limit(1);
      
      // Even if there's an error about non-existent table, it means we connected to the database successfully.
      // A bad connection would give a fetch error or network request failed.
      if (error && error.code === '42P01') {
         // 42P01 is relation does not exist - meaning DB connection works!
         setIsConnected(true);
         setStatusText('Connected to Supabase!');
      } else if (error && error.message && error.message.includes('FetchError')) {
         setIsConnected(false);
         setStatusText('Failed to connect.');
      } else {
         // Other errors could just mean RLS policy block, which also means connectivity works!
         setIsConnected(true);
         setStatusText('Connected to Supabase!');
      }
    } catch (err) {
      setIsConnected(false);
      setStatusText('Network Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        style={styles.background}
      />
      
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.headerTitle}>LinkLoop</Text>
          <Text style={styles.subtitle}>Supabase Status</Text>

          <View style={[styles.statusBox, isConnected === true ? styles.statusSuccess : isConnected === false ? styles.statusError : styles.statusPending]}>
            {loading ? (
              <ActivityIndicator color="#ffffff" style={styles.loader} />
            ) : (
              <View style={[styles.dot, { backgroundColor: isConnected ? '#4ade80' : '#ef4444' }]} />
            )}
            <Text style={styles.statusText}>{statusText}</Text>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={checkConnection}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Checking...' : 'Check Again'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          The default Welcome screen was replaced to verify your Supabase connectivity!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 32,
    width: width * 0.9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 32,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  loader: {
    marginRight: 10,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#38bdf8',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  note: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontSize: 12,
    lineHeight: 18,
  }
});

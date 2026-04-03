import { BG, BR, FW, TX } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  Linking as RNLinking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

type TrustedContact = {
  id: string;
  name: string;
  phone: string;
};

export default function SOSScreen() {
  const { user, profile } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState("");
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadContacts();
    startPulse();
    requestLocation();
  }, []);

  async function requestLocation() {
    setLocationLoading(true);
    setLocationError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Location permission denied. Location will not be included in alerts.",
        );
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);
    } catch {
      setLocationError("Unable to get location. Check your GPS settings.");
    } finally {
      setLocationLoading(false);
    }
  }

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }

  async function loadContacts() {
    if (!user) return;
    const { data } = await supabase
      .from("trusted_contacts")
      .select("*")
      .eq("user_id", user.id);
    if (data) setContacts(data);
  }
//validation
  async function addContact() {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert("Error", "Please enter both name and phone number.");
      return;
    }
    if (!user) return;

    const { error } = await supabase.from("trusted_contacts").insert({
      user_id: user.id,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setNewContactName("");
      setNewContactPhone("");
      setShowAddContact(false);
      loadContacts();
    }
  }

  async function removeContact(id: string) {
    Alert.alert("Remove Contact", "Remove this trusted contact?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await supabase.from("trusted_contacts").delete().eq("id", id);
          loadContacts();
        },
      },
    ]);
  }

  async function triggerSOS() {
    Alert.alert(
      "🚨 EMERGENCY SOS",
      "This will:\n• Alert campus security\n• Share your location\n• Notify your trusted contacts\n\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "SEND SOS",
          style: "destructive",
          onPress: async () => {
            setSending(true);

            // Log the SOS alert
            // Get fresh location at time of SOS
            let freshLocation = location;
            if (!freshLocation) {
              try {
                const { status } =
                  await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                  freshLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                  });
                  setLocation(freshLocation);
                }
              } catch {
                /* proceed without location */
              }
            }

            const coords = freshLocation?.coords;
            const mapsLink = coords
              ? `https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`
              : null;

            const sosData: any = {
              user_id: user!.id,
              student_name: profile?.full_name || "Unknown Student",
              student_email: user!.email,
              message: message || "Emergency! Need immediate help!",
              status: "active",
              ...(coords && {
                latitude: coords.latitude,
                longitude: coords.longitude,
              }),
            };

            const { error } = await supabase.from("sos_alerts").insert(sosData);

            if (error) {
              Alert.alert(
                "Error",
                "Failed to send SOS. Try calling security directly.",
              );
              setSending(false);
              return;
            }

            // Notify trusted contacts via SMS link
            for (const contact of contacts) {
              const locationPart = mapsLink
                ? `\n📍 Live Location: ${mapsLink}`
                : "";
              const smsBody = encodeURIComponent(
                `🚨 EMERGENCY SOS from ${profile?.full_name || "A student"} at SLIIT campus!\n${message || "Needs immediate help!"}${locationPart}`,
              );
              const smsUrl =
                Platform.OS === "ios"
                  ? `sms:${contact.phone}&body=${smsBody}`
                  : `sms:${contact.phone}?body=${smsBody}`;
              try {
                await RNLinking.openURL(smsUrl);
              } catch {
                // SMS not available, continue
              }
            }

            setSending(false);
            setSent(true);

            setTimeout(() => setSent(false), 10000);
          },
        },
      ],
    );
  }

  async function callSecurity() {
    const securityNumber = "tel:+94112345678"; // Campus security number
    try {
      await RNLinking.openURL(securityNumber);
    } catch {
      Alert.alert("Error", "Unable to place call. Please dial manually.");
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>
          Press the SOS button to alert campus security and your trusted
          contacts
        </Text>

        {/* Live Location Card */}
        <TouchableOpacity
          style={[
            styles.locationCard,
            locationError ? styles.locationCardError : null,
            !locationLoading && !locationError && location
              ? styles.locationCardOk
              : null,
          ]}
          onPress={() => {
            if (location?.coords) {
              const { latitude, longitude } = location.coords;
              RNLinking.openURL(
                `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`,
              );
            } else {
              requestLocation();
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Your Live Location</Text>
            {locationLoading ? (
              <Text style={styles.locationSub}>Getting GPS location…</Text>
            ) : locationError ? (
              <Text style={[styles.locationSub, styles.locationSubError]}>
                {locationError}
              </Text>
            ) : location ? (
              <>
                <Text style={styles.locationSub}>
                  {location.coords.latitude.toFixed(5)},{" "}
                  {location.coords.longitude.toFixed(5)}
                </Text>
                <Text style={styles.locationTap}>Tap to open in Maps</Text>
              </>
            ) : (
              <Text style={styles.locationSub}>Tap to retry</Text>
            )}
          </View>
          {!locationLoading && !locationError && location && (
            <Text style={styles.locationBadge}>✓ Live</Text>
          )}
        </TouchableOpacity>

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.sosButton, sent && styles.sosSent]}
              onPress={triggerSOS}
              disabled={sending || sent}
              activeOpacity={0.7}
            >
              <Text style={styles.sosIcon}>{sent ? "✓" : "🆘"}</Text>
              <Text style={styles.sosText}>
                {sending ? "SENDING..." : sent ? "SOS SENT" : "SOS"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.sosHint}>
            Press and confirm to send emergency alert
          </Text>
        </View>

        {/* Optional Message */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Message (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="e.g., Stuck in elevator, Building C..."
            placeholderTextColor={TX.label}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={200}
          />
        </View>

        {/* Direct Call */}
        <TouchableOpacity
          style={styles.callCard}
          onPress={callSecurity}
          activeOpacity={0.8}
        >
          <View style={styles.callIcon}>
            <Text style={styles.callEmoji}>📞</Text>
          </View>
          <View style={styles.callInfo}>
            <Text style={styles.callTitle}>Call Campus Security</Text>
            <Text style={styles.callSub}>
              Direct phone call to security office
            </Text>
          </View>
        </TouchableOpacity>

        {/* Trusted Contacts */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Trusted Contacts</Text>
            <TouchableOpacity
              onPress={() => setShowAddContact(!showAddContact)}
            >
              <Text style={styles.addBtn}>
                {showAddContact ? "Cancel" : "+ Add"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardDesc}>
            These contacts will be notified when you trigger an SOS alert
          </Text>

          {showAddContact && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.addInput}
                placeholder="Contact name"
                placeholderTextColor={TX.label}
                value={newContactName}
                onChangeText={setNewContactName}
              />
              <TextInput
                style={styles.addInput}
                placeholder="Phone number"
                placeholderTextColor={TX.label}
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.addSaveBtn} onPress={addContact}>
                <Text style={styles.addSaveText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          )}

          {contacts.length === 0 ? (
            <Text style={styles.noContacts}>
              No trusted contacts added yet. Add friends who can help in
              emergencies.
            </Text>
          ) : (
            contacts.map((contact) => (
              <View key={contact.id} style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactInitial}>
                    {contact.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => removeContact(contact.id)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Safety Tips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Safety Tips</Text>
          {[
            "Keep your phone charged while on campus",
            "Share your class schedule with trusted contacts",
            "Know the nearest emergency exits",
            "Save campus security number in speed dial",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.main },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 110 },
  title: {
    fontSize: 28,
    fontWeight: FW.hero,
    color: TX.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: FW.caption,
    color: TX.secondary,
    marginBottom: 24,
  },

  sosSection: { alignItems: "center", marginBottom: 28 },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#F87171",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F87171",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  sosSent: { backgroundColor: "#34D399" },
  sosIcon: { fontSize: 40, marginBottom: 4 },
  sosText: {
    fontSize: 18,
    fontWeight: FW.hero,
    color: "#fff",
    letterSpacing: 2,
  },
  sosHint: {
    fontSize: 12,
    fontWeight: FW.caption,
    color: TX.label,
    marginTop: 12,
  },

  card: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BG.border,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: FW.cardTitle,
    color: TX.primary,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: FW.caption,
    color: TX.label,
    marginBottom: 16,
  },
  addBtn: {
    fontSize: 14,
    fontWeight: FW.body,
    color: "#818CF8",
    marginBottom: 8,
  },

  messageInput: {
    backgroundColor: BG.input,
    borderRadius: BR.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TX.primary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: BG.border,
    height: 70,
    textAlignVertical: "top",
  },

  callCard: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  callIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  callEmoji: { fontSize: 22 },
  callInfo: { flex: 1 },
  callTitle: { fontSize: 16, fontWeight: FW.cardTitle, color: TX.primary },
  callSub: {
    fontSize: 12,
    fontWeight: FW.caption,
    color: TX.label,
    marginTop: 2,
  },

  addForm: { gap: 10, marginBottom: 16 },
  addInput: {
    backgroundColor: BG.input,
    borderRadius: BR.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TX.primary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: BG.border,
  },
  addSaveBtn: {
    backgroundColor: "#818CF8",
    borderRadius: BR.smallButton,
    paddingVertical: 12,
    alignItems: "center",
  },
  addSaveText: { color: "#fff", fontSize: 15, fontWeight: FW.header },

  noContacts: {
    fontSize: 13,
    fontWeight: FW.caption,
    color: TX.label,
    lineHeight: 20,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BG.border,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG.input,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactInitial: { fontSize: 16, fontWeight: FW.header, color: TX.primary },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: FW.body, color: TX.primary },
  contactPhone: {
    fontSize: 12,
    fontWeight: FW.caption,
    color: TX.label,
    marginTop: 2,
  },
  removeBtn: { fontSize: 16, color: "#F87171", padding: 8 },

  tipRow: { flexDirection: "row", marginBottom: 8 },
  tipBullet: { color: TX.label, marginRight: 8 },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: FW.caption,
    color: TX.secondary,
    lineHeight: 20,
  },

  locationCard: {
    backgroundColor: BG.card,
    borderRadius: BR.card,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.3)",
  },
  locationCardOk: { borderColor: "rgba(52, 211, 153, 0.4)" },
  locationCardError: { borderColor: "rgba(248, 113, 113, 0.4)" },
  locationIcon: { fontSize: 22, marginRight: 12 },
  locationInfo: { flex: 1 },
  locationTitle: {
    fontSize: 14,
    fontWeight: FW.cardTitle,
    color: TX.primary,
    marginBottom: 2,
  },
  locationSub: { fontSize: 12, fontWeight: FW.caption, color: TX.label },
  locationSubError: { color: "#F87171" },
  locationTap: { fontSize: 11, color: "#818CF8", marginTop: 2 },
  locationBadge: {
    fontSize: 11,
    fontWeight: FW.header,
    color: "#34D399",
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
});

import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, StatusBar, Alert, Modal, FlatList, ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, ChevronRight, MapPin, Check } from "lucide-react-native";

import { getEventById, updateEvent } from "@/lib/events";

const INSIDE_LOCATIONS = [
  "Play ground", "Computing faculty", "Business faculty", "Mini auditorium",
  "Auditorium", "Computer lab", "Engineering faculty", "Cafeteria",
  "Lab rooms", "Volleyball court", "Basketball court", "Badminton court",
  "Swimming pool", "Tennis court", "Library", "Study halls",
  "Student Center", "Common room", "Type my own...",
];

function parseEventDate(dateStr: string) {
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parseEventTime(timeStr: string) {
  const base = new Date();
  if (!timeStr) return base;
  const [hour = "0", minute = "0"] = timeStr.split(":");
  base.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
  return base;
}

export default function EditEventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();

  const [title, setTitle] = useState("");
  const [customActivity, setCustomActivity] = useState("");
  const [locationType, setLocationType] = useState<"inside" | "outside">("inside");
  const [insideLocation, setInsideLocation] = useState("");
  const [customInsideLocation, setCustomInsideLocation] = useState("");
  const [outsideLocation, setOutsideLocation] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [peopleNeeded, setPeopleNeeded] = useState(4);
  const [joinMode, setJoinMode] = useState<"direct" | "request">("direct");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [subcategoryLabel, setSubcategoryLabel] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      if (!eventId) {
        Alert.alert("Error", "Missing event id.");
        router.back();
        return;
      }

      try {
        const event = await getEventById(eventId);
        if (!active) return;

        setTitle(event.title || "");
        setCustomActivity(event.custom_activity || "");
        setLocationType((event.location_type || "inside") as "inside" | "outside");
        setPeopleNeeded(event.people_needed || 4);
        setJoinMode((event.join_mode || "direct") as "direct" | "request");
        setDate(parseEventDate(event.event_date));
        setTime(parseEventTime(event.event_time));
        setCategoryLabel(event.category_label || "Custom");
        setSubcategoryLabel(event.subcategory_label || "");
        setIsCustom(Boolean(event.custom_activity));

        if (event.location_type === "outside") {
          setOutsideLocation(event.location || "");
        } else if (INSIDE_LOCATIONS.includes(event.location)) {
          setInsideLocation(event.location || "");
          setShowCustomInput(false);
        } else {
          setCustomInsideLocation(event.location || "");
          setShowCustomInput(true);
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Could not load this event.");
        router.back();
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvent();
    return () => {
      active = false;
    };
  }, [eventId, router]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const loc = locationType === "inside"
      ? (showCustomInput ? customInsideLocation : insideLocation)
      : outsideLocation;

    if (!title.trim()) nextErrors.title = "*Title is required*";
    if (isCustom && !customActivity.trim()) nextErrors.customActivity = "*Activity is required*";
    if (!loc.trim()) nextErrors.location = "*Location is required*";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventD = new Date(date);
    eventD.setHours(0, 0, 0, 0);

    if (eventD < today) nextErrors.date = "*Cannot select past date*";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const formatDate = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  const formatTime = (t: Date) => {
    const h = t.getHours();
    const m = t.getMinutes().toString().padStart(2, "0");
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  };

  const handleSave = async () => {
    if (!eventId || !validate()) return;

    const loc = locationType === "inside"
      ? (showCustomInput ? customInsideLocation : insideLocation)
      : outsideLocation;

    setSaving(true);
    try {
      await updateEvent(eventId, {
        title,
        customActivity,
        locationType,
        location: loc,
        eventDate: date,
        eventTime: time,
        peopleNeeded,
        joinMode,
      });

      Alert.alert("Saved", "Your event details were updated.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#080E1C" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#818CF8" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080E1C" />

      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#CBD5E1" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navStep}>EDIT EVENT</Text>
          <Text style={styles.navTitle}>Update Details</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.breadRow}>
          <View style={styles.breadPill}>
            <Text style={styles.breadText}>
              {isCustom ? "Custom Event" : subcategoryLabel ? `${categoryLabel}  ›  ${subcategoryLabel}` : categoryLabel}
            </Text>
          </View>
        </View>

        {isCustom && (
          <>
            <Text style={styles.label}>What's the Activity?</Text>
            <TextInput
              placeholder="e.g. Avurudu party, debate practice..."
              placeholderTextColor="#2D3E55"
              style={[styles.input, customActivity && styles.inputActive]}
              value={customActivity}
              onChangeText={setCustomActivity}
            />
            {errors.customActivity && <Text style={styles.errorText}>{errors.customActivity}</Text>}
          </>
        )}

        <Text style={styles.label}>Event Title</Text>
        <TextInput
          placeholder="Give your event a name..."
          placeholderTextColor="#2D3E55"
          style={[styles.input, title && styles.inputActive]}
          value={title}
          onChangeText={setTitle}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        <Text style={styles.label}>Location</Text>
        <View style={styles.toggleRow}>
          {(["inside", "outside"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.toggleBtn, locationType === type && styles.toggleBtnActive]}
              onPress={() => {
                setLocationType(type);
                if (type === "inside") {
                  setShowDropdown(true);
                }
              }}
            >
              <MapPin size={13} color={locationType === type ? "#0F172A" : "#475569"} strokeWidth={2.5} />
              <Text style={[styles.toggleBtnText, locationType === type && { color: "#0F172A" }]} numberOfLines={1}>
                {type === "inside"
                  ? (showCustomInput ? "Custom Inside Spot" : insideLocation || "Inside Uni")
                  : "Outside Uni"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {locationType === "inside" ? (
          <View>
            <TouchableOpacity style={[styles.selectorBtn, (insideLocation || customInsideLocation) && styles.inputActive]} onPress={() => setShowDropdown(true)}>
              <MapPin size={13} color="#818CF8" strokeWidth={2.5} />
              <Text style={styles.selectorText}>
                {showCustomInput ? customInsideLocation || "Choose exact inside location" : insideLocation || "Select inside uni location"}
              </Text>
            </TouchableOpacity>

            {showCustomInput && (
              <View style={styles.customLocContainer}>
                <Text style={styles.customLabel}>TAP TO SPECIFY EXACT SPOT:</Text>
                <TextInput
                  placeholder="e.g. Block C Room 204, Lab 3..."
                  placeholderTextColor="#475569"
                  style={[styles.input, { borderColor: "#818CF8", borderWidth: 1.5 }]}
                  value={customInsideLocation}
                  onChangeText={setCustomInsideLocation}
                />
              </View>
            )}

            <Modal visible={showDropdown} transparent animationType="fade">
              <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDropdown(false)} activeOpacity={1}>
                <View style={styles.dropdownModal}>
                  <Text style={styles.dropdownModalTitle}>Select Location</Text>
                  <FlatList
                    data={INSIDE_LOCATIONS}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                      const isTypeOwn = item === "Type my own...";
                      const isSelected = !isTypeOwn && insideLocation === item;
                      return (
                        <TouchableOpacity
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                          onPress={() => {
                            if (isTypeOwn) {
                              setShowCustomInput(true);
                              setInsideLocation("");
                            } else {
                              setInsideLocation(item);
                              setShowCustomInput(false);
                              setCustomInsideLocation("");
                            }
                            setShowDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isTypeOwn && styles.dropdownItemTypeOwn, isSelected && styles.dropdownItemTextSelected]}>
                            {item}
                          </Text>
                          {isSelected && <Check size={14} color="#818CF8" strokeWidth={3} />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>
        ) : (
          <View>
            <TextInput
              placeholder="e.g. Pizza Hut Malabe, One Galle Face..."
              placeholderTextColor="#2D3E55"
              style={[styles.input, outsideLocation && styles.inputActive]}
              value={outsideLocation}
              onChangeText={setOutsideLocation}
            />
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>
        )}

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dtBtn} onPress={() => setShowDate(true)}>
              <Clock size={13} color="#818CF8" strokeWidth={2.5} />
              <Text style={styles.dtText}>{formatDate(date)}</Text>
            </TouchableOpacity>
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity style={styles.dtBtn} onPress={() => setShowTime(true)}>
              <Clock size={13} color="#818CF8" strokeWidth={2.5} />
              <Text style={styles.dtText}>{formatTime(time)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showDate} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDate(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDate(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                textColor="#F1F5F9"
                locale="en_US"
                onChange={(_: any, d?: Date) => { if (d) setDate(d); }}
                style={{ alignSelf: "center", width: "100%" }}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={showTime} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTime(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTime(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                is24Hour={false}
                locale="en_US"
                textColor="#F1F5F9"
                onChange={(_: any, t?: Date) => { if (t) setTime(t); }}
                style={{ alignSelf: "center", width: "100%" }}
              />
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>People Needed</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setPeopleNeeded(Math.max(1, peopleNeeded - 1))}>
            <Text style={styles.stepSym}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepVal}>{peopleNeeded}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setPeopleNeeded(peopleNeeded + 1)}>
            <Text style={styles.stepSym}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Join Mode</Text>
        <View style={styles.joinRow}>
          {[
            { mode: "direct" as const, title: "Open to Join", sub: "Anyone can join instantly", dot: "#34D399" },
            { mode: "request" as const, title: "By Request", sub: "You approve each person", dot: "#FBBF24" },
          ].map((j) => (
            <TouchableOpacity
              key={j.mode}
              style={[styles.joinCard, joinMode === j.mode && { borderColor: j.dot, backgroundColor: j.dot + "10" }]}
              onPress={() => setJoinMode(j.mode)}
            >
              <View style={[styles.joinDot, { backgroundColor: joinMode === j.mode ? j.dot : "#1E2A40" }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.joinTitle, { color: joinMode === j.mode ? j.dot : "#64748B" }]}>{j.title}</Text>
                <Text style={styles.joinSub}>{j.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.postBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={styles.postBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
          {!saving && <ChevronRight size={18} color="#0F172A" strokeWidth={3} />}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080E1C" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 14, fontWeight: "700", color: "#CBD5E1" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18 },
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: "#141B2D", borderBottomWidth: 1, borderBottomColor: "#1E2A40",
  },
  backBtn: { width: 40, height: 40, backgroundColor: "#0F172A", borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1E2A40" },
  navCenter: { alignItems: "center" },
  navStep: { fontSize: 10, fontWeight: "800", color: "#475569", letterSpacing: 1.5 },
  navTitle: { fontSize: 16, fontWeight: "800", color: "#F1F5F9", marginTop: 2 },

  breadRow: { marginTop: 14, marginBottom: 16 },
  breadPill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#141B2D", borderWidth: 1, borderColor: "#1E2A40" },
  breadText: { fontSize: 12, fontWeight: "700", color: "#CBD5E1" },

  label: { fontSize: 10, fontWeight: "800", color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 20, marginBottom: 10 },
  input: { backgroundColor: "#141B2D", borderWidth: 1, borderColor: "#1E2A40", borderRadius: 14, padding: 15, fontSize: 14, color: "#CBD5E1", fontWeight: "500" },
  inputActive: { borderColor: "#2D3E55" },
  selectorBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#141B2D", borderWidth: 1, borderColor: "#1E2A40", borderRadius: 14, padding: 15, gap: 10 },
  selectorText: { flex: 1, fontSize: 14, color: "#CBD5E1", fontWeight: "500" },

  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#1E2A40", backgroundColor: "#141B2D", gap: 7 },
  toggleBtnActive: { backgroundColor: "#818CF8", borderColor: "#818CF8" },
  toggleBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  dropdownModal: { backgroundColor: "#141B2D", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "60%", borderWidth: 1, borderColor: "#1E2A40" },
  dropdownModalTitle: { fontSize: 16, fontWeight: "800", color: "#F1F5F9", marginBottom: 16 },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  dropdownItemSelected: { backgroundColor: "rgba(129,140,248,0.1)" },
  dropdownItemText: { fontSize: 15, fontWeight: "600", color: "#CBD5E1" },
  dropdownItemTextSelected: { color: "#818CF8", fontWeight: "700" },
  dropdownItemTypeOwn: { color: "#818CF8", fontWeight: "800" },

  customLocContainer: { marginBottom: 16, marginTop: 12 },
  customLabel: { fontSize: 9, fontWeight: "900", color: "#818CF8", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },

  twoCol: { flexDirection: "row", gap: 12 },
  dtBtn: { backgroundColor: "#141B2D", borderWidth: 1, borderColor: "#1E2A40", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  dtText: { fontSize: 13, color: "#CBD5E1", fontWeight: "700", flex: 1 },

  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#141B2D", borderWidth: 1, borderColor: "#1E2A40", borderRadius: 14, padding: 10 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: "#2D3E55", alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A" },
  stepSym: { fontSize: 20, fontWeight: "700", lineHeight: 22, color: "#CBD5E1" },
  stepVal: { fontSize: 20, fontWeight: "900", color: "#F1F5F9" },

  joinRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  joinCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#1E2A40", backgroundColor: "#141B2D" },
  joinDot: { width: 10, height: 10, borderRadius: 5 },
  joinTitle: { fontSize: 12, fontWeight: "800" },
  joinSub: { fontSize: 10, color: "#334155", fontWeight: "500", marginTop: 1 },

  postBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, borderRadius: 18, marginTop: 28, gap: 8, backgroundColor: "#818CF8" },
  postBtnText: { fontSize: 17, fontWeight: "900", color: "#0F172A", letterSpacing: 0.2 },

  errorText: { color: "#F87171", fontSize: 12, marginTop: 4, marginLeft: 5 },

  pickerModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  pickerModalContent: { backgroundColor: "#141B2D", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1E2A40" },
  pickerCancel: { color: "#94A3B8", fontSize: 16 },
  pickerTitle: { color: "#F1F5F9", fontSize: 16, fontWeight: "700" },
  pickerDone: { color: "#818CF8", fontSize: 16, fontWeight: "700" },
});

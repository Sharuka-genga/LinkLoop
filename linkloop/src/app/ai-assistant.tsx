import { useRouter } from "expo-router"
import React, { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native"

export default function Home() {
  const router = useRouter()

  const [selectedInterest, setSelectedInterest] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState("")

  const interests = ["Sports", "Study", "Gaming", "Campus Events"]
  const times = ["morning", "afternoon", "evening", "night"]

  const toggleInterest = (item: string) => {
    if (selectedInterest.includes(item)) {
      setSelectedInterest(selectedInterest.filter(i => i !== item))
    } else {
      setSelectedInterest([...selectedInterest, item])
    }
  }

  const goToResults = () => {
    if (selectedInterest.length === 0 || !selectedTime) {
      alert("Please select interest and time")
      return
    }

    router.push({
      pathname: "/suggestions",
      params: {
        interest: JSON.stringify(selectedInterest),
        time: selectedTime
      }
    })
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Find events for you</Text>

      <Text style={styles.label}>INTEREST</Text>
      <View style={styles.row}>
        {interests.map(item => (
          <TouchableOpacity
            key={item}
            style={[
              styles.chip,
              selectedInterest.includes(item) && styles.selectedChip
            ]}
            onPress={() => toggleInterest(item)}
          >
            <Text style={styles.chipText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>AVAILABLE TIME</Text>
      <View style={styles.row}>
        {times.map(t => (
          <TouchableOpacity
            key={t}
            style={[
              styles.chip,
              selectedTime === t && styles.selectedChip
            ]}
            onPress={() => setSelectedTime(t)}
          >
            <Text style={styles.chipText}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={goToResults}>
        <Text style={styles.buttonText}>Generate Suggestions</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080E1C", padding: 16 },
  title: { color: "#F1F5F9", fontSize: 28, fontWeight: "900" },
  label: { color: "#CBD5E1", marginTop: 20, fontWeight: "800" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E2A40"
  },
  selectedChip: { backgroundColor: "#818CF8" },
  chipText: { color: "#F1F5F9" },
  button: {
    backgroundColor: "#818CF8",
    padding: 16,
    borderRadius: 18,
    marginTop: 20,
    alignItems: "center"
  },
  buttonText: { color: "#000", fontWeight: "800" }
})
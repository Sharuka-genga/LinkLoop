import { useLocalSearchParams, useRouter } from "expo-router"
import React from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"

const eventsData = [
  { id: 1, title: "Football Match", category: "Sports", time: "evening", popularity: 4 },
  { id: 2, title: "Study Group", category: "Study", time: "morning", popularity: 5 },
  { id: 3, title: "Gaming Night", category: "Gaming", time: "night", popularity: 3 },
  { id: 4, title: "Campus Meetup", category: "Campus Events", time: "afternoon", popularity: 2 }
]

export default function Suggestions() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const selectedInterest = JSON.parse(params.interest as string)
  const selectedTime = params.time

  const results = eventsData
    .map(event => {
      let score = 0

      if (selectedInterest.includes(event.category)) score += 5
      if (selectedTime === event.time) score += 3
      score += event.popularity

      return { ...event, score }
    })
    .sort((a, b) => b.score - a.score)

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Suggested for You</Text>

      {results.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSub}>
            {item.category} • {item.time}
          </Text>
          <Text style={styles.score}>Score: {item.score}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080E1C", padding: 16 },
  back: { color: "#818CF8", marginBottom: 10 },
  title: { color: "#F1F5F9", fontSize: 24, fontWeight: "900" },
  card: {
    backgroundColor: "#141B2D",
    padding: 16,
    borderRadius: 24,
    marginTop: 10
  },
  cardTitle: { color: "#F1F5F9", fontWeight: "700" },
  cardSub: { color: "#CBD5E1" },
  score: { color: "#34D399" }
})
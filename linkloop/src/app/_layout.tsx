import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { usePathname } from "expo-router";
import { useState } from "react";
import NavBar from "../components/NavBar";
import SplashScreen from "../components/SplashScreen";

// Pages where navbar should NOT show
const HIDE_NAV = ["/category", "/subcategory", "/event-form", "/suggested-participants"];

export default function Layout() {
  const pathname = usePathname();
  const showNav = !HIDE_NAV.includes(pathname);
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }} />
      {showNav && !isSplashVisible && <NavBar />}
      
      {isSplashVisible && (
        <SplashScreen onFinish={() => setIsSplashVisible(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080E1C" },
});
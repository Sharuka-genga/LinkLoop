import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { usePathname } from "expo-router";
import { useState } from "react";
import NavBar from "../components/NavBar";
import SplashScreen from "../components/SplashScreen";

// Pages where navbar should NOT show
const HIDE_NAV = ["/category", "/subcategory", "/event-form", "/suggested-participants", "/notifications"];

export default function Layout() {
  const pathname = usePathname();
  const showNav = !HIDE_NAV.includes(pathname) && !pathname.startsWith("/chat/");
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }} />
        {showNav && !isSplashVisible && <NavBar />}
        
        {isSplashVisible && (
          <SplashScreen onFinish={() => setIsSplashVisible(false)} />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080E1C" },
});
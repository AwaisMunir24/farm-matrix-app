import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import SplashScreen from "./SplashScreen";
import OnboardingSwiper from "./src/screens/OnboardingSwiper";
import LoginScreen from "./src/screens/LoginScreen";
import TabNavigator from "./src/navigation/TabNavigator";
import {
  getAuthUser,
  hasSeenOnboarding,
  markOnboardingDone,
} from "./src/utils/auth";
import OfflineSyncBanner from "./src/components/OfflineSyncBanner";

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN STATES
// ─────────────────────────────────────────────────────────────────────────────
const SCREENS = {
  BOOTING: "booting",
  SPLASH: "splash",
  ONBOARDING: "onboarding",
  LOGIN: "login",
  HOME: "home",
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.BOOTING);
  const [authToken, setAuthToken] = useState(null);

  // ── Boot: decide which screen to show ──────────────────────────────────────
  const boot = useCallback(async () => {
    try {
      const [user, onboardingDone] = await Promise.all([
        getAuthUser(),
        hasSeenOnboarding(),
      ]);

      if (user?.token) {
        // Valid, non-expired token found → go straight to home
        setScreen(SCREENS.HOME);
        setAuthToken(user.token);
      } else if (onboardingDone) {
        // Seen onboarding before, but no valid session → login
        setScreen(SCREENS.LOGIN);
      } else {
        // Brand new install → show splash then onboarding
        setScreen(SCREENS.SPLASH);
      }
    } catch (e) {
      console.error("Boot error:", e);
      setScreen(SCREENS.SPLASH);
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGetStarted = () => setScreen(SCREENS.ONBOARDING);

  const handleOnboardingComplete = async () => {
    await markOnboardingDone();
    setScreen(SCREENS.LOGIN);
  };

  const handleLogin = (_user) => {
    setScreen(SCREENS.HOME);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (screen === SCREENS.BOOTING) {
    return (
      <View style={styles.bootContainer}>
        <ActivityIndicator size="large" color="#39B54B" />
      </View>
    );
  }

  if (screen === SCREENS.SPLASH) {
    return <SplashScreen onGetStarted={handleGetStarted} />;
  }

  if (screen === SCREENS.ONBOARDING) {
    return <OnboardingSwiper onComplete={handleOnboardingComplete} />;
  }

  if (screen === SCREENS.LOGIN) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <OfflineSyncBanner
          authToken={authToken}
          onSyncComplete={({ uploaded, failed }) => {
            Alert.alert(
              "Sync Complete",
              `${uploaded} farmer(s) uploaded successfully.${failed > 0 ? ` ${failed} failed.` : ""}`,
            );
          }}
        />
        <TabNavigator />
      </View>

      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    backgroundColor: "#F4F7F3",
    justifyContent: "center",
    alignItems: "center",
  },
});

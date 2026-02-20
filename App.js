import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import SplashScreen from "./SplashScreen";
import OnboardingSwiper from "./src/screens/OnboardingSwiper";
import LoginScreen from "./src/screens/LoginScreen";
// import BottomTabNavigator from "./src/navigation/BottomNavigator";
import TabNavigator from "./src/navigation/TabNavigator";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("splash");

  const handleGetStarted = () => {
    setCurrentScreen("onboarding");
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen("login");
  };

  const handleLogin = () => {
    setCurrentScreen("home");
  };

  if (currentScreen === "splash") {
    return <SplashScreen onGetStarted={handleGetStarted} />;
  }

  if (currentScreen === "onboarding") {
    return <OnboardingSwiper onComplete={handleOnboardingComplete} />;
  }

  if (currentScreen === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Main App with Navigation
  return (
    <NavigationContainer>
      {/* <BottomTabNavigator /> */}
      <TabNavigator />
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

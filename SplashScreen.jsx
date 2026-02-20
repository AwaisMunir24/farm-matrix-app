import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const SplashScreen = ({ onGetStarted }) => {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Bottom Background Image */}
      <ImageBackground
        source={require("./assets/splashscreenmain.png")}
        resizeMode="cover"
        style={styles.bottomImage}
      />

      {/* Content */}
      <View style={styles.content}>
        <Image
          style={styles.logo}
          source={require("./assets/logo.png")}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Precision Insights for{" "}
          <Text style={styles.sustainable}> Sustainable Farming</Text>
        </Text>
        <Text style={styles.para}>
          Transforming satellite and remote-sensing data into actionable
          insights for modern agriculture
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SplashScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    justifyContent: "start",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
  },

  bottomImage: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "100%", // adjust as needed
  },

  content: {
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1, // keeps content above image
    flex: 1,
  },

  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 2,
    marginBottom: 12,
  },

  tagline: {
    fontSize: 24,
    color: "#383838",
    opacity: 0.9,

    textAlign: "start",
    fontWeight: "bold",
    paddingTop: 29,
  },
  button: {
    fontSize: 20,
    backgroundColor: "#BEC3BD",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    elevation: 8,
    position: "absolute",
    bottom: 0,
    width: "100%",
    marginHorizontal: "auto",
    // zIndex: 11,
  },
  buttonText: {
    color: "#383838",
    fontSize: 18,
    fontWeight: 600,
    textAlign: "center",
  },
  logo: {
    marginHorizontal: "auto",
  },
  sustainable: {
    color: "#39B54B",
  },
  para: {
    fontSize: 14,
    fontWeight: "medium",
    lineHeight: 18,
    color: "#383838",
    paddingTop: 15,
  },
});

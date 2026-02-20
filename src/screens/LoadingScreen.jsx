import React, { useEffect } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Alert,
  BackHandler,
} from "react-native";
import axios from "axios";

const SERVER_URL = "https://farm-matrix-backend.vercel.app";
const STATIC_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcxNTAyMDMxLCJleHAiOjE3NzIzNjYwMzF9.u0_kiWVsBe1dz5yQNzTvSom2lmVYClWloyF8Ob0Rxm8";

const LoadingScreen = ({ navigation, route }) => {
  const { image, location } = route.params;

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const formData = new FormData();
    formData.append("image", {
      uri: image,
      name: "plant.jpg",
      type: "image/jpeg",
    });
    formData.append(
      "coordinates",
      `${location.longitude}, ${location.latitude}`,
    );

    axios
      .post(`${SERVER_URL}/api/cropAnalysis`, formData, {
        headers: {
          "x-auth-token": STATIC_TOKEN,
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      })
      .then((resp) => {
        // replace() swaps Loading with Result in the stack
        // Stack is now: [MainTabs, Camera, Result]
        // Then we immediately reset to [MainTabs, Result] — Camera gone forever
        navigation.reset({
          index: 1,
          routes: [
            { name: "MainTabs" },
            { name: "Result", params: { image, result: resp.data } },
          ],
        });
      })
      .catch((err) => {
        console.log("❌ Error:", err.response?.status, err.code, err.message);

        let message = "Failed to analyze plant. Please try again.";
        if (err.response?.status === 413) message = "Image too large.";
        else if (err.response?.status === 401) message = "Auth failed.";
        else if (err.code === "ECONNABORTED") message = "Timed out.";
        else if (!err.response) message = "Network error.";

        Alert.alert("Analysis Failed", message, [
          {
            text: "Try Again",
            // Go back to Camera so user can retake
            onPress: () => navigation.goBack(),
          },
          {
            text: "Go Home",
            onPress: () =>
              navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] }),
          },
        ]);
      });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#39B54B" />
      <Text style={styles.text}>Analyzing plant...</Text>
      <Text style={styles.subText}>This may take a few seconds</Text>
    </View>
  );
};

export default LoadingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  text: { fontSize: 18, fontWeight: "600", color: "#383838" },
  subText: { fontSize: 13, color: "#888888" },
});

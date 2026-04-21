import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
} from "react-native";
import { ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import MenuBar from "../../assets/bars.svg";
import Logo from "../../assets/Logo.svg";
import BellIcon from "../../assets/bellicon.svg";
import FarmerImage from "../../assets/mini-farmer-icon.svg";
import FieldsIcon from "../../assets/mini-fields-icon.svg";
import UsersIcon from "../../assets/userss.svg";
import Uparrow from "../../assets/up_arrow.svg";
import LeafCards from "../../assets/leafs_cardss.svg";
import ScanButtonIcon from "../../assets/btn_scan_icon.svg";
import ScanImage from "../../assets/scaning_img.svg";
import WorldImg from "../../assets/worldimg.svg";
import AiLeaf from "../../assets/ai-leaf.svg";
import PluseIcon from "../../assets/plus-icon.svg";
import WeatherIcon from "../../assets/weather-icon.svg";
import Mic from "../../assets/mic.svg";
import Share from "../../assets/share.svg";
import ShareBg from "../../assets/share-bg.svg";
import WeatherArrow from "../../assets/weather-arrow-icon.svg";
import axios from "axios";
import { SERVER_URL } from "../utils/index";
import { getAuthToken } from "../utils/auth";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const HomeScreen = ({ navigation, onOpenSidebar }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const [homeInput, setHomeInput] = useState("");

  const [weatherData, setWeatherData] = useState({
    temperature: "--",
    condition: "Loading...",
    feelsLike: "--",
    high: "--",
    low: "--",
    day: "------",
    time: "--:-- --",
    date: "--",
  });

  const fetchWeather = async (lat, lon) => {
    try {
      setLoadingWeather(true);

      const token = await getAuthToken();

      const response = await axios.get(
        `${SERVER_URL}/api/weather/detail?lat=${lat}&lon=${lon}&units=metric`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        },
      );

      const today = response?.data?.data?.[0];

      if (!today) {
        console.warn("No weather data found");
        return;
      }

      const avg = parseFloat(today.temperature?.avg || 0);
      const min = parseFloat(today.temperature?.min || 0);
      const max = parseFloat(today.temperature?.max || 0);

      const dayName = new Date(today.date)
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();

      const now = new Date();

      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const dateStr = now.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "2-digit",
      });

      setWeatherData({
        temperature: Math.round(avg).toString(),
        feelsLike: Math.round(avg).toString(),
        high: Math.round(max).toString(),
        low: Math.round(min).toString(),
        condition: today.description || "Clear",
        day: dayName,
        time: timeStr,
        date: dateStr,
      });
    } catch (error) {
      console.error(
        "Weather error:",
        error.response?.status,
        error.response?.data,
      );
    } finally {
      setTimeout(() => {
        setLoadingWeather(false);
      }, 800);
    }
  };

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(function (permResult) {
      if (permResult.status !== "granted") {
        console.warn("Location denied — using default coords");
        fetchWeather(31.4504, 73.135);
        return;
      }

      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then(function (location) {
          fetchWeather(location.coords.latitude, location.coords.longitude);
        })
        .catch(function (err) {
          console.error("Location error:", err);
          fetchWeather(31.4504, 73.135);
        });
    });
  }, []);

  const handleInputFocus = () => {
    setTimeout(() => {
      inputRef.current?.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => {},
      );
    }, 300);
  };

  const handleSendMessage = () => {
    const text = homeInput.trim();
    inputRef.current?.blur();
    setHomeInput("");
    navigation.navigate("Chat", { initialMessage: text || undefined });
  };

  const handleMicPress = () => {
    inputRef.current?.blur();
    navigation.navigate("Chat", { openMic: true });
  };

  const _handleCropScan = () => {
    navigation.navigate("Cropscan");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenSidebar}>
          <MenuBar width={24} height={24} />
        </TouchableOpacity>
        <View style={{ width: 160, aspectRatio: 152 / 31 }}>
          <Logo width="100%" height="100%" />
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <BellIcon width={24} height={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Weather Section */}
          <View
            style={{
              marginTop: 30,
              paddingHorizontal: 20,
              marginBottom: 24,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {loadingWeather ? (
              <View
                style={{
                  flex: 1,
                  height: 79,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="large" color="#34B349" />
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <WeatherIcon width={79} height={79} />
                  <View style={{ marginLeft: 8 }}>
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: "500",
                        color: "#4E4E4E",
                      }}
                    >
                      {`${weatherData.temperature}°C`}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#4E4E4E",
                      }}
                    >
                      {weatherData.day}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "500",
                        color: "#4E4E4E",
                      }}
                    >
                      {`${weatherData.time} | ${weatherData.date}`}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    justifyContent: "flex-end",
                    alignItems: "flex-end",
                  }}
                >
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: "#D8D8D8",
                      width: 25,
                      height: 25,
                      borderRadius: 50,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                    onPress={() => navigation.navigate("Weather")}
                  >
                    <WeatherArrow size={16} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: "#4E4E4E",
                    }}
                  >
                    {`Feels like ${weatherData.feelsLike}°`}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: "#4E4E4E",
                    }}
                  >
                    {`High ${weatherData.high} | Low ${weatherData.low}`}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Top Cards */}
          <View style={styles.topCardsContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("AddFarmer")}
            >
              <View style={styles.innerCard}>
                <FarmerImage width={35} height={35} />
              </View>
              <Text style={styles.cardTitle}>Add new farmer</Text>
              <TouchableOpacity style={styles.addButton}>
                <PluseIcon width={18} height={18} />
              </TouchableOpacity>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("AddNewField")}
            >
              <View style={styles.innerCard}>
                <FieldsIcon width={35} height={35} />
              </View>
              <Text style={styles.cardTitle}>Add new field</Text>
              <TouchableOpacity style={styles.addButton}>
                <PluseIcon width={18} height={18} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Quick Access */}
          <View style={styles.quickAccessContainer}>
            <TouchableOpacity
              style={styles.quickAccessButton}
              onPress={() => navigation.navigate("FarmerListing")}
            >
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <UsersIcon width={18} height={18} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: "#383838",
                    marginLeft: 12,
                  }}
                >
                  My Farmer
                </Text>
              </TouchableOpacity>
              <View style={styles.arrowCircle}>
                <Uparrow width={18} height={18} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessButton}
              onPress={() => navigation.navigate("FieldsListing")}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <LeafCards width={18} height={18} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: "#383838",
                    marginLeft: 12,
                  }}
                >
                  My Fields
                </Text>
              </View>
              <View style={styles.arrowCircle}>
                <Uparrow width={18} height={18} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Leaf Scan AI */}
          <View style={styles.featureCard}>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Leaf Scan AI</Text>
              <Text style={styles.featureStep}>1. Take a picture of plant</Text>
              <Text style={styles.featureStep}>2. AI Detect Plant Disease</Text>
              <Text style={styles.featureStep}>
                3. Get a detail disease diagnosis
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.navigate("Camera")}
              >
                <LinearGradient
                  colors={["#5FD66E", "#34B349"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.startButtonGradient}
                >
                  <ScanButtonIcon width={18} height={18} />
                  <Text style={styles.startButtonText}>Start Analyzing</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View>
              <ScanImage width={133} height={130} />
            </View>
          </View>

          {/* Crop Scan */}
          <View style={styles.cropSectionWrapper}>
            <View style={styles.cropSectionInner}>
              <View style={{ flexShrink: 0 }}>
                <WorldImg width={180} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cropScanHeading}>Crop Scan</Text>
                <Text style={styles.cropContent}>
                  Satellite based smart crop mapping
                </Text>
                <TouchableOpacity onPress={_handleCropScan}>
                  <LinearGradient
                    colors={["#5FD66E", "#34B349"]}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 25,
                      marginTop: 8,
                      borderRadius: 5,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      View Map
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* AI Assistant */}
          <View style={styles.aiCard}>
            <View style={styles.aiCardContent}>
              <View>
                <Text style={styles.aiTitle}>AI Assistant</Text>
                <Text style={styles.aiSubtitle}>
                  Ask anything about crops, diseases & farming
                </Text>

                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={() => navigation.navigate("Chat")}
                >
                  <LinearGradient
                    colors={["#5FD66E", "#34B349"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiButtonGradient}
                  >
                    <Text style={styles.aiButtonText}>Start Chat</Text>
                    <TouchableOpacity
                      style={{ marginLeft: 4, position: "relative" }}
                    >
                      <ShareBg width={30} height={30} />
                      <Share
                        width={18}
                        height={18}
                        style={{ position: "absolute", top: 7, left: 5 }}
                      />
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View>
                <AiLeaf width={70} height={70} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    backgroundColor: "#F9F9F9",
  },
  scrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    borderRadius: 9,
    borderColor: "#D8D8D8",
    borderWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  topCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: "row",
    paddingHorizontal: 10,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  innerCard: {
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#383838",
  },
  addButton: {
    borderRadius: 8,
    overflow: "hidden",
    marginLeft: 3,
  },
  quickAccessContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  quickAccessButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 32,
    paddingRight: 12,
    paddingLeft: 14,
    justifyContent: "space-between",
    paddingVertical: 4,
    borderColor: "#BDEAC4",
    borderWidth: 1,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 100,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    justifyContent: "space-between",
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#383838",
    marginBottom: 10,
  },
  featureStep: {
    fontSize: 12,
    color: "#3E3E3E",
    marginBottom: 2,
  },
  startButton: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 7,
    overflow: "hidden",
    marginTop: 10,
  },
  startButtonGradient: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  startButtonText: {
    fontSize: 12,
    color: "#fff",
    marginLeft: 7,
  },
  featureContent: {
    width: "50%",
  },
  cropSectionWrapper: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 15,
    marginTop: 14,
  },
  cropSectionInner: {
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  cropScanHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#383838",
  },
  cropContent: {
    fontSize: 12,
    color: "#3E3E3E",
    marginTop: 8,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  aiCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  aiCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#383838",
    marginBottom: 6,
  },
  aiSubtitle: {
    fontSize: 12,
    color: "#6B6B6B",
    marginBottom: 12,
    width: 180,
  },
  aiButton: {
    borderRadius: 8,
    overflow: "hidden",
    width: 140,
  },
  aiButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default HomeScreen;

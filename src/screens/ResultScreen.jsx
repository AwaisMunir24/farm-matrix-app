import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import CancelIcon from "../../assets/cross-icon.svg";
import Icon from "../../assets/result-icon.svg";

const SERVER_URL = "https://farm-matrix-backend.vercel.app";

const STATIC_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcxNTAyMDMxLCJleHAiOjE3NzIzNjYwMzF9.u0_kiWVsBe1dz5yQNzTvSom2lmVYClWloyF8Ob0Rxm8";

const ResultScreen = ({ navigation, route }) => {
  const { image, result } = route.params;
  const id = result?.data?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const wordIntervalRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${SERVER_URL}/api/cropAnalysis/analysis/${id}`, {
        headers: {
          "x-auth-token": STATIC_TOKEN,
        },
      })
      .then((resp) => {
        setData(resp.data?.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analysis result.");
        setLoading(false);
      });

    return () => {
      Speech.stop();
      clearInterval(wordIntervalRef.current);
    };
  }, [id]);

  const cleanDescription = (text) =>
    text
      ?.replace(/###\s*/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

  const handleSpeak = async () => {
    if (!data?.description) return;

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setCurrentWordIndex(-1);
      clearInterval(wordIntervalRef.current);
      return;
    }

    const text = cleanDescription(data.description);
    const words = text.split(" ");
    const rate = 0.9;
    const msPerWord = (60 / (130 * rate)) * 1000;

    setIsSpeaking(true);
    setCurrentWordIndex(0);

    let currentIndex = 0;
    wordIntervalRef.current = setInterval(() => {
      currentIndex += 1;
      if (currentIndex >= words.length) {
        clearInterval(wordIntervalRef.current);
        setCurrentWordIndex(-1);
        setIsSpeaking(false);
        return;
      }
      setCurrentWordIndex(currentIndex);
    }, msPerWord);

    // Get available voices and log them so you can see what's on YOUR device
    const voices = await Speech.getAvailableVoicesAsync();
    const englishVoices = voices.filter((v) => v.language?.startsWith("en"));
    console.log(
      "Available English voices:",
      JSON.stringify(englishVoices, null, 2),
    );

    // Platform-specific male voice identifiers
    let maleVoiceId = undefined;

    if (Platform.OS === "ios") {
      // iOS known male voices - try each until one matches what's installed
      const iosMaleVoices = [
        "com.apple.ttsbundle.Daniel-compact", // Daniel (UK Male)
        "com.apple.ttsbundle.Alex-compact", // Alex (US Male) - older iOS
        "com.apple.voice.compact.en-US.Nicky", // Nicky
        "com.apple.ttsbundle.siri_male_en-US_compact", // Siri Male
        "com.apple.voice.compact.en-GB.Daniel", // Daniel GB
        "com.apple.ttsbundle.Fred-compact", // Fred (robotic but male)
      ];

      const matched = voices.find((v) => iosMaleVoices.includes(v.identifier));
      maleVoiceId = matched?.identifier;
      console.log("Matched iOS male voice:", maleVoiceId);
    } else if (Platform.OS === "android") {
      // On Android, filter by name containing 'male' or use known Google TTS male
      const androidMale = englishVoices.find(
        (v) =>
          v.name?.toLowerCase().includes("male") ||
          v.identifier?.toLowerCase().includes("male") ||
          v.name?.toLowerCase().includes("en-us-x-sfg") || // Google male
          v.name?.toLowerCase().includes("#male"),
      );
      maleVoiceId = androidMale?.identifier;
      console.log("Matched Android male voice:", maleVoiceId);
    }

    Speech.speak(text, {
      rate,
      pitch: Platform.OS === "ios" ? 0.8 : 0.75, // lower = deeper/more male
      language: "en-US",
      ...(maleVoiceId ? { voice: maleVoiceId } : {}),
      onDone: () => {
        clearInterval(wordIntervalRef.current);
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
      },
      onStopped: () => {
        clearInterval(wordIntervalRef.current);
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
      },
    });
  };

  const renderHighlightedText = () => {
    if (!data?.description) return null;

    const text = cleanDescription(data.description);
    const words = text.split(" ");

    return words.map((word, index) => (
      <Text
        key={index}
        style={[
          styles.descriptionText,
          index === currentWordIndex && styles.highlightText,
        ]}
      >
        {word + " "}
      </Text>
    ));
  };

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.navigate("MainTabs")}
        >
          <CancelIcon width={16} height={16} />
        </TouchableOpacity>

        <Text style={styles.title}>Analysis Result</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39B54B" />
          <Text style={styles.loadingText}>Fetching result...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image */}
          <View style={styles.imageCard}>
            <Image
              source={{ uri: data?.imageUrl ?? image }}
              style={styles.resultImage}
            />
            {data?.user?.name && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Analyzed by: </Text>
                <Text style={styles.metaValue}>{data.user.name}</Text>
              </View>
            )}
            {data?.coordinates && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Location: </Text>
                <Text style={styles.metaValue}>{data.coordinates}</Text>
              </View>
            )}
          </View>

          {/* Detail Header with Speaker */}
          <View style={styles.detailHeader}>
            <Icon width={20} height={20} />
            <Text style={styles.detailTitle}>Detail:</Text>

            <TouchableOpacity style={styles.speakerBtn} onPress={handleSpeak}>
              <Ionicons
                name={isSpeaking ? "volume-high" : "volume-medium"}
                size={22}
                color="#39B54B"
              />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={{ marginTop: 8, lineHeight: 22, flexWrap: "wrap" }}>
            {renderHighlightedText()}
          </Text>
          <TouchableOpacity
            style={{
              width: "100%",
              backgroundColor: "#39B54B",
              borderRadius: 9,
              marginVertical: 24,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                paddingVertical: 9,
                textAlign: "center",
              }}
            >
              Export Report
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

export default ResultScreen;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 23,
  },

  cancelBtn: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    backgroundColor: "#EFEFEF",
    width: 30,
    height: 30,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#383838",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#888",
  },

  errorText: {
    fontSize: 13,
    color: "red",
  },

  imageCard: {
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 12,
  },

  resultImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },

  detailHeader: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  detailTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4E4E4E",
    marginLeft: 9,
  },

  speakerBtn: {
    marginLeft: 12,
  },

  descriptionText: {
    fontSize: 14,
    color: "#4E4E4E",
  },

  highlightText: {
    backgroundColor: "#DFFFE3",
    color: "#000",
  },

  metaRow: { flexDirection: "row", marginTop: 8, paddingHorizontal: 4 },
  metaLabel: { fontSize: 12, fontWeight: "600", color: "#4E4E4E" },
  metaValue: {
    fontSize: 12,
    fontWeight: "400",
    color: "#4E4E4E",
    flexShrink: 1,
  },
});

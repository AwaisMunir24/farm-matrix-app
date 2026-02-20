import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import axios from "axios";
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

  useEffect(() => {
    axios
      .get(`${SERVER_URL}/api/cropAnalysis/analysis/${id}`, {
        headers: {
          "x-auth-token": STATIC_TOKEN,
        },
      })
      .then((resp) => {
        console.log("Result API Response:", resp.data);
        setData(resp.data?.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Result API Error:", err);
        setError("Failed to load analysis result.");
        setLoading(false);
      });
  }, [id]);

  const cleanDescription = (text) =>
    text
      .replace(/###\s*/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

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

      {/* States */}
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Image Card */}
          <View style={styles.imageCard}>
            <Image
              source={{ uri: data?.imageUrl ?? image }}
              style={styles.resultImage}
              resizeMode="cover"
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

          {/* Disease Detail */}
          <View style={styles.detailHeader}>
            <Icon width={20} height={20} />
            <Text style={styles.detailTitle}>Disease Detail:</Text>
          </View>

          <Text style={styles.descriptionText}>
            {data?.description
              ? cleanDescription(data.description)
              : "No description available."}
          </Text>
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
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
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
    textAlign: "center",
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
    textAlign: "center",
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

  metaRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingHorizontal: 4,
  },

  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4E4E4E",
  },

  metaValue: {
    fontSize: 12,
    fontWeight: "400",
    color: "#4E4E4E",
    flexShrink: 1,
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

  descriptionText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#4E4E4E",
    textAlign: "justify",
    marginTop: 8,
    lineHeight: 20,
  },
});

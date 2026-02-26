import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import axios from "axios";

const SERVER_URL = "https://farm-matrix-backend.vercel.app";
const STATIC_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcxNTAyMDMxLCJleHAiOjE3NzIzNjYwMzF9.u0_kiWVsBe1dz5yQNzTvSom2lmVYClWloyF8Ob0Rxm8";

// ─── Screens / Modes ───────────────────────────────────────────────
// "choose"  → show two buttons (gallery | camera)
// "camera"  → live camera view
// "preview" → show captured / picked photo + Analyze button
// "loading" → spinner while API call is in flight

const CameraScreen = ({ navigation }) => {
  const [mode, setMode] = useState("choose");
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null); // local URI
  const [location, setLocation] = useState(null);

  const cameraRef = useRef(null);

  // ── Block hardware back while loading ──────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      () => mode === "loading",
    );
    return () => sub.remove();
  }, [mode]);

  // ── Fetch GPS once ─────────────────────────────────────────────
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) =>
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }),
        )
        .catch(() => setLocation({ latitude: 31.5204, longitude: 74.3587 }));
    });
  }, []);

  // ── Close → back to Home tabs ──────────────────────────────────
  const goBack = () => navigation.replace("MainTabs");

  // ── Open Gallery ───────────────────────────────────────────────
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setPhoto(result.assets[0].uri);
      setMode("preview");
    }
  };

  // ── Open Camera ────────────────────────────────────────────────
  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission needed", "Allow camera access to continue.");
        return;
      }
    }
    setMode("camera");
  };

  // ── Capture photo ──────────────────────────────────────────────
  const capture = async () => {
    if (!cameraRef.current) return;
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      setPhoto(result.uri);
      setMode("preview");
    } catch {
      Alert.alert("Error", "Failed to capture. Try again.");
    }
  };

  // ── Send to API ────────────────────────────────────────────────
  const analyze = () => {
    if (!photo) return;
    if (!location) {
      Alert.alert("Please wait", "Still fetching your location…");
      return;
    }

    setMode("loading");

    const formData = new FormData();
    formData.append("image", {
      uri: photo,
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
        console.log("API Response:", resp.data);
        navigation.replace("Result", { image: photo, result: resp.data });
      })
      .catch((err) => {
        setMode("preview");
        let msg = "Failed to analyze. Please try again.";
        if (err.response?.status === 413) msg = "Image is too large.";
        else if (err.response?.status === 401) msg = "Authentication failed.";
        else if (err.code === "ECONNABORTED") msg = "Request timed out.";
        else if (!err.response) msg = "Network error. Check your connection.";
        Alert.alert("Error", msg);
      });
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  // ── Loading spinner ────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39B54B" />
        <Text style={styles.loadingText}>Analyzing plant…</Text>
        <Text style={styles.subText}>This may takes a few seconds</Text>
      </View>
    );
  }

  // ── Live camera ────────────────────────────────────────────────
  if (mode === "camera") {
    return (
      <View style={styles.fullScreen}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setMode("choose")}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Point at a plant leaf</Text>
          <Text style={styles.locText}>{location ? "📍" : "⏳"}</Text>
        </View>

        {/* Capture button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.captureBtn} onPress={capture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Preview photo ──────────────────────────────────────────────
  if (mode === "preview") {
    return (
      <View style={styles.fullScreen}>
        <Image
          source={{ uri: photo }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setMode("choose")}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Ready to Analyze</Text>
          <Text style={styles.locText}>{location ? "📍" : "⏳"}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.bottomBar}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => setMode("choose")}
            >
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.analyzeBtn} onPress={analyze}>
              <Text style={styles.analyzeBtnText}>Analyze Plant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Default: Choose mode ───────────────────────────────────────
  return (
    <View style={styles.chooseContainer}>
      {/* Header */}
      <View style={styles.chooseHeader}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Text style={[styles.closeBtnText, { color: "#555" }]}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.chooseTitle}>Leaf Scan AI</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Illustration placeholder */}
      <View style={styles.illustrationBox}>
        <Text style={styles.illustrationEmoji}>🌿</Text>
        <Text style={styles.illustrationHint}>
          Upload or capture a clear photo of a plant leaf
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.btnGroup}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <Text style={styles.galleryBtnIcon}>🖼️</Text>
          <Text style={styles.galleryBtnText}>Upload from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
          <Text style={styles.cameraBtnIcon}>📷</Text>
          <Text style={styles.cameraBtnText}>Open Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CameraScreen;

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  loadingText: { fontSize: 18, fontWeight: "600", color: "#383838" },
  subText: { fontSize: 13, color: "#888" },

  // Top overlay bar (camera / preview modes)
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16 },
  topTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  locText: { fontSize: 18, width: 34, textAlign: "center" },

  // Bottom overlay bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 52,
    paddingTop: 24,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  // Capture button
  captureBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },

  // Preview action row
  actionRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 24,
    width: "100%",
  },
  retakeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  retakeText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  analyzeBtn: {
    flex: 2,
    backgroundColor: "#39B54B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  analyzeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // ── Choose screen ──────────────────────────────────────────────
  chooseContainer: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    paddingTop: 45,
    paddingHorizontal: 20,
  },
  chooseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  chooseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#383838",
  },
  illustrationBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  illustrationEmoji: { fontSize: 80 },
  illustrationHint: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },

  // Buttons
  btnGroup: {
    gap: 14,
    paddingBottom: 48,
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#39B54B",
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  galleryBtnIcon: { fontSize: 20 },
  galleryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#39B54B",
  },
  cameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: "#39B54B",
  },
  cameraBtnIcon: { fontSize: 20 },
  cameraBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

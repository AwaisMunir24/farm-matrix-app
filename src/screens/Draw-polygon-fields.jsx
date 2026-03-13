import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AddNewPolygonFields from "../components/common/AddNewPolygonFields";

const DrawPolygonFields = ({ navigation }) => {
  const scrollViewRef = useRef(null);
  const [polygonData, setPolygonData] = useState({
    coordinates: [],
    areaInAcres: 0,
    isClosed: false,
  });

  const handlePolygonComplete = ({ coordinates, areaInAcres, isClosed }) => {
    setPolygonData({ coordinates, areaInAcres, isClosed });
  };

  const handleConfirm = () => {
    // Log polygon coordinates to console on save
    console.log("=== POLYGON SAVED ===");
    console.log(
      "Coordinates:",
      JSON.stringify(polygonData.coordinates, null, 2),
    );
    console.log("Area (acres):", polygonData.areaInAcres.toFixed(4));
    console.log("Total points:", polygonData.coordinates.length);
    // Navigate back to AddNewField, passing polygon data as route params
    navigation.navigate("AddNewField", {
      polygonCoordinates: polygonData.coordinates,
      areaInAcres: polygonData.areaInAcres,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.navigate("AddNewField")}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Polygon</Text>
        <View style={{ width: 15 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.body}>
            <AddNewPolygonFields onPolygonComplete={handlePolygonComplete} />

            {/* Confirm bar at bottom when polygon is ready */}
            {polygonData.isClosed && (
              <TouchableOpacity
                style={styles.confirmBar}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.confirmBarSub}>Polygon Ready</Text>
                  <Text style={styles.confirmBarMain}>
                    {polygonData.areaInAcres.toFixed(4)} acres ·{" "}
                    {polygonData.coordinates.length} points
                  </Text>
                </View>
                <View style={styles.confirmArrow}>
                  <Text style={styles.confirmArrowText}>→</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DrawPolygonFields;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18
    ,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 17,
  },
  backBtnText: { color: "#4E4E4E", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#4E4E4E" },

  confirmBtn: {
    backgroundColor: "#39B54B",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  closeBtnText: { color: "#4E4E4E", fontSize: 14, fontWeight: "600" },

  confirmBtnDisabled: {
    backgroundColor: "#E5E5E5",
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  confirmBtnTextDisabled: { color: "#ABABAB" },

  body: { paddingHorizontal: 20, paddingVertical: 16 },

  // Bottom confirm bar
  confirmBar: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#39B54B",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmBarSub: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  confirmBarMain: { fontSize: 15, fontWeight: "800", color: "#fff" },
  confirmArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmArrowText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});

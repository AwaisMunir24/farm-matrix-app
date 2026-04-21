import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import React, { useRef, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import AddNewPolygonFields from "../components/common/AddNewPolygonFields";
import { SERVER_URL } from "../utils";
import { getAuthToken } from "../utils/auth";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Safe fetch → JSON
// ---------------------------------------------------------------------------
const fetchJSON = async (url, options) => {
  const resp = await fetch(url, options);
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned non-JSON (status ${resp.status}): ${text.slice(0, 120)}`,
    );
  }
};

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Centroid of [[lng, lat], ...]
const polygonCentroid = (coords) => {
  const n = coords.length;
  if (!n) return null;
  const sum = coords.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / n, lng: sum.lng / n };
};

// ---------------------------------------------------------------------------
// InfoRow
// ---------------------------------------------------------------------------
const InfoRow = ({ label, value, icon }) => (
  <View style={modalStyles.infoRow}>
    <View style={modalStyles.infoLeft}>
      <Text style={modalStyles.infoIcon}>{icon}</Text>
      <Text style={modalStyles.infoLabel}>{label}</Text>
    </View>
    <Text style={modalStyles.infoValue}>{value || "—"}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// FieldDetailModal – slides up from the bottom
// ---------------------------------------------------------------------------
const FieldDetailModal = ({ field, visible, onClose, onViewFull }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!field) return null;

  const farmerName = field.farmer?.first_name
    ? `${field.farmer.first_name} ${field.farmer.last_name}`
    : "—";

  const distLabel =
    field._distKm != null
      ? field._distKm < 1
        ? `${(field._distKm * 1000).toFixed(0)} m away`
        : `${field._distKm.toFixed(2)} km away`
      : null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modalStyles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={modalStyles.handle} />

        <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
          <Text style={modalStyles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={modalStyles.titleRow}>
          <View style={modalStyles.dot} />
          <View style={{ flex: 1 }}>
            <Text style={modalStyles.fieldTitle} numberOfLines={1}>
              {field.field_name || field.name || `Field #${field.id}`}
            </Text>
            <View style={modalStyles.cropRow}>
              <Text style={modalStyles.cropIcon}>🌾</Text>
              <Text style={modalStyles.cropText}>
                {field.cropType || "Unknown Crop"}
              </Text>
            </View>
          </View>
        </View>

        <View style={modalStyles.pillsRow}>
          <View style={modalStyles.pill}>
            <Text style={modalStyles.pillText}>
              📐{" "}
              {field.area_acres
                ? `${parseFloat(field.area_acres).toFixed(2)}`
                : (field.area_of_field ?? "—")}{" "}
              acres
            </Text>
          </View>
          {field.land_level != null && (
            <View style={modalStyles.pill}>
              <Text style={modalStyles.pillText}>
                {field.land_level ? "⬆ Level" : "〰 Unlevel"}
              </Text>
            </View>
          )}
          {field.id && (
            <View style={modalStyles.pill}>
              <Text style={modalStyles.pillText}>🏷 #{field.id}</Text>
            </View>
          )}
          {distLabel && (
            <View style={[modalStyles.pill, modalStyles.pillGreen]}>
              <Text style={[modalStyles.pillText, modalStyles.pillTextGreen]}>
                📍 {distLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={modalStyles.card}>
          <InfoRow label="Farmer" value={farmerName} icon="👤" />
          <View style={modalStyles.divider} />
          <InfoRow
            label="Tehsil"
            value={field.tehsil?.name || field.tehsil}
            icon="📍"
          />
          <View style={modalStyles.divider} />
          <InfoRow label="Category" value={field.category} icon="🌿" />
          <View style={modalStyles.divider} />
          <InfoRow label="Irrigation" value={field.irrigation_type} icon="💧" />
          <View style={modalStyles.divider} />
          <InfoRow label="Soil Type" value={field.soil_type} icon="🪨" />
          <View style={modalStyles.divider} />
          <InfoRow label="Ownership" value={field.ownership_type} icon="🏠" />
        </View>

        <TouchableOpacity
          style={modalStyles.viewBtn}
          onPress={() => {
            onClose();
            if (onViewFull) onViewFull(field);
          }}
          activeOpacity={0.85}
        >
          <Text style={modalStyles.viewBtnText}>👁 View Full Details</Text>
          <Text style={modalStyles.viewBtnArrow}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 14,
  },
  closeBtn: {
    position: "absolute",
    top: 18,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 12, color: "#555", fontWeight: "700" },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#39B54B",
    marginTop: 5,
  },
  fieldTitle: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  cropRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  cropIcon: { fontSize: 12 },
  cropText: { fontSize: 13, color: "#666", fontWeight: "500" },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    backgroundColor: "#F3F3F3",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillGreen: { backgroundColor: "#E8F8EC" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#444" },
  pillTextGreen: { color: "#2D7A3A" },
  card: {
    backgroundColor: "#F7FCF8",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0F0E3",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoIcon: { fontSize: 14, width: 20, textAlign: "center" },
  infoLabel: { fontSize: 13, fontWeight: "600", color: "#555" },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1A1A",
    maxWidth: "55%",
    textAlign: "right",
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#DFF0E2" },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#39B54B",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 6,
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  viewBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  viewBtnArrow: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "300",
    lineHeight: 22,
  },
});

// ---------------------------------------------------------------------------
// NearestFieldsPanel  ← rows are tappable now
// ---------------------------------------------------------------------------
const NearestFieldsPanel = ({ fields, onClose, onFieldPress }) => {
  if (!fields) return null;

  return (
    <View style={panelStyles.container}>
      <View style={panelStyles.header}>
        <Text style={panelStyles.title}>
          {fields.length
            ? `${fields.length} Nearest Field${fields.length > 1 ? "s" : ""}`
            : "No Fields Found"}
        </Text>
        <TouchableOpacity onPress={onClose} style={panelStyles.closeBtn}>
          <Text style={panelStyles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {fields.map((f, i) => (
        // ← TouchableOpacity instead of plain View
        <TouchableOpacity
          key={f.id ?? i}
          style={panelStyles.row}
          onPress={() => onFieldPress(f)}
          activeOpacity={0.7}
        >
          <View style={panelStyles.badge}>
            <Text style={panelStyles.badgeText}>{i + 1}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={panelStyles.fieldName}>
              {f.cluster_name ??
                (f.farmer?.first_name
                  ? `${f.farmer.first_name} ${f.farmer.last_name}`
                  : `Field #${f.id}`)}
            </Text>
            <Text style={panelStyles.fieldSub}>
              {f.area_acres
                ? `${parseFloat(f.area_acres).toFixed(2)} ac`
                : f.area_of_field
                  ? `${f.area_of_field} ac`
                  : "—"}
              {f.cropType ? ` · ${f.cropType}` : ""}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <Text style={panelStyles.dist}>
              {f._distKm < 1
                ? `${(f._distKm * 1000).toFixed(0)} m`
                : `${f._distKm.toFixed(2)} km`}
            </Text>
            <Text style={panelStyles.tapHint}>tap for details ›</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={panelStyles.hint}>
        Tap a field to see details · Draw yours to avoid overlap
      </Text>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F0FAF2",
    borderBottomWidth: 1,
    borderBottomColor: "#D8EFDb",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#2D7A3A" },
  closeBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D8EFDb",
    borderRadius: 13,
  },
  closeBtnText: { fontSize: 11, color: "#2D7A3A", fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEE",
    gap: 12,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#39B54B",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  fieldName: { fontSize: 13, fontWeight: "600", color: "#2E2E2E" },
  fieldSub: { fontSize: 11, color: "#888", marginTop: 1 },
  dist: { fontSize: 12, fontWeight: "700", color: "#39B54B" },
  tapHint: { fontSize: 10, color: "#ABABAB" },
  hint: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontStyle: "italic",
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
const DrawPolygonFields = ({ navigation, route }) => {
  const scrollViewRef = useRef(null);

  const [polygonData, setPolygonData] = useState({
    coordinates: [],
    areaInAcres: 0,
    isClosed: false,
  });

  const [nearestFields, setNearestFields] = useState(null);
  const [loadingNearest, setLoadingNearest] = useState(false);

  // ← NEW: modal state
  const [selectedField, setSelectedField] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const clusterId = route?.params?.clusterId ?? null;

  // ------------------------------------------------------------------
  const handlePolygonComplete = ({ coordinates, areaInAcres, isClosed }) => {
    setPolygonData({ coordinates, areaInAcres, isClosed });
  };

  const handleConfirm = () => {
    navigation.navigate("AddNewField", {
      polygonCoordinates: polygonData.coordinates,
      areaInAcres: polygonData.areaInAcres,
    });
  };

  // ← NEW: open / close modal helpers
  const openFieldModal = useCallback((field) => {
    setSelectedField(field);
    setModalVisible(true);
  }, []);

  const closeFieldModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedField(null), 300); // wait for slide-out
  }, []);

  const handleViewFull = useCallback(
    (field) => {
      navigation.navigate("FieldView", { fieldId: field.id });
    },
    [navigation],
  );

  // ------------------------------------------------------------------
  // Nearest fields fetch  (unchanged from File 1)
  // ------------------------------------------------------------------
  const handleSeeNearestFields = async () => {
    try {
      setLoadingNearest(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is needed to find nearest fields.",
        );
        setLoadingNearest(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const userLat = loc.coords.latitude;
      const userLng = loc.coords.longitude;

      const token = await getAuthToken();
      if (!token) {
        Alert.alert("Session Expired", "Please log in again.");
        setLoadingNearest(false);
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        ...(token ? { "x-auth-token": token } : {}),
      };

      let fields = [];

      if (clusterId) {
        const json = await fetchJSON(
          `${SERVER_URL}/api/field/${clusterId}/cluster`,
          { headers },
        );
        fields = json?.data ?? [];
      } else {
        const clusterJson = await fetchJSON(
          `${SERVER_URL}/api/field?page=2&limit=10&search=&sortBy=id&order=ASC`,
          { headers },
        );
        fields = clusterJson?.data ?? [];
      }

      const fieldsWithDist = fields
        .map((f) => {
          if (f.center_latitude && f.center_longitude) {
            const distKm = haversineDistance(
              userLat,
              userLng,
              parseFloat(f.center_latitude),
              parseFloat(f.center_longitude),
            );
            return { ...f, _distKm: distKm };
          }
          const raw = f?.geometry?.coordinates?.[0] ?? [];
          if (!raw.length) return null;
          const centroid = polygonCentroid(raw);
          if (!centroid) return null;
          const distKm = haversineDistance(
            userLat,
            userLng,
            centroid.lat,
            centroid.lng,
          );
          return { ...f, _distKm: distKm };
        })
        .filter(Boolean)
        .sort((a, b) => a._distKm - b._distKm)
        .slice(0, 10);

      setNearestFields(fieldsWithDist);

      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        300,
      );
    } catch (err) {
      console.error("Nearest fields error:", err);
      Alert.alert("Error", "Could not fetch nearest fields. Please try again.");
    } finally {
      setLoadingNearest(false);
    }
  };

  // ------------------------------------------------------------------
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
            {/*
              ← KEY: keep nearbyPolygons from File 1 so orange polygons
                still draw on the map, AND add onNearbyPolygonPress so
                tapping a polygon on the map also opens the modal.
            */}
            <AddNewPolygonFields
              onPolygonComplete={handlePolygonComplete}
              nearbyPolygons={nearestFields ?? []}
              onNearbyPolygonPress={openFieldModal} // ← wire map tap → modal
            />

            {/* Nearest Fields Button */}
            <TouchableOpacity
              style={[
                styles.nearestBtn,
                loadingNearest && styles.nearestBtnDisabled,
              ]}
              onPress={handleSeeNearestFields}
              disabled={loadingNearest}
              activeOpacity={0.8}
            >
              {loadingNearest ? (
                <ActivityIndicator color="#39B54B" size="small" />
              ) : (
                <Text style={styles.nearestBtnIcon}>📍</Text>
              )}
              <Text
                style={[
                  styles.nearestBtnText,
                  loadingNearest && styles.nearestBtnTextDisabled,
                ]}
              >
                {loadingNearest
                  ? "Finding Nearest Fields…"
                  : nearestFields
                    ? "Refresh Nearest Fields"
                    : "See Nearest Fields"}
              </Text>
            </TouchableOpacity>

            {/* Nearest Fields Panel */}
            {nearestFields !== null && (
              <NearestFieldsPanel
                fields={nearestFields}
                onClose={() => setNearestFields(null)}
                onFieldPress={openFieldModal} // ← list tap → modal
              />
            )}

            {/* Confirm bar */}
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

      {/* ← Field Detail Bottom Sheet — rendered outside ScrollView so it
            overlays everything including the map */}
      <FieldDetailModal
        field={selectedField}
        visible={modalVisible}
        onClose={closeFieldModal}
        onViewFull={handleViewFull}
      />
    </SafeAreaView>
  );
};

export default DrawPolygonFields;

// ---------------------------------------------------------------------------
// Styles  (unchanged from File 1)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#4E4E4E", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#4E4E4E" },
  scrollView: { flex: 1 },
  body: { paddingHorizontal: 20, paddingVertical: 16 },
  nearestBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#39B54B",
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  nearestBtnDisabled: {
    borderColor: "#C5C5C5",
    shadowOpacity: 0,
    elevation: 0,
  },
  nearestBtnIcon: { fontSize: 16 },
  nearestBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#39B54B",
    letterSpacing: 0.2,
  },
  nearestBtnTextDisabled: { color: "#ABABAB" },
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

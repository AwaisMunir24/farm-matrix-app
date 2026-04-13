import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  FlatList,
} from "react-native";
import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { getAuthUser, getAuthToken } from "../utils/auth"; // adjust path
import { SERVER_URL } from "../utils"; // adjust path

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Distinct field colors ────────────────────────────────────────────────────
const FIELD_COLORS = [
  { fill: "rgba(57,181,75,0.35)", stroke: "#39B54B" },
  { fill: "rgba(59,130,246,0.35)", stroke: "#3b82f6" },
  { fill: "rgba(245,158,11,0.35)", stroke: "#f59e0b" },
  { fill: "rgba(239,68,68,0.35)", stroke: "#ef4444" },
  { fill: "rgba(139,92,246,0.35)", stroke: "#8b5cf6" },
  { fill: "rgba(236,72,153,0.35)", stroke: "#ec4899" },
  { fill: "rgba(20,184,166,0.35)", stroke: "#14b8a6" },
  { fill: "rgba(249,115,22,0.35)", stroke: "#f97316" },
  { fill: "rgba(99,102,241,0.35)", stroke: "#6366f1" },
  { fill: "rgba(16,185,129,0.35)", stroke: "#10b981" },
];

const getFieldColor = (index) => FIELD_COLORS[index % FIELD_COLORS.length];

// ─── Crop icon map ─────────────────────────────────────────────────────────────
const CROP_ICONS = {
  sugarcane: "🌾",
  wheat: "🌿",
  cotton: "☁️",
  rice: "🍚",
  corn: "🌽",
  default: "🌱",
};
const getCropIcon = (crop = "") =>
  CROP_ICONS[crop.toLowerCase()] ?? CROP_ICONS.default;

// ─── Compute bounding region for all fields ──────────────────────────────────
const computeRegion = (fields) => {
  if (!fields.length)
    return {
      latitude: 30.3753,
      longitude: 69.3451,
      latitudeDelta: 5,
      longitudeDelta: 5,
    };
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;
  fields.forEach((f) => {
    (f.coordinates || []).forEach(([lng, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });
  });
  const PAD = 1.4;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PAD, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * PAD, 0.01),
  };
};

// ─── Field Info Bottom Sheet ──────────────────────────────────────────────────
const FieldInfoSheet = ({ field, color, onClose, onViewDetail }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [field]);

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 340,
      duration: 220,
      useNativeDriver: true,
    }).start(onClose);
  };

  if (!field) return null;

  const farmerName =
    `${field.farmer?.first_name || ""} ${field.farmer?.last_name || ""}`.trim();

  const rows = [
    { icon: "user", label: "Farmer", value: farmerName || "—" },
    { icon: "map-pin", label: "Tehsil", value: field.tehsil || "—" },
    { icon: "layers", label: "Category", value: field.field_category || "—" },
    {
      icon: "droplet",
      label: "Irrigation",
      value: field.irrigation_type || "—",
    },
    { icon: "grid", label: "Soil Type", value: field.soil_type || "—" },
    { icon: "home", label: "Ownership", value: field.ownership_type || "—" },
  ];

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
    >
      {/* Handle */}
      <View style={styles.sheetHandle} />

      {/* Header */}
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderLeft}>
          <View
            style={[styles.sheetColorDot, { backgroundColor: color.stroke }]}
          />
          <View>
            <Text style={styles.sheetFieldName} numberOfLines={1}>
              {field.field_name}
            </Text>
            <Text style={styles.sheetCrop}>
              {getCropIcon(field.cropType)} {field.cropType || "—"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.sheetCloseBtn} onPress={closeSheet}>
          <Feather name="x" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Area badge row */}
      <View style={styles.sheetBadgeRow}>
        <View
          style={[
            styles.sheetBadge,
            { backgroundColor: color.fill, borderColor: color.stroke },
          ]}
        >
          <Feather name="maximize-2" size={11} color={color.stroke} />
          <Text style={[styles.sheetBadgeText, { color: color.stroke }]}>
            {field.area_of_field?.toFixed(2)} acres
          </Text>
        </View>
        <View style={styles.sheetBadge}>
          <Feather name="map" size={11} color="#6B7280" />
          <Text style={styles.sheetBadgeText}>
            {field.land_typography || "—"}
          </Text>
        </View>
        <View style={styles.sheetBadge}>
          <Feather name="tag" size={11} color="#6B7280" />
          <Text style={styles.sheetBadgeText}>#{field.id}</Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.sheetInfoGrid}>
        {rows.map(({ icon, label, value }) => (
          <View key={label} style={styles.sheetInfoItem}>
            <View style={styles.sheetInfoIcon}>
              <Feather name={icon} size={12} color="#39B54B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetInfoLabel}>{label}</Text>
              <Text style={styles.sheetInfoValue} numberOfLines={1}>
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.sheetCTA, { backgroundColor: color.stroke }]}
        onPress={() => onViewDetail(field)}
        activeOpacity={0.85}
      >
        <Feather name="eye" size={14} color="#fff" />
        <Text style={styles.sheetCTAText}>View Full Details</Text>
        <Feather name="chevron-right" size={14} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MapFieldsScreen = ({ navigation }) => {
  const mapRef = useRef(null);

  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ── Fetch fields
  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await getAuthUser();
      const token = await getAuthToken();
      const userId = user?.id;
      if (!userId) throw new Error("User not found");

      const res = await axios.get(
        `${SERVER_URL}/api/field/${userId}/representative`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        },
      );
      if (res.data?.success) {
        setFields(res.data.data || []);
      } else {
        throw new Error("Failed to load fields");
      }
    } catch (e) {
      console.error("fetchFields:", e?.message);
      setError(e?.response?.data?.message || "Unable to load fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // ── Fit map to fields after load
useEffect(() => {
  if (mapReady && fields.length && mapRef.current) {
    const first = fields[0];
    setTimeout(() => {
      mapRef.current?.animateCamera(
        {
          center: {
            latitude: first.center_latitude,
            longitude: first.center_longitude,
          },
          zoom: 15,
        },
        { duration: 800 }
      );
    }, 600);
  }
}, [mapReady, fields]);

  // ── Filtered fields for search suggestions
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return fields.filter(
      (f) =>
        f.field_name?.toLowerCase().includes(q) ||
        `${f.farmer?.first_name} ${f.farmer?.last_name}`
          .toLowerCase()
          .includes(q) ||
        f.cropType?.toLowerCase().includes(q) ||
        f.tehsil?.toLowerCase().includes(q),
    );
  }, [searchQuery, fields]);

  const handlePolygonPress = (field) => {
    setSelectedField(field);
    setSearchQuery("");
    // Fly to field
    if (mapRef.current && field.center_latitude) {
      mapRef.current.animateToRegion(
        {
          latitude: field.center_latitude,
          longitude: field.center_longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        600,
      );
    }
  };

  const handleSearchSelect = (field) => {
    setSearchQuery("");
    setSearchFocused(false);
    handlePolygonPress(field);
  };

  const handleFitAll = () => {
    setSelectedField(null);
    if (mapRef.current && fields.length) {
      mapRef.current.animateToRegion(computeRegion(fields), 700);
    }
  };

  const totalAcres = useMemo(
    () => fields.reduce((sum, f) => sum + (f.area_of_field || 0), 0),
    [fields],
  );

  const uniqueFarmers = useMemo(
    () => new Set(fields.map((f) => f.farmer_id)).size,
    [fields],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Map Fields</Text>
          {!loading && (
            <Text style={styles.headerSub}>
              {fields.length} fields · {totalAcres.toFixed(1)} acres ·{" "}
              {uniqueFarmers} farmers
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchFields}>
          <Feather name="refresh-cw" size={15} color="#39B54B" />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}

      {/* ── Map ── */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color="#39B54B" />
            <Text style={styles.mapLoaderText}>Loading fields…</Text>
          </View>
        ) : error ? (
          <View style={styles.mapLoader}>
            <Feather name="alert-circle" size={36} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchFields}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            mapType="satellite"
            initialRegion={computeRegion(fields)}
            onMapReady={() => setMapReady(true)}
            onPress={() => {
              if (selectedField) setSelectedField(null);
              if (searchFocused) setSearchFocused(false);
            }}
            // showsUserLocation///
            showsMyLocationButton={false}
            showsCompass={false}
          >
            {fields.map((field, index) => {
              const clr = getFieldColor(index);
              const coords = (field.coordinates || []).map(([lng, lat]) => ({
                latitude: lat,
                longitude: lng,
              }));
              if (coords.length < 3) return null;
              const isSelected = selectedField?.id === field.id;

              return (
                <React.Fragment key={field.id}>
                  <Polygon
                    coordinates={coords}
                    fillColor={
                      isSelected
                        ? clr.stroke
                            .replace(")", ",0.55)")
                            .replace("rgb", "rgba")
                        : clr.fill
                    }
                    strokeColor={clr.stroke}
                    strokeWidth={isSelected ? 3 : 1.8}
                    tappable
                    onPress={() => handlePolygonPress(field)}
                  />
                  {/* Center label marker */}
                  {field.center_latitude && (
                    <Marker
                      coordinate={{
                        latitude: field.center_latitude,
                        longitude: field.center_longitude,
                      }}
                      anchor={{ x: 0.5, y: 0.5 }}
                      onPress={() => handlePolygonPress(field)}
                      tracksViewChanges={false}
                    >
                      <View
                        style={[
                          styles.markerLabel,
                          isSelected && {
                            borderColor: clr.stroke,
                            backgroundColor: "#fff",
                          },
                        ]}
                      >
                        <Text style={styles.markerText} numberOfLines={1}>
                          {field.field_name.length > 12
                            ? field.field_name.slice(0, 10) + "…"
                            : field.field_name}
                        </Text>
                      </View>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}
          </MapView>
        )}

        {/* ── Map Controls ── */}
        {!loading && !error && (
          <View style={styles.mapControls}>
            {/* Fit all */}
            <TouchableOpacity
              style={styles.mapControlBtn}
              onPress={handleFitAll}
            >
              <Feather name="maximize" size={16} color="#374151" />
            </TouchableOpacity>
            <View style={styles.mapControlDivider} />
            {/* Zoom + */}
            <TouchableOpacity
              style={styles.mapControlBtn}
              onPress={() => {
                mapRef.current?.getCamera().then((cam) => {
                  mapRef.current?.animateCamera(
                    { zoom: (cam.zoom || 12) + 1 },
                    { duration: 300 },
                  );
                });
              }}
            >
              <Feather name="plus" size={18} color="#374151" />
            </TouchableOpacity>
            <View style={styles.mapControlDivider} />
            {/* Zoom - */}
            <TouchableOpacity
              style={styles.mapControlBtn}
              onPress={() => {
                mapRef.current?.getCamera().then((cam) => {
                  mapRef.current?.animateCamera(
                    { zoom: (cam.zoom || 12) - 1 },
                    { duration: 300 },
                  );
                });
              }}
            >
              <Feather name="minus" size={18} color="#374151" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Field count chip (bottom-left) ── */}
        {!loading && !error && (
          <View style={styles.countChip}>
            <View style={styles.countChipDot} />
            <Text style={styles.countChipText}>{fields.length} Fields</Text>
          </View>
        )}
      </View>

      {/* ── Field Info Bottom Sheet ── */}
      {selectedField && (
        <FieldInfoSheet
          field={selectedField}
          color={getFieldColor(
            fields.findIndex((f) => f.id === selectedField.id),
          )}
          onClose={() => setSelectedField(null)}
          onViewDetail={(field) => {
            setSelectedField(null);
            navigation?.navigate("ViewField", {
              fieldId: field.id,
              fieldName: field.field_name,
            });
          }}
        />
      )}

      {/* ── Legend strip ── */}
      {!loading && !error && !selectedField && fields.length > 0 && (
        <View style={styles.legend}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.legendContent}
          >
            {fields.map((field, i) => {
              const clr = getFieldColor(i);
              return (
                <TouchableOpacity
                  key={field.id}
                  style={styles.legendItem}
                  onPress={() => handlePolygonPress(field)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[styles.legendDot, { backgroundColor: clr.stroke }]}
                  />
                  <Text style={styles.legendText} numberOfLines={1}>
                    {field.field_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

export default MapFieldsScreen;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const GREEN = "#39B54B";
const WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";
const TEXT_PRI = "#111827";
const TEXT_SEC = "#6B7280";
const TEXT_MUTED = "#9CA3AF";

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  android: { elevation: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 4 : 8,
    paddingBottom: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_PRI,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
    fontWeight: "500",
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },

  // ── Search
  searchWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: WHITE,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  searchBarFocused: {
    borderColor: GREEN,
    backgroundColor: WHITE,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT_PRI,
    fontWeight: "500",
    padding: 0,
  },
  suggestions: {
    position: "absolute",
    top: 56,
    left: 12,
    right: 12,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 8 },
    }),
    maxHeight: 240,
    overflow: "hidden",
    zIndex: 999,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  suggestionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_PRI,
  },
  suggestionSub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
    textTransform: "capitalize",
  },
  suggestionArea: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
  },
  suggestionDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 14,
  },

  // ── Map
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  mapLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    gap: 12,
  },
  mapLoaderText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  retryBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  retryBtnText: { color: WHITE, fontWeight: "700", fontSize: 13 },

  // ── Map controls
  mapControls: {
    position: "absolute",
    right: 14,
    bottom: 80,
    backgroundColor: WHITE,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 6 },
    }),
  },
  mapControlBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 8,
  },

  // ── Count chip
  countChip: {
    position: "absolute",
    bottom: 80,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,24,39,0.82)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  countChipText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Marker label
  markerLabel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  markerText: {
    fontSize: 9,
    fontWeight: "700",
    color: TEXT_PRI,
    maxWidth: 80,
  },

  // ── Legend strip
  legend: {
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 8,
  },
  legendContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_PRI,
    maxWidth: 100,
  },

  // ── Bottom sheet
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 50 : 150,
    ...CARD_SHADOW,
    zIndex: 500,

  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  sheetColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sheetFieldName: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_PRI,
    letterSpacing: -0.3,
    maxWidth: SW * 0.55,
  },
  sheetCrop: {
    fontSize: 11,
    color: TEXT_SEC,
    marginTop: 2,
    textTransform: "capitalize",
    fontWeight: "500",
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBadgeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sheetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sheetBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_SEC,
  },
  sheetInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  sheetInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: (SW - 40) / 2,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sheetInfoIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetInfoLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sheetInfoValue: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_PRI,
    marginTop: 1,
    textTransform: "capitalize",
  },
  sheetCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
  },
  sheetCTAText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

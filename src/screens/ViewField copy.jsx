import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import MapView, { Polygon, PROVIDER_GOOGLE } from "react-native-maps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { label: "Biomass (NDVI)", value: "ndvi" },
  { label: "Soil Moisture", value: "moisture" },
  { label: "Chlorophyll", value: "chlorophyll" },
  { label: "Temperature", value: "temperature" },
];

// Mock timeline snapshots — replace with API data
const MOCK_TIMELINE = [
  { id: "1", date: "Nov 30", label: "Nov 30", cloudCover: 22 },
  { id: "2", date: "Dec 5", label: "Dec 5", cloudCover: 22 },
  { id: "3", date: "Dec 10", label: "Dec 10", cloudCover: 22 },
  { id: "4", date: "Dec 25", label: "Dec 25", cloudCover: 22 },
  { id: "5", date: "Dec 30", label: "Dec 30", cloudCover: 22 },
];

// Mock plant-health graph values (0–1 NDVI) — replace with API data
const MOCK_GRAPH = [0.2, 0.5, 0.3, 0.7, 0.6, 0.4, 0.8, 0.5, 0.3, 0.6, 0.9, 0.4];

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
const CategoryDropdown = ({ selectedValue, onSelect }) => {
  const [visible, setVisible] = useState(false);
  const selected = CATEGORY_OPTIONS.find((o) => o.value === selectedValue);

  return (
    <>
      <TouchableOpacity
        style={styles.categoryDropdown}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        {/* Green leaf dot */}
        <View style={styles.categoryDot} />
        <Text style={styles.categoryDropdownText} numberOfLines={1}>
          {selected?.label || "Select Category"}
        </Text>
        <Feather name="chevron-down" size={14} color="#fff" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Feather name="x" size={18} color="#4E4E4E" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CATEGORY_OPTIONS}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemActive,
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && styles.modalItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Feather name="check" size={14} color="#39B54B" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NDVI HEATMAP OVERLAY (SVG-style pixel grid rendered in a View)
// Replace with a real image/tile overlay from your API
// ─────────────────────────────────────────────────────────────────────────────
const NDVIOverlay = () => {
  // A simplified color grid to mimic the NDVI heatmap in the screenshot.
  // In production: replace with an actual image overlay on the MapView.
  const COLORS = [
    "#4B0082",
    "#0000CD",
    "#00BFFF",
    "#00FF00",
    "#FFFF00",
    "#FF4500",
    "#FF0000",
  ];
  const ROWS = 10;
  const COLS = 12;

  const grid = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      const v = Math.sin(r * 0.8 + c * 0.5) * 0.5 + 0.5;
      const idx = Math.min(Math.floor(v * COLORS.length), COLORS.length - 1);
      return COLORS[idx];
    }),
  );

  const cellW = (SCREEN_WIDTH - 32 - 64) / COLS; // map width minus legend
  const cellH = 180 / ROWS;

  return (
    <View style={styles.ndviOverlay} pointerEvents="none">
      {grid.map((row, r) => (
        <View key={r} style={{ flexDirection: "row" }}>
          {row.map((color, c) => (
            <View
              key={c}
              style={{ width: cellW, height: cellH, backgroundColor: color }}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INDEX LEGEND (right side gradient bar 1 → 0)
// ─────────────────────────────────────────────────────────────────────────────
const IndexLegend = () => (
  <View style={styles.legend}>
    <Text style={styles.legendTitle}>Index</Text>
    <Text style={styles.legendTop}>1</Text>
    <View style={styles.legendGradient}>
      {[
        "#FF0000",
        "#FF4500",
        "#FFA500",
        "#FFFF00",
        "#ADFF2F",
        "#00FF00",
        "#00BFFF",
        "#0000CD",
        "#4B0082",
      ].map((c, i) => (
        <View key={i} style={[styles.legendSlice, { backgroundColor: c }]} />
      ))}
    </View>
    <Text style={styles.legendBottom}>0</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE THUMBNAIL (small colored field previews below the map)
// ─────────────────────────────────────────────────────────────────────────────
const TimelineThumbnail = ({ item, isSelected, onPress }) => (
  <TouchableOpacity
    style={styles.thumbWrap}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {/* Cloud cover badge */}
    <View style={styles.thumbBadge}>
      <Feather name="cloud" size={8} color="#fff" />
      <Text style={styles.thumbBadgeText}>{item.cloudCover}%</Text>
    </View>
    {/* Mini NDVI preview box */}
    <View style={[styles.thumbBox, isSelected && styles.thumbBoxSelected]}>
      {/* Simplified gradient fill */}
      <View style={styles.thumbGradTop} />
      <View style={styles.thumbGradMid} />
      <View style={styles.thumbGradBot} />
    </View>
    <Text style={styles.thumbDate}>{item.label}</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// PLANT HEALTH GRAPH (simple polyline using Views)
// ─────────────────────────────────────────────────────────────────────────────
const PlantHealthGraph = ({ data }) => {
  const GRAPH_H = 100;
  const GRAPH_W = SCREEN_WIDTH - 64;
  const MAX = Math.max(...data);
  const MIN = Math.min(...data);

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * GRAPH_W,
    y: GRAPH_H - ((v - MIN) / (MAX - MIN + 0.001)) * GRAPH_H,
  }));

  return (
    <View style={{ height: GRAPH_H + 20, marginTop: 8 }}>
      <View style={{ position: "relative", height: GRAPH_H, width: GRAPH_W }}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              top: t * GRAPH_H,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "#F0F0F0",
            }}
          />
        ))}

        {/* Line segments */}
        {pts.slice(0, -1).map((p, i) => {
          const next = pts[i + 1];
          const dx = next.x - p.x;
          const dy = next.y - p.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: length,
                height: 2,
                backgroundColor: "#39B54B",
                transformOrigin: "0 50%",
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {/* Dots */}
        {pts.map((p, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: p.x - 4,
              top: p.y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#39B54B",
              borderWidth: 2,
              borderColor: "#fff",
            }}
          />
        ))}
      </View>

      {/* X-axis labels */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(
          (m) => (
            <Text key={m} style={styles.graphXLabel}>
              {m}
            </Text>
          ),
        )}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const ViewField = ({ navigation, route }) => {
  // Dynamic data passed from FieldsListing via navigation
  const {
    fieldId,
    polygon = [], // [{ latitude, longitude }, ...]
    fieldName = "Field",
  } = route?.params || {};

  const goBack = () => navigation.goBack();

  const [selectedCategory, setSelectedCategory] = useState("ndvi");
  const [selectedSnapshot, setSelectedSnapshot] = useState("3"); // Dec 10 active by default
  const [isLoading, setIsLoading] = useState(false);

  // Dynamically calculate map region from polygon
  const mapRegion = (() => {
    if (!polygon || polygon.length === 0)
      return {
        latitude: 31.5204,
        longitude: 74.3587,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    const lats = polygon.map((p) => p.latitude);
    const lngs = polygon.map((p) => p.longitude);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs),
      maxLng = Math.max(...lngs);
    const PADDING = 1.6;
    const MIN_SPAN = 0.005;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * PADDING, MIN_SPAN),
      longitudeDelta: Math.max((maxLng - minLng) * PADDING, MIN_SPAN),
    };
  })();

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header — same as FieldsListing */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Feather name="x" size={18} color="#4E4E4E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detailed Field Analytics</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subTitle}>
        Select a category and deep-dive{"\n"}into your fields data
      </Text>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── MAP CARD ── */}
        <View style={styles.mapCard}>
          {/* Map top bar: date label + category dropdown */}
          <View style={styles.mapTopBar}>
            <Text style={styles.mapDateLabel}>Mon, 14 April 2022</Text>
            <CategoryDropdown
              selectedValue={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>

          {/* Zoom buttons */}
          <View style={styles.zoomBtns}>
            <TouchableOpacity style={styles.zoomBtn}>
              <Feather name="plus" size={16} color="#383838" />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomBtn}>
              <Feather name="minus" size={16} color="#383838" />
            </TouchableOpacity>
          </View>

          {/* Satellite MapView */}
          <View style={styles.mapContainer}>
            {isLoading ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#39B54B" />
              </View>
            ) : (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={mapRegion}
                mapType="satellite"
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
              >
                {polygon.length > 0 && (
                  <Polygon
                    coordinates={polygon}
                    strokeColor="#fff"
                    fillColor="rgba(255,255,255,0.1)"
                    strokeWidth={2}
                  />
                )}
              </MapView>
            )}

            {/* NDVI heatmap overlay on top of map */}
            <NDVIOverlay />

            {/* Index legend (right side) */}
            <IndexLegend />

            {/* Fullscreen button */}
            <TouchableOpacity style={styles.fullscreenBtn}>
              <Feather name="maximize-2" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Timeline thumbnails */}
          <FlatList
            data={MOCK_TIMELINE}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineList}
            renderItem={({ item }) => (
              <TimelineThumbnail
                item={item}
                isSelected={selectedSnapshot === item.id}
                onPress={() => setSelectedSnapshot(item.id)}
              />
            )}
          />
        </View>

        {/* ── PLANT HEALTH GRAPH CARD ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plant Health Graph</Text>
          <PlantHealthGraph data={MOCK_GRAPH} />
        </View>

        {/* ── FIELD DETAILS CARD ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Field Details</Text>
          <DetailRow label="Field ID" value={String(fieldId || "N/A")} />
          <DetailRow label="Field Name" value={fieldName || "N/A"} />
          <DetailRow
            label="Category"
            value={
              CATEGORY_OPTIONS.find((o) => o.value === selectedCategory)
                ?.label || "N/A"
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ViewField;

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — mirrors FieldsListing exactly
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F0F0" },
  scrollView: { flex: 1 },

  // Header (copied from FieldsListing)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#383838" },

  subTitle: {
    textAlign: "center",
    fontSize: 12,
    color: "#7A7A7A",
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 20,
  },

  // Card (copied from FieldsListing)
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },

  // Map card
  mapCard: {
    backgroundColor: "#1A1A2E",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  // Map top bar
  mapTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  mapDateLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Category dropdown
  categoryDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#39B54B",
  },
  categoryDropdownText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 2,
  },

  // Zoom buttons (top-left overlay)
  zoomBtns: {
    position: "absolute",
    top: 56,
    left: 14,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    overflow: "hidden",
  },
  zoomBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: { height: 1, backgroundColor: "#E0E0E0" },

  // Map container
  mapContainer: {
    height: 220,
    marginHorizontal: 14,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    marginBottom: 12,
  },
  map: { width: "100%", height: "100%" },
  mapLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },

  // NDVI overlay
  ndviOverlay: {
    position: "absolute",
    top: "10%",
    left: "15%",
    right: "20%",
    bottom: "10%",
    opacity: 0.85,
    borderRadius: 4,
    overflow: "hidden",
  },

  // Legend
  legend: {
    position: "absolute",
    right: 10,
    top: 10,
    bottom: 10,
    width: 36,
    alignItems: "center",
  },
  legendTitle: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 2,
  },
  legendTop: { color: "#fff", fontSize: 9, marginBottom: 2 },
  legendGradient: { flex: 1, width: 16, borderRadius: 4, overflow: "hidden" },
  legendSlice: { flex: 1, width: "100%" },
  legendBottom: { color: "#fff", fontSize: 9, marginTop: 2 },

  // Fullscreen btn
  fullscreenBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Timeline
  timelineList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  thumbWrap: { alignItems: "center", marginRight: 10 },
  thumbBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 4,
    gap: 2,
  },
  thumbBadgeText: { color: "#fff", fontSize: 8, fontWeight: "600" },
  thumbBox: {
    width: 58,
    height: 50,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbBoxSelected: { borderColor: "#39B54B" },
  thumbGradTop: { flex: 1, backgroundColor: "#FF4500" },
  thumbGradMid: { flex: 1, backgroundColor: "#FFFF00" },
  thumbGradBot: { flex: 1, backgroundColor: "#00BFFF" },
  thumbDate: { color: "#CCC", fontSize: 10, marginTop: 4 },

  // Graph
  graphXLabel: { fontSize: 9, color: "#AAA", flex: 1, textAlign: "center" },

  // Detail rows (copied from FieldsListing)
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  detailLabel: {
    width: 120,
    fontSize: 12,
    color: "#7A7A7A",
    fontWeight: "600",
  },
  detailValue: { flex: 1, fontSize: 12, color: "#383838", fontWeight: "500" },

  // Modal (copied from FieldsListing)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    width: "100%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: { fontSize: 14, fontWeight: "700", color: "#383838" },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  modalItemActive: { backgroundColor: "#F0FDF4" },
  modalItemText: { fontSize: 13, color: "#4E4E4E" },
  modalItemTextActive: { color: "#15803D", fontWeight: "700" },
});

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Animated,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import MapView, { Marker, PROVIDER_GOOGLE, Geojson } from "react-native-maps";
import DropdownIcon from "../../assets/dropdownsvg.svg";
import { Ionicons } from "@expo/vector-icons";
import { getAuthToken } from "../utils/auth"; // ← import from auth.js (adjust path as needed)

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SERVER_URL = "https://farm-matrix-backend.vercel.app";

const SCREEN_WIDTH = Dimensions.get("window").width;

const CROP_TYPE_COLORS = {
  Wheat: "#F4A460",
  Rice: "#90EE90",
  Cotton: "#FFB6C1",
  Sugarcane: "#DDA0DD",
  Maize: "#FFD700",
  Unknown: "#808080",
};

// ─── Pakistan boundary (accurate simplified) ──────────────────────────────────
const PAKISTAN_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            // ── Arabian Sea coast (west → east) ──
            [61.59, 25.21],
            [62.4, 25.05],
            [63.3, 24.4],
            [64.2, 24.0],
            [65.15, 24.7],
            [66.46, 24.86],
            [67.35, 24.26],
            [68.09, 23.55], // Sir Creek

            // ── India border (south → north) ──
            [68.84, 23.96],
            [69.53, 24.27],
            [70.09, 25.31],
            [70.55, 26.6],
            [70.8, 27.8],
            [71.0, 28.95],
            [71.59, 29.83],
            [72.28, 30.94],
            [73.06, 31.8],
            [74.35, 32.1],
            [74.65, 32.27], // Wagah

            // ── Line of Control ──
            [76.77, 35.66],

            // ── China border ──
            [76.15, 36.9],
            [75.5, 36.98],
            [74.57, 37.07],

            // ── Durand Line / Afghanistan border (north → south) ──
            // Stays EAST of Kabul (69.17°E) at all latitudes
            [73.5, 36.9],
            [71.85, 36.48], // Chitral
            [71.5, 35.85], // Dir
            [71.2, 35.15], // Bajaur
            [71.1, 34.55],
            [71.1, 34.1], // Torkham / Khyber Pass
            [70.3, 33.6], // Kurram
            [69.5, 32.5], // North Waziristan
            [69.2, 31.9], // South Waziristan
            [68.5, 31.4],
            [67.4, 31.2],
            [66.45, 30.93], // Chaman
            [65.8, 30.3],
            [64.5, 30.0],
            [63.5, 29.9],
            [62.47, 29.4],
            [61.58, 29.31], // Iran-Afghan-Pak tripoint

            // ── Iran border (north → south) ──
            [61.0, 28.2],
            [60.87, 27.0],
            [60.87, 25.9],
            [61.59, 25.21], // close polygon
          ],
        ],
      },
    },
  ],
};

// ─── Animated Dropdown ────────────────────────────────────────────────────────
const AnimatedDropdown = ({
  label,
  options,
  selected,
  onSelect,
  isOpen,
  onToggle,
}) => {
  const animHeight = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const itemHeight = 40;
    const maxItems = 5;
    const targetHeight = Math.min(
      options.length * itemHeight,
      maxItems * itemHeight,
    );

    if (isOpen) {
      Animated.parallel([
        Animated.timing(animHeight, {
          toValue: targetHeight,
          duration: 240,
          useNativeDriver: false,
        }),
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: false,
        }),
        Animated.timing(animRotate, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: false,
        }),
        Animated.timing(animRotate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const rotate = animRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const selectedLabel =
    options.find((o) => o.value === selected)?.label || null;

  return (
    <View style={dd.wrapper}>
      <TouchableOpacity
        style={dd.trigger}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={dd.label}>{label}</Text>
          <Text style={dd.selected} numberOfLines={1}>
            {selectedLabel || `Select ${label}`}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <DropdownIcon width={18} height={18} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={[dd.list, { maxHeight: animHeight, opacity: animOpacity }]}
      >
        <ScrollView
          scrollEnabled
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[dd.option, opt.value === selected && dd.optionActive]}
              onPress={() => {
                onSelect(opt.value);
                onToggle();
              }}
            >
              <Text
                style={[
                  dd.optionText,
                  opt.value === selected && dd.optionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// ─── Mini Bar Chart (no external lib) ────────────────────────────────────────
const MiniBarChart = ({ yearlyData }) => {
  if (!yearlyData || yearlyData.length === 0) return null;

  const cropTypes = [
    ...new Set(
      yearlyData.flatMap((d) => Object.keys(d).filter((k) => k !== "year")),
    ),
  ];

  // Convert hectares to acres, find max for scaling
  const converted = yearlyData.map((d) => {
    const row = { year: d.year };
    cropTypes.forEach((c) => {
      row[c] = d[c] ? parseFloat((d[c] * 2.47105).toFixed(1)) : 0;
    });
    return row;
  });

  const allValues = converted.flatMap((d) => cropTypes.map((c) => d[c] || 0));
  const maxVal = Math.max(...allValues, 1);

  const BAR_H = 80;
  const BAR_W = Math.max(
    20,
    Math.floor(
      (SCREEN_WIDTH - 120) /
        (yearlyData.length * cropTypes.length + yearlyData.length),
    ),
  );
  const GAP = 4;

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={chart.title}>Yearly crop area (acres)</Text>

      {/* Chart area */}
      <View style={[chart.chartArea, { height: BAR_H + 28 }]}>
        {converted.map((yearRow, yi) => (
          <View key={yearRow.year} style={chart.group}>
            {/* Bars */}
            <View style={chart.bars}>
              {cropTypes.map((crop) => {
                const val = yearRow[crop] || 0;
                const barH = Math.max(2, (val / maxVal) * BAR_H);
                const color = CROP_TYPE_COLORS[crop] || "#808080";
                return (
                  <View
                    key={crop}
                    style={[
                      chart.bar,
                      {
                        width: BAR_W,
                        height: barH,
                        backgroundColor: color,
                        marginHorizontal: GAP / 2,
                      },
                    ]}
                  />
                );
              })}
            </View>
            {/* Year label */}
            <Text style={chart.yearLabel}>{yearRow.year}</Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={chart.legend}>
        {cropTypes.map((crop) => (
          <View key={crop} style={chart.legendItem}>
            <View
              style={[
                chart.legendDot,
                { backgroundColor: CROP_TYPE_COLORS[crop] || "#808080" },
              ]}
            />
            <Text style={chart.legendText}>{crop}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Crop Info Panel (sidebar) ────────────────────────────────────────────────
const CropInfoPanel = ({ cropInfo, yearlyData, animValue }) => {
  return (
    <Animated.View
      style={[
        info.card,
        {
          opacity: animValue,
          transform: [
            { scaleY: animValue },
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        style={{ maxHeight: 380 }}
      >
        {cropInfo.length === 0 ? (
          <Text style={info.empty}>No crop data available</Text>
        ) : (
          cropInfo.map((item, index) => (
            <View key={index} style={info.cropCard}>
              {/* Header row */}
              <View style={info.cropRow}>
                <View style={[info.dot, { backgroundColor: item.color }]} />
                <Text style={info.cropName}>{item.title}</Text>
                <Text style={info.cropPct}>{item.percent}</Text>
              </View>
              {/* Progress bar */}
              <View style={info.barBg}>
                <View
                  style={[
                    info.barFill,
                    {
                      width: item.percent,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              {/* Area + count */}
              <Text style={info.areaText}>
                {(parseFloat(item.area) * 2.47105).toFixed(2)} acres (
                {item.count} zones)
              </Text>
            </View>
          ))
        )}

        {/* Mini bar chart */}
        <MiniBarChart yearlyData={yearlyData} />
      </ScrollView>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CropScan = ({ navigation }) => {
  const goBack = () => navigation.replace("MainTabs");
  const mapRef = useRef(null);

  // Dropdowns
  const [clusters, setClusters] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [openDropdown, setOpenDropdown] = useState(null);

  // Loading / panel
  const [loading, setLoading] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  // Map layers
  const [cropScans, setCropScans] = useState(null);
  const [farmerFields, setFarmerFields] = useState(null);
  const [clusterBoundary, setClusterBoundary] = useState(null);

  // Stats
  const [cropInfo, setCropInfo] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);

  const infoAnim = useRef(new Animated.Value(0)).current;

  // ── On mount: generate years + load clusters ──────────────────────────────
  useEffect(() => {
    generateYears();
    loadClusters();
  }, []);

  const generateYears = () => {
    const current = new Date().getFullYear();
    const list = [];
    for (let y = current + 1; y >= 2020; y--) {
      list.push({ value: y.toString(), label: y.toString() });
    }
    setYears(list);
  };

  // ── Load clusters using auth.js getAuthToken ──────────────────────────────
  const loadClusters = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error("loadClusters: no token found, user not logged in");
        return;
      }

      const params = new URLSearchParams({
        page: "1",
        limit: "10",
        search: "",
        sortBy: "id",
        order: "ASC",
      });

      const res = await fetch(`${SERVER_URL}/api/cluster?${params}`, {
        headers: { "x-auth-token": token },
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("loadClusters: non-JSON response:", text.slice(0, 200));
        return;
      }

      if (data.success) {
        setClusters(
          data.data.map((c) => ({
            value: c.id.toString(),
            label: c.cluster_name,
          })),
        );
      } else {
        console.error("loadClusters: API error:", data.message);
      }
    } catch (e) {
      console.error("loadClusters:", e.message);
    }
  };

  // ── API helpers ───────────────────────────────────────────────────────────
  const fetchCropScansGeoJSON = async (clusterId, year) => {
    const params = new URLSearchParams({ cluster_id: clusterId, year });
    const res = await fetch(
      `${SERVER_URL}/api/crop-scan/scans/geojson?${params}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch crop scans");
    if (!data.data?.features?.length)
      throw new Error("No crop scan data found for this year");
    return data.data;
  };

  const fetchFarmerFieldsGeoJSON = async (clusterId) => {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(
      `${SERVER_URL}/api/crop-scan/fields/geojson/${clusterId}`,
      { headers: { "x-auth-token": token } },
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.message || "Failed to fetch farmer fields");
    return data.data;
  };

  const fetchClusterBoundary = async (clusterId) => {
    const res = await fetch(
      `${SERVER_URL}/api/crop-scan/${clusterId}/boundary`,
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.message || "Failed to fetch cluster boundary");
    return data.data;
  };

  const fetchStatistics = async (clusterId, year) => {
    const params = new URLSearchParams({ cluster_id: clusterId, year });
    const res = await fetch(`${SERVER_URL}/api/crop-scan/statistics?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch statistics");
    return data.data;
  };

  const fetchYearlyStatistics = async (clusterId) => {
    const params = new URLSearchParams({ cluster_id: clusterId });
    const res = await fetch(
      `${SERVER_URL}/api/crop-scan/statistics/yearly?${params}`,
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.message || "Failed to fetch yearly statistics");
    return data.data;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCluster) {
      Alert.alert("Error", "Please select a cluster");
      return;
    }

    setLoading(true);
    try {
      const [scans, boundary, fields, stats, yearly] = await Promise.allSettled(
        [
          fetchCropScansGeoJSON(selectedCluster, selectedYear),
          fetchClusterBoundary(selectedCluster),
          fetchFarmerFieldsGeoJSON(selectedCluster),
          fetchStatistics(selectedCluster, selectedYear),
          fetchYearlyStatistics(selectedCluster),
        ],
      );

      if (scans.status === "rejected") throw new Error(scans.reason?.message);
      setCropScans(scans.value);
      fitMapToScans(scans.value);

      if (boundary.status === "fulfilled") setClusterBoundary(boundary.value);
      if (fields.status === "fulfilled") setFarmerFields(fields.value);

      if (stats.status === "fulfilled") {
        const infoArray = Object.entries(stats.value).map(([cropType, d]) => ({
          title: cropType,
          percent: `${(d.percentage || 0).toFixed(1)}%`,
          color: CROP_TYPE_COLORS[cropType] || "#808080",
          area: (d.totalAreaHectares || 0).toFixed(2),
          count: d.count || 0,
        }));
        setCropInfo(infoArray);
      }

      if (yearly.status === "fulfilled") setYearlyData(yearly.value);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ── Fit map to fetched scan bounds ─────────────────────────────────────────
  const fitMapToScans = (geojson) => {
    if (!mapRef.current || !geojson?.features?.length) return;
    const coords = [];
    geojson.features.forEach((f) => {
      const rings =
        f.geometry.type === "MultiPolygon"
          ? f.geometry.coordinates.flat(1)
          : f.geometry.coordinates;
      rings[0]?.forEach(([lng, lat]) =>
        coords.push({ latitude: lat, longitude: lng }),
      );
    });
    if (coords.length) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
        animated: true,
      });
    }
  };

  // ── Toggle info panel ──────────────────────────────────────────────────────
  const toggleInfo = () => {
    if (infoVisible) {
      Animated.timing(infoAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setInfoVisible(false));
    } else {
      setInfoVisible(true);
      Animated.timing(infoAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  };

  const toggleDropdown = (name) =>
    setOpenDropdown((prev) => (prev === name ? null : name));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.chooseHeader}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Text style={[styles.closeBtnText, { color: "#555" }]}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.chooseTitle}>Crop Scan</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Map */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : null}
          initialRegion={{
            latitude: 30.3753,
            longitude: 69.3451,
            latitudeDelta: 12,
            longitudeDelta: 12,
          }}
          mapType="hybrid"
          showsUserLocation
          showsMyLocationButton
          onPress={() => setOpenDropdown(null)}
        >
          {/* Pakistan boundary highlight */}
          {/* <Geojson
            geojson={PAKISTAN_GEOJSON}
            strokeColor="#39B54B"
            fillColor="rgba(57,181,75,0.08)"
            strokeWidth={2.5}
          /> */}

          {/* Cluster boundary layer */}
          {clusterBoundary && (
            <Geojson
              geojson={
                clusterBoundary.type
                  ? clusterBoundary
                  : { type: "FeatureCollection", features: [clusterBoundary] }
              }
              strokeColor="#39B54B"
              fillColor="rgba(57,181,75,0.1)"
              strokeWidth={3}
            />
          )}

          {/* Farmer fields layer */}
          {farmerFields?.features?.length > 0 && (
            <Geojson
              geojson={farmerFields}
              strokeColor="#3B82F6"
              fillColor="rgba(59,130,246,0.2)"
              strokeWidth={2}
            />
          )}

          {/* Crop scan layers — one Geojson per crop type for correct colours */}
          {cropScans?.features?.length > 0 &&
            Object.entries(CROP_TYPE_COLORS).map(([cropType, color]) => {
              const filtered = {
                type: "FeatureCollection",
                features: cropScans.features.filter(
                  (f) => (f.properties?.cropType || "Unknown") === cropType,
                ),
              };
              if (!filtered.features.length) return null;
              return (
                <Geojson
                  key={cropType}
                  geojson={filtered}
                  strokeColor="#ffffff"
                  fillColor={color + "99"}
                  strokeWidth={2}
                />
              );
            })}
        </MapView>

        {/* ── Overlaid controls ── */}
        <View style={styles.overlayTop} pointerEvents="box-none">
          {/* Row 1: Cluster + Year dropdowns */}
          <View style={styles.overlayRow}>
            <View
              style={{
                flex: 1.6,
                marginRight: 8,
                zIndex: openDropdown === "cluster" ? 50 : 10,
              }}
            >
              <AnimatedDropdown
                label="Region"
                options={clusters}
                selected={selectedCluster}
                onSelect={setSelectedCluster}
                isOpen={openDropdown === "cluster"}
                onToggle={() => toggleDropdown("cluster")}
              />
            </View>

            <View
              style={{
                flex: 1,
                zIndex: openDropdown === "year" ? 50 : 10,
              }}
            >
              <AnimatedDropdown
                label="Year"
                options={years}
                selected={selectedYear}
                onSelect={setSelectedYear}
                isOpen={openDropdown === "year"}
                onToggle={() => toggleDropdown("year")}
              />
            </View>
          </View>

          {/* Row 2: Submit button + eye toggle */}
          <View style={[styles.overlayRow, { alignItems: "center" }]}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={toggleInfo}
              activeOpacity={0.8}
            >
              <Ionicons
                name={infoVisible ? "eye" : "eye-off"}
                size={22}
                color="#383838"
              />
            </TouchableOpacity>
          </View>

          {/* Crop info panel */}
          {infoVisible && (
            <CropInfoPanel
              cropInfo={cropInfo}
              yearlyData={yearlyData}
              animValue={infoAnim}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default CropScan;

// ─── Dropdown styles ──────────────────────────────────────────────────────────
const dd = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 10,
    color: "#999",
    fontWeight: "500",
    marginBottom: 1,
  },
  selected: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  list: {
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  option: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  optionActive: { backgroundColor: "#F0FAF2" },
  optionText: { fontSize: 13, color: "#444" },
  optionTextActive: { color: "#34B349", fontWeight: "600" },
});

// ─── Info panel styles ────────────────────────────────────────────────────────
const info = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 10,
    elevation: 7,
  },
  empty: {
    color: "#999",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 12,
  },
  cropCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  cropRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    flexShrink: 0,
  },
  cropName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  cropPct: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
  },
  barBg: {
    width: "100%",
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 4,
  },
  areaText: {
    fontSize: 11,
    color: "#777",
    marginTop: 5,
  },
});

// ─── Mini chart styles ────────────────────────────────────────────────────────
const chart = StyleSheet.create({
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 0,
  },
  group: {
    alignItems: "center",
    marginRight: 10,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  bar: {
    borderRadius: 3,
  },
  yearLabel: {
    fontSize: 9,
    color: "#666",
    marginTop: 4,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: "#555",
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    paddingTop: 45,
    paddingHorizontal: 20,
  },
  chooseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chooseTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#383838",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFEFEF",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
  },
  map: { flex: 1 },
  overlayTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
  },
  overlayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  submitBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#39B54B",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
});

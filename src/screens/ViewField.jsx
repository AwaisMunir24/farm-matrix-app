import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  Alert,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import MapView, {
  Polygon,
  UrlTile,
  PROVIDER_GOOGLE,
  Marker,
} from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { SERVER_URL } from "../utils";
import { getAuthToken } from "../utils/auth";
import UrduFieldReportModal from "./Urdufieldreportmodal";

const { width: SW, height: SH } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — match your web INDEX_CONFIG exactly
// ─────────────────────────────────────────────────────────────────────────────
const INDEX_CONFIG = {
  NDVI: {
    label: "Biomass",
    fullLabel: "Biomass (NDVI)",
    color: "#22c55e",
    unit: "NDVI",
    description: "Plant health & vegetation density",
    icon: "leaf",
  },
  NDRE: {
    label: "Nitrogen",
    fullLabel: "Nitrogen (NDRE)",
    color: "#f59e0b",
    unit: "NDRE",
    description: "Nitrogen content in crop canopy",
    icon: "test-tube",
  },
  NDMI: {
    label: "Moisture",
    fullLabel: "Soil Moisture (NDMI)",
    color: "#3b82f6",
    unit: "NDMI",
    description: "Water content in vegetation",
    icon: "water",
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// TOKEN HELPER
// ─────────────────────────────────────────────────────────────────────────────
const getAuthHeaders = async () => {
  try {
    const token = await getAuthToken()
    return {
      "Content-Type": "application/json",
      "x-auth-token": token,
    };
  } catch {
    return { "Content-Type": "application/json" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 ── SATELLITE MAP CARD
// ─────────────────────────────────────────────────────────────────────────────
const SatelliteMapCard = ({ fieldId, fieldData }) => {
  const mapRef = useRef(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState("NDVI");
  const [tileUrl, setTileUrl] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTile, setLoadingTile] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showIndexPicker, setShowIndexPicker] = useState(false);
  const [showLayer, setShowLayer] = useState(true);
  const [sampledValue, setSampledValue] = useState(null);
  const [tileKey, setTileKey] = useState(0); // force UrlTile remount on change

  const cfg = INDEX_CONFIG[selectedIndex];

  // Derive map region from field polygon
  const mapRegion = useMemo(() => {
    const coords = fieldData?.coordinates;
    if (!coords || coords.length === 0) {
      return {
        latitude: 31.5204,
        longitude: 74.3587,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    const lats = coords.map((p) => p[1]);
    const lngs = coords.map((p) => p[0]);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs),
      maxLng = Math.max(...lngs);
    const PAD = 1.8;
    const MIN = 0.004;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * PAD, MIN),
      longitudeDelta: Math.max((maxLng - minLng) * PAD, MIN),
    };
  }, [fieldData]);

  const polygonCoords = useMemo(
    () =>
      (fieldData?.coordinates || []).map((c) => ({
        latitude: c[1],
        longitude: c[0],
      })),
    [fieldData]
  );

  // ── Fetch satellite images (last 90 days)
  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 90 * 864e5).toISOString().split("T")[0];
      const res = await axios.get(
        `${SERVER_URL}/api/satellite/fields/${fieldId}/images`,
        { params: { startDate: start, endDate: end }, headers }
      );
      if (res.data.success && res.data.images.length > 0) {
        const imgs = res.data.images;
        setImages(imgs);
        const best =
          imgs.filter((i) => i.cloudCoverage < 20).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          )[0] || imgs[0];
        setSelectedImage(best);
        setCurrentIdx(imgs.findIndex((i) => i.id === best.id));
      }
    } catch (e) {
      console.error("fetchImages:", e?.message);
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  // ── Fetch tile visualization
  const fetchVisualization = useCallback(async () => {
    if (!selectedImage) return;
    setLoadingTile(true);
    setSampledValue(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(
        `${SERVER_URL}/api/satellite/fields/${fieldId}/visualization`,
        {
          params: { imageId: selectedImage.id, indexType: selectedIndex },
          headers,
        }
      );
      if (res.data.success) {
        setTileUrl(res.data.tileUrl);
        setStatistics(res.data.statistics);
        setTileKey((k) => k + 1); // remount UrlTile to reload
      }
    } catch (e) {
      console.error("fetchVisualization:", e?.message);
    } finally {
      setLoadingTile(false);
    }
  }, [selectedImage, selectedIndex, fieldId]);

  useEffect(() => { if (fieldId) fetchImages(); }, [fetchImages]);
  useEffect(() => { if (selectedImage) fetchVisualization(); }, [fetchVisualization]);

  const selectImage = (img, idx) => {
    setSelectedImage(img);
    setCurrentIdx(idx);
    setSampledValue(null);
  };

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const fmtShortDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <View style={styles.mapCard}>
      {/* ── Header bar */}
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.mapHeaderTitle}>Satellite Analysis</Text>
          {selectedImage && (
            <Text style={styles.mapHeaderSub}>{fmtDate(selectedImage.date)}</Text>
          )}
        </View>
        <View style={styles.mapHeaderRight}>
          {/* Layer toggle */}
          <TouchableOpacity
            style={[styles.layerToggle, showLayer && styles.layerToggleActive]}
            onPress={() => setShowLayer((v) => !v)}
          >
            <Feather
              name="layers"
              size={13}
              color={showLayer ? "#fff" : "#9CA3AF"}
            />
            <Text style={[styles.layerToggleText, showLayer && { color: "#fff" }]}>
              {showLayer ? "ON" : "OFF"}
            </Text>
          </TouchableOpacity>

          {/* Index picker button */}
          <TouchableOpacity
            style={[styles.indexPickerBtn, { borderColor: cfg.color }]}
            onPress={() => setShowIndexPicker(true)}
          >
            <View style={[styles.indexDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.indexPickerLabel, { color: cfg.color }]}>
              {cfg.label}
            </Text>
            <Feather name="chevron-down" size={12} color={cfg.color} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Stats bar */}
      {statistics && (
        <View style={styles.statsBar}>
          {[
            ["Min", statistics.min],
            ["Mean", statistics.mean],
            ["Max", statistics.max],
          ].map(([label, val]) => (
            <View key={label} style={styles.statItem}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={[styles.statValue, { color: cfg.color }]}>
                {Number(val).toFixed(3)}
              </Text>
            </View>
          ))}
          {sampledValue != null && (
            <View style={[styles.statItem, styles.statItemSampled]}>
              <Text style={styles.statLabel}>📍 Sampled</Text>
              <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                {sampledValue.toFixed(3)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#39B54B" />
            <Text style={styles.mapLoadingText}>Loading images…</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={mapRegion}
            mapType="satellite"
            onPress={async (e) => {
              if (!selectedImage || !showLayer || !tileUrl) return;
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setSampledValue(null);
              try {
                const headers = await getAuthHeaders();
                const res = await axios.get(
                  `${SERVER_URL}/api/satellite/fields/${fieldId}/pixel-value`,
                  {
                    params: {
                      imageId: selectedImage.id,
                      indexType: selectedIndex,
                      lat: latitude,
                      lng: longitude,
                    },
                    headers,
                  }
                );
                if (res.data.value != null) {
                  setSampledValue(res.data.value);
                } else if (res.data.outsideField) {
                  Alert.alert("Outside Field", "Tap within the field boundary.");
                }
              } catch {
                /* silent */
              }
            }}
          >
            {/* Satellite index tile overlay */}
            {tileUrl && showLayer && (
              <UrlTile
                key={`${tileKey}-${selectedIndex}`}
                urlTemplate={tileUrl}
                maximumZ={19}
                flipY={false}
                opacity={0.85}
                zIndex={10}
              />
            )}

            {/* Field boundary polygon */}
            {polygonCoords.length > 0 && (
              <Polygon
                coordinates={polygonCoords}
                strokeColor={cfg.color}
                fillColor={`${cfg.color}22`}
                strokeWidth={2.5}
                zIndex={20}
              />
            )}
          </MapView>
        )}

        {/* Tile loading spinner */}
        {loadingTile && (
          <View style={styles.tileLoadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.tileLoadingText}>Rendering layer…</Text>
          </View>
        )}

        {/* Tap hint */}
        {!loadingTile && showLayer && tileUrl && sampledValue == null && (
          <View style={styles.tapHint}>
            <Feather name="crosshair" size={11} color="#D1D5DB" />
            <Text style={styles.tapHintText}>Tap field to sample value</Text>
          </View>
        )}
      </View>

      {/* ── Timeline thumbnails */}
      {images.length > 0 && (
        <View style={styles.timelineWrap}>
          <FlatList
            data={images}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineList}
            renderItem={({ item, index }) => {
              const isSelected = selectedImage?.id === item.id;
              return (
                <TouchableOpacity
                  onPress={() => selectImage(item, index)}
                  style={[
                    styles.thumb,
                    isSelected && {
                      borderColor: cfg.color,
                      borderWidth: 2,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {/* Simulated gradient thumb */}
                  <LinearGradient
                    colors={["#1a3a5c", "#22c55e", "#003d1f"]}
                    style={styles.thumbGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  {/* Cloud badge */}
                  {item.cloudCoverage > 0 && (
                    <View style={styles.cloudBadge}>
                      <Feather name="cloud" size={8} color="#fff" />
                      <Text style={styles.cloudBadgeText}>
                        {Math.round(item.cloudCoverage)}%
                      </Text>
                    </View>
                  )}
                  {/* Selected dot */}
                  {isSelected && (
                    <View
                      style={[styles.selectedDot, { backgroundColor: cfg.color }]}
                    />
                  )}
                  <Text style={styles.thumbDate}>{fmtShortDate(item.date)}</Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Prev / Next */}
          <View style={styles.timelineNav}>
            <TouchableOpacity
              style={[
                styles.navBtn,
                currentIdx === 0 && styles.navBtnDisabled,
              ]}
              disabled={currentIdx === 0}
              onPress={() => selectImage(images[currentIdx - 1], currentIdx - 1)}
            >
              <Feather name="chevron-left" size={14} color={currentIdx === 0 ? "#9CA3AF" : "#374151"} />
              <Text style={[styles.navBtnText, currentIdx === 0 && { color: "#9CA3AF" }]}>
                Prev
              </Text>
            </TouchableOpacity>
            <Text style={styles.imageCounter}>
              {currentIdx + 1} / {images.length}
            </Text>
            <TouchableOpacity
              style={[
                styles.navBtn,
                currentIdx === images.length - 1 && styles.navBtnDisabled,
              ]}
              disabled={currentIdx === images.length - 1}
              onPress={() => selectImage(images[currentIdx + 1], currentIdx + 1)}
            >
              <Text
                style={[
                  styles.navBtnText,
                  currentIdx === images.length - 1 && { color: "#9CA3AF" },
                ]}
              >
                Next
              </Text>
              <Feather
                name="chevron-right"
                size={14}
                color={currentIdx === images.length - 1 ? "#9CA3AF" : "#374151"}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Index picker modal */}
      <Modal visible={showIndexPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIndexPicker(false)}
        >
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Index Layer</Text>
              <TouchableOpacity onPress={() => setShowIndexPicker(false)}>
                <Feather name="x" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
            {Object.entries(INDEX_CONFIG).map(([key, cfg]) => {
              const isActive = key === selectedIndex;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedIndex(key);
                    setShowIndexPicker(false);
                  }}
                >
                  <View
                    style={[
                      styles.pickerDot,
                      { backgroundColor: cfg.color },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.pickerItemLabel,
                        isActive && { color: cfg.color, fontWeight: "700" },
                      ]}
                    >
                      {cfg.fullLabel}
                    </Text>
                    <Text style={styles.pickerItemDesc}>{cfg.description}</Text>
                  </View>
                  {isActive && (
                    <Feather name="check" size={15} color={cfg.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 ── WEATHER CARD
// ─────────────────────────────────────────────────────────────────────────────
const WeatherCard = ({ weatherData }) => {
  const [activeDay, setActiveDay] = useState(0);

  if (!weatherData?.data?.length) return null;

  const days = weatherData.data;
  const current = days[activeDay];
  const location = weatherData.location;

  const fmtDay = (d) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short" });
  const fmtDate = (d) => new Date(d).getDate();
  const fmtFull = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const weatherDetails = [
    { label: "Avg Temp", value: `${current.temperature.avg}°C`, icon: "thermometer" },
    { label: "Wind", value: `${current.wind_speed} m/s`, icon: "wind" },
    { label: "Pressure", value: `${current.pressure} hPa`, icon: "activity" },
    { label: "Humidity", value: `${current.humidity}%`, icon: "droplet" },
    { label: "Clouds", value: `${current.clouds}%`, icon: "cloud" },
  ];

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardIconBg}>
          <Feather name="cloud" size={14} color="#39B54B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Weather Forecast</Text>
          {location && (
            <Text style={styles.cardSubtitle}>
              {location.name}, {location.country}
            </Text>
          )}
        </View>
      </View>

      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelectorScroll}
        contentContainerStyle={styles.daySelectorContent}
      >
        {days.map((day, idx) => {
          const isActive = idx === activeDay;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.dayChip, isActive && styles.dayChipActive]}
              onPress={() => setActiveDay(idx)}
            >
              <Text
                style={[styles.dayChipDay, isActive && { color: "#fff" }]}
              >
                {fmtDay(day.date)}
              </Text>
              <Text
                style={[
                  styles.dayChipDate,
                  isActive && {
                    color: "#fff",
                    backgroundColor: "rgba(255,255,255,0.25)",
                  },
                ]}
              >
                {fmtDate(day.date)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Current day detail */}
      <View style={styles.weatherDetailBox}>
        <View style={styles.weatherDetailTop}>
          <View>
            <Text style={styles.weatherDateFull}>{fmtFull(current.date)}</Text>
            <Text style={styles.weatherDesc}>{current.description}</Text>
          </View>
          <View style={styles.tempBox}>
            <Text style={styles.tempMin}>{current.temperature.min}°</Text>
            <Text style={styles.tempSep}>/</Text>
            <Text style={styles.tempMax}>{current.temperature.max}°C</Text>
          </View>
        </View>

        <View style={styles.weatherGrid}>
          {weatherDetails.map(({ label, value, icon }) => (
            <View key={label} style={styles.weatherGridItem}>
              <Feather name={icon} size={14} color="#39B54B" />
              <Text style={styles.weatherGridLabel}>{label}</Text>
              <Text style={styles.weatherGridValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 ── CHARTS
// ─────────────────────────────────────────────────────────────────────────────

// Simple SVG-free bar/line chart using Views (no extra deps beyond what Expo Go supports)
const MiniLineChart = ({ data, color, height = 80, valueKey = "value", formatY }) => {
  if (!data || data.length === 0) return null;
  const vals = data.map((d) => d[valueKey]).filter((v) => v != null && !isNaN(v));
  if (vals.length === 0) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const chartW = SW - 64;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * chartW,
    y: height - ((d[valueKey] - min) / range) * height,
    val: d[valueKey],
    name: d.name,
  }));

  return (
    <View style={{ height: height + 24, width: "100%" }}>
      <View style={{ height, position: "relative" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <View
            key={t}
            style={{
              position: "absolute",
              top: t * height,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "#F3F4F6",
            }}
          />
        ))}
        {/* Line segments */}
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          const dx = next.x - p.x;
          const dy = next.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y - 1,
                width: len,
                height: 2,
                backgroundColor: color,
                transformOrigin: "0 50%",
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
        {/* Dots */}
        {points.map((p, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: p.x - 4,
              top: p.y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
              borderWidth: 2,
              borderColor: "#fff",
            }}
          />
        ))}
      </View>
      {/* X labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        {points
          .filter((_, i) => i % Math.ceil(points.length / 5) === 0 || i === points.length - 1)
          .map((p, i) => (
            <Text key={i} style={{ fontSize: 9, color: "#9CA3AF" }}>
              {p.name}
            </Text>
          ))}
      </View>
    </View>
  );
};

// Temperature chart — 3 lines (min/avg/max)
const TemperatureChart = ({ weatherData }) => {
  const data = useMemo(() => {
    if (!weatherData?.data) return [];
    return weatherData.data.map((item) => ({
      name: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      min: parseFloat(item.temperature.min),
      avg: parseFloat(item.temperature.avg),
      max: parseFloat(item.temperature.max),
    }));
  }, [weatherData]);

  if (!data.length) return null;

  const allVals = data.flatMap((d) => [d.min, d.avg, d.max]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const H = 90;
  const chartW = SW - 64;

  const line = (key, color) => {
    const pts = data.map((d, i) => ({
      x: (i / (data.length - 1)) * chartW,
      y: H - ((d[key] - min) / range) * H,
    }));
    return pts.slice(0, -1).map((p, i) => {
      const next = pts[i + 1];
      const dx = next.x - p.x,
        dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      return (
        <View
          key={`${key}-${i}`}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y - 1,
            width: len,
            height: 2,
            backgroundColor: color,
            transformOrigin: "0 50%",
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      );
    });
  };

  return (
    <View style={{ height: H + 40 }}>
      <View style={{ height: H, position: "relative" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <View
            key={t}
            style={{
              position: "absolute",
              top: t * H,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "#F3F4F6",
            }}
          />
        ))}
        {line("max", "#ef4444")}
        {line("avg", "#3b82f6")}
        {line("min", "#22c55e")}
      </View>
      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
        {[
          { label: "Max", color: "#ef4444" },
          { label: "Avg", color: "#3b82f6" },
          { label: "Min", color: "#22c55e" },
        ].map(({ label, color }) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 16, height: 2, backgroundColor: color, borderRadius: 1 }} />
            <Text style={{ fontSize: 10, color: "#6B7280" }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Humidity chart
const HumidityChart = ({ weatherData }) => {
  const data = useMemo(() => {
    if (!weatherData?.data) return [];
    return weatherData.data.map((item) => ({
      name: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: item.humidity,
    }));
  }, [weatherData]);

  return <MiniLineChart data={data} color="#3b82f6" height={80} />;
};

// Satellite index time-series chart
const SatelliteIndexChart = ({ fieldId, indexType }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentValue, setCurrentValue] = useState(null);

  const cfg = useMemo(
    () => ({
      NDVI: { color: "#22c55e", title: "Plant Health" },
      NDMI: { color: "#3b82f6", title: "Plant Moisture" },
      NDRE: { color: "#f59e0b", title: "Nitrogen" },
      CH4: { color: "#ef4444", title: "Methane Emissions" },
      CO: { color: "#8b5cf6", title: "Carbon Emissions" },
    }[indexType] || { color: "#22c55e", title: indexType }
  ));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const endDate = new Date();
      const startDate = new Date(Date.now() - 90 * 864e5);
      const res = await axios.get(
        `${SERVER_URL}/api/satellite/field/${fieldId}/timeseries`,
        {
          params: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            indexType,
          },
          headers,
        }
      );
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length) {
        const transformed = res.data.data
          .map((item) => ({
            name: new Date(item.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            fullDate: item.date,
            value: parseFloat(
              (item.mean ?? item.value ?? item.meanValue ?? 0).toFixed(4)
            ),
          }))
          .filter((d) => d.value != null && !isNaN(d.value))
          .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

        setChartData(transformed);
        if (transformed.length) {
          setCurrentValue(transformed[transformed.length - 1].value);
        }
      } else {
        setError(`No data available for ${cfg.title}`);
      }
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to load ${cfg.title}`);
    } finally {
      setLoading(false);
    }
  }, [fieldId, indexType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.chartLoader}>
        <ActivityIndicator size="small" color={cfg.color} />
        <Text style={[styles.chartLoaderText, { color: cfg.color }]}>
          Loading {cfg.title}…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.chartError}>
        <Feather name="alert-circle" size={20} color="#EF4444" />
        <Text style={styles.chartErrorText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!chartData.length) return null;

  return (
    <View>
      <View style={styles.chartMeta}>
        <Text style={[styles.chartCurrentLabel, { color: cfg.color }]}>
          Current: {currentValue?.toFixed(3)}
        </Text>
        <Text style={styles.chartDataPoints}>{chartData.length} pts</Text>
      </View>
      <MiniLineChart data={chartData} color={cfg.color} height={80} />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 ── FIELD INFO PANEL
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "—"}</Text>
  </View>
);

const InfoSection = ({ title, icon, children }) => (
  <View style={styles.infoSection}>
    <View style={styles.infoSectionHeader}>
      <View style={styles.cardIconBg}>
        <Feather name={icon} size={13} color="#39B54B" />
      </View>
      <Text style={styles.infoSectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const FieldInfoPanel = ({ fieldData, fieldBookData }) => {
  const [expanded, setExpanded] = useState({
    farmer: true,
    field: true,
    seed: false,
    land: false,
    sowing: false,
    irrigation: false,
    fertilizer: false,
    disease: false,
    harvesting: false,
    advisory: false,
    weed: false,
    issue: false,
  });

  const toggle = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const CollapsibleSection = ({ sectionKey, title, icon, children }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggle(sectionKey)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBg}>
            <Feather name={icon} size={13} color="#39B54B" />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Feather
          name={expanded[sectionKey] ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9CA3AF"
        />
      </TouchableOpacity>
      {expanded[sectionKey] && (
        <View style={styles.collapsibleBody}>{children}</View>
      )}
    </View>
  );

  return (
    <>
      {/* Farmer Info */}
      <CollapsibleSection sectionKey="farmer" title="Farmer Information" icon="user">
        <InfoRow
          label="Name"
          value={`${fieldData?.farmer?.first_name || ""} ${fieldData?.farmer?.last_name || ""}`}
        />
        <InfoRow label="Email" value={fieldData?.farmer?.email} />
      </CollapsibleSection>

      {/* Field Info */}
      <CollapsibleSection sectionKey="field" title="Field Information" icon="map">
        <InfoRow label="Field Name" value={fieldData?.field_name} />
        <InfoRow label="Category" value={fieldData?.field_category} />
        <InfoRow label="Crop Type" value={fieldData?.cropType} />
        <InfoRow label="Soil Type" value={fieldData?.soil_type} />
        <InfoRow label="Irrigation" value={fieldData?.irrigation_type} />
        <InfoRow label="Land Typography" value={fieldData?.land_typography} />
        <InfoRow label="Ownership" value={fieldData?.ownership_type} />
        <InfoRow label="Area" value={fieldData?.area_of_field ? `${fieldData.area_of_field} acre` : null} />
        <InfoRow label="Tehsil" value={fieldData?.tehsil} />
        <InfoRow label="Address" value={fieldData?.address} />
        <InfoRow label="Village" value={fieldData?.village_name} />
        <InfoRow label="Farmer Responsivity" value={fieldData?.farmer_responsivity} />
        <InfoRow label="Data Knowledge" value={fieldData?.data_knowledge} />
      </CollapsibleSection>

      {/* FieldBook sections — only if available */}
      {fieldBookData && (
        <>
          <CollapsibleSection sectionKey="seed" title="Seed Detail" icon="package">
            <InfoRow label="Variety Name" value={fieldBookData?.seed_detail?.variety_name} />
            <InfoRow label="Quantity" value={fieldBookData?.seed_detail?.quantity_of_seed} />
            <InfoRow label="Cost of Seed" value={fieldBookData?.seed_detail?.cost_of_seed} />
            <InfoRow label="Seed Treatment" value={fieldBookData?.seed_detail?.seed_treatment} />
            <InfoRow label="Treatment Cost" value={fieldBookData?.seed_detail?.treatment_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.seed_detail?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="land" title="Land Preparation" icon="tool">
            <InfoRow label="Equipment Used" value={fieldBookData?.preparation_of_land?.equipment_used} />
            <InfoRow label="Application Date" value={fieldBookData?.preparation_of_land?.application_date} />
            <InfoRow label="Labour Cost" value={fieldBookData?.preparation_of_land?.labour_cost} />
            <InfoRow label="Diesel/Petrol Cost" value={fieldBookData?.preparation_of_land?.diesel_petrol_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.preparation_of_land?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="sowing" title="Sowing Detail" icon="calendar">
            <InfoRow label="Sowing Date" value={fieldBookData?.sowing_detail?.sowing_date} />
            <InfoRow label="Sowing Method" value={fieldBookData?.sowing_detail?.sowing_method} />
            <InfoRow label="Labour Cost" value={fieldBookData?.sowing_detail?.labour_cost} />
            <InfoRow label="Diesel Cost" value={fieldBookData?.sowing_detail?.diesel_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.sowing_detail?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="irrigation" title="Irrigation" icon="droplet">
            <InfoRow label="Source" value={fieldBookData?.irrigation?.irrigation_source} />
            <InfoRow label="Application Date" value={fieldBookData?.irrigation?.application_date} />
            <InfoRow label="Labour Cost" value={fieldBookData?.irrigation?.labour_cost} />
            <InfoRow label="Diesel Cost" value={fieldBookData?.irrigation?.diesel_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.irrigation?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="fertilizer" title="Fertilizer" icon="box">
            <InfoRow label="Application Type" value={fieldBookData?.fertilizer?.application_type} />
            <InfoRow label="Application Date" value={fieldBookData?.fertilizer?.application_date} />
            <InfoRow label="Quantity Type" value={fieldBookData?.fertilizer?.quantity_type} />
            <InfoRow label="Bags" value={fieldBookData?.fertilizer?.bag} />
            <InfoRow label="Fertilizer Price" value={fieldBookData?.fertilizer?.fertilizer_price} />
            <InfoRow label="Labour Cost" value={fieldBookData?.fertilizer?.labour_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.fertilizer?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="disease" title="Disease & Pest Control" icon="alert-triangle">
            <InfoRow label="Pesticide Type" value={fieldBookData?.disease_and_pest?.pesticide_type} />
            <InfoRow label="Application Type" value={fieldBookData?.disease_and_pest?.application_type} />
            <InfoRow label="Application Date" value={fieldBookData?.disease_and_pest?.application_date} />
            <InfoRow label="Pesticide Price" value={fieldBookData?.disease_and_pest?.pesticide_price} />
            <InfoRow label="Labour Cost" value={fieldBookData?.disease_and_pest?.labour_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.disease_and_pest?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="weed" title="Weed Treatment" icon="scissors">
            <InfoRow label="Method" value={fieldBookData?.weed_treatment?.method_of_weeding} />
            <InfoRow label="Application Date" value={fieldBookData?.weed_treatment?.application_date} />
            <InfoRow label="Weeding Details" value={fieldBookData?.weed_treatment?.weeding_details} />
            <InfoRow label="Labour Cost" value={fieldBookData?.weed_treatment?.labour_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.weed_treatment?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="harvesting" title="Harvesting" icon="trending-up">
            <InfoRow label="Harvesting Type" value={fieldBookData?.harvesting?.harvesting_type} />
            <InfoRow label="Actual Harvest" value={fieldBookData?.harvesting?.actual_harvest} />
            <InfoRow label="Estimated Harvest" value={fieldBookData?.harvesting?.estimated_harvest} />
            <InfoRow label="Yield Cost/Mound" value={fieldBookData?.harvesting?.yield_cost_per_mound} />
            <InfoRow label="Labour Cost" value={fieldBookData?.harvesting?.labour_cost} />
            <InfoRow label="Total Cost" value={fieldBookData?.harvesting?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="advisory" title="Advisory" icon="message-circle">
            <InfoRow label="Advisory Type" value={fieldBookData?.advisory?.advisory_type} />
            <InfoRow label="Advisory Date" value={fieldBookData?.advisory?.advisory_date} />
            <InfoRow label="Details" value={fieldBookData?.advisory?.advisory_details} />
            <InfoRow label="Total Cost" value={fieldBookData?.advisory?.total_cost} />
          </CollapsibleSection>

          <CollapsibleSection sectionKey="issue" title="Reported Issue" icon="alert-circle">
            <InfoRow label="Detected Date" value={fieldBookData?.reported_issue?.detected_date} />
            <InfoRow label="Issue Details" value={fieldBookData?.reported_issue?.detected_issue_details} />
            <InfoRow label="Cost to Recover" value={fieldBookData?.reported_issue?.cost_to_recover} />
            <InfoRow label="Total Cost" value={fieldBookData?.reported_issue?.total_cost} />
          </CollapsibleSection>
        </>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 ── FIELD REPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────
// const FieldReportModal = ({ visible, onClose, fieldData, fieldBookData }) => {
//   const sections = [
//     {
//       title: "Field Overview",
//       rows: [
//         ["Field Name", fieldData?.field_name],
//         ["Crop Type", fieldData?.cropType],
//         ["Area", fieldData?.area_of_field ? `${fieldData.area_of_field} acre` : null],
//         ["Soil Type", fieldData?.soil_type],
//         ["Irrigation", fieldData?.irrigation_type],
//         ["Ownership", fieldData?.ownership_type],
//         ["Village", fieldData?.village_name],
//         ["Tehsil", fieldData?.tehsil],
//       ],
//     },
//     fieldBookData && {
//       title: "Cost Summary",
//       rows: [
//         ["Seed Total", fieldBookData?.seed_detail?.total_cost],
//         ["Land Prep Total", fieldBookData?.preparation_of_land?.total_cost],
//         ["Sowing Total", fieldBookData?.sowing_detail?.total_cost],
//         ["Irrigation Total", fieldBookData?.irrigation?.total_cost],
//         ["Fertilizer Total", fieldBookData?.fertilizer?.total_cost],
//         ["Pest Control Total", fieldBookData?.disease_and_pest?.total_cost],
//         ["Weed Treatment Total", fieldBookData?.weed_treatment?.total_cost],
//         ["Harvesting Total", fieldBookData?.harvesting?.total_cost],
//       ],
//     },
//     fieldBookData && {
//       title: "Harvest Summary",
//       rows: [
//         ["Actual Harvest", fieldBookData?.harvesting?.actual_harvest],
//         ["Estimated Harvest", fieldBookData?.harvesting?.estimated_harvest],
//         ["Harvesting Type", fieldBookData?.harvesting?.harvesting_type],
//         ["Yield Cost/Mound", fieldBookData?.harvesting?.yield_cost_per_mound],
//       ],
//     },
//   ].filter(Boolean);

//   return (
//     <Modal visible={visible} animationType="slide" transparent>
//       <View style={styles.reportModalContainer}>
//         <View style={styles.reportModalBox}>
//           {/* Header */}
//           <LinearGradient
//             colors={["#39B54B", "#22863a"]}
//             style={styles.reportModalHeader}
//           >
//             <View>
//               <Text style={styles.reportModalTitle}>Field Report</Text>
//               <Text style={styles.reportModalSub}>
//                 {fieldData?.field_name} · {fieldData?.cropType}
//               </Text>
//             </View>
//             <TouchableOpacity onPress={onClose} style={styles.reportCloseBtn}>
//               <Feather name="x" size={18} color="#fff" />
//             </TouchableOpacity>
//           </LinearGradient>

//           <ScrollView
//             style={styles.reportScroll}
//             contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
//             showsVerticalScrollIndicator={false}
//           >
//             {sections.map((section) => (
//               <View key={section.title} style={styles.reportSection}>
//                 <Text style={styles.reportSectionTitle}>{section.title}</Text>
//                 {section.rows.map(([label, value]) => (
//                   <View key={label} style={styles.reportRow}>
//                     <Text style={styles.reportLabel}>{label}</Text>
//                     <Text style={styles.reportValue}>{value || "N/A"}</Text>
//                   </View>
//                 ))}
//               </View>
//             ))}
//           </ScrollView>
//         </View>
//       </View>
//     </Modal>
//   );
// };


// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const ViewField = ({ navigation, route }) => {
  const { fieldId, fieldName = "Field" } = route?.params || {};

  const [fieldData, setFieldData] = useState(null);
  const [fieldBookData, setFieldBookData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [fieldCenter, setFieldCenter] = useState(null);
  const [isLoadingField, setIsLoadingField] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState("map"); // map | charts | info

  const goBack = () => navigation?.goBack();

  // ── Fetch field data + fieldbook
  const fetchFieldData = useCallback(async () => {
    if (!fieldId) return;
    setIsLoadingField(true);
    try {
      const headers = await getAuthHeaders();

      const [fieldRes, bookRes] = await Promise.allSettled([
        axios.get(`${SERVER_URL}/api/field/${fieldId}`, { headers }),
        axios.get(`${SERVER_URL}/api/fieldbook/field/${fieldId}`, { headers }),
      ]);

      if (fieldRes.status === "fulfilled" && fieldRes.value.data.success) {
        const fd = fieldRes.value.data.data;
        setFieldData(fd);
        if (fd.center_latitude && fd.center_longitude) {
          setFieldCenter({
            latitude: fd.center_latitude,
            longitude: fd.center_longitude,
          });
        } else {
          // fallback: compute from coordinates
          if (fd.coordinates?.length) {
            const lats = fd.coordinates.map((c) => c[1]);
            const lngs = fd.coordinates.map((c) => c[0]);
            setFieldCenter({
              latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
              longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
            });
          }
        }
      }

      if (bookRes.status === "fulfilled" && bookRes.value.data.success) {
        setFieldBookData(bookRes.value.data.data);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to load field data. Please try again.");
      console.error("fetchFieldData:", e?.message);
    } finally {
      setIsLoadingField(false);
    }
  }, [fieldId]);

  // ── Fetch weather using field center
  const fetchWeather = useCallback(async () => {
    if (!fieldCenter) return;
    setIsLoadingWeather(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${SERVER_URL}/api/weather/detail`, {
        params: {
          lat: fieldCenter.latitude,
          lon: fieldCenter.longitude,
          units: "metric",
        },
        headers,
      });
      if (res.data?.data) setWeatherData(res.data);
    } catch (e) {
      console.error("fetchWeather:", e?.message);
    } finally {
      setIsLoadingWeather(false);
    }
  }, [fieldCenter]);

  useEffect(() => { fetchFieldData(); }, [fetchFieldData]);
  useEffect(() => { if (fieldCenter) fetchWeather(); }, [fetchWeather]);

  // ── Tab definitions
  const TABS = [
    { key: "map", label: "Map", icon: "map" },
    { key: "charts", label: "Analytics", icon: "bar-chart-2" },
    { key: "info", label: "Info", icon: "info" },
  ];

  // ── Loading screen
  if (isLoadingField) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#39B54B" />
        <Text style={styles.loadingText}>Loading field data…</Text>
      </SafeAreaView>
    );
  }

  // ── No data screen
  if (!fieldData && !isLoadingField) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <Feather name="alert-circle" size={40} color="#EF4444" />
        <Text style={[styles.loadingText, { color: "#EF4444", marginTop: 12 }]}>
          Unable to load field data
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { marginTop: 16 }]}
          onPress={fetchFieldData}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Feather name="arrow-left" size={18} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {fieldData?.field_name || fieldName}
          </Text>
          <Text style={styles.headerSub}>
            {fieldData?.cropType ? `${fieldData.cropType} · ` : ""}
            {fieldData?.area_of_field ? `${fieldData.area_of_field} acre` : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setShowReport(true)}
        >
          <Feather name="file-text" size={13} color="#fff" />
          <Text style={styles.reportBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather
                name={tab.icon}
                size={14}
                color={isActive ? "#39B54B" : "#9CA3AF"}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── MAP TAB */}
        {activeTab === "map" && (
          <>
            <SatelliteMapCard fieldId={fieldId} fieldData={fieldData} />
            <WeatherCard weatherData={weatherData} />
            {isLoadingWeather && (
              <View style={styles.weatherLoader}>
                <ActivityIndicator size="small" color="#39B54B" />
                <Text style={styles.weatherLoaderText}>Fetching weather…</Text>
              </View>
            )}
          </>
        )}

        {/* ── CHARTS TAB */}
        {activeTab === "charts" && (
          <>
            {/* Plant Health (NDVI) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBg, { backgroundColor: "#DCFCE7" }]}>
                  <Feather name="activity" size={13} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Plant Health</Text>
                  <Text style={styles.cardSubtitle}>NDVI · 90 days</Text>
                </View>
              </View>
              <SatelliteIndexChart fieldId={fieldId} indexType="NDVI" />
            </View>

            {/* Plant Moisture (NDMI) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBg, { backgroundColor: "#DBEAFE" }]}>
                  <Feather name="droplet" size={13} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Plant Moisture</Text>
                  <Text style={styles.cardSubtitle}>NDMI · 90 days</Text>
                </View>
              </View>
              <SatelliteIndexChart fieldId={fieldId} indexType="NDMI" />
            </View>

            {/* Plant Nutrients (NDRE) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBg, { backgroundColor: "#FEF3C7" }]}>
                  <Feather name="zap" size={13} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Plant Nutrients</Text>
                  <Text style={styles.cardSubtitle}>NDRE · 90 days</Text>
                </View>
              </View>
              <SatelliteIndexChart fieldId={fieldId} indexType="NDRE" />
            </View>

            {/* Carbon Emissions */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBg, { backgroundColor: "#EDE9FE" }]}>
                  <Feather name="wind" size={13} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Carbon Emissions</Text>
                  <Text style={styles.cardSubtitle}>CO · 90 days</Text>
                </View>
              </View>
              <SatelliteIndexChart fieldId={fieldId} indexType="CO" />
            </View>

            {/* Methane Emissions */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBg, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="alert-triangle" size={13} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Methane Emissions</Text>
                  <Text style={styles.cardSubtitle}>CH4 · 90 days</Text>
                </View>
              </View>
              <SatelliteIndexChart fieldId={fieldId} indexType="CH4" />
            </View>

            {/* Air Temperature */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBg, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="thermometer" size={13} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Air Temperature</Text>
                  <Text style={styles.cardSubtitle}>Min / Avg / Max · °C</Text>
                </View>
              </View>
              {weatherData ? (
                <TemperatureChart weatherData={weatherData} />
              ) : (
                <Text style={styles.noWeatherText}>
                  Weather data not available
                </Text>
              )}
            </View>

            {/* Air Humidity */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBg, { backgroundColor: "#DBEAFE" }]}>
                  <Feather name="droplets" size={13} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Air Humidity</Text>
                  <Text style={styles.cardSubtitle}>Relative Humidity · %</Text>
                </View>
              </View>
              {weatherData ? (
                <HumidityChart weatherData={weatherData} />
              ) : (
                <Text style={styles.noWeatherText}>
                  Weather data not available
                </Text>
              )}
            </View>
          </>
        )}

        {/* ── INFO TAB */}
        {activeTab === "info" && (
          <FieldInfoPanel fieldData={fieldData} fieldBookData={fieldBookData} />
        )}
      </ScrollView>

      {/* ── Field Report Modal */}
      <UrduFieldReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        fieldData={fieldData}
        fieldBookData={fieldBookData}
      />


    </SafeAreaView>
  );
};

export default ViewField;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const GREEN = "#39B54B";
const GREEN_LIGHT = "#F0FDF4";
const GRAY_BG = "#F5F5F5";
const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

const styles = StyleSheet.create({
  // ── Layout
  container: { flex: 1, backgroundColor: GRAY_BG },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: 12, paddingBottom: 32 },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 4 : 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1, textTransform: "capitalize" },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  reportBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // ── Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: GREEN },
  tabLabel: { fontSize: 12, fontWeight: "500", color: "#9CA3AF" },
  tabLabelActive: { color: GREEN, fontWeight: "700" },

  // ── Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 16,
    ...CARD_SHADOW,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardSubtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  // ── Map card
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  mapHeaderTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  mapHeaderSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  mapHeaderRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  layerToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  layerToggleActive: { backgroundColor: GREEN, borderColor: GREEN },
  layerToggleText: { fontSize: 10, fontWeight: "700", color: "#9CA3AF" },
  indexPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  indexDot: { width: 7, height: 7, borderRadius: 3.5 },
  indexPickerLabel: { fontSize: 11, fontWeight: "700" },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 16,
    flexWrap: "wrap",
  },
  statItem: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statItemSampled: { backgroundColor: "#FFFBEB" },
  statLabel: { fontSize: 9, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 13, fontWeight: "800", marginTop: 1 },

  // Map container
  mapContainer: { height: 220, marginHorizontal: 14, borderRadius: 10, overflow: "hidden", position: "relative" },
  map: { width: "100%", height: "100%" },
  mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  mapLoadingText: { color: "#9CA3AF", marginTop: 8, fontSize: 12 },
  tileLoadingOverlay: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: [{ translateX: -60 }],
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,24,39,0.75)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tileLoadingText: { color: "#D1D5DB", fontSize: 11, fontWeight: "600" },
  tapHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(17,24,39,0.65)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tapHintText: { color: "#D1D5DB", fontSize: 10 },

  // Timeline
  timelineWrap: { paddingTop: 12 },
  timelineList: { paddingHorizontal: 14, gap: 8, paddingBottom: 2 },
  thumb: {
    width: 62,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  thumbGrad: { width: "100%", height: "70%" },
  cloudBadge: {
    position: "absolute",
    top: 3,
    left: 3,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    gap: 2,
  },
  cloudBadgeText: { color: "#fff", fontSize: 8, fontWeight: "600" },
  selectedDot: { position: "absolute", top: 3, right: 3, width: 7, height: 7, borderRadius: 3.5 },
  thumbDate: { position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#fff", backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 2 },
  timelineNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 8,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  imageCounter: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },

  // Index picker modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  pickerBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  pickerItemActive: { backgroundColor: "#F9FAFB" },
  pickerDot: { width: 12, height: 12, borderRadius: 6 },
  pickerItemLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  pickerItemDesc: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  // Weather card
  daySelectorScroll: { marginBottom: 12 },
  daySelectorContent: { gap: 6 },
  dayChip: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 52,
  },
  dayChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  dayChipDay: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginBottom: 4 },
  dayChipDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  weatherDetailBox: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12 },
  weatherDetailTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  weatherDateFull: { fontSize: 12, fontWeight: "700", color: "#111827" },
  weatherDesc: { fontSize: 11, color: "#9CA3AF", marginTop: 2, textTransform: "capitalize" },
  tempBox: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  tempMin: { fontSize: 16, fontWeight: "700", color: "#22c55e" },
  tempSep: { fontSize: 14, color: "#9CA3AF" },
  tempMax: { fontSize: 16, fontWeight: "700", color: "#ef4444" },
  weatherGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  weatherGridItem: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  weatherGridLabel: { fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", fontWeight: "600" },
  weatherGridValue: { fontSize: 12, fontWeight: "700", color: "#111827" },
  weatherLoader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, justifyContent: "center" },
  weatherLoaderText: { fontSize: 12, color: "#9CA3AF" },

  // Charts
  chartLoader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 80 },
  chartLoaderText: { fontSize: 12, fontWeight: "500" },
  chartError: { alignItems: "center", gap: 6, height: 80, justifyContent: "center" },
  chartErrorText: { fontSize: 12, color: "#6B7280" },
  chartMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  chartCurrentLabel: { fontSize: 12, fontWeight: "700" },
  chartDataPoints: { fontSize: 10, color: "#9CA3AF" },
  noWeatherText: { fontSize: 12, color: "#9CA3AF", textAlign: "center", paddingVertical: 20 },
  retryBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Info panel
  infoSection: { marginBottom: 4 },
  infoSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoSectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    gap: 12,
  },
  infoLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600", flex: 1 },
  infoValue: { fontSize: 12, color: "#111827", fontWeight: "500", flex: 2, textAlign: "right", textTransform: "capitalize" },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collapsibleBody: { marginTop: 10 },

  // Report modal
  reportModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  reportModalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SH * 0.88,
    overflow: "hidden",
  },
  reportModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
  },
  reportModalTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  reportModalSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  reportCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  reportScroll: { flex: 1 },
  reportSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  reportSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: GREEN,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    gap: 10,
  },
  reportLabel: { fontSize: 12, color: "#6B7280", flex: 1 },
  reportValue: { fontSize: 12, color: "#111827", fontWeight: "600", flex: 1, textAlign: "right" },
});
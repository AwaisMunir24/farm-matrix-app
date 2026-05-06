import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import MapView, {
  LocalTile,
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import {
  boundsToMapRegion,
  getOfflineCoverageInspector,
  getOfflineMapTilePathTemplate,
  getTileCoverageStatus,
} from "../../utils/offlineMapTiles";

const { height } = Dimensions.get("window");
const MAP_HEIGHT = height * 0.62;

// ─── Area calculation ────────────────────────────────────────────────────────
const calculatePolygonAreaInAcres = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  let area = 0;
  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(coordinates[i].latitude);
    const lat2 = toRad(coordinates[j].latitude);
    const lon1 = toRad(coordinates[i].longitude);
    const lon2 = toRad(coordinates[j].longitude);
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 2);
  return area * 0.000247105;
};

// ─── NEW: Distance between two lat/lng points in FEET ───────────────────────
const getDistanceInFeet = (p1, p2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(p2.latitude - p1.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.latitude)) *
      Math.cos(toRad(p2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceInMeters = R * c;
  return distanceInMeters * 3.28084; // convert meters → feet
};

// ─── NEW: Midpoint between two lat/lng points (for label placement) ──────────
const getMidpoint = (p1, p2) => ({
  latitude: (p1.latitude + p2.latitude) / 2,
  longitude: (p1.longitude + p2.longitude) / 2,
});

// ─── Emoji pin marker ───────────────────────────────────────────────────────
const PinDot = React.memo(() => (
  <View
    style={{
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Text style={{ fontSize: 26, lineHeight: 30 }}>📍</Text>
  </View>
));

// ─── Component ───────────────────────────────────────────────────────────────
const AddNewPolygonFields = ({ onPolygonComplete }) => {
  const mapRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [region, setRegion] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [tilePathTemplate, setTilePathTemplate] = useState(null);
  const [coverageStatus, setCoverageStatus] = useState(null);
  const [inspector, setInspector] = useState({ preparedAt: null, regions: [] });
  const [jumpingRegionId, setJumpingRegionId] = useState(null);

  const areaInAcres = isClosed ? calculatePolygonAreaInAcres(points) : 0;

  // Fly to user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setRegion({
          latitude: 31.5204,
          longitude: 74.3587,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const userRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(userRegion);
      mapRef.current?.animateToRegion(userRegion, 800);
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state?.isConnected && state?.isInternetReachable !== false;
      setIsOffline(!online);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadTileTemplate = async () => {
      try {
        const template = await getOfflineMapTilePathTemplate();
        if (mounted) setTilePathTemplate(template);
      } catch (e) {
        console.error("load offline tile template error:", e);
      }
    };
    loadTileTemplate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!region) return;
    getTileCoverageStatus({
      latitude: region.latitude,
      longitude: region.longitude,
    }).then(setCoverageStatus);
  }, [region]);

  useEffect(() => {
    const loadInspector = async () => {
      const data = await getOfflineCoverageInspector();
      setInspector(data);
    };
    loadInspector();
  }, [tilePathTemplate]);

  const jumpToRegion = (item) => {
    const minLat = Number(item?.bounds?.minLat);
    const maxLat = Number(item?.bounds?.maxLat);
    const minLon = Number(item?.bounds?.minLon);
    const maxLon = Number(item?.bounds?.maxLon);
    const safeBounds =
      Number.isFinite(minLat) &&
      Number.isFinite(maxLat) &&
      Number.isFinite(minLon) &&
      Number.isFinite(maxLon)
        ? { minLat, maxLat, minLon, maxLon }
        : null;
    const target = boundsToMapRegion(safeBounds, 1.25);
    if (!target || !mapRef.current) {
      Alert.alert("Jump unavailable", "Could not locate this cached cluster region.");
      return;
    }
    setJumpingRegionId(item?.id || null);

    const corners = [
      { latitude: minLat, longitude: minLon },
      { latitude: minLat, longitude: maxLon },
      { latitude: maxLat, longitude: minLon },
      { latitude: maxLat, longitude: maxLon },
    ];

    try {
      mapRef.current.fitToCoordinates(corners, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
      // Ensure camera movement on some Android devices where fitToCoordinates is ignored.
      setTimeout(() => mapRef.current?.animateCamera({ center: target, zoom: 14 }, { duration: 450 }), 80);
      setTimeout(() => mapRef.current?.animateToRegion(target, 500), 180);
      setRegion(target);
    } catch (e) {
      console.error("jumpToRegion error:", e);
      mapRef.current?.animateCamera({ center: target, zoom: 14 }, { duration: 600 });
      mapRef.current?.animateToRegion(target, 700);
      setRegion(target);
    } finally {
      setTimeout(() => setJumpingRegionId(null), 900);
    }
  };

  const statusColor = (status) => {
    if (status === "complete") return "#16A34A";
    if (status === "partial") return "#D97706";
    return "#DC2626";
  };

  // ── Tap handler
  const handleMapPress = useCallback(
    (e) => {
      if (isClosed) return;
      const lat = e.nativeEvent.coordinate.latitude;
      const lng = e.nativeEvent.coordinate.longitude;
      setPoints((prev) => [...prev, { latitude: lat, longitude: lng }]);
    },
    [isClosed],
  );

  const handleClosePolygon = () => {
    if (points.length < 3) {
      Alert.alert("Not enough points", "Add at least 3 points to close.");
      return;
    }
    const area = calculatePolygonAreaInAcres(points);
    setIsClosed(true);
    onPolygonComplete?.({
      coordinates: points,
      areaInAcres: area,
      isClosed: true,
    });
  };

  const handleUndo = () => {
    if (isClosed) {
      setIsClosed(false);
      onPolygonComplete?.({
        coordinates: points,
        areaInAcres: 0,
        isClosed: false,
      });
    } else {
      setPoints((prev) => prev.slice(0, -1));
    }
  };

  const handleReset = () => {
    Alert.alert("Reset", "Clear all polygon points?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          setPoints([]);
          setIsClosed(false);
          onPolygonComplete?.({
            coordinates: [],
            areaInAcres: 0,
            isClosed: false,
          });
        },
      },
    ]);
  };

  // ─── NEW: Build segment list with distance labels ─────────────────────────
  // Each segment = { from, to, midpoint, feet }
  // For open polygon: segments between consecutive drawn points
  // For closed polygon: also includes the closing edge (last → first)
  const segments = React.useMemo(() => {
    if (points.length < 2) return [];
    const segs = [];
    const count = isClosed ? points.length : points.length - 1;
    for (let i = 0; i < count; i++) {
      const from = points[i];
      const to = points[(i + 1) % points.length];
      segs.push({
        from,
        to,
        midpoint: getMidpoint(from, to),
        feet: getDistanceInFeet(from, to),
        index: i,
      });
    }
    return segs;
  }, [points, isClosed]);
  const useLocalTiles = Boolean(isOffline && tilePathTemplate);

  if (!region) {
    return (
      <View style={styles.loadingBox}>
        <View style={styles.loadingDot} />
        <Text style={styles.loadingText}>Locating you…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Stats bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>POINTS</Text>
          <Text style={styles.statValue}>{points.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>AREA (ACRES)</Text>
          <Text
            style={[
              styles.statValue,
              { color: isClosed ? "#39B54B" : "#C4C4C4" },
            ]}
          >
            {isClosed ? areaInAcres.toFixed(4) : "—"}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>STATUS</Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isClosed ? "#DCFCE7" : "#FEF3C7" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isClosed ? "#16A34A" : "#D97706" },
              ]}
            >
              {isClosed ? "CLOSED" : points.length < 3 ? "Ready" : "DRAWING"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Instruction strip ── */}
      {!isClosed && (
        <View style={styles.hint}>
          <View style={styles.hintDot} />
          <Text style={styles.hintText}>
            {points.length === 0
              ? "Tap on the map to start drawing"
              : points.length < 3
                ? `Add ${3 - points.length} more point${3 - points.length > 1 ? "s" : ""} to close`
                : "Tap 'Close Polygon' when done"}
          </Text>
        </View>
      )}

      {isOffline && (
        <View style={styles.offlineHint}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlineHintText}>
            Offline mode:{" "}
            {tilePathTemplate
              ? "cached map tiles loaded."
              : "no cached map tiles found (tap Prepare Offline Data)."}{" "}
            Coverage:{" "}
            {coverageStatus?.covered
              ? coverageStatus.coveredRegionName || "covered"
              : "not covered for this location"}.
          </Text>
        </View>
      )}

      {isOffline && (
        <View style={styles.inspectorCard}>
          <Text style={styles.inspectorTitle}>Offline Coverage Inspector</Text>
          <Text style={styles.inspectorSub}>
            Status by cluster cache and quick jump
          </Text>
          {inspector.regions.length === 0 ? (
            <Text style={styles.inspectorEmptyText}>
              No cached clusters found. Use Prepare Offline Data first.
            </Text>
          ) : (
            <View style={styles.inspectorList}>
              {inspector.regions.map((item) => (
                <View key={item.id} style={styles.inspectorRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inspectorName}>{item.name}</Text>
                    <Text style={styles.inspectorMeta}>
                      {item.completionPct}% • {item.cached + item.downloaded}/
                      {item.planned} tiles
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${statusColor(item.status)}20` },
                    ]}
                  >
                    <Text
                      style={[styles.statusBadgeText, { color: statusColor(item.status) }]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.jumpBtn}
                    onPress={() => jumpToRegion(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.jumpBtnText}>
                      {jumpingRegionId === item.id ? "Jumping..." : "Jump"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Map ── */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          mapType={useLocalTiles ? "none" : "standard"}
          initialRegion={region}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          {useLocalTiles && (
            <LocalTile pathTemplate={tilePathTemplate} tileSize={256} zIndex={0} />
          )}

          {/* Drawing polyline */}
          {!isClosed && points.length > 1 && (
            <Polyline
              coordinates={points}
              strokeColor="#39B54B"
              strokeWidth={2.5}
              lineDashPattern={[8, 5]}
            />
          )}

          {/* Closing preview edge */}
          {!isClosed && points.length >= 3 && (
            <Polyline
              coordinates={[points[points.length - 1], points[0]]}
              strokeColor="#39B54B"
              strokeWidth={2}
              lineDashPattern={[4, 7]}
            />
          )}

          {/* Filled polygon */}
          {isClosed && (
            <Polygon
              coordinates={points}
              fillColor="rgba(57,181,75,0.2)"
              strokeColor="#39B54B"
              strokeWidth={3}
            />
          )}

          {/* Emoji pin markers */}
          {points.map((pt, i) => (
            <Marker
              key={`marker-${i}`}
              coordinate={pt}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={true}
            >
              <PinDot />
            </Marker>
          ))}

          {/* ── Distance label at the midpoint of each segment ── */}
          {segments.map((seg) => (
            <Marker
              key={`dist-${seg.index}`}
              coordinate={seg.midpoint}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={true}
              zIndex={999}
            >
              <Text style={styles.distLabelText}>
                {Math.round(seg.feet)} ft
              </Text>
            </Marker>
          ))}
        </MapView>

        {/* Point counter */}
        {points.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{points.length} pts</Text>
          </View>
        )}

        {/* Floating acres label on map */}
        {isClosed && (
          <View style={styles.acresFloat}>
            <Text style={styles.acresFloatText}>
              {areaInAcres.toFixed(4)} acres
            </Text>
          </View>
        )}
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.btnRow}>
        {/* Undo */}
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnGhost,
            points.length === 0 && styles.btnDisabled,
          ]}
          onPress={handleUndo}
          disabled={points.length === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.btnGhostIcon}>↩</Text>
          <Text style={styles.btnGhostLabel}>
            {isClosed ? "Reopen" : "Undo"}
          </Text>
        </TouchableOpacity>

        {/* Close / Area chip */}
        {!isClosed ? (
          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnGreen,
              { flex: 1.6 },
              points.length < 3 && styles.btnDisabled,
            ]}
            onPress={handleClosePolygon}
            disabled={points.length < 3}
            activeOpacity={0.8}
          >
            <Text style={styles.btnGreenLabel}>Close Polygon</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.btn, styles.areaChip, { flex: 1.6 }]}>
            <Text style={styles.areaChipSub}>TOTAL AREA</Text>
            <Text style={styles.areaChipMain}>{areaInAcres.toFixed(4)} ac</Text>
          </View>
        )}

        {/* Reset */}
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnDanger,
            points.length === 0 && styles.btnDisabled,
          ]}
          onPress={handleReset}
          disabled={points.length === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.btnDangerIcon}>✕</Text>
          <Text style={styles.btnDangerLabel}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddNewPolygonFields;

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingBox: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#39B54B",
  },
  loadingText: { fontSize: 14, fontWeight: "600", color: "#39B54B" },

  // Stats
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: { flex: 1, alignItems: "center", gap: 5 },
  statDivider: { width: 1, backgroundColor: "#F0F0F0", marginVertical: 2 },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B0B0B0",
    letterSpacing: 0.8,
  },
  statValue: { fontSize: 15, fontWeight: "800", color: "#3A3A3A" },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },

  // Hint
  hint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#39B54B",
    gap: 8,
  },
  hintDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#39B54B",
  },
  hintText: { fontSize: 12, color: "#15803D", fontWeight: "500", flex: 1 },
  offlineHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    gap: 8,
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  offlineHintText: { fontSize: 12, color: "#1D4ED8", fontWeight: "500", flex: 1 },
  inspectorCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  inspectorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  inspectorSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 8,
  },
  inspectorList: {
    gap: 6,
  },
  inspectorEmptyText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  inspectorRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 7,
  },
  inspectorName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
  },
  inspectorMeta: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  jumpBtn: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  jumpBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4338CA",
  },

  // Map
  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    height: MAP_HEIGHT,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  map: { width: "100%", height: "100%" },

  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  acresFloat: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    left: "20%",
    right: "20%",
    backgroundColor: "rgba(22,163,74,0.93)",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  acresFloatText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // ── Distance label on map
  distLabel: {
    backgroundColor: "#16A34A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 80, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
    overflow: "visible",
  },
  distLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  // Buttons
  btnRow: { flexDirection: "row", gap: 9, marginBottom: 4 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 5,
  },
  btnDisabled: { opacity: 0.3 },

  btnGhost: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  btnGhostIcon: { fontSize: 15, color: "#555" },
  btnGhostLabel: { fontSize: 12, fontWeight: "700", color: "#444" },

  btnGreen: {
    backgroundColor: "#39B54B",
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  btnGreenLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },

  btnDanger: {
    backgroundColor: "#FFF5F5",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  btnDangerIcon: { fontSize: 12, color: "#EF4444" },
  btnDangerLabel: { fontSize: 12, fontWeight: "700", color: "#EF4444" },

  areaChip: {
    flexDirection: "column",
    gap: 2,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
  },
  areaChipSub: {
    fontSize: 8,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: 0.8,
  },
  areaChipMain: { fontSize: 13, fontWeight: "900", color: "#15803D" },
});

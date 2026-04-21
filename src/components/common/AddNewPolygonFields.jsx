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
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as Location from "expo-location";

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

// ─── Distance between two lat/lng points in FEET ────────────────────────────
const getDistanceInFeet = (p1, p2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(p2.latitude - p1.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.latitude)) *
      Math.cos(toRad(p2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 3.28084;
};

// ─── Midpoint between two lat/lng points ────────────────────────────────────
const getMidpoint = (p1, p2) => ({
  latitude: (p1.latitude + p2.latitude) / 2,
  longitude: (p1.longitude + p2.longitude) / 2,
});

// ─── Convert API [lng, lat] arrays → RN Maps {latitude, longitude} ──────────
const toLatLng = (coords) =>
  coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

// ─── Emoji pin marker ────────────────────────────────────────────────────────
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
const AddNewPolygonFields = ({
  onPolygonComplete,
  nearbyPolygons = [],
  onNearbyPolygonPress, // ← ADDED
}) => {
  const mapRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [region, setRegion] = useState(null);

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

  // ─── Segments with distance labels ──────────────────────────────────────────
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

      {/* ── Nearby polygons legend ── */}
      {nearbyPolygons.length > 0 && (
        <View style={styles.legendRow}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>
            {nearbyPolygons.length} nearby field
            {nearbyPolygons.length > 1 ? "s" : ""} shown in orange
          </Text>
        </View>
      )}

      {/* ── Map ── */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          mapType="hybrid"
          initialRegion={region}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          {/* ── Nearby cluster polygons from API ── */}
          {nearbyPolygons.map((field, idx) => {
            const raw = field?.geometry?.coordinates?.[0] ?? [];
            if (raw.length < 3) return null;
            const coords = toLatLng(raw);

            return (
              <React.Fragment key={`nearby-${field.id ?? idx}`}>
                <Polygon
                  coordinates={coords}
                  fillColor="rgba(249,115,22,0.15)"
                  strokeColor="#F97316"
                  strokeWidth={2.5}
                  tappable={true} // ← ADDED
                  onPress={() => onNearbyPolygonPress?.(field)} // ← ADDED
                />
                {field.center_latitude && field.center_longitude && (
                  <Marker
                    coordinate={{
                      latitude: parseFloat(field.center_latitude),
                      longitude: parseFloat(field.center_longitude),
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                    zIndex={100}
                    onPress={() => onNearbyPolygonPress?.(field)} // ← ADDED
                  >
                    <View style={styles.nearbyLabel}>
                      <Text style={styles.nearbyLabelText}>
                        {field.cluster_name ??
                          field.farmer?.first_name ??
                          `Field #${field.id}`}
                      </Text>
                      {field.area_acres && (
                        <Text style={styles.nearbyLabelSub}>
                          {parseFloat(field.area_acres).toFixed(1)} ac
                        </Text>
                      )}
                    </View>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}

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

          {/* Distance labels at midpoint of each segment */}
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

        {/* Point counter badge */}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
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

  // Nearby legend strip
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#F97316",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F97316",
  },
  legendText: { fontSize: 12, color: "#C2410C", fontWeight: "500", flex: 1 },

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

  // Distance label on map
  distLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  // Nearby polygon label bubble
  nearbyLabel: {
    backgroundColor: "rgba(249,115,22,0.92)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  nearbyLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  nearbyLabelSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "600",
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

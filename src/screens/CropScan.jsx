import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Animated,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import DropdownIcon from "../../assets/dropdownsvg.svg";
import { Ionicons } from "@expo/vector-icons";

const REGIONS = [
  "Select Cluster",
  "North Punjab",
  "South Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
];
const MAP_LAYERS = [
  "Crop Type",
  "Soil Moisture",
  "NDVI",
  "Field Boundaries",
  "Yield Estimate",
];
const YEARS = ["2022", "2023", "2024", "2025"];
const DATE_TABS = ["Feb 08", "Apr 12", "Jul 18", "Sep 31", "Nov 21"];

// Replace with API response later
const CROP_DATA = {
  "Feb 08": {
    crops: [
      {
        name: "Wheat",
        fields: "100k fields",
        pct: 65.3,
        barColor: "#F5A623",
        barWidth: "65%",
        val: "123,3M",
        change: "+ 1,23%",
        changeColor: "#34B349",
      },
      {
        name: "Oilseed Rape",
        fields: "7.3k fields",
        pct: 4.5,
        barColor: "#34B349",
        barWidth: "45%",
        val: "32,2M",
        change: "+ 14,01%",
        changeColor: "#34B349",
      },
    ],
    basedOn: "Sentinel -2 Imagery",
    collectedYears: "2015-2019, 2021-2022",
    note: "Field boundaries delinated by AG company in Feb, 2022 with confidence level 0.95",
  },
  "Apr 12": {
    crops: [
      {
        name: "Wheat",
        fields: "98k fields",
        pct: 60.1,
        barColor: "#F5A623",
        barWidth: "60%",
        val: "118,7M",
        change: "+ 0,89%",
        changeColor: "#34B349",
      },
      {
        name: "Oilseed Rape",
        fields: "6.8k fields",
        pct: 3.9,
        barColor: "#34B349",
        barWidth: "39%",
        val: "29,5M",
        change: "+ 11,34%",
        changeColor: "#34B349",
      },
    ],
    basedOn: "Sentinel -2 Imagery",
    collectedYears: "2015-2019, 2021-2022",
    note: "Field boundaries delinated by AG company in Apr, 2022 with confidence level 0.95",
  },
  "Jul 18": {
    crops: [
      {
        name: "Wheat",
        fields: "100k fields",
        pct: 65.3,
        barColor: "#F5A623",
        barWidth: "65%",
        val: "123,3M",
        change: "+ 1,23%",
        changeColor: "#34B349",
      },
      {
        name: "Oilseed Rape",
        fields: "7.3k fields",
        pct: 4.5,
        barColor: "#34B349",
        barWidth: "45%",
        val: "32,2M",
        change: "+ 14,01%",
        changeColor: "#34B349",
      },
    ],
    basedOn: "Sentinel -2 Imagery",
    collectedYears: "2015-2019, 2021-2022",
    note: "Field boundaries delinated by AG company in Aug, 2022 with confidence level 0.95",
  },
  "Sep 31": {
    crops: [
      {
        name: "Wheat",
        fields: "103k fields",
        pct: 70.2,
        barColor: "#F5A623",
        barWidth: "70%",
        val: "131,0M",
        change: "+ 2,45%",
        changeColor: "#34B349",
      },
      {
        name: "Oilseed Rape",
        fields: "8.1k fields",
        pct: 5.2,
        barColor: "#34B349",
        barWidth: "52%",
        val: "36,8M",
        change: "+ 16,22%",
        changeColor: "#34B349",
      },
    ],
    basedOn: "Sentinel -2 Imagery",
    collectedYears: "2015-2019, 2021-2022",
    note: "Field boundaries delinated by AG company in Sep, 2022 with confidence level 0.95",
  },
  "Nov 21": {
    crops: [
      {
        name: "Wheat",
        fields: "95k fields",
        pct: 55.8,
        barColor: "#F5A623",
        barWidth: "56%",
        val: "109,4M",
        change: "- 0,72%",
        changeColor: "#E74C3C",
      },
      {
        name: "Oilseed Rape",
        fields: "6.1k fields",
        pct: 3.1,
        barColor: "#34B349",
        barWidth: "31%",
        val: "24,9M",
        change: "+ 8,15%",
        changeColor: "#34B349",
      },
    ],
    basedOn: "Sentinel -2 Imagery",
    collectedYears: "2015-2019, 2021-2022",
    note: "Field boundaries delinated by AG company in Nov, 2022 with confidence level 0.95",
  },
};

// ─── Animated Dropdown ───────────────────────────────────────────────────────
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
    if (isOpen) {
      Animated.parallel([
        Animated.timing(animHeight, {
          toValue: options.length * 38,
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

  return (
    <View style={dd.wrapper}>
      <TouchableOpacity
        style={dd.trigger}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <View>
          <Text style={dd.label}>{label}</Text>
          <Text style={dd.selected}>{selected}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <DropdownIcon width={18} height={18} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={[dd.list, { maxHeight: animHeight, opacity: animOpacity }]}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[dd.option, opt === selected && dd.optionActive]}
            onPress={() => {
              onSelect(opt);
              onToggle();
            }}
          >
            <Text
              style={[dd.optionText, opt === selected && dd.optionTextActive]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
};

// ─── Crop Info Panel ─────────────────────────────────────────────────────────
const CropInfoPanel = ({ animValue }) => {
  const [activeTab, setActiveTab] = useState("Jul 18");
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // When API is ready: call fetchCropData(tab) inside here
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const data = CROP_DATA[activeTab];

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
      {/* Date Tabs */}
      <View style={info.tabRow}>
        {DATE_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[info.tab, activeTab === tab && info.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text
              style={[info.tabText, activeTab === tab && info.tabTextActive]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Animated content fades on tab switch */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={info.divider} />

        {/* Dynamic Crop Rows */}
        {data.crops.map((crop, index) => (
          <View key={crop.name}>
            <View style={info.cropRow}>
              <View style={info.cropLeft}>
                <Text style={info.cropName}>{crop.name}</Text>
                <Text style={info.cropSub}>{crop.fields}</Text>
              </View>
              <View style={info.cropMid}>
                <View style={info.barBg}>
                  <View
                    style={[
                      info.barFill,
                      {
                        width: crop.barWidth,
                        backgroundColor: crop.barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={info.cropPct}>{crop.pct}%</Text>
              </View>
              <View style={info.cropRight}>
                <Text style={info.cropVal}>{crop.val}</Text>
                <Text style={[info.cropChange, { color: crop.changeColor }]}>
                  {crop.change}
                </Text>
              </View>
            </View>
            {index < data.crops.length - 1 && <View style={info.divider} />}
          </View>
        ))}

        <View style={info.divider} />

        {/* Footer */}
        <View style={info.footerRow}>
          <View style={info.footerCol}>
            <Text style={info.footerLabel}>based on</Text>
            <Text style={info.footerVal}>{data.basedOn}</Text>
          </View>
          <View style={info.footerCol}>
            <Text style={info.footerLabel}>collected years</Text>
            <Text style={info.footerVal}>{data.collectedYears}</Text>
          </View>
        </View>
        <Text style={info.footerNote}>{data.note}</Text>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const CropScan = ({ navigation }) => {
  const goBack = () => navigation.replace("MainTabs");
  const mapRef = useRef(null);

  const [region, setRegion] = useState({
    latitude: 31.5204,
    longitude: 74.3587,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState("Select Cluster");
  const [selectedLayer, setSelectedLayer] = useState("Crop Type");
  const [selectedYear, setSelectedYear] = useState("2022");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);

  const infoAnim = useRef(new Animated.Value(0)).current;

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

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const handleMapPress = (e) => {
    setOpenDropdown(null);
    setSelectedLocation(e.nativeEvent.coordinate);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.chooseHeader}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Text style={[styles.closeBtnText, { color: "#555" }]}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.chooseTitle}>Crop Scan</Text>
        <View style={{ width: 15 }} />
      </View>

      {/* Map */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : null}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType="hybrid"
        >
          {selectedLocation && (
            <Marker
              coordinate={selectedLocation}
              title="Selected Field"
              description={`${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
              pinColor="#34B349"
            />
          )}
        </MapView>

        {/* Overlaid Controls */}
        <View style={styles.overlayTop} pointerEvents="box-none">
          {/* Row 1: Region + Map Layer */}
          <View style={styles.overlayRow}>
            <View
              style={{
                flex: 1,
                marginRight: 8,
                zIndex: openDropdown === "region" ? 30 : 10,
              }}
            >
              <AnimatedDropdown
                label="Region"
                options={REGIONS}
                selected={selectedRegion}
                onSelect={setSelectedRegion}
                isOpen={openDropdown === "region"}
                onToggle={() => toggleDropdown("region")}
              />
            </View>
            <View
              style={{
                flex: 1,
                zIndex: openDropdown === "layer" ? 30 : 10,
              }}
            >
              <AnimatedDropdown
                label="Map Layer"
                options={MAP_LAYERS}
                selected={selectedLayer}
                onSelect={setSelectedLayer}
                isOpen={openDropdown === "layer"}
                onToggle={() => toggleDropdown("layer")}
              />
            </View>
          </View>

          {/* Row 2: Year + Eye Toggle */}
          <View style={[styles.overlayRow, { alignItems: "flex-start" }]}>
            <View
              style={{
                width: 110,
                zIndex: openDropdown === "year" ? 30 : 10,
                marginRight: 10,
              }}
            >
              <AnimatedDropdown
                label="Year"
                options={YEARS}
                selected={selectedYear}
                onSelect={setSelectedYear}
                isOpen={openDropdown === "year"}
                onToggle={() => toggleDropdown("year")}
              />
            </View>

            {/* Eye Toggle Button */}
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

          {/* Crop Info Panel */}
          {infoVisible && <CropInfoPanel animValue={infoAnim} />}
        </View>
      </View>
    </View>
  );
};

export default CropScan;

// ─── Dropdown Styles ──────────────────────────────────────────────────────────
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
  chevron: {
    fontSize: 18,
    color: "#555",
    lineHeight: 22,
  },
  list: {
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  option: {
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  optionActive: { backgroundColor: "#F0FAF2" },
  optionText: { fontSize: 13, color: "#444" },
  optionTextActive: { color: "#34B349", fontWeight: "600" },
});

// ─── Info Panel Styles ────────────────────────────────────────────────────────
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
  tabRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
  },
  tabActive: {
    backgroundColor: "#34B349",
  },
  tabText: {
    fontSize: 11,
    color: "#555",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 10,
  },
  cropRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cropLeft: {
    flex: 1.2,
  },
  cropMid: {
    flex: 1.5,
    alignItems: "flex-start",
    gap: 3,
  },
  cropRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  cropName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  cropSub: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  barBg: {
    width: "100%",
    height: 5,
    backgroundColor: "#EBEBEB",
    borderRadius: 4,
  },
  barFill: {
    height: 5,
    borderRadius: 4,
  },
  cropPct: {
    fontSize: 11,
    color: "#777",
  },
  cropVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  cropChange: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  footerCol: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 10,
    color: "#aaa",
  },
  footerVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#383838",
    marginTop: 2,
  },
  footerNote: {
    fontSize: 10,
    color: "#888",
    lineHeight: 15,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
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

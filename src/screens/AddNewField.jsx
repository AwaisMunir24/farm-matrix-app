import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import MapView, { LocalTile, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import axios from "axios";
import Drawpolygon from "../../assets/draw-polygon.svg";
import { SERVER_URL } from "../utils/index";
import tehsilData from "../utils/TehsilData.json";
import { getAuthToken } from "../utils/auth";
import NetInfo from "@react-native-community/netinfo";
import { enqueueItem } from "../utils/offlineQueue";
import {
  getAddFieldOfflineReference,
  prepareAddFieldOfflineReference,
} from "../utils/offlineReferenceData";
import { getOfflineMapTilePathTemplate } from "../utils/offlineMapTiles";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Static auth token (replace with AsyncStorage when ready) */
// const getAuthToken = () =>
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc0MzcxMTExLCJleHAiOjE3NzUyMzUxMTF9.qAYbeTTv_qVlsDilJNs_aSw_6K9Tg_Tsk44FqqaUKHs";

// ─────────────────────────────────────────────────────────────────────────────
// STATIC OPTION LISTS  (copied 1-to-1 from web FieldsInput)
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_CATEGORY_OPTIONS = [
  "Seed Plot",
  "Conventional",
  "Regenerative",
  "Organic",
];
const SOIL_TYPE_OPTIONS = [
  "Silt loam",
  "Clay loam",
  "Sandy Loam",
  "Silty Clay Loam",
];
const IRRIGATION_OPTIONS = [
  "Drip",
  "Sprinkler",
  "Flood",
  "Tubewell",
  "Solar Tubewell",
];
const LAND_TYPO_OPTIONS = ["Level", "Unlevel"];
const OWNERSHIP_OPTIONS = ["Owner", "Leased", "Rented", "Shared"];
const SOIL_TREATMENT_OPTIONS = ["Organic", "Chemical", "Mixed", "None"];

const CROP_CATEGORY_OPTIONS = [
  { value: "cash_crop", label: "Cash Crop" },
  { value: "vegetables", label: "Vegetables" },
  { value: "horticulture", label: "Horticulture" },
  { value: "forestry", label: "Forestry" },
  { value: "other", label: "Other" },
];

// Flat list of tehsil names from JSON
const TEHSIL_OPTIONS = tehsilData.provinces.flatMap((p) =>
  p.tehsils.map((t) => t.name),
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY FORM STATE
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  farmerName: "", // farmer id (string for select compatibility)
  fieldName: "",
  fieldCategory: "",
  cluster: "",
  soilType: "",
  irrigationType: "",
  landTypo: "",
  ownershipType: "",
  areaOFField: "",
  selectTehsil: "",
  address: "",
  representative_id: "",
  plannedCrop: "",
  soilTreatment: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AddNewField = ({ navigation, route }) => {
  const scrollViewRef = useRef(null);

  // ── Polygon data passed back from DrawPolygonFields screen ──────────────
  const [polygonCoordinates, setPolygonCoordinates] = useState(
    route?.params?.polygonCoordinates || [],
  );
  const [areaInAcres, setAreaInAcres] = useState(
    route?.params?.areaInAcres || 0,
  );

  React.useEffect(() => {
    if (route?.params?.polygonCoordinates) {
      setPolygonCoordinates(route.params.polygonCoordinates);
      setAreaInAcres(route.params.areaInAcres || 0);
    }
  }, [route?.params]);

  const hasPolygon = polygonCoordinates && polygonCoordinates.length >= 3;

  // ── API data ─────────────────────────────────────────────────────────────
  const [farmerOptions, setFarmerOptions] = useState([]); // [{label, value}]
  const [clusters, setClusters] = useState([]); // [{id, cluster_name}]
  const [representativeList, setRepresentativeList] = useState([]); // [{id, first_name, last_name}]
  const [cropTypes, setCropTypes] = useState([]); // [{id, crop_name}]

  // ── Loading / submitting flags ────────────────────────────────────────────
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [loadingReps, setLoadingReps] = useState(false);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState(null); // { status, data, isError }
  const [isOffline, setIsOffline] = useState(false);
  const [tilePathTemplate, setTilePathTemplate] = useState(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedCropCategory, setSelectedCropCategory] = useState("");
  const [isOtherCrop, setIsOtherCrop] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Active modal picker state ─────────────────────────────────────────────
  // We use a simple inline picker approach; swap with your modal picker lib if preferred.
  const [activePicker, setActivePicker] = useState(null); // field key or null

  // ── Polygon region for mini-map ───────────────────────────────────────────
  const polygonRegion = React.useMemo(() => {
    if (!hasPolygon) return null;
    const lats = polygonCoordinates.map((c) => c.latitude);
    const lngs = polygonCoordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs),
      maxLng = Math.max(...lngs);
    const pad = 1.5;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * pad, 0.002),
      longitudeDelta: Math.max((maxLng - minLng) * pad, 0.002),
    };
  }, [polygonCoordinates]);

  // ── Sync area from polygon ────────────────────────────────────────────────
  useEffect(() => {
    if (hasPolygon) {
      setForm((prev) => ({ ...prev, areaOFField: areaInAcres.toFixed(4) }));
    }
  }, [areaInAcres, hasPolygon]);

  // ─────────────────────────────────────────────────────────────────────────
  // API CALLS  (mirrored from web FieldsInput)
  // ─────────────────────────────────────────────────────────────────────────

  /** Fetch all farmers */
  const fetchFarmers = async (token) => {
    setLoadingFarmers(true);
    try {
      const resp = await axios.get(
        `${SERVER_URL}/api/farmers?page=1&limit=10000&search=&sortBy=id&order=ASC`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        },
      );
      if (resp.data?.data) {
        setFarmerOptions(
          resp.data.data.map((f) => ({
            label:
              `${f.first_name || ""} ${f.last_name || ""}`.trim() ||
              f.username ||
              `Farmer ${f.id}`,
            value: String(f.id),
          })),
        );
      }
    } catch (e) {
      console.error("fetchFarmers:", e);
    } finally {
      setLoadingFarmers(false);
    }
  };

  /** Fetch all clusters */
  const fetchClusters = async (token) => {
    setLoadingClusters(true);
    try {
      const resp = await fetch(`${SERVER_URL}/api/cluster?limit=10000000`, {
        headers: { "x-auth-token": token },
      });
      const result = await resp.json();
      if (result.success) setClusters(result.data);
    } catch (e) {
      console.error("fetchClusters:", e);
    } finally {
      setLoadingClusters(false);
    }
  };

  /** Fetch all representatives (employees) */
  const fetchRepresentatives = async (token) => {
    setLoadingReps(true);
    try {
      const resp = await fetch(
        `${SERVER_URL}/api/user/employee?limit=10000000`,
        {
          headers: { "x-auth-token": token },
        },
      );
      const result = await resp.json();
      if (result.success) setRepresentativeList(result.data);
    } catch (e) {
      console.error("fetchRepresentatives:", e);
    } finally {
      setLoadingReps(false);
    }
  };

  /** Fetch crop types for a given category */
  const fetchCropTypes = async (category, tokenOverride = null) => {
    setLoadingCrops(true);
    try {
      const token = tokenOverride || (await getAuthToken());
      const resp = await axios.get(
        `${SERVER_URL}/api/cropType/category/${category}`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        },
      );
      if (resp.data.success) setCropTypes(resp.data.data);
      else setCropTypes([]);
    } catch (e) {
      console.error("fetchCropTypes:", e);
      setCropTypes([]);
      Alert.alert("Error", "Failed to load crop types. Please try again.");
    } finally {
      setLoadingCrops(false);
    }
  };

  // Mount: fetch farmers, clusters, reps
  useEffect(() => {
    const init = async () => {
      const token = await getAuthToken();
      if (!token) return;

      const netState = await NetInfo.fetch();
      const isOnline =
        netState.isConnected && netState.isInternetReachable !== false;

      if (isOnline) {
        await Promise.all([
          fetchFarmers(token),
          fetchClusters(token),
          fetchRepresentatives(token),
        ]);
        try {
          const ref = await prepareAddFieldOfflineReference({ token });
          setFarmerOptions(ref.farmers || []);
          setClusters(ref.clusters || []);
          setRepresentativeList(ref.representatives || []);
        } catch (e) {
          console.error("prepareAddFieldOfflineReference:", e);
        }
      } else {
        const ref = await getAddFieldOfflineReference();
        if (!ref) {
          Alert.alert(
            "Offline data missing",
            "Please use 'Prepare Offline Data' from sidebar before going offline.",
          );
          return;
        }
        setFarmerOptions(ref.farmers || []);
        setClusters(ref.clusters || []);
        setRepresentativeList(ref.representatives || []);
      }
    };
    init();
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
    const loadTemplate = async () => {
      try {
        const template = await getOfflineMapTilePathTemplate();
        if (mounted) setTilePathTemplate(template);
      } catch (e) {
        console.error("load offline map template error:", e);
      }
    };
    loadTemplate();
    return () => {
      mounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // FORM HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleCropCategoryChange = (value) => {
    setSelectedCropCategory(value);
    handleChange("plannedCrop", "");
    if (errors.cropCategory)
      setErrors((prev) => ({ ...prev, cropCategory: "" }));

    if (value === "other") {
      setIsOtherCrop(true);
      setCropTypes([]);
    } else if (value) {
      setIsOtherCrop(false);
      NetInfo.fetch().then((net) => {
        const isOnline = net.isConnected && net.isInternetReachable !== false;
        if (isOnline) {
          fetchCropTypes(value);
        } else {
          getAddFieldOfflineReference().then((ref) => {
            const offlineCrops = ref?.cropTypesByCategory?.[value] || [];
            setCropTypes(offlineCrops);
          });
        }
      });
    } else {
      setIsOtherCrop(false);
      setCropTypes([]);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION  (mirrored from web FieldsInput.validateForm)
  // ─────────────────────────────────────────────────────────────────────────

  const validateForm = () => {
    const e = {};
    if (!form.farmerName) e.farmerName = "Please select a farmer";
    if (!form.fieldName.trim()) e.fieldName = "Field name is required";
    if (!form.fieldCategory) e.fieldCategory = "Field category is required";
    if (!form.cluster) e.cluster = "Cluster is required";
    if (!form.representative_id)
      e.representative_id = "Representative is required";
    if (!form.soilType) e.soilType = "Soil type is required";
    if (!form.areaOFField || parseFloat(form.areaOFField) <= 0)
      e.areaOFField = "Please enter a valid area";
    if (!selectedCropCategory) e.cropCategory = "Please select a crop type";
    if (!form.plannedCrop?.trim())
      e.plannedCrop = "Please select or enter a crop";
    if (!polygonCoordinates || polygonCoordinates.length === 0)
      e.polygon = "Please draw a polygon on the map";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // API SUBMISSION  (mirrored from web FieldsInput.handleSubmit)
  // ─────────────────────────────────────────────────────────────────────────

  const formatCoordinatesForAPI = (coords) => {
    if (!coords?.length) return null;
    const closed = [...coords];
    const first = coords[0],
      last = coords[coords.length - 1];
    if (
      first.latitude !== last.latitude ||
      first.longitude !== last.longitude
    ) {
      closed.push({ ...first });
    }
    // Convert {latitude, longitude} objects → [lng, lat] pairs (GeoJSON order)
    return closed.map((c) => [c.longitude, c.latitude]);
  };

  const preparePayload = () => {
    const formatted = formatCoordinatesForAPI(polygonCoordinates);
    return {
      field_name: form.fieldName,
      farmer_id: parseInt(form.farmerName) || 0,
      field_category: form.fieldCategory,
      cluster_id: form.cluster ? parseInt(form.cluster) : null,
      soil_type: form.soilType,
      irrigation_type: form.irrigationType,
      land_typography: form.landTypo,
      ownership_type: form.ownershipType,
      area_of_field: parseFloat(form.areaOFField) || 0,
      tehsil: form.selectTehsil,
      address: form.address,
      representative_id: form.representative_id,
      planned_crop: form.plannedCrop,
      soil_treatment: form.soilTreatment,
      cropType: form.plannedCrop,
      geometry: formatted
        ? { type: "Polygon", coordinates: [formatted] }
        : null,
      coordinates: formatted,
    };
  };

  const handleSubmit = async () => {
    console.log("==============================");
    console.log("🟡 SAVE BUTTON CLICKED");
    console.log("==============================");

    if (!validateForm()) {
      console.log(
        "❌ VALIDATION FAILED — errors:",
        JSON.stringify(errors, null, 2),
      );
      Alert.alert(
        "Validation Error",
        "Please fill all required fields correctly.",
      );
      return;
    }

    console.log("✅ VALIDATION PASSED — sending to API...");
    setIsSubmitting(true);

    try {
      const token = await getAuthToken();
      const payload = preparePayload();

      console.log("📦 Payload:");
      console.log(JSON.stringify(payload, null, 2));
      console.log("🌐 URL:", `${SERVER_URL}/api/field`);
      console.log("🔑 Token:", token);

      const net = await NetInfo.fetch();
      const isOnline = net.isConnected && net.isInternetReachable !== false;

      if (!isOnline) {
        await enqueueItem({
          type: "field_create",
          payload,
          meta: { title: payload.field_name || "Field draft" },
        });
        Alert.alert(
          "Saved offline",
          "Field has been saved locally and will be uploaded when internet is available.",
          [{ text: "OK", onPress: () => navigation.replace("MainTabs") }],
        );
        return;
      }

      const response = await axios.post(`${SERVER_URL}/api/field`, payload, {
        headers: { "x-auth-token": token, "Content-Type": "application/json" },
      });

      console.log("==============================");
      console.log("✅ FIELD SAVED SUCCESSFULLY");
      console.log("📬 Status:", response.status);
      console.log("📬 Response:", JSON.stringify(response.data, null, 2));
      console.log("==============================");

      setApiResponse({
        isError: false,
        status: response.status,
        data: response.data,
      });

      Alert.alert("Success!", "Field created successfully!", [
        {
          text: "OK",
          onPress: () => {
            setForm(EMPTY_FORM);
            setSelectedCropCategory("");
            setCropTypes([]);
            setErrors({});
            setIsOtherCrop(false);
            navigation.replace("MainTabs");
          },
        },
      ]);
    } catch (error) {
      console.log("==============================");
      console.log("❌ FIELD SAVE FAILED");
      console.log("📛 Status:", error.response?.status);
      console.log(
        "📛 Error message:",
        error.response?.data?.message || error.message,
      );
      console.log(
        "📛 Full error response:",
        JSON.stringify(error.response?.data, null, 2),
      );
      console.log("==============================");

      setApiResponse({
        isError: true,
        status: error.response?.status || "Network Error",
        data: error.response?.data || { message: error.message },
      });

      const msg =
        error.response?.data?.message ||
        error.response?.statusText ||
        (error.request ? "No response from server" : error.message);
      Alert.alert("Submission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const goBack = () => navigation.replace("MainTabs");
  const useLocalTiles = Boolean(isOffline && tilePathTemplate);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Field</Text>
        <View style={{ width: 32 }} />
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
            {/* ── Polygon map card ── */}
            <View style={styles.mapCard}>
              {hasPolygon ? (
                <>
                  <MapView
                    style={styles.miniMap}
                    provider={PROVIDER_GOOGLE}
                    mapType={useLocalTiles ? "none" : "standard"}
                    region={polygonRegion}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    pointerEvents="none"
                  >
                    {useLocalTiles && (
                      <LocalTile
                        pathTemplate={tilePathTemplate}
                        tileSize={256}
                        zIndex={0}
                      />
                    )}
                    <Polygon
                      coordinates={polygonCoordinates}
                      fillColor="rgba(57,181,75,0.25)"
                      strokeColor="#39B54B"
                      strokeWidth={3}
                    />
                  </MapView>
                  <View style={styles.mapAreaBadge}>
                    <Text style={styles.mapAreaBadgeText}>
                      {areaInAcres.toFixed(4)} acres
                    </Text>
                  </View>
                  <View style={styles.mapPtsBadge}>
                    <Text style={styles.mapPtsBadgeText}>
                      {polygonCoordinates.length} pts
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.redrawBtn}
                    onPress={() => navigation.navigate("DrawPolygonFields")}
                    activeOpacity={0.85}
                  >
                    <Drawpolygon width={18} height={18} />
                    <Text style={styles.redrawBtnText}>Redraw Polygon</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Image
                    style={styles.placeholderImg}
                    source={require("../../assets/add-new-field.png")}
                    resizeMode="cover"
                  />
                  <View style={styles.imgOverlay} />
                  <TouchableOpacity
                    style={styles.drawBtn}
                    onPress={() => navigation.navigate("DrawPolygonFields")}
                    activeOpacity={0.88}
                  >
                    <Drawpolygon width={22} height={22} />
                    <Text style={styles.drawBtnText}>Draw a Polygon</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* ── Polygon error ── */}
            {errors.polygon && (
              <View style={styles.errorStrip}>
                <Text style={styles.errorStripText}>⚠ {errors.polygon}</Text>
              </View>
            )}

            {/* ── Polygon success strip ── */}
            {hasPolygon && (
              <View style={styles.successStrip}>
                <View style={styles.successDot} />
                <Text style={styles.successText}>
                  Polygon drawn — {areaInAcres.toFixed(4)} acres,{" "}
                  {polygonCoordinates.length} points
                </Text>
              </View>
            )}

            {/* ── Section title ── */}
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitleText}>Enter Field Details</Text>
            </View>

            {/* ═══════════════════════════════════════════════════════════
                FORM FIELDS  (all from web FieldsInput)
            ═══════════════════════════════════════════════════════════ */}

            {/* 1. Farmer Name */}
            <Field label="Farmer Name *" error={errors.farmerName}>
              <PickerDropdown
                options={farmerOptions}
                value={form.farmerName}
                placeholder={
                  loadingFarmers ? "Loading farmers…" : "Select Farmer"
                }
                onSelect={(val) => handleChange("farmerName", val)}
                hasError={!!errors.farmerName}
              />
            </Field>

            {/* 2. Field Name */}
            <Field label="Name of Field *" error={errors.fieldName}>
              <TextInput
                placeholder="Field-11480"
                placeholderTextColor="#A9A9A9"
                style={[styles.input, errors.fieldName && styles.inputError]}
                value={form.fieldName}
                onChangeText={(v) => handleChange("fieldName", v)}
                returnKeyType="done"
                blurOnSubmit
              />
            </Field>

            {/* 3. Field Category */}
            <Field label="Field Category *" error={errors.fieldCategory}>
              <PickerDropdown
                options={FIELD_CATEGORY_OPTIONS.map((o) => ({
                  label: o,
                  value: o,
                }))}
                value={form.fieldCategory}
                placeholder="Select Category"
                onSelect={(val) => handleChange("fieldCategory", val)}
                hasError={!!errors.fieldCategory}
              />
            </Field>

            {/* 4. Select Cluster */}
            <Field label="Select Cluster *" error={errors.cluster}>
              <PickerDropdown
                options={clusters.map((c) => ({
                  label: c.cluster_name,
                  value: String(c.id),
                }))}
                value={form.cluster}
                placeholder={
                  loadingClusters ? "Loading clusters…" : "Select Cluster"
                }
                onSelect={(val) => handleChange("cluster", val)}
                hasError={!!errors.cluster}
              />
            </Field>

            {/* 5. Soil Type */}
            <Field label="Soil Type *" error={errors.soilType}>
              <PickerDropdown
                options={SOIL_TYPE_OPTIONS.map((o) => ({ label: o, value: o }))}
                value={form.soilType}
                placeholder="Select Soil Type"
                onSelect={(val) => handleChange("soilType", val)}
                hasError={!!errors.soilType}
              />
            </Field>

            {/* 6. Irrigation Type */}
            <Field label="Irrigation Type">
              <PickerDropdown
                options={IRRIGATION_OPTIONS.map((o) => ({
                  label: o,
                  value: o,
                }))}
                value={form.irrigationType}
                placeholder="Select Irrigation Type"
                onSelect={(val) => handleChange("irrigationType", val)}
              />
            </Field>

            {/* 7. Land Typography */}
            <Field label="Land Typography">
              <PickerDropdown
                options={LAND_TYPO_OPTIONS.map((o) => ({ label: o, value: o }))}
                value={form.landTypo}
                placeholder="Select Land Typography"
                onSelect={(val) => handleChange("landTypo", val)}
              />
            </Field>

            {/* 8. Ownership Type */}
            <Field label="Ownership Type">
              <PickerDropdown
                options={OWNERSHIP_OPTIONS.map((o) => ({ label: o, value: o }))}
                value={form.ownershipType}
                placeholder="Select Ownership Type"
                onSelect={(val) => handleChange("ownershipType", val)}
              />
            </Field>

            {/* 9. Area of Field */}
            <Field label="Area of Field (Acre) *" error={errors.areaOFField}>
              <TextInput
                placeholder="Area of Field"
                placeholderTextColor={hasPolygon ? "#39B54B" : "#A9A9A9"}
                style={[
                  styles.input,
                  hasPolygon && styles.inputPrefilled,
                  errors.areaOFField && styles.inputError,
                ]}
                value={form.areaOFField}
                editable={!hasPolygon} // auto-filled when polygon is drawn
                onChangeText={(v) => handleChange("areaOFField", v)}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </Field>

            {/* 10. Select Tehsil */}
            <Field label="Select Tehsil">
              <PickerDropdown
                options={TEHSIL_OPTIONS.map((o) => ({ label: o, value: o }))}
                value={form.selectTehsil}
                placeholder="Select Tehsil"
                onSelect={(val) => handleChange("selectTehsil", val)}
                searchable
              />
            </Field>

            {/* 11. Address + 12. Village (side by side, matching web layout intent) */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Address (Optional)">
                  <TextInput
                    placeholder="Enter Address"
                    placeholderTextColor="#A9A9A9"
                    style={styles.input}
                    value={form.address}
                    onChangeText={(v) => handleChange("address", v)}
                    returnKeyType="done"
                  />
                </Field>
              </View>
            </View>

            {/* 13. Crop Type (category picker) */}
            <Field label="Crop Type *" error={errors.cropCategory}>
              <PickerDropdown
                options={CROP_CATEGORY_OPTIONS}
                value={selectedCropCategory}
                placeholder="Select Crop Type"
                onSelect={handleCropCategoryChange}
                hasError={!!errors.cropCategory}
              />
            </Field>

            {/* 14. Planned Crop — shown only after category is selected */}
            {selectedCropCategory !== "" && (
              <Field label="Planned Crop *" error={errors.plannedCrop}>
                {isOtherCrop ? (
                  // Free-text input when "Other" is selected
                  <TextInput
                    placeholder="Enter crop name"
                    placeholderTextColor="#A9A9A9"
                    style={[
                      styles.input,
                      errors.plannedCrop && styles.inputError,
                    ]}
                    value={form.plannedCrop}
                    onChangeText={(v) => handleChange("plannedCrop", v)}
                    returnKeyType="done"
                    blurOnSubmit
                  />
                ) : (
                  // Dropdown with API-fetched crop types
                  <PickerDropdown
                    options={cropTypes.map((c) => ({
                      label: c.crop_name,
                      value: c.crop_name,
                    }))}
                    value={form.plannedCrop}
                    placeholder={
                      loadingCrops ? "Loading crops…" : "Select Crop"
                    }
                    onSelect={(val) => handleChange("plannedCrop", val)}
                    hasError={!!errors.plannedCrop}
                    disabled={loadingCrops}
                  />
                )}
              </Field>
            )}

            {/* 15. Soil Treatment */}
            <Field label="Soil Treatment">
              <PickerDropdown
                options={SOIL_TREATMENT_OPTIONS.map((o) => ({
                  label: o,
                  value: o,
                }))}
                value={form.soilTreatment}
                placeholder="Select Soil Treatment"
                onSelect={(val) => handleChange("soilTreatment", val)}
              />
            </Field>

            {/* 16. Select Representative */}
            <Field
              label="Select Representative *"
              error={errors.representative_id}
            >
              <PickerDropdown
                options={representativeList.map((r) => ({
                  label: `${r.first_name} ${r.last_name}`.trim(),
                  value: String(r.id),
                }))}
                value={form.representative_id}
                placeholder={loadingReps ? "Loading…" : "Select Representative"}
                onSelect={(val) => handleChange("representative_id", val)}
                hasError={!!errors.representative_id}
              />
            </Field>

            {/* ── API Response Box (for testing) ── */}
            {apiResponse && (
              <View
                style={[
                  styles.responseBox,
                  apiResponse.isError
                    ? styles.responseBoxError
                    : styles.responseBoxSuccess,
                ]}
              >
                <View style={styles.responseHeader}>
                  <Text style={styles.responseHeaderText}>
                    {apiResponse.isError ? "❌ API ERROR" : "✅ API SUCCESS"} —
                    Status: {apiResponse.status}
                  </Text>
                  <TouchableOpacity onPress={() => setApiResponse(null)}>
                    <Text style={styles.responseDismiss}>✕ Dismiss</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.responseScroll} nestedScrollEnabled>
                  <Text style={styles.responseText}>
                    {JSON.stringify(apiResponse.data, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}

            {/* ── Save button ── */}
            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PICKER DROPDOWN COMPONENT
// A simple ActionSheet-style dropdown. Replace with your modal-picker library
// (e.g. react-native-modal-picker, @react-native-picker/picker) as needed.
// ─────────────────────────────────────────────────────────────────────────────
const PickerDropdown = ({
  options = [], // [{label, value}]
  value, // currently selected value
  placeholder,
  onSelect,
  hasError = false,
  disabled = false,
  searchable = false, // reserved for future search-modal integration
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered =
    searchable && search
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  return (
    <View>
      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.dropdown,
          hasError && styles.dropdownError,
          disabled && styles.dropdownDisabled,
        ]}
        onPress={() => !disabled && setOpen((v) => !v)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            styles.dropdownText,
            { color: selectedLabel ? "#383838" : "#A9A9A9" },
          ]}
        >
          {selectedLabel || placeholder}
        </Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#7A7A7A"
        />
      </TouchableOpacity>

      {/* Inline options list */}
      {open && (
        <View style={styles.optionsList}>
          {searchable && (
            <TextInput
              style={styles.searchInput}
              placeholder="Search…"
              placeholderTextColor="#A9A9A9"
              value={search}
              onChangeText={setSearch}
            />
          )}
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
            {filtered.length === 0 ? (
              <Text style={styles.optionEmpty}>No options</Text>
            ) : (
              filtered.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionItem,
                    opt.value === value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      opt.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.value === value && (
                    <Feather name="check" size={14} color="#39B54B" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FIELD WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ label, children, error }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

export default AddNewField;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  scrollView: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#4E4E4E", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#4E4E4E" },

  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 },

  // Map card
  mapCard: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  miniMap: { width: "100%", height: "100%" },
  placeholderImg: { width: "100%", height: "100%" },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  // Map overlays
  mapAreaBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(22,163,74,0.92)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  mapAreaBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  mapPtsBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapPtsBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  redrawBtn: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    left: "25%",
    right: "25%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(57,181,75,0.93)",
    borderRadius: 10,
    paddingVertical: 8,
    gap: 7,
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  redrawBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  drawBtn: {
    position: "absolute",
    top: "38%",
    left: "20%",
    right: "20%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#39B54B",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  drawBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Strips
  successStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#39B54B",
    gap: 8,
  },
  successDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#39B54B",
  },
  successText: { fontSize: 12, color: "#15803D", fontWeight: "600", flex: 1 },

  errorStrip: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  errorStripText: { fontSize: 12, color: "#B91C1C", fontWeight: "600" },

  // Section title
  sectionTitle: { marginBottom: 18 },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4E4E4E",
    textAlign: "center",
  },

  row: { flexDirection: "row", marginBottom: 0 },

  // Form elements
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#383838",
    marginBottom: 7,
  },
  fieldError: { fontSize: 11, color: "#EF4444", marginTop: 4 },

  input: {
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    borderColor: "#D8D8D8",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontStyle: "italic",
    color: "#383838",
    fontSize: 12,
    fontWeight: "500",
  },
  inputPrefilled: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
    color: "#16A34A",
    fontStyle: "normal",
    fontWeight: "700",
  },
  inputError: { borderColor: "#EF4444" },

  // Dropdown
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#D8D8D8",
    borderWidth: 1,
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  dropdownError: { borderColor: "#EF4444" },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: {
    fontStyle: "italic",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },

  // Options list (inline)
  optionsList: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 12,
    color: "#383838",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionItemSelected: { backgroundColor: "#F0FDF4" },
  optionText: { fontSize: 13, color: "#383838" },
  optionTextSelected: { color: "#15803D", fontWeight: "700" },
  optionEmpty: {
    padding: 16,
    color: "#A9A9A9",
    fontSize: 12,
    textAlign: "center",
  },

  // Save button
  saveBtn: {
    backgroundColor: "#39B54B",
    borderRadius: 10,
    marginTop: 24,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { backgroundColor: "#9CA3AF" },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: "#fff",
    letterSpacing: 0.4,
  },

  // API Response Box
  responseBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 4,
    overflow: "hidden",
  },
  responseBoxSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  responseBoxError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  responseHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#383838",
    flex: 1,
  },
  responseDismiss: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginLeft: 8,
  },
  responseScroll: {
    maxHeight: 200,
    padding: 12,
  },
  responseText: {
    fontSize: 11,
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    lineHeight: 18,
  },
});

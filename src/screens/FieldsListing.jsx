import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import MapView, { Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import { SERVER_URL } from "../utils/index";
import FarmerIcon from "../../assets/farmer_pic.svg";
import FieldsIcon from "../../assets/field-list-svg.svg";
import TotalAreaIcon from "../../assets/total-area.svg";

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE DROPDOWN (same style as FarmerListing)
// ─────────────────────────────────────────────────────────────────────────────
const Dropdown = ({ placeholder, options = [], selectedValue, onSelect }) => {
  const [visible, setVisible] = useState(false);

  const selectedLabel = options.find(
    (o) => String(o.value) === String(selectedValue),
  )?.label;

  return (
    <>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            styles.dropdownText,
            { color: selectedLabel ? "#383838" : "#A9A9A9" },
          ]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#7A7A7A" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Feather name="x" size={18} color="#4E4E4E" />
              </TouchableOpacity>
            </View>

            {/* Clear selection */}
            <TouchableOpacity
              style={styles.modalItemClear}
              onPress={() => {
                onSelect("");
                setVisible(false);
              }}
            >
              <Text style={styles.modalItemClearText}>— Clear selection —</Text>
            </TouchableOpacity>

            <FlatList
              data={options}
              keyExtractor={(item, idx) => String(item.value ?? idx)}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => {
                const isSelected = String(item.value) === String(selectedValue);
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
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>No options found</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FIELD ROW — accordion card matching Figma design
// ─────────────────────────────────────────────────────────────────────────────
const FieldRow = ({ field, onDelete, navigation }) => {
  const [expanded, setExpanded] = useState(false);

  // Farmer name from nested farmer object (same as web component)
  const farmerName = field.farmer
    ? `${field.farmer.first_name} ${field.farmer.last_name || ""}`.trim()
    : "N/A";

  // Convert API polygon coordinates [lng, lat] → { latitude, longitude }
  // API returns: coordinates: [[lng, lat], [lng, lat], ...]
  const polygonCoords = (
    field.geometry?.coordinates?.[0] ||
    field.coordinates ||
    []
  ).map((point) => ({
    latitude: point[1], // lat is index 1
    longitude: point[0], // lng is index 0
  }));

  // Dynamically calculate map region so the polygon always fits in frame.
  // We find the min/max lat & lng of all polygon points, then add a 40% padding
  // so the polygon never touches the edges of the map view.
  const mapRegion = (() => {
    if (polygonCoords.length === 0) return null;

    const lats = polygonCoords.map((p) => p.latitude);
    const lngs = polygonCoords.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Center of the polygon bounding box
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Span of the polygon — how wide/tall it is in degrees
    const spanLat = maxLat - minLat;
    const spanLng = maxLng - minLng;

    // Add 40% padding on each side so polygon isn't clipped at the edges.
    // Also enforce a minimum span (0.0005°≈55m) so tiny fields don't zoom
    // in to an unusable level.
    const PADDING = 1.4; // 40% extra space around the polygon
    const MIN_SPAN = 0.0005;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(spanLat * PADDING, MIN_SPAN),
      longitudeDelta: Math.max(spanLng * PADDING, MIN_SPAN),
    };
  })();

  return (
    <View style={styles.accordionCard}>
      {/* Row header: Farmer Code | Farmer Name | Chevron */}
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionCode}>{field.farmer_id || field.id}</Text>
        <Text style={styles.accordionName} numberOfLines={1}>
          {farmerName}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#7A7A7A"
        />
      </TouchableOpacity>

      {/* Expanded body */}
      {expanded && (
        <View style={styles.accordionBody}>
          {/* Field Name | Field Area — two columns with center divider (Figma) */}
          <View style={styles.fieldInfoRow}>
            <View style={styles.fieldInfoCol}>
              <Text style={styles.fieldInfoLabel}>Field Name</Text>
              <Text style={styles.fieldInfoValue}>
                {field.field_name || "N/A"}
              </Text>
            </View>
            <View style={styles.fieldInfoDivider} />
            <View style={styles.fieldInfoCol}>
              <Text style={styles.fieldInfoLabel}>Field Area</Text>
              <Text style={styles.fieldInfoValue}>
                {field.area_of_field ? `${field.area_of_field} ac` : "N/A"}
              </Text>
            </View>
          </View>

          {/* Satellite Map with polygon drawn from API coordinates */}
          {mapRegion && polygonCoords.length > 0 ? (
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={mapRegion}
                mapType="satellite" // satellite view as shown in Figma
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
              >
                <Polygon
                  coordinates={polygonCoords}
                  strokeColor="#39B54B"
                  fillColor="rgba(57,181,75,0.25)"
                  strokeWidth={2}
                />
              </MapView>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Feather name="map" size={24} color="#CCC" />
              <Text style={styles.mapPlaceholderText}>
                No map data available
              </Text>
            </View>
          )}

          {/* Additional field details */}
          <View style={styles.extraDetails}>
            <DetailRow label="Crop Type" value={field.cropType || "N/A"} />
            <DetailRow
              label="Field Category"
              value={field.field_category || "N/A"}
            />
            <DetailRow label="Soil Type" value={field.soil_type || "N/A"} />
            <DetailRow
              label="Irrigation"
              value={field.irrigation_type || "N/A"}
            />
            <DetailRow
              label="Cluster ID"
              value={String(field.cluster_id || "N/A")}
            />
            <DetailRow
              label="Representative"
              value={
                field.representative
                  ? `${field.representative.first_name} ${field.representative.last_name || ""}`.trim()
                  : "N/A"
              }
            />
          </View>

          {/* View Field | Field Book | Delete — matches Figma button layout */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.viewFieldBtn}
              onPress={() =>
                navigation.navigate("ViewField", {
                  fieldId: field.id,
                  polygon: polygonCoords,
                  fieldName: field.field_name,
                })
              }
            >
              <Text style={styles.viewFieldBtnText}>View Field</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fieldBookBtn}
              onPress={() =>
                navigation.navigate("FieldBookDetails", {
                  fieldId: field.id,
                })
              }
            >
              <Text style={styles.fieldBookBtnText}>Field Book</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(field.id)}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// Small reusable detail row
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const FieldsListing = ({ navigation }) => {
  const goBack = () => navigation.replace("MainTabs");

  // ── state ──────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [fieldsData, setFieldsData] = useState([]);
  const [clusterList, setClusterList] = useState([]);

  // filter state — mirrors web FieldsListingTables
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedFieldStatus, setSelectedFieldStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });

  // stats cards
  const [statsCards, setStatsCards] = useState([
    { Icon: FarmerIcon, name: "Total Farmers", value: "0" },
    { Icon: FieldsIcon, name: "Total Fields", value: "0" },
    { Icon: TotalAreaIcon, name: "Total Area", value: "0" },
    { Icon: FarmerIcon, name: "Total Cluster", value: "0" },
  ]);

  // Field category options — same as web component
  const fieldStatusOptions = [
    { label: "Seed Plot", value: "Seed Plot" },
    { label: "Conventional", value: "Conventional" },
    { label: "Regenerative", value: "Regenerative" },
    { label: "Organic", value: "Organic" },
  ];

  // ── fetch dashboard stats ──────────────────────────────────────────────────
  const fetchDashboardStats = useCallback(() => {
    getAuthToken().then((token) => {
      const headers = {
        "Content-Type": "application/json",
        "x-auth-token": token,
      };

      // axios.all fires all 3 requests in parallel — same as FarmerListing
      axios
        .all([
          axios.get(`${SERVER_URL}/api/farmers?limit=1000000000`, { headers }),
          axios.get(`${SERVER_URL}/api/field?limit=1000000000`, { headers }),
          axios.get(`${SERVER_URL}/api/cluster?limit=1000000000`, { headers }),
        ])
        .then(
          axios.spread((farmersRes, fieldsRes, clustersRes) => {
            const farmers = farmersRes.data.data || [];
            const fields = fieldsRes.data.data || [];
            const clusters = clustersRes.data.data || [];

            const totalAcres = fields
              .reduce((sum, f) => sum + (parseFloat(f.area_of_field) || 0), 0)
              .toFixed(2);

            setStatsCards([
              {
                Icon: FarmerIcon,
                name: "Total Farmers",
                value: farmers.length.toLocaleString(),
              },
              {
                Icon: FieldsIcon,
                name: "Total Fields",
                value: fields.length.toLocaleString(),
              },
              { Icon: TotalAreaIcon, name: "Total Area", value: totalAcres },
              {
                Icon: FarmerIcon,
                name: "Total Cluster",
                value: clusters.length.toLocaleString(),
              },
            ]);
          }),
        )
        .catch((err) => console.error("fetchDashboardStats error:", err));
    });
  }, []);

  // ── fetch clusters for dropdown ────────────────────────────────────────────
  const fetchClusters = useCallback(() => {
    getAuthToken().then((token) => {
      axios
        .get(`${SERVER_URL}/api/cluster?limit=1000000`, {
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
        })
        .then((res) => setClusterList(res.data.data || []))
        .catch((err) => console.error("fetchClusters error:", err));
    });
  }, []);

  const fetchFields = (
    page = 1,
    cluster = selectedCluster,
    status = selectedFieldStatus,
    search = searchQuery,
  ) => {
    setIsLoading(true);

    getAuthToken().then((token) => {
      const headers = {
        "Content-Type": "application/json",
        "x-auth-token": token,
      };
      const PAGE_LIMIT = 10;

      if (search) {
        // ── Search mode: fetch ALL records then filter on both field_name
        //    and farmer name client-side so nothing gets missed.
        let queryParams = `page=1&limit=100000&sortBy=id&order=ASC`;
        if (cluster) queryParams += `&cluster_id=${cluster}`;
        if (status)
          queryParams += `&field_category=${encodeURIComponent(status)}`;

        axios
          .get(`${SERVER_URL}/api/field?${queryParams}`, { headers })
          .then((res) => {
            const allFields = res.data.data || [];
            const term = search.toLowerCase().trim();

            // Filter on: field_name  OR  farmer first_name  OR  farmer last_name
            // OR full name combo (e.g. "Rehman Ali")
            const filtered = allFields.filter((field) => {
              const fieldName = (field.field_name || "").toLowerCase();
              const firstName = (field.farmer?.first_name || "").toLowerCase();
              const lastName = (field.farmer?.last_name || "").toLowerCase();
              const fullName = `${firstName} ${lastName}`.trim();

              return (
                fieldName.includes(term) ||
                firstName.includes(term) ||
                lastName.includes(term) ||
                fullName.includes(term)
              );
            });

            // Paginate the filtered results manually
            const totalFiltered = filtered.length;
            const totalPages = Math.max(
              1,
              Math.ceil(totalFiltered / PAGE_LIMIT),
            );
            const safePage = Math.min(page, totalPages);
            const start = (safePage - 1) * PAGE_LIMIT;
            const pageSlice = filtered.slice(start, start + PAGE_LIMIT);

            setFieldsData(pageSlice);
            setPagination({
              currentPage: safePage,
              totalPages,
              total: totalFiltered,
              limit: PAGE_LIMIT,
            });
          })
          .catch((err) => {
            console.error("fetchFields (search) error:", err);
            Alert.alert("Error", "Failed to search fields.");
          })
          .finally(() => setIsLoading(false));
      } else {
        // ── Normal paginated mode — no search term
        let queryParams = `page=${page}&limit=${PAGE_LIMIT}&sortBy=id&order=ASC`;
        if (cluster) queryParams += `&cluster_id=${cluster}`;
        if (status)
          queryParams += `&field_category=${encodeURIComponent(status)}`;

        axios
          .get(`${SERVER_URL}/api/field?${queryParams}`, { headers })
          .then((res) => {
            setFieldsData(res.data.data || []);
            setPagination({
              currentPage: res.data.currentPage ?? page,
              totalPages: res.data.totalPages ?? 1,
              total: res.data.total ?? 0,
              limit: PAGE_LIMIT,
            });
          })
          .catch((err) => {
            console.error("fetchFields error:", err);
            Alert.alert("Error", "Failed to load fields.");
          })
          .finally(() => setIsLoading(false));
      }
    });
  };

  // On mount
  useEffect(() => {
    fetchDashboardStats();
    fetchClusters();
    fetchFields(1, "", "", "");
  }, []);

  // Debounced search + filter — re-runs whenever any filter value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFields(1, selectedCluster, selectedFieldStatus, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCluster, selectedFieldStatus]);

  // ── button handlers ────────────────────────────────────────────────────────
  const handleSubmit = () => {
    fetchFields(1, selectedCluster, selectedFieldStatus, searchQuery);
  };

  const handleReset = () => {
    setSelectedCluster("");
    setSelectedFieldStatus("");
    setSearchQuery("");
    fetchFields(1, "", "", "");
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this field?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .delete(`${SERVER_URL}/api/field/${id}`, {
                  headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": token,
                  },
                })
                .then(() => {
                  // Refresh list and stats after delete
                  fetchFields(
                    pagination.currentPage,
                    selectedCluster,
                    selectedFieldStatus,
                    searchQuery,
                  );
                  fetchDashboardStats();
                })
                .catch(() => Alert.alert("Error", "Failed to delete field."));
            });
          },
        },
      ],
    );
  };

  // ── dropdown options ───────────────────────────────────────────────────────
  const clusterOptions = clusterList.map((c) => ({
    label: c.cluster_name || `Cluster ${c.id}`,
    value: String(c.id),
  }));

  // ── pagination buttons ─────────────────────────────────────────────────────
  const renderPageButtons = () => {
    const pages = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      if (
        i === 1 ||
        i === pagination.totalPages ||
        (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)
      ) {
        pages.push(i);
      } else if (
        i === pagination.currentPage - 2 ||
        i === pagination.currentPage + 2
      ) {
        pages.push("...");
      }
    }
    // Remove duplicate "..."
    const deduped = pages.filter(
      (p, i) => p !== "..." || pages[i - 1] !== "...",
    );

    return deduped.map((p, idx) =>
      p === "..." ? (
        <Text key={`d${idx}`} style={styles.pageDots}>
          …
        </Text>
      ) : (
        <TouchableOpacity
          key={p}
          style={[
            styles.pageBtn,
            pagination.currentPage === p && styles.pageBtnActive,
          ]}
          onPress={() =>
            fetchFields(p, selectedCluster, selectedFieldStatus, searchQuery)
          }
        >
          <Text
            style={[
              styles.pageBtnText,
              pagination.currentPage === p && styles.pageBtnTextActive,
            ]}
          >
            {p}
          </Text>
        </TouchableOpacity>
      ),
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Feather name="x" size={18} color="#4E4E4E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Field Listing</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {statsCards.map((card, idx) => {
            const IconComp = card.Icon;
            return (
              <View key={idx} style={styles.statCard}>
                <Image
                  source={require("../../assets/circle-img.png")}
                  style={styles.statCircle}
                />
                <IconComp width={40} height={40} />
                <Text style={styles.statName}>{card.name}</Text>
                <Text style={styles.statValue}>{card.value}</Text>
              </View>
            );
          })}
        </View>

        {/* Main listing card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Field Listing</Text>

          {/* Filters — Field Status + Choose Cluster */}
          <View style={styles.filterRow}>
            <View style={styles.filterHalf}>
              <Dropdown
                placeholder="Field Status"
                options={fieldStatusOptions}
                selectedValue={selectedFieldStatus}
                onSelect={setSelectedFieldStatus}
              />
            </View>
            <View style={styles.filterHalf}>
              <Dropdown
                placeholder="Choose Cluster"
                options={clusterOptions}
                selectedValue={selectedCluster}
                onSelect={setSelectedCluster}
              />
            </View>
          </View>

          {/* Submit / Reset buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Feather
              name="search"
              size={15}
              color="#A9A9A9"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Field, Farmer Name…"
              placeholderTextColor="#A9A9A9"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.searchClear}
              >
                <Feather name="x-circle" size={15} color="#A9A9A9" />
              </TouchableOpacity>
            )}
          </View>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>
              Farmer Code
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>
              Farmer Name
            </Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Table body */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#39B54B" />
              <Text style={styles.loadingText}>Loading fields…</Text>
            </View>
          ) : fieldsData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={36} color="#CCC" />
              <Text style={styles.emptyText}>No fields found</Text>
            </View>
          ) : (
            fieldsData.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                navigation={navigation}
                onDelete={handleDelete}
              />
            ))
          )}

          {/* Pagination controls */}
          {!isLoading && fieldsData.length > 0 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  pagination.currentPage === 1 && styles.pageBtnDisabled,
                ]}
                disabled={pagination.currentPage === 1}
                onPress={() =>
                  fetchFields(
                    pagination.currentPage - 1,
                    selectedCluster,
                    selectedFieldStatus,
                    searchQuery,
                  )
                }
              >
                <Feather
                  name="chevron-left"
                  size={13}
                  color={pagination.currentPage === 1 ? "#CCC" : "#4E4E4E"}
                />
                <Text style={styles.pageBtnText}> Prev</Text>
              </TouchableOpacity>

              {renderPageButtons()}

              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  pagination.currentPage === pagination.totalPages &&
                    styles.pageBtnDisabled,
                ]}
                disabled={pagination.currentPage === pagination.totalPages}
                onPress={() =>
                  fetchFields(
                    pagination.currentPage + 1,
                    selectedCluster,
                    selectedFieldStatus,
                    searchQuery,
                  )
                }
              >
                <Text style={styles.pageBtnText}>Next </Text>
                <Feather
                  name="chevron-right"
                  size={13}
                  color={
                    pagination.currentPage === pagination.totalPages
                      ? "#CCC"
                      : "#4E4E4E"
                  }
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Result count */}
          {!isLoading && fieldsData.length > 0 && (
            <Text style={styles.resultInfo}>
              Showing {(pagination.currentPage - 1) * pagination.limit + 1}–
              {Math.min(
                pagination.currentPage * pagination.limit,
                pagination.total,
              )}{" "}
              of {pagination.total} fields
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FieldsListing;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F0F0" },
  scrollView: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#383838" },

  // Stats grid (identical to FarmerListing)
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCircle: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 85,
    height: 66,
    resizeMode: "contain",
    opacity: 0.4,
  },
  statName: { fontSize: 12, fontWeight: "600", color: "#4E4E4E", marginTop: 3 },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4e4e4e",
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
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
    marginBottom: 14,
  },

  // Filter row
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  filterHalf: { flex: 1 },

  // Dropdown
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#D8D8D8",
    borderWidth: 1,
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  dropdownText: {
    fontStyle: "italic",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    marginRight: 4,
  },

  // Modal
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
  modalItemClear: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  modalItemClearText: { fontSize: 12, color: "#A9A9A9", fontStyle: "italic" },
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
  modalEmpty: {
    padding: 20,
    textAlign: "center",
    color: "#A9A9A9",
    fontSize: 13,
  },

  // Buttons row
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: "#39B54B",
    paddingHorizontal: 26,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  resetBtn: {
    backgroundColor: "#1A53D3",
    paddingHorizontal: 26,
    paddingVertical: 9,
    borderRadius: 8,
  },
  resetBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#383838",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  searchClear: { marginLeft: 6, padding: 2 },

  // Table header
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E6FAE6",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: "center",
  },
  tableHeaderText: { fontSize: 13, fontWeight: "700", color: "#2D7A39" },

  // Accordion card
  accordionCard: {
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  accordionCode: { flex: 1, fontSize: 13, color: "#4E4E4E", fontWeight: "600" },
  accordionName: { flex: 2, fontSize: 13, color: "#4E4E4E", fontWeight: "500" },

  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },

  // Field Name | Field Area two-column row (Figma design)
  fieldInfoRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    marginBottom: 12,
    overflow: "hidden",
  },
  fieldInfoCol: { flex: 1, alignItems: "center", paddingVertical: 10 },
  fieldInfoDivider: { width: 1, backgroundColor: "#EFEFEF" },
  fieldInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4E4E4E",
    marginBottom: 2,
  },
  fieldInfoValue: { fontSize: 13, fontWeight: "500", color: "#383838" },

  // Map
  mapContainer: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
    height: 180,
  },
  map: { width: "100%", height: "100%" },
  mapPlaceholder: {
    height: 120,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 6,
  },
  mapPlaceholderText: { fontSize: 12, color: "#CCC" },

  // Extra detail rows
  extraDetails: { marginBottom: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  detailLabel: {
    width: 120,
    fontSize: 12,
    color: "#7A7A7A",
    fontWeight: "600",
  },
  detailValue: { flex: 1, fontSize: 12, color: "#383838", fontWeight: "500" },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  viewFieldBtn: {
    flex: 1,
    backgroundColor: "#39B54B",
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
  },
  viewFieldBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  fieldBookBtn: {
    flex: 1,
    backgroundColor: "#1A53D3",
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
  },
  fieldBookBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#E53935",
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Loading / empty
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 13, color: "#AAA" },
  emptyBox: { paddingVertical: 36, alignItems: "center", gap: 8 },
  emptyText: { color: "#BBB", fontSize: 14, marginTop: 6 },

  // Pagination
  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  pageBtnActive: { backgroundColor: "#39B54B", borderColor: "#39B54B" },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 12, color: "#4E4E4E" },
  pageBtnTextActive: { color: "#fff", fontWeight: "700" },
  pageDots: { fontSize: 14, color: "#BBB", paddingHorizontal: 2 },
  resultInfo: {
    textAlign: "center",
    fontSize: 11,
    color: "#AAA",
    marginTop: 10,
    marginBottom: 4,
  },
});

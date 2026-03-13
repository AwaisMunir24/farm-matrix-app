import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { getAuthToken } from "../utils/auth"; // adjust path to your auth file
import { SERVER_URL } from "../utils/index"; // adjust path to your utils file
import FarmerIcon from "../../assets/farmer_pic.svg";
import FieldsIcon from "../../assets/field-list-svg.svg";
import TotalAreaIcon from "../../assets/total-area.svg";

// ─────────────────────────────────────────────────────────────────────────────
// DROPDOWN — styled like AddNewField's PickerDropdown (Feather chevron, EFEFEF bg)
// ─────────────────────────────────────────────────────────────────────────────
const Dropdown = ({
  placeholder,
  options = [],
  selectedValue,
  onSelect,
  searchable = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = options.find(
    (o) => String(o.value) === String(selectedValue),
  )?.label;

  const filtered =
    searchable && search
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => {
          setSearch("");
          setVisible(true);
        }}
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

      {/* Modal Sheet */}
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalBox}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Feather name="x" size={18} color="#4E4E4E" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            {searchable && (
              <View style={styles.modalSearchWrap}>
                <Feather
                  name="search"
                  size={14}
                  color="#A9A9A9"
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  style={styles.modalSearch}
                  placeholder="Search…"
                  placeholderTextColor="#A9A9A9"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            )}

            {/* Clear option */}
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
              data={filtered}
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
// ACCORDION ROW
// ─────────────────────────────────────────────────────────────────────────────
const FarmerRow = ({ farmer, onDelete, onReset, calculateTotalAcres }) => {
  const [expanded, setExpanded] = useState(false);
  const totalAcres = calculateTotalAcres(farmer.fields || []);
  const fullName = `${farmer.first_name} ${farmer.last_name || ""}`.trim();

  return (
    <View style={styles.accordionCard}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setExpanded((p) => !p)}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionId}>{farmer.id}</Text>
        <Text style={styles.accordionName} numberOfLines={1}>
          {fullName}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#7A7A7A"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordionBody}>
          <DetailRow label="Field Acre" value={`${totalAcres} ac`} />
          <DetailRow label="City" value={farmer.address || "N/A"} />
          <DetailRow
            label="No. of Fields"
            value={String(farmer.fields?.length ?? 0)}
          />
          <DetailRow label="Farmer Code" value={farmer.user_code || "N/A"} />

          <View style={styles.accordionActions}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(farmer.id)}
            >
              <Feather
                name="trash-2"
                size={13}
                color="#fff"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setExpanded(false);
                onReset();
              }}
            >
              <Feather
                name="refresh-ccw"
                size={13}
                color="#fff"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FarmerListing = ({ navigation }) => {
  const goBack = () => navigation.replace("MainTabs");

  const [farmersData, setFarmersData] = useState([]);
  const [clusterList, setClusterList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [selectedClusterId, setSelectedClusterId] = useState("");

  const [statsCards, setStatsCards] = useState([
    { Icon: FarmerIcon, name: "Total Farmers", value: "0" },
    { Icon: FieldsIcon, name: "Total Fields", value: "0" },
    { Icon: TotalAreaIcon, name: "Total Area", value: "0" },
    { Icon: FarmerIcon, name: "Total Cluster", value: "0" },
  ]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const calculateTotalAcres = useCallback((fieldData) => {
    if (!Array.isArray(fieldData) || !fieldData.length) return "0.00";
    return fieldData
      .reduce((s, f) => s + (parseFloat(f.area_of_field) || 0), 0)
      .toFixed(2);
  }, []);

  // ── fetch dashboard stats ─────────────────────────────────────────────────
  const fetchDashboardStats = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const h = { "Content-Type": "application/json", "x-auth-token": token };
      const [fRes, fiRes, cRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/farmers?limit=1000000000`, { headers: h }),
        fetch(`${SERVER_URL}/api/field?limit=1000000000`, { headers: h }),
        fetch(`${SERVER_URL}/api/cluster?limit=1000000000`, { headers: h }),
      ]);
      const fd = await fRes.json();
      const fi = await fiRes.json();
      const cd = await cRes.json();
      const totalAcres = (fi.data || [])
        .reduce((s, f) => s + (parseFloat(f.area_of_field) || 0), 0)
        .toFixed(2);
      setStatsCards([
        {
          Icon: FarmerIcon,
          name: "Total Farmers",
          value: (fd.data?.length ?? 0).toLocaleString(),
        },
        {
          Icon: FieldsIcon,
          name: "Total Fields",
          value: (fi.data?.length ?? 0).toLocaleString(),
        },
        { Icon: TotalAreaIcon, name: "Total Area", value: totalAcres },
        {
          Icon: FarmerIcon,
          name: "Total Cluster",
          value: (cd.data?.length ?? 0).toLocaleString(),
        },
      ]);
    } catch (e) {
      console.error("fetchDashboardStats:", e);
    }
  }, []);

  // ── fetch farmers ─────────────────────────────────────────────────────────
  const fetchFarmers = useCallback(
    async (page = 1, farmerId = "", clusterId = "", search = "") => {
      setIsLoading(true);
      try {
        const token = await getAuthToken();
        let query = `page=${page}&limit=10`;
        if (clusterId) query += `&cluster_id=${clusterId}`;
        if (search) query += `&search=${encodeURIComponent(search)}`;

        const res = await fetch(`${SERVER_URL}/api/farmers?${query}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        let filtered = data.data || [];
        if (farmerId) {
          filtered = filtered.filter((f) => String(f.id) === String(farmerId));
        }
        setFarmersData(filtered);
        setPagination({
          currentPage: data.currentPage ?? page,
          totalPages: data.totalPages ?? 1,
          total: data.total ?? filtered.length,
          limit: 10,
        });
      } catch (e) {
        Alert.alert("Error", e.message || "Failed to load farmers.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ── fetch clusters ────────────────────────────────────────────────────────
  const fetchClusters = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${SERVER_URL}/api/cluster?limit=1000000`, {
        headers: { "Content-Type": "application/json", "x-auth-token": token },
      });
      const data = await res.json();
      setClusterList(data?.data || []);
    } catch (_) {}
  }, []);

  // ── mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDashboardStats();
    fetchClusters();
    fetchFarmers(1);
  }, []);

  // ── real-time search debounce (400ms) ─────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFarmers(1, selectedFarmerId, selectedClusterId, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSubmit = () =>
    fetchFarmers(1, selectedFarmerId, selectedClusterId, searchQuery);

  const handleReset = () => {
    setSelectedFarmerId("");
    setSelectedClusterId("");
    setSearchQuery("");
    fetchFarmers(1);
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this farmer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getAuthToken();
              await fetch(`${SERVER_URL}/api/farmers/${id}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  "x-auth-token": token,
                },
              });
              fetchFarmers(
                pagination.currentPage,
                selectedFarmerId,
                selectedClusterId,
                searchQuery,
              );
              fetchDashboardStats();
            } catch (e) {
              Alert.alert("Error", "Failed to delete farmer.");
            }
          },
        },
      ],
    );
  };

  // ── options ───────────────────────────────────────────────────────────────
  const farmerOptions = farmersData.map((f) => ({
    label: `${f.first_name} ${f.last_name || ""}`.trim(),
    value: String(f.id),
  }));
  const clusterOptions = clusterList.map((c) => ({
    label: c.cluster_name || `Cluster ${c.id}`,
    value: String(c.id),
  }));

  // ── pagination ────────────────────────────────────────────────────────────
  const renderPageButtons = () => {
    const pages = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      if (
        i === 1 ||
        i === pagination.totalPages ||
        (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)
      )
        pages.push(i);
      else if (
        i === pagination.currentPage - 2 ||
        i === pagination.currentPage + 2
      )
        pages.push("...");
    }
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
            fetchFarmers(p, selectedFarmerId, selectedClusterId, searchQuery)
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Feather name="x" size={18} color="#4E4E4E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farmer Listing</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Stats Cards ── */}
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

        {/* ── Farmer Listing Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Farmer Listing</Text>

          {/* Dropdowns */}
          <View style={styles.filterRow}>
            <View style={styles.filterHalf}>
              <Dropdown
                placeholder="Select Farmer"
                options={farmerOptions}
                selectedValue={selectedFarmerId}
                onSelect={setSelectedFarmerId}
              />
            </View>
            <View style={styles.filterHalf}>
              <Dropdown
                placeholder="Choose Cluster"
                options={clusterOptions}
                selectedValue={selectedClusterId}
                onSelect={setSelectedClusterId}
                searchable
              />
            </View>
          </View>

          {/* Submit / Reset */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.blueResetBtn} onPress={handleReset}>
              <Text style={styles.blueResetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* ── Real-time Search ── */}
          <View style={styles.searchWrap}>
            <Feather
              name="search"
              size={15}
              color="#A9A9A9"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search farmer by name or email…"
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
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Farmer ID</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>
              Farmer Name
            </Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Table body */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#39B54B" />
              <Text style={styles.loadingText}>Loading farmers…</Text>
            </View>
          ) : farmersData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={36} color="#CCC" />
              <Text style={styles.emptyText}>No farmers found</Text>
            </View>
          ) : (
            farmersData.map((farmer) => (
              <FarmerRow
                key={farmer.id}
                farmer={farmer}
                onDelete={handleDelete}
                onReset={handleReset}
                calculateTotalAcres={calculateTotalAcres}
              />
            ))
          )}

          {/* Pagination */}
          {!isLoading && farmersData.length > 0 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  pagination.currentPage === 1 && styles.pageBtnDisabled,
                ]}
                disabled={pagination.currentPage === 1}
                onPress={() =>
                  fetchFarmers(
                    pagination.currentPage - 1,
                    selectedFarmerId,
                    selectedClusterId,
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
                  fetchFarmers(
                    pagination.currentPage + 1,
                    selectedFarmerId,
                    selectedClusterId,
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

          {/* Result info */}
          {!isLoading && farmersData.length > 0 && (
            <Text style={styles.resultInfo}>
              Showing {(pagination.currentPage - 1) * pagination.limit + 1}–
              {Math.min(
                pagination.currentPage * pagination.limit,
                pagination.total,
              )}{" "}
              of {pagination.total} farmers
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FarmerListing;

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

  // Stats grid
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
    marginBottom: 0,
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
  statName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4E4E4E",
    marginTop: 3,
  },
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

  // Filter dropdowns
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  filterHalf: { flex: 1 },

  // Dropdown trigger — matches AddNewField exactly
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
  modalSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#FAFAFA",
  },
  modalSearch: { flex: 1, fontSize: 13, color: "#383838" },
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

  // Buttons
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
  blueResetBtn: {
    backgroundColor: "#1A53D3",
    paddingHorizontal: 26,
    paddingVertical: 9,
    borderRadius: 8,
  },
  blueResetBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Search input
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 12, color: "#383838", fontStyle: "italic" },
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
  accordionId: { flex: 1, fontSize: 13, color: "#4E4E4E", fontWeight: "600" },
  accordionName: { flex: 2, fontSize: 13, color: "#4E4E4E", fontWeight: "500" },

  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
  },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  detailLabel: {
    width: 110,
    fontSize: 12,
    color: "#7A7A7A",
    fontWeight: "600",
  },
  detailValue: { flex: 1, fontSize: 12, color: "#383838", fontWeight: "500" },

  accordionActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53935",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 7,
  },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A53D3",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 7,
  },
  resetBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

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

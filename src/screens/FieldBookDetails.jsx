import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Image,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import { SERVER_URL } from "../utils/index";
import FarmingSliderMobile from "../components/FarmingSliderMobile";

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE DROPDOWN
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
// DETAIL ROW
// ─────────────────────────────────────────────────────────────────────────────
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value || "N/A"}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const FieldBookDetails = ({ navigation, route }) => {
  const { fieldId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [fieldBookData, setFieldBookData] = useState(null); // full fieldbook object (same as web)
  const [mainFieldBookDetails, setMainFieldBookDetails] = useState(null); // data.field (same as web)
  const [gettingIds, setGettingIds] = useState(null); // data itself — holds representative_id & id
  const [fieldVisits, setFieldVisits] = useState([]);

  // Form state — mirrors web formData shape exactly
  const [formData, setFormData] = useState({
    date: "",
    farmingActivity: "",
    comment: "",
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { uri, name, type }
  const [isSaving, setIsSaving] = useState(false);

  // Farmer name accordion
  const [farmerExpanded, setFarmerExpanded] = useState(true);

  const farmingActivityOptions = [
    { label: "Plowing", value: "Plowing" },
    { label: "Sowing", value: "Sowing" },
    { label: "Irrigation", value: "Irrigation" },
    { label: "Fertilization", value: "Fertilization" },
    { label: "Pesticide Application", value: "Pesticide Application" },
    { label: "Harvesting", value: "Harvesting" },
    { label: "Other", value: "Other" },
  ];

  // ── Fetch fieldbook (same endpoint as web: /api/fieldbook/field/:id) ──────
  useEffect(() => {
    fetchFieldBookData();
  }, [fieldId]);

  const fetchFieldBookData = () => {
    setIsLoading(true);
    getAuthToken().then((token) => {
      axios
        .get(`${SERVER_URL}/api/fieldbook/field/${fieldId}`, {
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
        })
        .then((resp) => {
          const data = resp.data.data;
          console.log(data, "data<============");
          setFieldBookData(data);
          setMainFieldBookDetails(data.field);
          setGettingIds(data);
        })
        .catch((err) => {
          console.error("fetchFieldBookData error:", err);
          Alert.alert("Error", "Failed to load field book details.");
        })
        .finally(() => setIsLoading(false));
    });
  };

  // ── Image picker ──────────────────────────────────────────────────────────
  const handlePickImage = () => {
    ImagePicker.requestMediaLibraryPermissionsAsync().then((permission) => {
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library.",
        );
        return;
      }
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      }).then((result) => {
        if (!result.canceled && result.assets?.length > 0) {
          const asset = result.assets[0];
          const filename = asset.uri.split("/").pop();
          const ext = filename.split(".").pop();
          setSelectedFile({
            uri: asset.uri,
            name: filename,
            type: `image/${ext}`,
          });
        }
      });
    });
  };

  // ── Date picker handler ───────────────────────────────────────────────────
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      // mirror web formData.date as YYYY-MM-DD string
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setFormData((prev) => ({ ...prev, date: `${yyyy}-${mm}-${dd}` }));
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  // ── Save field visit — same logic as web _handleSaveFieldVisit ────────────
  const handleSave = () => {
    if (!formData.date) {
      Alert.alert("Validation", "Please select a date.");
      return;
    }
    if (!formData.farmingActivity) {
      Alert.alert("Validation", "Please select a farming activity.");
      return;
    }

    setIsSaving(true);

    getAuthToken().then((token) => {
      const formDataToSend = new FormData();
      formDataToSend.append("visit_date", formData.date);
      formDataToSend.append("farming_activity", formData.farmingActivity);
      formDataToSend.append("comment", formData.comment);
      formDataToSend.append("representative_id", gettingIds?.representative_id);
      formDataToSend.append("fieldbook_id", gettingIds?.id);

      if (selectedFile) {
        formDataToSend.append("images", selectedFile); // key "images" same as web
      }

      axios
        .post(`${SERVER_URL}/api/fieldVisit`, formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
            "x-auth-token": token,
          },
        })
        .then(() => {
          Alert.alert("Success", "Field visit saved successfully!");
          // Reset form — same as web
          setFormData({ date: "", farmingActivity: "", comment: "" });
          setSelectedDate(null);
          setSelectedFile(null);
        })
        .catch((err) => {
          console.error("handleSave error:", err);
          Alert.alert("Error", "Error saving field visit.");
        })
        .finally(() => setIsSaving(false));
    });
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const farmerName = mainFieldBookDetails?.farmer
    ? `${mainFieldBookDetails.farmer.first_name} ${mainFieldBookDetails.farmer.last_name || ""}`.trim()
    : "N/A";

  const clusterName =
    mainFieldBookDetails?.tehsil || // same as web: mainFieldBookDetails?.tehsil
    mainFieldBookDetails?.cluster?.cluster_name ||
    "N/A";

  const representativeName = mainFieldBookDetails?.representative
    ? `${mainFieldBookDetails.representative.first_name} ${mainFieldBookDetails.representative.last_name || ""}`.trim()
    : "N/A";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={18} color="#4E4E4E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Field Book Details</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#39B54B" />
          <Text style={styles.loadingText}>Loading field details…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View
              style={{
                backgroundColor: "#F5F5F5",
                paddingHorizontal: 10,
                borderRadius: 12,
                paddingVertical: 10,
              }}
            >
              {/* ── Farmer Name Accordion ── */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setFarmerExpanded((p) => !p)}
                activeOpacity={0.8}
              >
                <Text style={styles.accordionLabel}>Farmer Name:</Text>
                <Text style={styles.accordionValue}>{farmerName}</Text>
                <Feather
                  name={farmerExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#7A7A7A"
                />
              </TouchableOpacity>

              {/* ── Field Details ── */}
              {farmerExpanded && (
                <View style={styles.detailsBlock}>
                  <DetailRow
                    label="Field Name"
                    value={mainFieldBookDetails?.field_name}
                  />
                  <DetailRow
                    label="Field Area"
                    value={
                      mainFieldBookDetails?.area_of_field
                        ? `${mainFieldBookDetails.area_of_field} acre`
                        : "N/A"
                    }
                  />
                  <DetailRow
                    label="Field Crop"
                    value={mainFieldBookDetails?.cropType}
                  />
                  <DetailRow
                    label="Soil Type"
                    value={mainFieldBookDetails?.soil_type}
                  />
                  <DetailRow
                    label="Representative"
                    value={representativeName}
                  />
                  <DetailRow
                    label="Field Category"
                    value={mainFieldBookDetails?.field_category}
                  />
                  <DetailRow
                    label="Irrigation Type"
                    value={mainFieldBookDetails?.irrigation_type}
                  />
                  <DetailRow label="Field Cluster" value={clusterName} />
                </View>
              )}
            </View>
          </View>

          {/* ── Field Visit Images ── */}
          {fieldVisits.length > 0 && (
            <View style={styles.visitsSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {fieldVisits.map((visit, idx) => (
                  <View key={idx} style={styles.visitCard}>
                    {visit.image_url ? (
                      <Image
                        source={{ uri: visit.image_url }}
                        style={styles.visitImage}
                      />
                    ) : (
                      <View style={styles.visitImagePlaceholder}>
                        <Feather name="image" size={24} color="#CCC" />
                      </View>
                    )}
                    <Text style={styles.visitDate}>
                      {visit.visit_date
                        ? visit.visit_date
                            .split("T")[0]
                            .split("-")
                            .reverse()
                            .join("-")
                        : "N/A"}
                    </Text>
                    <Text style={styles.visitActivity}>
                      {visit.farming_activity || "Farming Activity"}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.card}>
            <FarmingSliderMobile getId={fieldId} />
          </View>
          {/* ── Field Visits Form ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Field Visits</Text>

            <View style={styles.visitFormRow}>
              {/* Upload Image */}
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                {selectedFile ? (
                  <Image
                    source={{ uri: selectedFile.uri }}
                    style={styles.uploadedImg}
                  />
                ) : (
                  <>
                    <View style={styles.uploadIconCircle}>
                      <Feather name="user-plus" size={22} color="#39B54B" />
                    </View>
                    <Text style={styles.uploadText}>
                      Upload Image{"\n"}from System
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Form Fields */}
              <View style={styles.visitFormFields}>
                {/* Date Picker */}
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateInputText,
                      { color: selectedDate ? "#383838" : "#A9A9A9" },
                    ]}
                  >
                    {selectedDate
                      ? formatDisplayDate(selectedDate)
                      : "Select Date"}
                  </Text>
                  <Feather name="calendar" size={15} color="#A9A9A9" />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}

                {/* Farming Activity Dropdown */}
                <Dropdown
                  placeholder="Farming Activity"
                  options={farmingActivityOptions}
                  selectedValue={formData.farmingActivity}
                  onSelect={(val) =>
                    setFormData((prev) => ({ ...prev, farmingActivity: val }))
                  }
                />

                {/* Comment */}
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add Comment"
                  placeholderTextColor="#A9A9A9"
                  value={formData.comment}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, comment: text }))
                  }
                  multiline
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FieldBookDetails;

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
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#383838" },

  // Loading
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, fontSize: 13, color: "#AAA" },

  // Card
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

  // Accordion header
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 10,
  },
  accordionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4E4E4E",
    marginRight: 8,
  },
  accordionValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#383838",
  },

  // Details block
  detailsBlock: { paddingTop: 4 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailLabel: {
    width: 130,
    fontSize: 13,
    color: "#4E4E4E",
    fontWeight: "600",
  },
  detailValue: { flex: 1, fontSize: 13, color: "#383838", fontWeight: "400" },

  // Visits horizontal scroll
  visitsSection: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  visitCard: {
    marginRight: 12,
    alignItems: "center",
    width: 120,
  },
  visitImage: {
    width: 120,
    height: 90,
    borderRadius: 10,
    marginBottom: 5,
  },
  visitImagePlaceholder: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  visitDate: { fontSize: 11, color: "#4E4E4E", fontWeight: "500" },
  visitActivity: { fontSize: 11, color: "#7A7A7A" },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 14,
  },

  // Visit form row (upload box + fields side by side)
  visitFormRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  // Upload box
  uploadBox: {
    width: 110,
    height: 160,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#A7F3C0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  uploadIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E6FAE6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 11,
    color: "#4E4E4E",
    textAlign: "center",
    lineHeight: 16,
  },
  uploadedImg: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },

  // Form fields column
  visitFormFields: { flex: 1, gap: 10 },

  // Date input
  dateInput: {
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
  dateInputText: { fontSize: 12, fontStyle: "italic", fontWeight: "500" },

  // Dropdown (reused from FieldsListing style)
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

  // Comment input
  commentInput: {
    borderColor: "#D8D8D8",
    borderWidth: 1,
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 12,
    color: "#383838",
    fontStyle: "italic",
    minHeight: 50,
    textAlignVertical: "top",
  },

  // Save button
  saveBtn: {
    backgroundColor: "#39B54B",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

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
});

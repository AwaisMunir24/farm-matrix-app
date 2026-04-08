import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import { SERVER_URL } from "../utils/index";

// ─────────────────────────────────────────────────────────────────────────────
// LABELED INPUT
// ─────────────────────────────────────────────────────────────────────────────
const LabeledInput = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
}) => (
  <View>
    <Text style={advStyles.inputLabel}>{label}</Text>
    <TextInput
      style={[advStyles.textInput, multiline && advStyles.textInputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor="#A9A9A9"
      keyboardType={keyboardType}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
    />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// TABLE ROW
// ─────────────────────────────────────────────────────────────────────────────
const AdvisoryRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[advStyles.tableRow, index % 2 === 0 && advStyles.tableRowEven]}>
    <Text style={[advStyles.tableCell, advStyles.colNo]}>{index + 1}</Text>
    <Text style={[advStyles.tableCell, advStyles.colDate]} numberOfLines={1}>
      {item.advisory_date
        ? item.advisory_date.split("-").reverse().join("-")
        : "-"}
    </Text>
    <Text style={[advStyles.tableCell, advStyles.colType]} numberOfLines={1}>
      {item.advisory_type || "-"}
    </Text>
    <Text style={[advStyles.tableCell, advStyles.colDetails]} numberOfLines={1}>
      {item.advisory_details || "-"}
    </Text>
    <View style={advStyles.tableActions}>
      <TouchableOpacity style={advStyles.editBtn} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={12} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={advStyles.deleteBtn}
        onPress={() => onDelete(item)}
      >
        <Feather name="trash-2" size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AdvisoryMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [advisoryList, setAdvisoryList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [advisory, setAdvisory] = useState({
    advisoryDate: "",
    advisoryType: "",
    advisoryDetails: "",
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getId) return;
    getAuthToken().then((token) => {
      axios
        .get(`${SERVER_URL}/api/fieldbook/field/${getId}`, {
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
        })
        .then((resp) => {
          const data = resp.data.data;
          setFieldBookId(data.id);
          if (data.advisory && Array.isArray(data.advisory)) {
            setAdvisoryList(
              data.advisory.map((item, index) => ({
                id: index,
                advisory_date: item.advisory_date || "",
                advisory_type: item.advisory_type || "",
                advisory_details: item.advisory_details || "",
                total_cost: item.total_cost || 0,
              })),
            );
          }
        })
        .catch((err) => console.error("AdvisoryMobile fetch error:", err));
    });
  }, [getId]);

  // ── Date picker ────────────────────────────────────────────────────────────
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setAdvisory((p) => ({ ...p, advisoryDate: `${yyyy}-${mm}-${dd}` }));
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditingIndex(row.id);
    if (row.advisory_date) {
      const parts = row.advisory_date.split("-");
      if (parts.length === 3)
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
    setAdvisory({
      advisoryDate: row.advisory_date || "",
      advisoryType: row.advisory_type || "",
      advisoryDetails: row.advisory_details || "",
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (row) => {
    Alert.alert(
      "Delete Advisory",
      "Are you sure you want to delete this advisory?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .patch(
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/advisory`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.advisory) {
                    setAdvisoryList(
                      resp.data.data.advisory.map((item, index) => ({
                        id: index,
                        advisory_date: item.advisory_date || "",
                        advisory_type: item.advisory_type || "",
                        advisory_details: item.advisory_details || "",
                        total_cost: item.total_cost || 0,
                      })),
                    );
                  }
                  Alert.alert("Deleted", "Advisory deleted.");
                })
                .catch(() =>
                  Alert.alert("Error", "Failed to delete advisory."),
                );
            });
          },
        },
      ],
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!advisory.advisoryDate) {
      Alert.alert("Validation", "Please select an advisory date.");
      return;
    }
    setIsSaving(true);

    const item = {
      advisory_date: advisory.advisoryDate,
      advisory_type: advisory.advisoryType,
      advisory_details: advisory.advisoryDetails,
      total_cost: 0,
    };

    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };

    getAuthToken().then((token) => {
      axios
        .patch(`${SERVER_URL}/api/fieldbook/${fieldBookId}/advisory`, payload, {
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
        })
        .then((resp) => {
          Alert.alert(
            "Success",
            editingIndex !== null ? "Advisory updated!" : "Advisory added!",
          );
          if (resp.data?.data?.advisory) {
            setAdvisoryList(
              resp.data.data.advisory.map((item, index) => ({
                id: index,
                advisory_date: item.advisory_date || "",
                advisory_type: item.advisory_type || "",
                advisory_details: item.advisory_details || "",
                total_cost: item.total_cost || 0,
              })),
            );
          }
          setAdvisory({
            advisoryDate: "",
            advisoryType: "",
            advisoryDetails: "",
          });
          setSelectedDate(null);
          setEditingIndex(null);
        })
        .catch(() => Alert.alert("Error", "Failed to save advisory."))
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setAdvisory({ advisoryDate: "", advisoryType: "", advisoryDetails: "" });
    setSelectedDate(null);
    setEditingIndex(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={advStyles.wrapper}>
        {/* Accordion Header */}
        <TouchableOpacity
          style={advStyles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={advStyles.headerLeft}>
            <View style={advStyles.iconWrap}>
              <Text style={advStyles.iconEmoji}>📋</Text>
            </View>
            <Text style={advStyles.accordionTitle}>Advisory</Text>
            {advisoryList.length > 0 && (
              <View style={advStyles.badge}>
                <Text style={advStyles.badgeText}>{advisoryList.length}</Text>
              </View>
            )}
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#4E4E4E"
          />
        </TouchableOpacity>

        {expanded && (
          <ScrollView
            ref={scrollRef}
            style={advStyles.expandedContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* ── Table with horizontal scroll ── */}
            {advisoryList.length > 0 && (
              <View style={advStyles.tableWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  <View>
                    {/* Header */}
                    <View style={advStyles.tableHeaderRow}>
                      <Text
                        style={[advStyles.tableHeaderCell, advStyles.colNo]}
                      >
                        #
                      </Text>
                      <Text
                        style={[advStyles.tableHeaderCell, advStyles.colDate]}
                      >
                        Date
                      </Text>
                      <Text
                        style={[advStyles.tableHeaderCell, advStyles.colType]}
                      >
                        Type
                      </Text>
                      <Text
                        style={[
                          advStyles.tableHeaderCell,
                          advStyles.colDetails,
                        ]}
                      >
                        Details
                      </Text>
                      <Text
                        style={[
                          advStyles.tableHeaderCell,
                          advStyles.tableActions,
                        ]}
                      >
                        Actions
                      </Text>
                    </View>
                    {/* Rows */}
                    {advisoryList.map((item, index) => (
                      <AdvisoryRow
                        key={item.id}
                        item={item}
                        index={index}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Form */}
            <View style={advStyles.formSection}>
              {editingIndex !== null && (
                <View style={advStyles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={advStyles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}

              {/* Row 1: Date + Type */}
              <View style={advStyles.formRow}>
                <View style={advStyles.formCol}>
                  <Text style={advStyles.inputLabel}>Advisory Date</Text>
                  <TouchableOpacity
                    style={advStyles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        advStyles.dateInputText,
                        { color: selectedDate ? "#383838" : "#A9A9A9" },
                      ]}
                    >
                      {selectedDate
                        ? formatDisplayDate(selectedDate)
                        : "Select Date"}
                    </Text>
                    <Feather name="calendar" size={14} color="#A9A9A9" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </View>
                <View style={advStyles.formCol}>
                  <LabeledInput
                    label="Advisory Type"
                    value={advisory.advisoryType}
                    onChangeText={(v) =>
                      setAdvisory((p) => ({ ...p, advisoryType: v }))
                    }
                  />
                </View>
              </View>

              {/* Advisory Details (full width multiline) */}
              <View style={advStyles.formFullRow}>
                <LabeledInput
                  label="Advisory Details"
                  value={advisory.advisoryDetails}
                  onChangeText={(v) =>
                    setAdvisory((p) => ({ ...p, advisoryDetails: v }))
                  }
                  multiline={true}
                />
              </View>

              {/* Buttons */}
              <View style={advStyles.btnRow}>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={advStyles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={advStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    advStyles.saveBtn,
                    editingIndex !== null && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={advStyles.saveBtnText}>
                    {isSaving
                      ? "Saving…"
                      : editingIndex !== null
                        ? "Update"
                        : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default AdvisoryMobile;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const advStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E5FAE9",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 16 },
  accordionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4E4E4E",
    marginLeft: 4,
  },
  badge: {
    backgroundColor: "#39B54B",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  badgeText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  expandedContent: { maxHeight: 500 },
  // ── Column widths ──
  colNo: { width: 28 },
  colDate: { width: 100 },
  colType: { width: 90 },
  colDetails: { width: 120 },
  tableWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#E5FAE9",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: "700", color: "#4E4E4E" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  tableRowEven: { backgroundColor: "#FAFAFA" },
  tableCell: { fontSize: 12, color: "#383838" },
  tableActions: {
    width: 80,
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-end",
  },
  editBtn: { backgroundColor: "#3B82F6", borderRadius: 5, padding: 5 },
  deleteBtn: { backgroundColor: "#EF4444", borderRadius: 5, padding: 5 },
  formSection: { backgroundColor: "#F5F5F5", padding: 14 },
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  editingBannerText: { fontSize: 12, color: "#15803D", fontWeight: "600" },
  formRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  formFullRow: { marginBottom: 10 },
  formCol: { flex: 1 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4E4E4E",
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
    color: "#383838",
  },
  textInputMultiline: { minHeight: 70, textAlignVertical: "top" },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D8D8D8",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dateInputText: { fontSize: 12, fontWeight: "500", flex: 1 },
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: "#39B54B",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cancelBtn: {
    backgroundColor: "#6B7280",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  cancelBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});

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
  onFocus,
}) => (
  <View>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.textInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor="#A9A9A9"
      keyboardType={keyboardType}
      onFocus={onFocus}
    />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// TABLE ROW
// ─────────────────────────────────────────────────────────────────────────────
const SowingRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
    <Text style={[styles.tableCell, { width: 30 }]}>{index + 1}</Text>
    <Text style={[styles.tableCell, { width: 90 }]} numberOfLines={1}>
      {item.sowing_date ? item.sowing_date.split("-").reverse().join("-") : "-"}
    </Text>
    <Text style={[styles.tableCell, { width: 90 }]} numberOfLines={1}>
      {item.sowing_method || "-"}
    </Text>
    <Text style={[styles.tableCell, { width: 70 }]} numberOfLines={1}>
      {item.diesel_cost || "-"}
    </Text>
    <Text style={[styles.tableCell, { width: 70 }]} numberOfLines={1}>
      {item.labour_cost || "-"}
    </Text>
    <Text style={[styles.tableCell, { width: 70 }]} numberOfLines={1}>
      {item.cost_of_seed || "-"}
    </Text>
    <Text style={[styles.tableCell, { width: 70 }]} numberOfLines={1}>
      {item.total_cost || "-"}
    </Text>
    <View style={styles.tableActions}>
      <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={12} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
        <Feather name="trash-2" size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SowingMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const formSectionRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [sowingList, setSowingList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [sowingData, setSowingData] = useState({
    sowingDate: "",
    sowingMethod: "",
    dieselCost: "",
    laborCost: "",
    costOfSeed: "",
    totalCost: "",
  });

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getId) return;
    setIsLoading(true);
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
          if (data.sowing_detail && Array.isArray(data.sowing_detail)) {
            setSowingList(
              data.sowing_detail.map((item, index) => ({
                id: index,
                sowing_date: item.sowing_date || "",
                sowing_method: item.sowing_method || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                cost_of_seed: item.cost_of_seed || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
        })
        .catch((err) => console.error("SowingMobile fetch error:", err))
        .finally(() => setIsLoading(false));
    });
  }, [getId]);

  const scrollToForm = () => {
    setTimeout(() => {
      formSectionRef.current?.measureLayout(
        scrollRef.current,
        (x, y) => scrollRef.current?.scrollTo({ y, animated: true }),
        () => scrollRef.current?.scrollToEnd({ animated: true }),
      );
    }, 150);
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setSowingData((p) => ({ ...p, sowingDate: `${yyyy}-${mm}-${dd}` }));
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  const handleEdit = (row) => {
    setEditingIndex(row.id);
    if (row.sowing_date) {
      const parts = row.sowing_date.split("-");
      if (parts.length === 3)
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
    setSowingData({
      sowingDate: row.sowing_date || "",
      sowingMethod: row.sowing_method || "",
      dieselCost: row.diesel_cost || "",
      laborCost: row.labour_cost || "",
      costOfSeed: row.cost_of_seed || "",
      totalCost: row.total_cost || "",
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDelete = (row) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this sowing record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .patch(
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/sowing_detail`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.sowing_detail) {
                    setSowingList(
                      resp.data.data.sowing_detail.map((item, index) => ({
                        id: index,
                        sowing_date: item.sowing_date || "",
                        sowing_method: item.sowing_method || "",
                        diesel_cost: item.diesel_cost || "",
                        labour_cost: item.labour_cost || "",
                        cost_of_seed: item.cost_of_seed || "",
                        total_cost: item.total_cost || "",
                      })),
                    );
                  }
                  Alert.alert("Deleted", "Sowing record deleted.");
                })
                .catch(() => Alert.alert("Error", "Failed to delete record."));
            });
          },
        },
      ],
    );
  };

  const handleSave = () => {
    if (!sowingData.sowingDate) {
      Alert.alert("Validation", "Please select a sowing date.");
      return;
    }
    setIsSaving(true);
    const item = {
      sowing_date: sowingData.sowingDate,
      sowing_method: sowingData.sowingMethod,
      diesel_cost: sowingData.dieselCost,
      labour_cost: sowingData.laborCost,
      cost_of_seed: sowingData.costOfSeed,
      total_cost: sowingData.totalCost,
    };
    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };

    getAuthToken().then((token) => {
      axios
        .patch(
          `${SERVER_URL}/api/fieldbook/${fieldBookId}/sowing_detail`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              "x-auth-token": token,
            },
          },
        )
        .then((resp) => {
          Alert.alert(
            "Success",
            editingIndex !== null ? "Record updated!" : "Record added!",
          );
          if (resp.data?.data?.sowing_detail) {
            setSowingList(
              resp.data.data.sowing_detail.map((item, index) => ({
                id: index,
                sowing_date: item.sowing_date || "",
                sowing_method: item.sowing_method || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                cost_of_seed: item.cost_of_seed || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
          setSowingData({
            sowingDate: "",
            sowingMethod: "",
            dieselCost: "",
            laborCost: "",
            costOfSeed: "",
            totalCost: "",
          });
          setSelectedDate(null);
          setEditingIndex(null);
        })
        .catch(() => Alert.alert("Error", "Failed to save sowing record."))
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setSowingData({
      sowingDate: "",
      sowingMethod: "",
      dieselCost: "",
      laborCost: "",
      costOfSeed: "",
      totalCost: "",
    });
    setSelectedDate(null);
    setEditingIndex(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
    >
      <View style={styles.wrapper}>
        {/* Accordion Header */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🌱</Text>
            </View>
            <Text style={styles.accordionTitle}>Sowing</Text>
            {sowingList.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{sowingList.length}</Text>
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
            style={styles.expandedContent}
            contentContainerStyle={styles.expandedContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Table with horizontal scroll */}
            {sowingList.length > 0 && (
              <View style={styles.tableWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  <View>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { width: 30 }]}>
                        #
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: 90 }]}>
                        Date
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: 90 }]}>
                        Method
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: 70 }]}>
                        Diesel
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: 70 }]}>
                        Labour
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: 70 }]}>
                        Seed Cost
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: 70 }]}>
                        Total
                      </Text>
                      <Text style={[styles.tableHeaderCell, { width: 80 }]}>
                        Actions
                      </Text>
                    </View>
                    {sowingList.map((item, index) => (
                      <SowingRow
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
            <View ref={formSectionRef} style={styles.formSection}>
              {editingIndex !== null && (
                <View style={styles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={styles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}

              {/* Row 1 — Date + Method */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Sowing Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      setShowDatePicker(true);
                      scrollToForm();
                    }}
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
                <View style={styles.formCol}>
                  <LabeledInput
                    label="Sowing Method"
                    value={sowingData.sowingMethod}
                    onChangeText={(v) =>
                      setSowingData((p) => ({ ...p, sowingMethod: v }))
                    }
                    onFocus={scrollToForm}
                  />
                </View>
              </View>

              {/* Row 2 — Diesel + Labor */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <LabeledInput
                    label="Diesel/Petrol Cost"
                    value={sowingData.dieselCost}
                    onChangeText={(v) =>
                      setSowingData((p) => ({ ...p, dieselCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
                <View style={styles.formCol}>
                  <LabeledInput
                    label="Labor Cost"
                    value={sowingData.laborCost}
                    onChangeText={(v) =>
                      setSowingData((p) => ({ ...p, laborCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
              </View>

              {/* Row 3 — Seed + Total */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <LabeledInput
                    label="Cost of Seed"
                    value={sowingData.costOfSeed}
                    onChangeText={(v) =>
                      setSowingData((p) => ({ ...p, costOfSeed: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
                <View style={styles.formCol}>
                  <LabeledInput
                    label="Total Cost"
                    value={sowingData.totalCost}
                    onChangeText={(v) =>
                      setSowingData((p) => ({ ...p, totalCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.btnRow}>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    editingIndex !== null && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>
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

export default SowingMobile;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
  expandedContent: { flexGrow: 1 },
  expandedContentContainer: { paddingBottom: 20 },
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

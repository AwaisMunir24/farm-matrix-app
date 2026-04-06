import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import { SERVER_URL } from "../utils/index";

// ─────────────────────────────────────────────────────────────────────────────
// LABELED INPUT  (with onFocus callback for scroll)
// ─────────────────────────────────────────────────────────────────────────────
const LabeledInput = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  onFocus,
}) => (
  <View>
    <Text style={lpStyles.inputLabel}>{label}</Text>
    <TextInput
      style={lpStyles.textInput}
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
const LandPrepRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[lpStyles.tableRow, index % 2 === 0 && lpStyles.tableRowEven]}>
    <Text style={[lpStyles.tableCell, { width: 30 }]}>{index + 1}</Text>
    <Text style={[lpStyles.tableCell, { flex: 1 }]}>
      {item.application_date
        ? item.application_date.split("-").reverse().join("-")
        : "-"}
    </Text>
    <Text style={[lpStyles.tableCell, { width: 70 }]}>
      {item.equipment_used || "-"}
    </Text>
    <View style={lpStyles.tableActions}>
      <TouchableOpacity style={lpStyles.editBtn} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={12} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={lpStyles.deleteBtn}
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
const LandPreparationMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const formSectionRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [landPrepList, setLandPrepList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Date picker state
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [landPrepData, setLandPrepData] = useState({
    applicationDate: "",
    equipmentUsed: "",
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

          if (
            data.preparation_of_land &&
            Array.isArray(data.preparation_of_land)
          ) {
            const formatted = data.preparation_of_land.map((item, index) => ({
              id: index,
              application_date: item.application_date || "",
              equipment_used: item.equipment_used || "",
              diesel_petrol_cost: item.diesel_petrol_cost || "",
              labour_cost: item.labour_cost || "",
              cost_of_seed: item.cost_of_seed || "",
              total_cost: item.total_cost || "",
            }));
            setLandPrepList(formatted);
          }
        })
        .catch((err) => {
          console.error("LandPreparationMobile fetch error:", err);
        })
        .finally(() => setIsLoading(false));
    });
  }, [getId]);

  // ── Scroll to form when input focused ─────────────────────────────────────
  const scrollToForm = () => {
    setTimeout(() => {
      formSectionRef.current?.measureLayout(
        scrollRef.current,
        (x, y) => {
          scrollRef.current?.scrollTo({ y: y, animated: true });
        },
        () => {
          // fallback: just scroll to end
          scrollRef.current?.scrollToEnd({ animated: true });
        },
      );
    }, 150);
  };

  // ── Date Picker ────────────────────────────────────────────────────────────
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      setLandPrepData((p) => ({
        ...p,
        applicationDate: `${yyyy}-${mm}-${dd}`,
      }));
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditingIndex(row.id);
    if (row.application_date) {
      const parts = row.application_date.split("-");
      if (parts.length === 3) {
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
      }
    }
    setLandPrepData({
      applicationDate: row.application_date || "",
      equipmentUsed: row.equipment_used || "",
      dieselCost: row.diesel_petrol_cost || "",
      laborCost: row.labour_cost || "",
      costOfSeed: row.cost_of_seed || "",
      totalCost: row.total_cost || "",
    });
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (row) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this land preparation record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .patch(
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/preparation_of_land`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.preparation_of_land) {
                    const formatted = resp.data.data.preparation_of_land.map(
                      (item, index) => ({
                        id: index,
                        application_date: item.application_date || "",
                        equipment_used: item.equipment_used || "",
                        diesel_petrol_cost: item.diesel_petrol_cost || "",
                        labour_cost: item.labour_cost || "",
                        cost_of_seed: item.cost_of_seed || "",
                        total_cost: item.total_cost || "",
                      }),
                    );
                    setLandPrepList(formatted);
                  }
                  Alert.alert("Deleted", "Land preparation record deleted.");
                })
                .catch(() => {
                  Alert.alert("Error", "Failed to delete record.");
                });
            });
          },
        },
      ],
    );
  };

  // ── Save / Update ──────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!landPrepData.applicationDate) {
      Alert.alert("Validation", "Please select an application date.");
      return;
    }

    setIsSaving(true);

    const item = {
      application_date: landPrepData.applicationDate,
      equipment_used: landPrepData.equipmentUsed,
      diesel_petrol_cost: landPrepData.dieselCost,
      labour_cost: landPrepData.laborCost,
      cost_of_seed: landPrepData.costOfSeed,
      total_cost: landPrepData.totalCost,
    };

    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };

    getAuthToken().then((token) => {
      axios
        .patch(
          `${SERVER_URL}/api/fieldbook/${fieldBookId}/preparation_of_land`,
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

          if (resp.data?.data?.preparation_of_land) {
            const formatted = resp.data.data.preparation_of_land.map(
              (item, index) => ({
                id: index,
                application_date: item.application_date || "",
                equipment_used: item.equipment_used || "",
                diesel_petrol_cost: item.diesel_petrol_cost || "",
                labour_cost: item.labour_cost || "",
                cost_of_seed: item.cost_of_seed || "",
                total_cost: item.total_cost || "",
              }),
            );
            setLandPrepList(formatted);
          }

          setLandPrepData({
            applicationDate: "",
            equipmentUsed: "",
            dieselCost: "",
            laborCost: "",
            costOfSeed: "",
            totalCost: "",
          });
          setSelectedDate(null);
          setEditingIndex(null);
        })
        .catch(() => {
          Alert.alert("Error", "Failed to save land preparation record.");
        })
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setLandPrepData({
      applicationDate: "",
      equipmentUsed: "",
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
    // ✅ KeyboardAvoidingView wraps everything so keyboard pushes content up
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
    >
      <View style={lpStyles.wrapper}>
        {/* ── Accordion Header ── */}
        <TouchableOpacity
          style={lpStyles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={lpStyles.headerLeft}>
            <View style={lpStyles.iconWrap}>
              <Text style={lpStyles.iconEmoji}>🚜</Text>
            </View>
            <Text style={lpStyles.accordionTitle}>Land Preparation</Text>
            {landPrepList.length > 0 && (
              <View style={lpStyles.badge}>
                <Text style={lpStyles.badgeText}>{landPrepList.length}</Text>
              </View>
            )}
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#4E4E4E"
          />
        </TouchableOpacity>

        {/* ── Expanded Content ── */}
        {expanded && (
          <ScrollView
            ref={scrollRef}
            // ✅ No maxHeight cap — grows freely so full list is visible
            style={lpStyles.expandedContent}
            contentContainerStyle={lpStyles.expandedContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* ── Records Table — fully visible, no truncation ── */}
            {landPrepList.length > 0 && (
              <View style={lpStyles.tableWrapper}>
                <View style={lpStyles.tableHeaderRow}>
                  <Text style={[lpStyles.tableHeaderCell, { width: 30 }]}>
                    #
                  </Text>
                  <Text style={[lpStyles.tableHeaderCell, { flex: 1 }]}>
                    Date
                  </Text>
                  <Text style={[lpStyles.tableHeaderCell, { width: 70 }]}>
                    Equipment
                  </Text>
                  <Text style={[lpStyles.tableHeaderCell, { width: 80 }]}>
                    Actions
                  </Text>
                </View>
                {landPrepList.map((item, index) => (
                  <LandPrepRow
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}

            {/* ── Form ── */}
            {/* ✅ ref attached so we can scroll to it on input focus */}
            <View ref={formSectionRef} style={lpStyles.formSection}>
              {editingIndex !== null && (
                <View style={lpStyles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={lpStyles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}

              {/* Application Date */}
              <View style={lpStyles.formRow}>
                <View style={lpStyles.formCol}>
                  <Text style={lpStyles.inputLabel}>Application Date</Text>
                  <TouchableOpacity
                    style={lpStyles.dateInput}
                    onPress={() => {
                      setShowDatePicker(true);
                      scrollToForm();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        lpStyles.dateInputText,
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
                <View style={lpStyles.formCol}>
                  <LabeledInput
                    label="Equipment Used"
                    value={landPrepData.equipmentUsed}
                    onChangeText={(v) =>
                      setLandPrepData((p) => ({ ...p, equipmentUsed: v }))
                    }
                    onFocus={scrollToForm}
                  />
                </View>
              </View>

              {/* Row 2 */}
              <View style={lpStyles.formRow}>
                <View style={lpStyles.formCol}>
                  <LabeledInput
                    label="Diesel/Petrol Cost"
                    value={landPrepData.dieselCost}
                    onChangeText={(v) =>
                      setLandPrepData((p) => ({ ...p, dieselCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
                <View style={lpStyles.formCol}>
                  <LabeledInput
                    label="Labor Cost"
                    value={landPrepData.laborCost}
                    onChangeText={(v) =>
                      setLandPrepData((p) => ({ ...p, laborCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
              </View>

              {/* Row 3 */}
              <View style={lpStyles.formRow}>
                <View style={lpStyles.formCol}>
                  <LabeledInput
                    label="Cost of Seed"
                    value={landPrepData.costOfSeed}
                    onChangeText={(v) =>
                      setLandPrepData((p) => ({ ...p, costOfSeed: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
                <View style={lpStyles.formCol}>
                  <LabeledInput
                    label="Total Cost"
                    value={landPrepData.totalCost}
                    onChangeText={(v) =>
                      setLandPrepData((p) => ({ ...p, totalCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={lpStyles.btnRow}>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={lpStyles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={lpStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    lpStyles.saveBtn,
                    editingIndex !== null && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={lpStyles.saveBtnText}>
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

export default LandPreparationMobile;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const lpStyles = StyleSheet.create({
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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

  // ✅ Removed maxHeight — list is now fully visible
  expandedContent: {
    flexGrow: 1,
  },
  expandedContentContainer: {
    paddingBottom: 20,
  },

  // Table
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

  // Form
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

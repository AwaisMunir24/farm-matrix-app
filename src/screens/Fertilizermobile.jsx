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
// SIMPLE DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
const SimpleDropdown = ({
  placeholder,
  options = [],
  selectedValue,
  onSelect,
}) => {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find(
    (o) => String(o.value) === String(selectedValue),
  )?.label;

  return (
    <>
      <TouchableOpacity
        style={fStyles.dropdown}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            fStyles.dropdownText,
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
          style={fStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={fStyles.modalBox}>
            <View style={fStyles.modalHeader}>
              <Text style={fStyles.modalTitle}>{placeholder}</Text>
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
                      fStyles.modalItem,
                      isSelected && fStyles.modalItemActive,
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        fStyles.modalItemText,
                        isSelected && fStyles.modalItemTextActive,
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
                <Text style={fStyles.modalEmpty}>No options</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LABELED INPUT
// ─────────────────────────────────────────────────────────────────────────────
const LabeledInput = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
}) => (
  <View>
    <Text style={fStyles.inputLabel}>{label}</Text>
    <TextInput
      style={fStyles.textInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={label}
      placeholderTextColor="#A9A9A9"
      keyboardType={keyboardType}
    />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// TABLE ROW
// ─────────────────────────────────────────────────────────────────────────────
const FertilizerRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[fStyles.tableRow, index % 2 === 0 && fStyles.tableRowEven]}>
    <Text style={[fStyles.tableCell, fStyles.colNo]}>{index + 1}</Text>
    <Text style={[fStyles.tableCell, fStyles.colDate]} numberOfLines={1}>
      {item.application_date
        ? item.application_date.split("-").reverse().join("-")
        : "-"}
    </Text>
    <Text style={[fStyles.tableCell, fStyles.colType]} numberOfLines={1}>
      {item.application_type || "-"}
    </Text>
    <Text style={[fStyles.tableCell, fStyles.colQty]} numberOfLines={1}>
      {item.quantity_type || "-"}
    </Text>
    <Text style={[fStyles.tableCell, fStyles.colCost]} numberOfLines={1}>
      {item.total_cost || "-"}
    </Text>
    <View style={fStyles.tableActions}>
      <TouchableOpacity style={fStyles.editBtn} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={12} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={fStyles.deleteBtn}
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
const FertilizerMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [fertilizerList, setFertilizerList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedType, setSelectedType] = useState("bag");

  const [fertilizer, setFertilizer] = useState({
    applicationDate: "",
    applicationType: "",
    fertilizerPrice: "",
    fertilizerBag: "",
    fertilizerTrolly: "",
    dieselCost: "",
    labourCost: "",
    totalCost: "",
  });

  const applicationTypeOptions = [
    { label: "Mechanical", value: "mechanical" },
    { label: "Manual", value: "manual" },
  ];
  const quantityTypeOptions = [
    { label: "Bag", value: "bag" },
    { label: "Trolley", value: "trolley" },
  ];

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
          if (data.fertilizer && Array.isArray(data.fertilizer)) {
            setFertilizerList(
              data.fertilizer.map((item, index) => ({
                id: index,
                application_date: item.application_date || "",
                application_type: item.application_type || "",
                quantity_type: item.quantity_type || "",
                fertilizer_price: item.fertilizer_price || "",
                bag: item.bag || "",
                trolly: item.trolly || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
        })
        .catch((err) => console.error("FertilizerMobile fetch error:", err));
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
      setFertilizer((p) => ({ ...p, applicationDate: `${yyyy}-${mm}-${dd}` }));
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditingIndex(row.id);
    setSelectedType(row.quantity_type || "bag");
    if (row.application_date) {
      const parts = row.application_date.split("-");
      if (parts.length === 3)
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
    setFertilizer({
      applicationDate: row.application_date || "",
      applicationType: row.application_type || "",
      fertilizerPrice: String(row.fertilizer_price || ""),
      fertilizerBag: row.bag || "",
      fertilizerTrolly: row.trolly || "",
      dieselCost: String(row.diesel_cost || ""),
      labourCost: String(row.labour_cost || ""),
      totalCost: String(row.total_cost || ""),
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (row) => {
    Alert.alert(
      "Delete Fertilizer",
      "Are you sure you want to delete this record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .patch(
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/fertilizer`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.fertilizer) {
                    setFertilizerList(
                      resp.data.data.fertilizer.map((item, index) => ({
                        id: index,
                        application_date: item.application_date || "",
                        application_type: item.application_type || "",
                        quantity_type: item.quantity_type || "",
                        fertilizer_price: item.fertilizer_price || "",
                        bag: item.bag || "",
                        trolly: item.trolly || "",
                        diesel_cost: item.diesel_cost || "",
                        labour_cost: item.labour_cost || "",
                        total_cost: item.total_cost || "",
                      })),
                    );
                  }
                  Alert.alert("Deleted", "Fertilizer record deleted.");
                })
                .catch(() => Alert.alert("Error", "Failed to delete record."));
            });
          },
        },
      ],
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!fertilizer.applicationDate) {
      Alert.alert("Validation", "Please select an application date.");
      return;
    }
    setIsSaving(true);

    const fertilizerPrice = parseFloat(fertilizer.fertilizerPrice) || 0;
    const dieselCost = parseFloat(fertilizer.dieselCost) || 0;
    const labourCost = parseFloat(fertilizer.labourCost) || 0;

    const item = {
      application_date: fertilizer.applicationDate,
      application_type: fertilizer.applicationType,
      quantity_type: selectedType,
      fertilizer_price: fertilizerPrice,
      bag: selectedType === "bag" ? fertilizer.fertilizerBag : "",
      trolly: selectedType === "trolley" ? fertilizer.fertilizerTrolly : "",
      diesel_cost: dieselCost,
      labour_cost: labourCost,
      total_cost: fertilizerPrice + dieselCost + labourCost,
    };

    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };

    getAuthToken().then((token) => {
      axios
        .patch(
          `${SERVER_URL}/api/fieldbook/${fieldBookId}/fertilizer`,
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
          if (resp.data?.data?.fertilizer) {
            setFertilizerList(
              resp.data.data.fertilizer.map((item, index) => ({
                id: index,
                application_date: item.application_date || "",
                application_type: item.application_type || "",
                quantity_type: item.quantity_type || "",
                fertilizer_price: item.fertilizer_price || "",
                bag: item.bag || "",
                trolly: item.trolly || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
          setFertilizer({
            applicationDate: "",
            applicationType: "",
            fertilizerPrice: "",
            fertilizerBag: "",
            fertilizerTrolly: "",
            dieselCost: "",
            labourCost: "",
            totalCost: "",
          });
          setSelectedDate(null);
          setSelectedType("bag");
          setEditingIndex(null);
        })
        .catch(() => Alert.alert("Error", "Failed to save fertilizer record."))
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setFertilizer({
      applicationDate: "",
      applicationType: "",
      fertilizerPrice: "",
      fertilizerBag: "",
      fertilizerTrolly: "",
      dieselCost: "",
      labourCost: "",
      totalCost: "",
    });
    setSelectedDate(null);
    setSelectedType("bag");
    setEditingIndex(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={fStyles.wrapper}>
        {/* Accordion Header */}
        <TouchableOpacity
          style={fStyles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={fStyles.headerLeft}>
            <View style={fStyles.iconWrap}>
              <Text style={fStyles.iconEmoji}>🌱</Text>
            </View>
            <Text style={fStyles.accordionTitle}>Fertilizer</Text>
            {fertilizerList.length > 0 && (
              <View style={fStyles.badge}>
                <Text style={fStyles.badgeText}>{fertilizerList.length}</Text>
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
            style={fStyles.expandedContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* ── Table with horizontal scroll ── */}
            {fertilizerList.length > 0 && (
              <View style={fStyles.tableWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  <View>
                    {/* Header */}
                    <View style={fStyles.tableHeaderRow}>
                      <Text style={[fStyles.tableHeaderCell, fStyles.colNo]}>
                        #
                      </Text>
                      <Text style={[fStyles.tableHeaderCell, fStyles.colDate]}>
                        Date
                      </Text>
                      <Text style={[fStyles.tableHeaderCell, fStyles.colType]}>
                        App. Type
                      </Text>
                      <Text style={[fStyles.tableHeaderCell, fStyles.colQty]}>
                        Qty Type
                      </Text>
                      <Text style={[fStyles.tableHeaderCell, fStyles.colCost]}>
                        Total
                      </Text>
                      <Text
                        style={[fStyles.tableHeaderCell, fStyles.tableActions]}
                      >
                        Actions
                      </Text>
                    </View>
                    {/* Rows */}
                    {fertilizerList.map((item, index) => (
                      <FertilizerRow
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
            <View style={fStyles.formSection}>
              {editingIndex !== null && (
                <View style={fStyles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={fStyles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}

              {/* Row 1: Date + Application Type */}
              <View style={fStyles.formRow}>
                <View style={fStyles.formCol}>
                  <Text style={fStyles.inputLabel}>Application Date</Text>
                  <TouchableOpacity
                    style={fStyles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        fStyles.dateInputText,
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
                <View style={fStyles.formCol}>
                  <Text style={fStyles.inputLabel}>Application Type</Text>
                  <SimpleDropdown
                    placeholder="Select Type"
                    options={applicationTypeOptions}
                    selectedValue={fertilizer.applicationType}
                    onSelect={(v) =>
                      setFertilizer((p) => ({ ...p, applicationType: v }))
                    }
                  />
                </View>
              </View>

              {/* Row 2: Quantity Type + Qty Value */}
              <View style={fStyles.formRow}>
                <View style={fStyles.formCol}>
                  <Text style={fStyles.inputLabel}>Quantity Type</Text>
                  <SimpleDropdown
                    placeholder="Quantity Type"
                    options={quantityTypeOptions}
                    selectedValue={selectedType}
                    onSelect={(v) => setSelectedType(v)}
                  />
                </View>
                <View style={fStyles.formCol}>
                  <LabeledInput
                    label={
                      selectedType === "bag" ? "No. of Bags" : "No. of Trolleys"
                    }
                    value={
                      selectedType === "bag"
                        ? fertilizer.fertilizerBag
                        : fertilizer.fertilizerTrolly
                    }
                    onChangeText={(v) =>
                      setFertilizer((p) => ({
                        ...p,
                        [selectedType === "bag"
                          ? "fertilizerBag"
                          : "fertilizerTrolly"]: v,
                      }))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Row 3: Fertilizer Price + Diesel Cost */}
              <View style={fStyles.formRow}>
                <View style={fStyles.formCol}>
                  <LabeledInput
                    label="Fertilizer Price"
                    value={fertilizer.fertilizerPrice}
                    onChangeText={(v) =>
                      setFertilizer((p) => ({ ...p, fertilizerPrice: v }))
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={fStyles.formCol}>
                  <LabeledInput
                    label="Diesel Cost"
                    value={fertilizer.dieselCost}
                    onChangeText={(v) =>
                      setFertilizer((p) => ({ ...p, dieselCost: v }))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Row 4: Labour Cost */}
              <View style={fStyles.formRow}>
                <View style={fStyles.formCol}>
                  <LabeledInput
                    label="Labour Cost"
                    value={fertilizer.labourCost}
                    onChangeText={(v) =>
                      setFertilizer((p) => ({ ...p, labourCost: v }))
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={fStyles.formCol} />
              </View>

              {/* Buttons */}
              <View style={fStyles.btnRow}>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={fStyles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={fStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    fStyles.saveBtn,
                    editingIndex !== null && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={fStyles.saveBtnText}>
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

export default FertilizerMobile;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const fStyles = StyleSheet.create({
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
  expandedContent: { maxHeight: 540 },
  // ── Column widths ──
  colNo: { width: 28 },
  colDate: { width: 100 },
  colType: { width: 90 },
  colQty: { width: 80 },
  colCost: { width: 70 },
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
  dropdown: {
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
  dropdownText: { fontSize: 12, fontWeight: "500", flex: 1, marginRight: 4 },
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

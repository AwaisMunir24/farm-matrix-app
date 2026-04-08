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
        style={pdStyles.dropdown}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            pdStyles.dropdownText,
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
          style={pdStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={pdStyles.modalBox}>
            <View style={pdStyles.modalHeader}>
              <Text style={pdStyles.modalTitle}>{placeholder}</Text>
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
                      pdStyles.modalItem,
                      isSelected && pdStyles.modalItemActive,
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        pdStyles.modalItemText,
                        isSelected && pdStyles.modalItemTextActive,
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
                <Text style={pdStyles.modalEmpty}>No options</Text>
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
    <Text style={pdStyles.inputLabel}>{label}</Text>
    <TextInput
      style={pdStyles.textInput}
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
const PestRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[pdStyles.tableRow, index % 2 === 0 && pdStyles.tableRowEven]}>
    <Text style={[pdStyles.tableCell, { width: 28 }]}>{index + 1}</Text>
    <Text style={[pdStyles.tableCell, { width: 90 }]} numberOfLines={1}>
      {item.application_date
        ? item.application_date.split("-").reverse().join("-")
        : "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 80 }]} numberOfLines={1}>
      {item.application_type || "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 90 }]} numberOfLines={1}>
      {item.pesticide_type || "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 60 }]} numberOfLines={1}>
      {item.quantity_type || "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 60 }]} numberOfLines={1}>
      {item.kg || "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 70 }]} numberOfLines={1}>
      {item.pesticide_price || "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 65 }]} numberOfLines={1}>
      {item.diesel_cost || "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 65 }]} numberOfLines={1}>
      {item.labour_cost || "-"}
    </Text>
    <Text style={[pdStyles.tableCell, { width: 65 }]} numberOfLines={1}>
      {item.total_cost || "-"}
    </Text>
    <View style={pdStyles.tableActions}>
      <TouchableOpacity style={pdStyles.editBtn} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={12} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={pdStyles.deleteBtn}
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
const PestDiseaseMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [pestList, setPestList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [qtyType, setQtyType] = useState("kg");

  const [pestManagement, setPestManagement] = useState({
    applicationDate: "",
    applicationType: "",
    pesticideType: "",
    dieselCost: "",
    labourCost: "",
    pesticidePrice: "",
    kg: "",
    liter: "",
  });

  const applicationTypeOptions = [
    { label: "Mechanical", value: "mechanical" },
    { label: "Manual", value: "manual" },
  ];
  const qtyTypeOptions = [
    { label: "Kg", value: "kg" },
    { label: "Liter", value: "liter" },
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
          if (data.disease_and_pest && Array.isArray(data.disease_and_pest)) {
            setPestList(
              data.disease_and_pest.map((item, index) => ({
                id: index,
                application_date: item.application_date || "",
                application_type: item.application_type || "",
                pesticide_type: item.pesticide_type || "",
                quantity_type: item.quantity_type || "",
                kg: item.kg || "",
                pesticide_price: item.pesticide_price || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
        })
        .catch((err) => console.error("PestDiseaseMobile fetch error:", err));
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
      setPestManagement((p) => ({
        ...p,
        applicationDate: `${yyyy}-${mm}-${dd}`,
      }));
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditingIndex(row.id);
    const qt = row.quantity_type || "kg";
    setQtyType(qt);
    if (row.application_date) {
      const parts = row.application_date.split("-");
      if (parts.length === 3)
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
    setPestManagement({
      applicationDate: row.application_date || "",
      applicationType: row.application_type || "",
      pesticideType: row.pesticide_type || "",
      dieselCost: String(row.diesel_cost || ""),
      labourCost: String(row.labour_cost || ""),
      pesticidePrice: String(row.pesticide_price || ""),
      kg: qt === "kg" ? row.kg || "" : "",
      liter: qt === "liter" ? row.kg || "" : "",
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (row) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this pest/disease record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .patch(
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/disease_and_pest`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.disease_and_pest) {
                    setPestList(
                      resp.data.data.disease_and_pest.map((item, index) => ({
                        id: index,
                        application_date: item.application_date || "",
                        application_type: item.application_type || "",
                        pesticide_type: item.pesticide_type || "",
                        quantity_type: item.quantity_type || "",
                        kg: item.kg || "",
                        pesticide_price: item.pesticide_price || "",
                        diesel_cost: item.diesel_cost || "",
                        labour_cost: item.labour_cost || "",
                        total_cost: item.total_cost || "",
                      })),
                    );
                  }
                  Alert.alert("Deleted", "Pest/disease record deleted.");
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
    if (!pestManagement.applicationDate) {
      Alert.alert("Validation", "Please select an application date.");
      return;
    }
    setIsSaving(true);

    const pesticidePrice = parseFloat(pestManagement.pesticidePrice) || 0;
    const dieselCost = parseFloat(pestManagement.dieselCost) || 0;
    const labourCost = parseFloat(pestManagement.labourCost) || 0;

    const item = {
      application_date: pestManagement.applicationDate,
      application_type: pestManagement.applicationType,
      pesticide_type: pestManagement.pesticideType,
      quantity_type: qtyType,
      kg: qtyType === "kg" ? pestManagement.kg : pestManagement.liter,
      pesticide_price: pesticidePrice,
      diesel_cost: dieselCost,
      labour_cost: labourCost,
      total_cost: pesticidePrice + dieselCost + labourCost,
    };

    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };

    getAuthToken().then((token) => {
      axios
        .patch(
          `${SERVER_URL}/api/fieldbook/${fieldBookId}/disease_and_pest`,
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
          if (resp.data?.data?.disease_and_pest) {
            setPestList(
              resp.data.data.disease_and_pest.map((item, index) => ({
                id: index,
                application_date: item.application_date || "",
                application_type: item.application_type || "",
                pesticide_type: item.pesticide_type || "",
                quantity_type: item.quantity_type || "",
                kg: item.kg || "",
                pesticide_price: item.pesticide_price || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
          setPestManagement({
            applicationDate: "",
            applicationType: "",
            pesticideType: "",
            dieselCost: "",
            labourCost: "",
            pesticidePrice: "",
            kg: "",
            liter: "",
          });
          setSelectedDate(null);
          setQtyType("kg");
          setEditingIndex(null);
        })
        .catch(() => Alert.alert("Error", "Failed to save record."))
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setPestManagement({
      applicationDate: "",
      applicationType: "",
      pesticideType: "",
      dieselCost: "",
      labourCost: "",
      pesticidePrice: "",
      kg: "",
      liter: "",
    });
    setSelectedDate(null);
    setQtyType("kg");
    setEditingIndex(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={pdStyles.wrapper}>
        {/* Accordion Header */}
        <TouchableOpacity
          style={pdStyles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={pdStyles.headerLeft}>
            <View style={pdStyles.iconWrap}>
              <Text style={pdStyles.iconEmoji}>🐛</Text>
            </View>
            <Text style={pdStyles.accordionTitle}>
              Pest/Diseases Management
            </Text>
            {pestList.length > 0 && (
              <View style={pdStyles.badge}>
                <Text style={pdStyles.badgeText}>{pestList.length}</Text>
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
            style={pdStyles.expandedContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Table with horizontal scroll */}
            {pestList.length > 0 && (
              <View style={pdStyles.tableWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  <View>
                    {/* Header */}
                    <View style={pdStyles.tableHeaderRow}>
                      <Text style={[pdStyles.tableHeaderCell, { width: 28 }]}>
                        #
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 90 }]}>
                        Date
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 80 }]}>
                        App. Type
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 90 }]}>
                        Pesticide
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 60 }]}>
                        Qty Type
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 60 }]}>
                        Qty
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 70 }]}>
                        Price
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 65 }]}>
                        Diesel
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 65 }]}>
                        Labour
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 65 }]}>
                        Total
                      </Text>
                      <Text style={[pdStyles.tableHeaderCell, { width: 80 }]}>
                        Actions
                      </Text>
                    </View>
                    {/* Rows */}
                    {pestList.map((item, index) => (
                      <PestRow
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
            <View style={pdStyles.formSection}>
              {editingIndex !== null && (
                <View style={pdStyles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={pdStyles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}

              {/* Row 1: Date + Application Type */}
              <View style={pdStyles.formRow}>
                <View style={pdStyles.formCol}>
                  <Text style={pdStyles.inputLabel}>Application Date</Text>
                  <TouchableOpacity
                    style={pdStyles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        pdStyles.dateInputText,
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
                <View style={pdStyles.formCol}>
                  <Text style={pdStyles.inputLabel}>Application Type</Text>
                  <SimpleDropdown
                    placeholder="Select Type"
                    options={applicationTypeOptions}
                    selectedValue={pestManagement.applicationType}
                    onSelect={(v) =>
                      setPestManagement((p) => ({ ...p, applicationType: v }))
                    }
                  />
                </View>
              </View>

              {/* Row 2: Pesticide Type + Quantity Type */}
              <View style={pdStyles.formRow}>
                <View style={pdStyles.formCol}>
                  <LabeledInput
                    label="Pesticide Type"
                    value={pestManagement.pesticideType}
                    onChangeText={(v) =>
                      setPestManagement((p) => ({ ...p, pesticideType: v }))
                    }
                  />
                </View>
                <View style={pdStyles.formCol}>
                  <Text style={pdStyles.inputLabel}>Quantity Type</Text>
                  <SimpleDropdown
                    placeholder="Qty Type"
                    options={qtyTypeOptions}
                    selectedValue={qtyType}
                    onSelect={(v) => setQtyType(v)}
                  />
                </View>
              </View>

              {/* Row 3: Qty Value + Pesticide Price */}
              <View style={pdStyles.formRow}>
                <View style={pdStyles.formCol}>
                  <LabeledInput
                    label={
                      qtyType === "kg" ? "Quantity (Kg)" : "Quantity (Liter)"
                    }
                    value={
                      qtyType === "kg"
                        ? pestManagement.kg
                        : pestManagement.liter
                    }
                    onChangeText={(v) =>
                      setPestManagement((p) => ({
                        ...p,
                        [qtyType === "kg" ? "kg" : "liter"]: v,
                      }))
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={pdStyles.formCol}>
                  <LabeledInput
                    label="Pesticide Price"
                    value={pestManagement.pesticidePrice}
                    onChangeText={(v) =>
                      setPestManagement((p) => ({ ...p, pesticidePrice: v }))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Row 4: Diesel + Labour */}
              <View style={pdStyles.formRow}>
                <View style={pdStyles.formCol}>
                  <LabeledInput
                    label="Diesel Cost"
                    value={pestManagement.dieselCost}
                    onChangeText={(v) =>
                      setPestManagement((p) => ({ ...p, dieselCost: v }))
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={pdStyles.formCol}>
                  <LabeledInput
                    label="Labour Cost"
                    value={pestManagement.labourCost}
                    onChangeText={(v) =>
                      setPestManagement((p) => ({ ...p, labourCost: v }))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={pdStyles.btnRow}>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={pdStyles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={pdStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    pdStyles.saveBtn,
                    editingIndex !== null && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={pdStyles.saveBtnText}>
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

export default PestDiseaseMobile;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const pdStyles = StyleSheet.create({
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
    flexShrink: 1,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#4E4E4E",
    marginLeft: 4,
    flexShrink: 1,
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
  expandedContent: { maxHeight: 560 },
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

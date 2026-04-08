// ═══════════════════════════════════════════════════════════════════════════
// SeedDetailsMobile.jsx  — with horizontal table scroll
// ═══════════════════════════════════════════════════════════════════════════
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
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import { SERVER_URL } from "../utils/index";

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
        style={sdStyles.dropdown}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            sdStyles.dropdownText,
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
          style={sdStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={sdStyles.modalBox}>
            <View style={sdStyles.modalHeader}>
              <Text style={sdStyles.modalTitle}>{placeholder}</Text>
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
                      sdStyles.modalItem,
                      isSelected && sdStyles.modalItemActive,
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        sdStyles.modalItemText,
                        isSelected && sdStyles.modalItemTextActive,
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
                <Text style={sdStyles.modalEmpty}>No options</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const LabeledInput = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
  onFocus,
}) => (
  <View style={sdStyles.inputGroup}>
    <Text style={sdStyles.inputLabel}>{label}</Text>
    <TextInput
      style={sdStyles.textInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor="#A9A9A9"
      keyboardType={keyboardType}
      onFocus={onFocus}
    />
  </View>
);

const SeedRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[sdStyles.tableRow, index % 2 === 0 && sdStyles.tableRowEven]}>
    <Text style={[sdStyles.tableCell, sdStyles.colNo]}>{index + 1}</Text>
    <Text style={[sdStyles.tableCell, sdStyles.colVariety]} numberOfLines={1}>
      {item.variety_name || "-"}
    </Text>
    <Text style={[sdStyles.tableCell, sdStyles.colQty]} numberOfLines={1}>
      {item.quantity_of_seed || "-"}
    </Text>
    <Text style={[sdStyles.tableCell, sdStyles.colTreatment]} numberOfLines={1}>
      {item.seed_treatment || "-"}
    </Text>
    <Text style={[sdStyles.tableCell, sdStyles.colCost]} numberOfLines={1}>
      {item.total_cost || "-"}
    </Text>
    <View style={sdStyles.tableActions}>
      <TouchableOpacity style={sdStyles.editBtn} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={12} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={sdStyles.deleteBtn}
        onPress={() => onDelete(item)}
      >
        <Feather name="trash-2" size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

const SeedDetailsMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const formSectionRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [seedsList, setSeedsList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [seedsDetails, setSeedsDetails] = useState({
    varietyName: "",
    seedQuantity: "",
    seedTreatment: "",
    treatmentCost: "",
    costOfSeed: "",
    totalCost: "",
  });

  const seedTreatmentOptions = [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
    { label: "Chemical", value: "Chemical" },
    { label: "Biological", value: "Biological" },
    { label: "None", value: "None" },
  ];

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
          if (data.seed_detail && Array.isArray(data.seed_detail)) {
            setSeedsList(
              data.seed_detail.map((seed, index) => ({
                id: index,
                variety_name: seed.variety_name || "",
                quantity_of_seed: seed.quantity_of_seed || "",
                seed_treatment: seed.seed_treatment || "",
                treatment_cost: seed.treatment_cost || "",
                cost_of_seed: seed.cost_of_seed || "",
                total_cost: seed.total_cost || "",
              })),
            );
          }
        })
        .catch((err) => console.error("SeedDetailsMobile fetch error:", err))
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

  const handleEdit = (row) => {
    setEditingIndex(row.id);
    setSeedsDetails({
      varietyName: row.variety_name || "",
      seedQuantity: row.quantity_of_seed || "",
      seedTreatment: row.seed_treatment || "",
      treatmentCost: row.treatment_cost || "",
      costOfSeed: row.cost_of_seed || "",
      totalCost: row.total_cost || "",
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDelete = (row) => {
    Alert.alert(
      "Delete Seed Detail",
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
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/seed_detail`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.seed_detail) {
                    setSeedsList(
                      resp.data.data.seed_detail.map((seed, index) => ({
                        id: index,
                        variety_name: seed.variety_name || "",
                        quantity_of_seed: seed.quantity_of_seed || "",
                        seed_treatment: seed.seed_treatment || "",
                        treatment_cost: seed.treatment_cost || "",
                        cost_of_seed: seed.cost_of_seed || "",
                        total_cost: seed.total_cost || "",
                      })),
                    );
                  }
                  Alert.alert("Deleted", "Seed detail has been deleted.");
                })
                .catch(() =>
                  Alert.alert("Error", "Failed to delete seed detail."),
                );
            });
          },
        },
      ],
    );
  };

  const handleSave = () => {
    if (!seedsDetails.varietyName) {
      Alert.alert("Validation", "Please enter a variety name.");
      return;
    }
    setIsSaving(true);
    const item = {
      variety_name: seedsDetails.varietyName,
      quantity_of_seed: seedsDetails.seedQuantity,
      seed_treatment: seedsDetails.seedTreatment,
      treatment_cost: seedsDetails.treatmentCost,
      cost_of_seed: seedsDetails.costOfSeed,
      total_cost: seedsDetails.totalCost,
    };
    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };
    getAuthToken().then((token) => {
      axios
        .patch(
          `${SERVER_URL}/api/fieldbook/${fieldBookId}/seed_detail`,
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
            editingIndex !== null
              ? "Seed detail updated successfully!"
              : "Seed detail added successfully!",
          );
          if (resp.data?.data?.seed_detail) {
            setSeedsList(
              resp.data.data.seed_detail.map((seed, index) => ({
                id: index,
                variety_name: seed.variety_name || "",
                quantity_of_seed: seed.quantity_of_seed || "",
                seed_treatment: seed.seed_treatment || "",
                treatment_cost: seed.treatment_cost || "",
                cost_of_seed: seed.cost_of_seed || "",
                total_cost: seed.total_cost || "",
              })),
            );
          }
          setSeedsDetails({
            varietyName: "",
            seedQuantity: "",
            seedTreatment: "",
            treatmentCost: "",
            costOfSeed: "",
            totalCost: "",
          });
          setEditingIndex(null);
        })
        .catch(() =>
          Alert.alert(
            "Error",
            editingIndex !== null
              ? "Failed to update seed detail."
              : "Failed to add seed detail.",
          ),
        )
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setSeedsDetails({
      varietyName: "",
      seedQuantity: "",
      seedTreatment: "",
      treatmentCost: "",
      costOfSeed: "",
      totalCost: "",
    });
    setEditingIndex(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
    >
      <View style={sdStyles.wrapper}>
        <TouchableOpacity
          style={sdStyles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={sdStyles.headerLeft}>
            <View style={sdStyles.leafIconWrap}>
              <Text style={sdStyles.leafEmoji}>🌿</Text>
            </View>
            <Text style={sdStyles.accordionTitle}>Seed Details</Text>
            {seedsList.length > 0 && (
              <View style={sdStyles.badge}>
                <Text style={sdStyles.badgeText}>{seedsList.length}</Text>
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
            style={sdStyles.expandedContent}
            contentContainerStyle={sdStyles.expandedContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* ── Table with horizontal scroll ── */}
            {seedsList.length > 0 && (
              <View style={sdStyles.tableWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  <View>
                    <View style={sdStyles.tableHeaderRow}>
                      <Text style={[sdStyles.tableHeaderCell, sdStyles.colNo]}>
                        #
                      </Text>
                      <Text
                        style={[sdStyles.tableHeaderCell, sdStyles.colVariety]}
                      >
                        Variety
                      </Text>
                      <Text style={[sdStyles.tableHeaderCell, sdStyles.colQty]}>
                        Qty
                      </Text>
                      <Text
                        style={[
                          sdStyles.tableHeaderCell,
                          sdStyles.colTreatment,
                        ]}
                      >
                        Treatment
                      </Text>
                      <Text
                        style={[sdStyles.tableHeaderCell, sdStyles.colCost]}
                      >
                        Total
                      </Text>
                      <Text
                        style={[
                          sdStyles.tableHeaderCell,
                          sdStyles.tableActions,
                        ]}
                      >
                        Actions
                      </Text>
                    </View>
                    {seedsList.map((item, index) => (
                      <SeedRow
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

            <View ref={formSectionRef} style={sdStyles.formSection}>
              {editingIndex !== null && (
                <View style={sdStyles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={sdStyles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}
              <View style={sdStyles.formRow}>
                <View style={sdStyles.formCol}>
                  <LabeledInput
                    label="Variety Name"
                    value={seedsDetails.varietyName}
                    onChangeText={(v) =>
                      setSeedsDetails((p) => ({ ...p, varietyName: v }))
                    }
                    onFocus={scrollToForm}
                  />
                </View>
                <View style={sdStyles.formCol}>
                  <LabeledInput
                    label="Quantity of Seed"
                    value={seedsDetails.seedQuantity}
                    onChangeText={(v) =>
                      setSeedsDetails((p) => ({ ...p, seedQuantity: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
              </View>
              <View style={sdStyles.formRow}>
                <View style={sdStyles.formCol}>
                  <Text style={sdStyles.inputLabel}>Seed Treatment</Text>
                  <SimpleDropdown
                    placeholder="Seed Treatment"
                    options={seedTreatmentOptions}
                    selectedValue={seedsDetails.seedTreatment}
                    onSelect={(v) =>
                      setSeedsDetails((p) => ({ ...p, seedTreatment: v }))
                    }
                  />
                </View>
                <View style={sdStyles.formCol}>
                  <LabeledInput
                    label="Treatment Cost"
                    value={seedsDetails.treatmentCost}
                    onChangeText={(v) =>
                      setSeedsDetails((p) => ({ ...p, treatmentCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
              </View>
              <View style={sdStyles.formRow}>
                <View style={sdStyles.formCol}>
                  <LabeledInput
                    label="Cost of Seed"
                    value={seedsDetails.costOfSeed}
                    onChangeText={(v) =>
                      setSeedsDetails((p) => ({ ...p, costOfSeed: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
                <View style={sdStyles.formCol}>
                  <LabeledInput
                    label="Total Cost"
                    value={seedsDetails.totalCost}
                    onChangeText={(v) =>
                      setSeedsDetails((p) => ({ ...p, totalCost: v }))
                    }
                    keyboardType="numeric"
                    onFocus={scrollToForm}
                  />
                </View>
              </View>
              <View style={sdStyles.btnRow}>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={sdStyles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={sdStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    sdStyles.saveBtn,
                    editingIndex !== null && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={sdStyles.saveBtnText}>
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

export { SeedDetailsMobile };

const sdStyles = StyleSheet.create({
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
  leafIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  leafEmoji: { fontSize: 16 },
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
  // ── Column widths ──
  colNo: { width: 28 },
  colVariety: { width: 110 },
  colQty: { width: 70 },
  colTreatment: { width: 90 },
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
  inputGroup: { marginBottom: 0 },
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

export default SeedDetailsMobile;

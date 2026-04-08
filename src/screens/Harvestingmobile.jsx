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

// ─────────────────────────────────────────────────────────────────────────────
// HARVESTING TYPE OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const HARVESTING_TYPES = [
  { label: "Mechanical", value: "mechanical" },
  { label: "Manual", value: "manual" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
const HarvestingTypePicker = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  const selectedLabel = HARVESTING_TYPES.find((t) => t.value === value)?.label;

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
          {selectedLabel || "Select Type"}
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
              <Text style={styles.modalTitle}>Harvesting Type</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Feather name="x" size={18} color="#4E4E4E" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={HARVESTING_TYPES}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemActive,
                    ]}
                    onPress={() => {
                      onChange(item.value);
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
                <Text style={styles.modalEmpty}>No options</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLE ROW
// ─────────────────────────────────────────────────────────────────────────────
const HarvestingRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
    <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
    <Text style={[styles.tableCell, styles.colEst]} numberOfLines={1}>
      {item.estimated_harvest || "-"}
    </Text>
    <Text style={[styles.tableCell, styles.colActual]} numberOfLines={1}>
      {item.actual_harvest || "-"}
    </Text>
    <Text style={[styles.tableCell, styles.colType]} numberOfLines={1}>
      {item.harvesting_type
        ? item.harvesting_type.charAt(0).toUpperCase() +
          item.harvesting_type.slice(1)
        : "-"}
    </Text>
    <Text style={[styles.tableCell, styles.colCost]} numberOfLines={1}>
      {item.diesel_cost || "-"}
    </Text>
    <Text style={[styles.tableCell, styles.colCost]} numberOfLines={1}>
      {item.labour_cost || "-"}
    </Text>
    <Text style={[styles.tableCell, styles.colCost]} numberOfLines={1}>
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
const HarvestingMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const formSectionRef = useRef(null);

  // ✅ FIX: inputRefs must be a plain object of individual useRef() calls,
  //         NOT nested under .current — otherwise ref={inputRefs.current[key]}
  //         is undefined and crashes on focus, which closes the keyboard.
  const inputRefs = {
    estimatedHarvest: useRef(null),
    actualHarvesting: useRef(null),
    yeildCostPerMound: useRef(null),
    advisoryDetail: useRef(null),
    dieselCost: useRef(null),
    labourCost: useRef(null),
    totalCost: useRef(null),
  };

  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [harvestingList, setHarvestingList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [harvesting, setHarvesting] = useState({
    estimatedHarvest: "",
    actualHarvesting: "",
    yeildCostPerMound: "",
    advisoryDetail: "",
    harvestingType: "",
    dieselCost: "",
    labourCost: "",
    totalCost: "",
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
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
          if (data.harvesting && Array.isArray(data.harvesting)) {
            setHarvestingList(
              data.harvesting.map((item, index) => ({
                id: index,
                estimated_harvest: item.estimated_harvest || "",
                actual_harvest: item.actual_harvest || "",
                yield_cost_per_mound: item.yield_cost_per_mound || "",
                advisory_details: item.advisory_details || "",
                harvesting_type: item.harvesting_type || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
        })
        .catch((err) => console.error("HarvestingMobile fetch error:", err))
        .finally(() => setIsLoading(false));
    });
  }, [getId]);

  // ── Scroll helpers ─────────────────────────────────────────────────────────
  const scrollToForm = () => {
    setTimeout(() => {
      formSectionRef.current?.measureLayout(
        scrollRef.current,
        (x, y) => scrollRef.current?.scrollTo({ y, animated: true }),
        () => scrollRef.current?.scrollToEnd({ animated: true }),
      );
    }, 150);
  };

  // ✅ FIX: scrollToInput now correctly accesses inputRefs[key] (not inputRefs.current[key])
  const scrollToInput = (key) => {
    setTimeout(() => {
      const ref = inputRefs[key];
      if (!ref?.current || !scrollRef?.current) return;

      ref.current.measureLayout(
        scrollRef.current,
        (x, y) => {
          scrollRef.current.scrollTo({
            y: Math.max(0, y - 120),
            animated: true,
          });
        },
        () => {},
      );
    }, 150);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditingIndex(row.id);
    setHarvesting({
      estimatedHarvest: row.estimated_harvest || "",
      actualHarvesting: row.actual_harvest || "",
      yeildCostPerMound: row.yield_cost_per_mound || "",
      advisoryDetail: row.advisory_details || "",
      harvestingType: row.harvesting_type || "",
      dieselCost: row.diesel_cost || "",
      labourCost: row.labour_cost || "",
      totalCost: row.total_cost || "",
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (row) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this harvesting record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .patch(
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/harvesting`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.harvesting) {
                    setHarvestingList(
                      resp.data.data.harvesting.map((item, index) => ({
                        id: index,
                        estimated_harvest: item.estimated_harvest || "",
                        actual_harvest: item.actual_harvest || "",
                        yield_cost_per_mound: item.yield_cost_per_mound || "",
                        advisory_details: item.advisory_details || "",
                        harvesting_type: item.harvesting_type || "",
                        diesel_cost: item.diesel_cost || "",
                        labour_cost: item.labour_cost || "",
                        total_cost: item.total_cost || "",
                      })),
                    );
                  }
                  Alert.alert("Deleted", "Harvesting record deleted.");
                })
                .catch(() => Alert.alert("Error", "Failed to delete record."));
            });
          },
        },
      ],
    );
  };

  // ── Save / Update ──────────────────────────────────────────────────────────
  const handleSave = () => {
    setIsSaving(true);
    const item = {
      estimated_harvest: harvesting.estimatedHarvest,
      actual_harvest: harvesting.actualHarvesting,
      yield_cost_per_mound: harvesting.yeildCostPerMound,
      advisory_details: harvesting.advisoryDetail,
      harvesting_type: harvesting.harvestingType,
      diesel_cost: harvesting.dieselCost,
      labour_cost: harvesting.labourCost,
      total_cost: harvesting.totalCost,
    };
    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };

    getAuthToken().then((token) => {
      axios
        .patch(
          `${SERVER_URL}/api/fieldbook/${fieldBookId}/harvesting`,
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
          if (resp.data?.data?.harvesting) {
            setHarvestingList(
              resp.data.data.harvesting.map((item, index) => ({
                id: index,
                estimated_harvest: item.estimated_harvest || "",
                actual_harvest: item.actual_harvest || "",
                yield_cost_per_mound: item.yield_cost_per_mound || "",
                advisory_details: item.advisory_details || "",
                harvesting_type: item.harvesting_type || "",
                diesel_cost: item.diesel_cost || "",
                labour_cost: item.labour_cost || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
          setHarvesting({
            estimatedHarvest: "",
            actualHarvesting: "",
            yeildCostPerMound: "",
            advisoryDetail: "",
            harvestingType: "",
            dieselCost: "",
            labourCost: "",
            totalCost: "",
          });
          setEditingIndex(null);
        })
        .catch(() => Alert.alert("Error", "Failed to save harvesting record."))
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setHarvesting({
      estimatedHarvest: "",
      actualHarvesting: "",
      yeildCostPerMound: "",
      advisoryDetail: "",
      harvestingType: "",
      dieselCost: "",
      labourCost: "",
      totalCost: "",
    });
    setEditingIndex(null);
  };

  // ── Field helper ───────────────────────────────────────────────────────────
  // ✅ FIX: ref={inputRefs[refKey]} instead of the broken setInputRef(refKey)
  const Field = ({ label, stateKey, keyboardType = "default", refKey }) => (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        ref={inputRefs[refKey]}
        style={styles.textInput}
        value={harvesting[stateKey]}
        onChangeText={(v) => setHarvesting((p) => ({ ...p, [stateKey]: v }))}
        placeholder={label}
        placeholderTextColor="#A9A9A9"
        keyboardType={keyboardType}
        onFocus={() => scrollToInput(refKey)}
        blurOnSubmit={false}
      />
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
    >
      <View style={styles.wrapper}>
        {/* ── Accordion Header ── */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🌾</Text>
            </View>
            <Text style={styles.accordionTitle}>Harvesting</Text>
            {harvestingList.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{harvestingList.length}</Text>
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
            style={styles.expandedContent}
            contentContainerStyle={styles.expandedContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
          >
            {/* ── Records Table with horizontal scroll ── */}
            {harvestingList.length > 0 && (
              <View style={styles.tableWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  <View>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, styles.colNo]}>
                        #
                      </Text>
                      <Text style={[styles.tableHeaderCell, styles.colEst]}>
                        Est. Harvest
                      </Text>
                      <Text style={[styles.tableHeaderCell, styles.colActual]}>
                        Actual
                      </Text>
                      <Text style={[styles.tableHeaderCell, styles.colType]}>
                        Type
                      </Text>
                      <Text style={[styles.tableHeaderCell, styles.colCost]}>
                        Diesel
                      </Text>
                      <Text style={[styles.tableHeaderCell, styles.colCost]}>
                        Labour
                      </Text>
                      <Text style={[styles.tableHeaderCell, styles.colCost]}>
                        Total
                      </Text>
                      <Text
                        style={[styles.tableHeaderCell, styles.tableActions]}
                      >
                        Actions
                      </Text>
                    </View>

                    {/* Table Rows */}
                    {harvestingList.map((item, index) => (
                      <HarvestingRow
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

            {/* ── Form ── */}
            <View ref={formSectionRef} style={styles.formSection}>
              {editingIndex !== null && (
                <View style={styles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={styles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}

              {/* Row 1 */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Field
                    label="Estimated Harvest"
                    stateKey="estimatedHarvest"
                    refKey="estimatedHarvest"
                  />
                </View>
                <View style={styles.formCol}>
                  <Field
                    label="Actual Harvest"
                    stateKey="actualHarvesting"
                    refKey="actualHarvesting"
                  />
                </View>
              </View>

              {/* Row 2 */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Field
                    label="Yield Cost/Mound"
                    stateKey="yeildCostPerMound"
                    keyboardType="numeric"
                    refKey="yeildCostPerMound"
                  />
                </View>
                <View style={styles.formCol}>
                  <Field
                    label="Advisory Details"
                    stateKey="advisoryDetail"
                    refKey="advisoryDetail"
                  />
                </View>
              </View>

              {/* Row 3 — Harvesting Type modal dropdown */}
              <View style={[styles.formRow, { marginBottom: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Harvesting Type</Text>
                  <HarvestingTypePicker
                    value={harvesting.harvestingType}
                    onChange={(v) =>
                      setHarvesting((p) => ({ ...p, harvestingType: v }))
                    }
                  />
                </View>
              </View>

              {/* Row 4 */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Field
                    label="Diesel Cost"
                    stateKey="dieselCost"
                    keyboardType="numeric"
                    refKey="dieselCost"
                  />
                </View>
                <View style={styles.formCol}>
                  <Field
                    label="Labour Cost"
                    stateKey="labourCost"
                    keyboardType="numeric"
                    refKey="labourCost"
                  />
                </View>
              </View>

              {/* Row 5 */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Field
                    label="Total Cost"
                    stateKey="totalCost"
                    keyboardType="numeric"
                    refKey="totalCost"
                  />
                </View>
                <View style={styles.formCol} />
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

export default HarvestingMobile;

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
  expandedContentContainer: { paddingBottom: 40 },
  colNo: { width: 28 },
  colEst: { width: 100 },
  colActual: { width: 90 },
  colType: { width: 80 },
  colCost: { width: 75 },
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

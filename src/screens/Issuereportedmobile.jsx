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
    <Text style={irStyles.inputLabel}>{label}</Text>
    <TextInput
      style={[irStyles.textInput, multiline && irStyles.textInputMultiline]}
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
const IssueRow = ({ item, index, onEdit, onDelete }) => (
  <View style={[irStyles.tableRow, index % 2 === 0 && irStyles.tableRowEven]}>
    <Text style={[irStyles.tableCell, { width: 28 }]}>{index + 1}</Text>
    <Text style={[irStyles.tableCell, { flex: 1 }]} numberOfLines={1}>
      {item.detected_date
        ? item.detected_date.split("-").reverse().join("-")
        : "-"}
    </Text>
    <Text style={[irStyles.tableCell, { width: 80 }]} numberOfLines={1}>
      {item.detected_issue_details || "-"}
    </Text>
    <Text style={[irStyles.tableCell, { width: 50 }]} numberOfLines={1}>
      {item.cost_to_recover || "-"}
    </Text>
    <View style={irStyles.tableActions}>
      <TouchableOpacity style={irStyles.editBtn} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={12} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={irStyles.deleteBtn}
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
const IssueReportedMobile = ({ getId }) => {
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [fieldBookId, setFieldBookId] = useState(null);
  const [issueList, setIssueList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [issueReported, setIssueReported] = useState({
    detectedDate: "",
    detectedissuedetails: "",
    costToRecover: "",
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
          if (data.reported_issue && Array.isArray(data.reported_issue)) {
            setIssueList(
              data.reported_issue.map((item, index) => ({
                id: index,
                detected_date: item.detected_date || "",
                detected_issue_details: item.detected_issue_details || "",
                cost_to_recover: item.cost_to_recover || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
        })
        .catch((err) => console.error("IssueReportedMobile fetch error:", err));
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
      setIssueReported((p) => ({ ...p, detectedDate: `${yyyy}-${mm}-${dd}` }));
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditingIndex(row.id);
    if (row.detected_date) {
      const parts = row.detected_date.split("-");
      if (parts.length === 3)
        setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
    setIssueReported({
      detectedDate: row.detected_date || "",
      detectedissuedetails: row.detected_issue_details || "",
      costToRecover: String(row.cost_to_recover || ""),
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (row) => {
    Alert.alert(
      "Delete Issue",
      "Are you sure you want to delete this issue report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            getAuthToken().then((token) => {
              axios
                .patch(
                  `${SERVER_URL}/api/fieldbook/${fieldBookId}/reported_issue`,
                  { operation: "delete", index: row.id },
                  {
                    headers: {
                      "Content-Type": "application/json",
                      "x-auth-token": token,
                    },
                  },
                )
                .then((resp) => {
                  if (resp.data?.data?.reported_issue) {
                    setIssueList(
                      resp.data.data.reported_issue.map((item, index) => ({
                        id: index,
                        detected_date: item.detected_date || "",
                        detected_issue_details:
                          item.detected_issue_details || "",
                        cost_to_recover: item.cost_to_recover || "",
                        total_cost: item.total_cost || "",
                      })),
                    );
                  }
                  Alert.alert("Deleted", "Issue report deleted.");
                })
                .catch(() =>
                  Alert.alert("Error", "Failed to delete issue report."),
                );
            });
          },
        },
      ],
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!issueReported.detectedDate) {
      Alert.alert("Validation", "Please select a detected date.");
      return;
    }
    setIsSaving(true);

    const costToRecover = parseFloat(issueReported.costToRecover) || 0;

    const item = {
      detected_date: issueReported.detectedDate,
      detected_issue_details: issueReported.detectedissuedetails,
      cost_to_recover: costToRecover,
      total_cost: costToRecover,
    };

    const payload =
      editingIndex !== null
        ? { operation: "update", index: editingIndex, item }
        : { operation: "append", item };

    getAuthToken().then((token) => {
      axios
        .patch(
          `${SERVER_URL}/api/fieldbook/${fieldBookId}/reported_issue`,
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
            editingIndex !== null ? "Issue updated!" : "Issue added!",
          );
          if (resp.data?.data?.reported_issue) {
            setIssueList(
              resp.data.data.reported_issue.map((item, index) => ({
                id: index,
                detected_date: item.detected_date || "",
                detected_issue_details: item.detected_issue_details || "",
                cost_to_recover: item.cost_to_recover || "",
                total_cost: item.total_cost || "",
              })),
            );
          }
          setIssueReported({
            detectedDate: "",
            detectedissuedetails: "",
            costToRecover: "",
          });
          setSelectedDate(null);
          setEditingIndex(null);
        })
        .catch(() => Alert.alert("Error", "Failed to save issue report."))
        .finally(() => setIsSaving(false));
    });
  };

  const handleCancel = () => {
    setIssueReported({
      detectedDate: "",
      detectedissuedetails: "",
      costToRecover: "",
    });
    setSelectedDate(null);
    setEditingIndex(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={irStyles.wrapper}>
        {/* Accordion Header */}
        <TouchableOpacity
          style={irStyles.accordionHeader}
          onPress={() => setExpanded((p) => !p)}
          activeOpacity={0.8}
        >
          <View style={irStyles.headerLeft}>
            <View style={irStyles.iconWrap}>
              <Text style={irStyles.iconEmoji}>⚠️</Text>
            </View>
            <Text style={irStyles.accordionTitle}>Issue Reported</Text>
            {issueList.length > 0 && (
              <View style={irStyles.badge}>
                <Text style={irStyles.badgeText}>{issueList.length}</Text>
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
            style={irStyles.expandedContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Table */}
            {issueList.length > 0 && (
              <View style={irStyles.tableWrapper}>
                <View style={irStyles.tableHeaderRow}>
                  <Text style={[irStyles.tableHeaderCell, { width: 28 }]}>
                    #
                  </Text>
                  <Text style={[irStyles.tableHeaderCell, { flex: 1 }]}>
                    Date
                  </Text>
                  <Text style={[irStyles.tableHeaderCell, { width: 80 }]}>
                    Issue
                  </Text>
                  <Text style={[irStyles.tableHeaderCell, { width: 50 }]}>
                    Cost
                  </Text>
                  <Text style={[irStyles.tableHeaderCell, { width: 80 }]}>
                    Actions
                  </Text>
                </View>
                {issueList.map((item, index) => (
                  <IssueRow
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}

            {/* Form */}
            <View style={irStyles.formSection}>
              {editingIndex !== null && (
                <View style={irStyles.editingBanner}>
                  <Feather name="edit-2" size={13} color="#15803D" />
                  <Text style={irStyles.editingBannerText}>
                    Editing record #{editingIndex + 1}
                  </Text>
                </View>
              )}

              {/* Row 1: Date + Cost */}
              <View style={irStyles.formRow}>
                <View style={irStyles.formCol}>
                  <Text style={irStyles.inputLabel}>Detected Date</Text>
                  <TouchableOpacity
                    style={irStyles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        irStyles.dateInputText,
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
                <View style={irStyles.formCol}>
                  <LabeledInput
                    label="Cost to Recover"
                    value={issueReported.costToRecover}
                    onChangeText={(v) =>
                      setIssueReported((p) => ({ ...p, costToRecover: v }))
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Issue Details (full width) */}
              <View style={irStyles.formFullRow}>
                <LabeledInput
                  label="Detected Issue Details"
                  value={issueReported.detectedissuedetails}
                  onChangeText={(v) =>
                    setIssueReported((p) => ({ ...p, detectedissuedetails: v }))
                  }
                  multiline={true}
                />
              </View>

              {/* Buttons */}
              <View style={irStyles.btnRow}>
                {editingIndex !== null && (
                  <TouchableOpacity
                    style={irStyles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={irStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    irStyles.saveBtn,
                    editingIndex !== null && { backgroundColor: "#2563EB" },
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={irStyles.saveBtnText}>
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

export default IssueReportedMobile;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const irStyles = StyleSheet.create({
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

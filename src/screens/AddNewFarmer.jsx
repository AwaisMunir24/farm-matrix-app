import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import React, { useRef, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { SERVER_URL } from "../utils/index";
import tehsilData from "../utils/TehsilData.json"; // ← your JSON file
import { getAuthUser } from "../utils/auth"; // ← centralized auth
import NetInfo from "@react-native-community/netinfo";
import { saveDraft } from "../utils/offlineQueue";
import {
  consumeOfflineFarmerCode,
  getAddFarmerOfflineReference,
  prepareAddFarmerOfflineReference,
} from "../utils/offlineReferenceData";
// ─── Flatten tehsil JSON into a searchable list ───────────────────────────────
// Each item: { name, district, division, province }
const ALL_TEHSILS = tehsilData.provinces.flatMap((province) =>
  province.tehsils.map((t) => ({
    name: t.name,
    district: t.district,
    division: t.division,
    province: province.name,
  })),
);

// ─── Searchable Dropdown Modal ────────────────────────────────────────────────
const SearchableDropdownModal = ({
  visible,
  title,
  options,
  onSelect,
  onClose,
  labelKey,
  subLabelKey,
}) => {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? options.filter((item) => {
        const label = typeof item === "string" ? item : item[labelKey];
        return label?.toLowerCase().includes(query.toLowerCase());
      })
    : options;

  // Reset search when modal opens
  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={modalStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={modalStyles.sheet} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View style={modalStyles.searchRow}>
            <Feather
              name="search"
              size={16}
              color="#999"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={modalStyles.searchInput}
              placeholder={`Search ${title}...`}
              placeholderTextColor="#BBB"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Feather name="x-circle" size={16} color="#BBB" />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={modalStyles.emptyText}>No results found</Text>
            }
            renderItem={({ item }) => {
              const label = typeof item === "string" ? item : item[labelKey];
              const sub =
                subLabelKey && typeof item !== "string"
                  ? item[subLabelKey]
                  : null;
              return (
                <TouchableOpacity
                  style={modalStyles.row}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={modalStyles.rowText}>{label}</Text>
                  {sub ? <Text style={modalStyles.rowSub}>{sub}</Text> : null}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={modalStyles.sep} />}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Simple (non-searchable) Dropdown Modal ───────────────────────────────────
const DropdownModal = ({
  visible,
  title,
  options,
  onSelect,
  onClose,
  labelKey = "label",
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={modalStyles.overlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={modalStyles.sheet} onStartShouldSetResponder={() => true}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={20} color="#555" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modalStyles.row}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.rowText}>
                {typeof item === "string" ? item : item[labelKey]}
              </Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={modalStyles.sep} />}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <View style={{ paddingTop: 14 }}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={{ color: "#EF4444" }}> *</Text>}
    </Text>
    {children}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AddNewFarmer = ({ navigation }) => {
  const scrollViewRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [clusters, setClusters] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [nextFarmerCode, setNextFarmerCode] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [errors, setErrors] = useState({});

  const [farmerData, setFarmerData] = useState({
    first_name: "",
    last_name: "",
    father_husband_name: "",
    cnic: "",
    email: "",
    phone: "",
    address: "",
    farmerCode: "",
    cluster_id: "",
    cluster_name: "",
    organization_id: "",
    organization_name: "",
    tehsil: "",
    farmer_responsivity: "",
    data_knowledge: "",
    date_of_birth: "",
  });

  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const responsivityOptions = ["High", "Medium", "Low"];
  const dataKnowledgeOptions = ["Complete", "Partial", "None"];

  const applyReferenceData = (reference) => {
    setClusters(reference?.clusters || []);
    setOrganizations(reference?.organizations || []);
    const code = reference?.nextFarmerCode || "";
    setNextFarmerCode(code);
    setFarmerData((prev) => ({
      ...prev,
      farmerCode: prev.farmerCode || code,
    }));
  };

  // ── Load user + fetch initial data
  useEffect(() => {
    (async () => {
      try {
        const user = await getAuthUser(); // ← uses auth.js (static or dynamic)
        if (!user) return;

        setUserRole(user.role);
        setUserId(user.id);
        setAuthToken(user.token);

        const netState = await NetInfo.fetch();
        const isOnline =
          netState.isConnected && netState.isInternetReachable !== false;

        if (isOnline) {
          try {
            const reference = await prepareAddFarmerOfflineReference({
              token: user.token,
              userRole: user.role,
            });
            applyReferenceData(reference);
          } catch (onlineError) {
            // Fallback to local backup if server fetch fails
            const cached = await getAddFarmerOfflineReference();
            if (cached) {
              applyReferenceData(cached);
              Alert.alert(
                "Offline backup used",
                "Could not refresh latest lists from server. Loaded previously backed-up data.",
              );
            } else {
              throw onlineError;
            }
          }
        } else {
          const cached = await getAddFarmerOfflineReference();
          if (cached) {
            applyReferenceData(cached);
          } else {
            Alert.alert(
              "Offline data missing",
              "No internet and no local backup found. Please use 'Prepare Offline Data' once before going offline.",
            );
          }
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  const setField = (key, value) => {
    setFarmerData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      setField("date_of_birth", selectedDate.toISOString().split("T")[0]);
      if (errors.date_of_birth)
        setErrors((prev) => ({ ...prev, date_of_birth: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!farmerData.first_name.trim())
      newErrors.first_name = "First name is required";

    if (!farmerData.last_name.trim())
      newErrors.last_name = "Last name is required";

    if (!farmerData.father_husband_name.trim())
      newErrors.father_husband_name = "Father/Husband name is required";

    // Email — mandatory + format check
    if (!farmerData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(farmerData.email.trim())) {
      newErrors.email = "Enter a valid email address";
    }

    // Date of birth — use date object as fallback
    const dobValue =
      farmerData.date_of_birth ||
      (date ? date.toISOString().split("T")[0] : "");
    if (!dobValue) {
      newErrors.date_of_birth = "Date of birth is required";
    } else {
      const dob = new Date(dobValue);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18)
        newErrors.date_of_birth = "Farmer must be at least 18 years old";
    }

    if (!farmerData.address.trim()) newErrors.address = "Address is required";

    if (!farmerData.farmerCode.trim())
      newErrors.farmerCode = "Farmer code is required";

    // Org required for admin only if list loaded
    if (
      userRole === "admin" &&
      organizations.length > 0 &&
      !farmerData.organization_id
    )
      newErrors.organization_id = "Please select an organization";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSave = async () => {
  if (!validateForm()) {
    const failedFields = Object.values(errors)
      .map((v) => `• ${v}`)
      .join("\n");
    Alert.alert("Please fix the following", failedFields);
    return;
  }

  const farmerPayload = {
    first_name: farmerData.first_name,
    last_name: farmerData.last_name,
    father_husband_name: farmerData.father_husband_name,
    username: `${farmerData.first_name}_${farmerData.last_name}`.toLowerCase(),
    email: farmerData.email,
    password: "123456",
    role: "farmer",
    dob: farmerData.date_of_birth,
    cnic: farmerData.cnic,
    phone: farmerData.phone,
    address: farmerData.address,
    user_code: farmerData.farmerCode,
    cluster_id: farmerData.cluster_id,
    tehsil: farmerData.tehsil,
    farmer_responsivity: farmerData.farmer_responsivity,
    data_knowledge: farmerData.data_knowledge,
    organization_id: userRole === "admin" ? farmerData.organization_id : userId,
  };

  // ── Check connectivity first ──
  const netState = await NetInfo.fetch();
  // `isInternetReachable` can be null briefly on mobile networks.
  // Treat only explicit `false` as offline to avoid false offline saves.
  const isOnline =
    netState.isConnected && netState.isInternetReachable !== false;

  if (!isOnline) {
    // Save to draft queue
    setLoading(true);
    try {
      await saveDraft(farmerPayload);
      const consumed = await consumeOfflineFarmerCode();
      if (consumed?.nextCode) {
        setNextFarmerCode(consumed.nextCode);
      }
      Alert.alert(
        "Saved as Draft",
        "No internet connection. Farmer has been saved locally and will upload automatically when you're back online.",
        [{ text: "OK", onPress: () => navigation.replace("MainTabs") }]
      );
    } catch (error) {
      console.error("saveDraft failed:", error);
      Alert.alert("Error", "Could not save draft. Please try again.");
    } finally {
      setLoading(false);
    }
    return;
  }

  // ── Online — normal flow ──
  setLoading(true);
  try {
    const res = await fetch(`${SERVER_URL}/api/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": authToken,
      },
      body: JSON.stringify(farmerPayload),
    });
    const result = await res.json();

    if (!result.success) {
      const serverMsg =
        result.message ||
        (result.errors && JSON.stringify(result.errors)) ||
        "Failed to create farmer";
      throw new Error(serverMsg);
    }

    Alert.alert("Success", "Farmer created successfully!", [
      {
        text: "OK",
        onPress: () => {
          // reset form...
          navigation.replace("MainTabs");
        },
      },
    ]);
  } catch (error) {
    Alert.alert("Error", error.message || "An error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
};
  const goBack = () => navigation.replace("MainTabs");

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#39B54B" />
          <Text style={{ marginTop: 12, color: "#39B54B", fontWeight: "600" }}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={goBack}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Farmer</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.body}>
            <Field label="First Name" required error={errors.first_name}>
              <TextInput
                placeholder="Enter first name"
                placeholderTextColor="#A9A9A9"
                style={[styles.input, errors.first_name && styles.inputError]}
                value={farmerData.first_name}
                onChangeText={(v) => setField("first_name", v)}
                returnKeyType="next"
              />
            </Field>

            <Field label="Last Name" required error={errors.last_name}>
              <TextInput
                placeholder="Enter last name"
                placeholderTextColor="#A9A9A9"
                style={[styles.input, errors.last_name && styles.inputError]}
                value={farmerData.last_name}
                onChangeText={(v) => setField("last_name", v)}
                returnKeyType="next"
              />
            </Field>

            <Field
              label="Father/Husband Name"
              required
              error={errors.father_husband_name}
            >
              <TextInput
                placeholder="Father/Husband Name"
                placeholderTextColor="#A9A9A9"
                style={[
                  styles.input,
                  errors.father_husband_name && styles.inputError,
                ]}
                value={farmerData.father_husband_name}
                onChangeText={(v) => setField("father_husband_name", v)}
                returnKeyType="next"
              />
            </Field>

            {/* DOB + CNIC */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field
                  label="Date of Birth"
                  required
                  error={errors.date_of_birth}
                >
                  <TouchableOpacity
                    style={[
                      styles.inputRow,
                      errors.date_of_birth && styles.inputError,
                    ]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text
                      style={[
                        styles.inputRowText,
                        !date && { color: "#A9A9A9" },
                      ]}
                    >
                      {date ? date.toLocaleDateString() : "Select Date"}
                    </Text>
                    <Feather name="calendar" size={18} color="#7A7A7A" />
                  </TouchableOpacity>
                </Field>
                {showDatePicker && (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="CNIC" error={errors.cnic}>
                  <TextInput
                    placeholder="13-digit CNIC"
                    placeholderTextColor="#A9A9A9"
                    style={[styles.input, errors.cnic && styles.inputError]}
                    value={farmerData.cnic}
                    onChangeText={(v) => setField("cnic", v)}
                    keyboardType="numeric"
                    maxLength={13}
                    returnKeyType="next"
                  />
                </Field>
              </View>
            </View>

            {/* Email + Phone */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Email" required error={errors.email}>
                  <TextInput
                    placeholder="Enter Email"
                    placeholderTextColor="#A9A9A9"
                    style={[styles.input, errors.email && styles.inputError]}
                    value={farmerData.email}
                    onChangeText={(v) => setField("email", v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Phone No." error={errors.phone}>
                  <TextInput
                    placeholder="Enter Phone"
                    placeholderTextColor="#A9A9A9"
                    style={[styles.input, errors.phone && styles.inputError]}
                    value={farmerData.phone}
                    onChangeText={(v) => setField("phone", v)}
                    keyboardType="phone-pad"
                    maxLength={11}
                    returnKeyType="next"
                  />
                </Field>
              </View>
            </View>

            <Field label="Address" required error={errors.address}>
              <TextInput
                placeholder="Enter Address"
                placeholderTextColor="#A9A9A9"
                style={[styles.input, errors.address && styles.inputError]}
                value={farmerData.address}
                onChangeText={(v) => setField("address", v)}
                returnKeyType="next"
              />
            </Field>

            {/* Cluster */}
            <Field label="Select Cluster" error={errors.cluster_id}>
              <TouchableOpacity
                style={[
                  styles.inputRow,
                  errors.cluster_id && styles.inputError,
                ]}
                onPress={() => setActiveDropdown("cluster")}
              >
                <Text
                  style={[
                    styles.inputRowText,
                    !farmerData.cluster_name && { color: "#A9A9A9" },
                  ]}
                >
                  {farmerData.cluster_name || "Select Cluster"}
                </Text>
                <Feather name="chevron-down" size={18} color="#7A7A7A" />
              </TouchableOpacity>
            </Field>

            {/* Tehsil — searchable, uses full JSON */}
            <Field label="Tehsil" error={errors.tehsil}>
              <TouchableOpacity
                style={[styles.inputRow, errors.tehsil && styles.inputError]}
                onPress={() => setActiveDropdown("tehsil")}
              >
                <Text
                  style={[
                    styles.inputRowText,
                    !farmerData.tehsil && { color: "#A9A9A9" },
                  ]}
                >
                  {farmerData.tehsil || "Search Tehsil"}
                </Text>
                <Feather name="chevron-down" size={18} color="#7A7A7A" />
              </TouchableOpacity>
            </Field>

            {/* Organization (admin only) */}
            {userRole === "admin" && (
              <Field
                label="Select Organization"
                required
                error={errors.organization_id}
              >
                <TouchableOpacity
                  style={[
                    styles.inputRow,
                    errors.organization_id && styles.inputError,
                  ]}
                  onPress={() => setActiveDropdown("organization")}
                >
                  <Text
                    style={[
                      styles.inputRowText,
                      !farmerData.organization_name && { color: "#A9A9A9" },
                    ]}
                  >
                    {farmerData.organization_name || "Search Organization"}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#7A7A7A" />
                </TouchableOpacity>
              </Field>
            )}

            {/* Data Knowledge */}
            <Field label="Data Knowledge">
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setActiveDropdown("data_knowledge")}
              >
                <Text
                  style={[
                    styles.inputRowText,
                    !farmerData.data_knowledge && { color: "#A9A9A9" },
                  ]}
                >
                  {farmerData.data_knowledge || "Select Data Knowledge"}
                </Text>
                <Feather name="chevron-down" size={18} color="#7A7A7A" />
              </TouchableOpacity>
            </Field>

            {/* Farmer Responsivity */}
            <Field label="Farmer Responsivity">
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setActiveDropdown("farmer_responsivity")}
              >
                <Text
                  style={[
                    styles.inputRowText,
                    !farmerData.farmer_responsivity && { color: "#A9A9A9" },
                  ]}
                >
                  {farmerData.farmer_responsivity ||
                    "Select Farmer Responsivity"}
                </Text>
                <Feather name="chevron-down" size={18} color="#7A7A7A" />
              </TouchableOpacity>
            </Field>

            {/* Farmer Code */}
            <Field label="Farmer Code" required error={errors.farmerCode}>
              <TextInput
                placeholder="Enter Code"
                placeholderTextColor="#A9A9A9"
                style={[styles.input, errors.farmerCode && styles.inputError]}
                value={farmerData.farmerCode}
                onChangeText={(v) => setField("farmerCode", v)}
                returnKeyType="done"
              />
              <Text style={styles.hint}>Next available: {nextFarmerCode}</Text>
            </Field>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Cluster — searchable ── */}
      <SearchableDropdownModal
        visible={activeDropdown === "cluster"}
        title="Select Cluster"
        options={clusters}
        labelKey="cluster_name"
        onSelect={(item) => {
          setField("cluster_id", item.id);
          setField("cluster_name", item.cluster_name);
        }}
        onClose={() => setActiveDropdown(null)}
      />

      {/* ── Tehsil — searchable, full JSON ── */}
      <SearchableDropdownModal
        visible={activeDropdown === "tehsil"}
        title="Select Tehsil"
        options={ALL_TEHSILS}
        labelKey="name"
        subLabelKey="district"
        onSelect={(item) => setField("tehsil", item.name)}
        onClose={() => setActiveDropdown(null)}
      />

      {/* ── Organization — searchable ── */}
      <SearchableDropdownModal
        visible={activeDropdown === "organization"}
        title="Select Organization"
        options={organizations}
        labelKey="username"
        onSelect={(item) => {
          setField("organization_id", item.id);
          setField("organization_name", item.username || item.email);
        }}
        onClose={() => setActiveDropdown(null)}
      />

      {/* ── Data Knowledge ── */}
      <DropdownModal
        visible={activeDropdown === "data_knowledge"}
        title="Data Knowledge"
        options={dataKnowledgeOptions}
        onSelect={(item) => setField("data_knowledge", item)}
        onClose={() => setActiveDropdown(null)}
      />

      {/* ── Farmer Responsivity ── */}
      <DropdownModal
        visible={activeDropdown === "farmer_responsivity"}
        title="Farmer Responsivity"
        options={responsivityOptions}
        onSelect={(item) => setField("farmer_responsivity", item)}
        onClose={() => setActiveDropdown(null)}
      />
    </SafeAreaView>
  );
};

export default AddNewFarmer;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#4E4E4E", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#4E4E4E" },
  scrollView: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: "row", paddingTop: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#383838", marginBottom: 2 },
  input: {
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    borderColor: "#D8D8D8",
    borderWidth: 1,
    marginTop: 9,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "#383838",
    fontSize: 13,
  },
  inputError: { borderColor: "#EF4444" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    borderColor: "#D8D8D8",
    borderWidth: 1,
    marginTop: 9,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  inputRowText: { fontSize: 13, color: "#383838", flex: 1 },
  errorText: { color: "#EF4444", fontSize: 11, marginTop: 4 },
  hint: { fontSize: 11, color: "#878787", marginTop: 4 },
  saveBtn: {
    backgroundColor: "#39B54B",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#A5D6A7",
    elevation: 0,
    shadowOpacity: 0,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: { fontSize: 15, fontWeight: "700", color: "#2A2A2A" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#2A2A2A",
    paddingVertical: 0,
  },
  emptyText: {
    textAlign: "center",
    color: "#AAA",
    fontSize: 13,
    paddingVertical: 24,
  },
  row: { paddingHorizontal: 20, paddingVertical: 14 },
  rowText: { fontSize: 14, color: "#383838", fontWeight: "500" },
  rowSub: { fontSize: 11, color: "#999", marginTop: 2 },
  sep: { height: 1, backgroundColor: "#F5F5F5", marginHorizontal: 20 },
});

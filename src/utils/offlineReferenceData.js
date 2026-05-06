import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVER_URL } from "./index";
import { getOfflineMapTileMeta } from "./offlineMapTiles";

const ADD_FARMER_OFFLINE_KEY = "offline_add_farmer_reference_v1";
const ADD_FIELD_OFFLINE_KEY = "offline_add_field_reference_v1";

const withAuth = (token) => ({
  "Content-Type": "application/json",
  "x-auth-token": token,
});

const fetchJson = async (url, token) => {
  const res = await fetch(url, { headers: withAuth(token) });
  return res.json();
};

export const saveAddFarmerOfflineReference = async (payload) => {
  await AsyncStorage.setItem(ADD_FARMER_OFFLINE_KEY, JSON.stringify(payload));
};

export const getAddFarmerOfflineReference = async () => {
  try {
    const raw = await AsyncStorage.getItem(ADD_FARMER_OFFLINE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("getAddFarmerOfflineReference error:", e);
    return null;
  }
};

export const prepareAddFarmerOfflineReference = async ({ token, userRole }) => {
  const [clusterJson, codeJson, orgJson] = await Promise.all([
    fetchJson(`${SERVER_URL}/api/cluster?limit=10000000`, token),
    fetchJson(`${SERVER_URL}/api/farmers/code/get`, token),
    userRole === "admin"
      ? fetchJson(`${SERVER_URL}/api/organization?page=1&limit=1000000`, token)
      : Promise.resolve({ success: true, data: [] }),
  ]);

  if (!clusterJson?.success) throw new Error("Failed to fetch cluster list");
  if (!codeJson?.success) throw new Error("Failed to fetch farmer code");
  if (userRole === "admin" && !orgJson?.success) {
    throw new Error("Failed to fetch organizations");
  }

  const reference = {
    clusters: clusterJson.data || [],
    organizations: orgJson.data || [],
    nextFarmerCode:
      codeJson?.nextFarmerCode === null || codeJson?.nextFarmerCode === undefined
        ? ""
        : String(codeJson.nextFarmerCode),
    preparedAt: new Date().toISOString(),
  };

  await saveAddFarmerOfflineReference(reference);
  return reference;
};

export const saveAddFieldOfflineReference = async (payload) => {
  await AsyncStorage.setItem(ADD_FIELD_OFFLINE_KEY, JSON.stringify(payload));
};

export const getAddFieldOfflineReference = async () => {
  try {
    const raw = await AsyncStorage.getItem(ADD_FIELD_OFFLINE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("getAddFieldOfflineReference error:", e);
    return null;
  }
};

export const prepareAddFieldOfflineReference = async ({ token }) => {
  const [farmersRes, clustersRes, repsRes] = await Promise.all([
    fetchJson(
      `${SERVER_URL}/api/farmers?page=1&limit=10000&search=&sortBy=id&order=ASC`,
      token,
    ),
    fetchJson(`${SERVER_URL}/api/cluster?limit=10000000`, token),
    fetchJson(`${SERVER_URL}/api/user/employee?limit=10000000`, token),
  ]);

  if (!clustersRes?.success) throw new Error("Failed to fetch clusters");
  if (!repsRes?.success) throw new Error("Failed to fetch representatives");

  const categories = ["cash_crop", "vegetables", "horticulture", "forestry"];
  const cropResults = await Promise.all(
    categories.map((cat) =>
      fetchJson(`${SERVER_URL}/api/cropType/category/${cat}`, token).then((r) => ({
        cat,
        data: r?.success ? r.data || [] : [],
      })),
    ),
  );

  const cropTypesByCategory = cropResults.reduce((acc, curr) => {
    acc[curr.cat] = curr.data;
    return acc;
  }, {});

  const reference = {
    farmers:
      (farmersRes?.data || []).map((f) => ({
        label:
          `${f.first_name || ""} ${f.last_name || ""}`.trim() ||
          f.username ||
          `Farmer ${f.id}`,
        value: String(f.id),
      })) || [],
    clusters: clustersRes.data || [],
    representatives: repsRes.data || [],
    cropTypesByCategory,
    preparedAt: new Date().toISOString(),
  };

  await saveAddFieldOfflineReference(reference);
  return reference;
};

export const saveFieldBookOfflineSnapshot = async ({ fieldId, data }) => {
  const key = `offline_fieldbook_snapshot_${fieldId}`;
  await AsyncStorage.setItem(
    key,
    JSON.stringify({ fieldId, data, savedAt: new Date().toISOString() }),
  );
};

export const getFieldBookOfflineSnapshot = async (fieldId) => {
  try {
    const key = `offline_fieldbook_snapshot_${fieldId}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("getFieldBookOfflineSnapshot error:", e);
    return null;
  }
};

export const getOfflinePreparationSummary = async () => {
  const [farmerRef, fieldRef, mapMeta] = await Promise.all([
    getAddFarmerOfflineReference(),
    getAddFieldOfflineReference(),
    getOfflineMapTileMeta(),
  ]);
  const times = [farmerRef?.preparedAt, fieldRef?.preparedAt, mapMeta?.preparedAt].filter(Boolean);
  const lastPreparedAt = times.length
    ? times.sort((a, b) => new Date(b) - new Date(a))[0]
    : null;
  return { lastPreparedAt, farmerRef, fieldRef, mapMeta };
};

const incrementCode = (code) => {
  if (code === null || code === undefined) return "";
  const normalizedCode =
    typeof code === "string" || typeof code === "number" ? String(code) : "";
  if (!normalizedCode) return "";

  const match = normalizedCode.match(/^(.*?)(\d+)$/);
  if (!match) return normalizedCode;
  const [, prefix, numPart] = match;
  const nextNum = String(Number(numPart) + 1).padStart(numPart.length, "0");
  return `${prefix}${nextNum}`;
};

export const consumeOfflineFarmerCode = async () => {
  const reference = await getAddFarmerOfflineReference();
  if (!reference?.nextFarmerCode) return null;

  const currentCode = String(reference.nextFarmerCode);
  const updated = {
    ...reference,
    nextFarmerCode: incrementCode(reference.nextFarmerCode),
    preparedAt: new Date().toISOString(),
  };
  await saveAddFarmerOfflineReference(updated);
  return { currentCode, nextCode: updated.nextFarmerCode };
};

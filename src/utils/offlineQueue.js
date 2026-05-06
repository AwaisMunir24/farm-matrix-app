import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_sync_queue_v2";
const listeners = new Set();

const notify = () => {
  listeners.forEach((cb) => cb());
};

export const subscribeQueueChanges = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const isConflict = (status, message = "") => {
  if (status === 409 || status === 422) return true;
  const m = String(message).toLowerCase();
  return (
    m.includes("already exists") ||
    m.includes("duplicate") ||
    m.includes("user_code") ||
    m.includes("cnic already")
  );
};

const buildRequestForItem = (serverUrl, item, authToken) => {
  if (item.type === "farmer_create") {
    return {
      url: `${serverUrl}/api/user`,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken,
        },
        body: JSON.stringify(item.payload),
      },
    };
  }

  if (item.type === "field_create") {
    return {
      url: `${serverUrl}/api/field`,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken,
        },
        body: JSON.stringify(item.payload),
      },
    };
  }

  if (item.type === "field_visit_create") {
    const data = new FormData();
    data.append("visit_date", item.payload.visit_date);
    data.append("farming_activity", item.payload.farming_activity);
    data.append("comment", item.payload.comment || "");
    data.append("representative_id", item.payload.representative_id);
    data.append("fieldbook_id", item.payload.fieldbook_id);
    if (item.payload.image) {
      data.append("images", item.payload.image);
    }
    return {
      url: `${serverUrl}/api/fieldVisit`,
      options: {
        method: "POST",
        headers: {
          "x-auth-token": authToken,
          "Content-Type": "multipart/form-data",
        },
        body: data,
      },
    };
  }

  throw new Error(`Unsupported queue type: ${item.type}`);
};

export const getQueueItems = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getQueueItems error:", e);
    return [];
  }
};

const saveQueueItems = async (items) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  notify();
};

export const enqueueItem = async ({
  type,
  payload,
  meta = {},
  localId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
}) => {
  const existing = await getQueueItems();
  const item = {
    id: localId,
    type,
    payload,
    meta,
    savedAt: new Date().toISOString(),
  };
  await saveQueueItems([...existing, item]);
  return item.id;
};

export const removeQueueItem = async (itemId) => {
  const existing = await getQueueItems();
  const updated = existing.filter((d) => d.id !== itemId);
  await saveQueueItems(updated);
};

export const getPendingCounts = async () => {
  const items = await getQueueItems();
  return {
    total: items.length,
    farmer: items.filter((i) => i.type === "farmer_create").length,
    field: items.filter((i) => i.type === "field_create").length,
    fieldVisit: items.filter((i) => i.type === "field_visit_create").length,
  };
};

export const syncQueueItem = async (serverUrl, authToken, item) => {
  const { url, options } = buildRequestForItem(serverUrl, item, authToken);
  const res = await fetch(url, options);
  const body = await safeJson(res);
  const ok = res.ok && (body.success !== false);

  if (ok) {
    await removeQueueItem(item.id);
    return { status: "uploaded", body };
  }

  const message = body?.message || JSON.stringify(body?.errors || {});
  if (isConflict(res.status, message)) {
    await removeQueueItem(item.id);
    return { status: "conflict", message };
  }

  return { status: "failed", message, statusCode: res.status };
};

export const syncQueue = async (serverUrl, authToken) => {
  const items = await getQueueItems();
  if (!items.length) {
    return { uploaded: 0, failed: 0, conflict: 0 };
  }

  let uploaded = 0;
  let failed = 0;
  let conflict = 0;

  for (const item of items) {
    try {
      const result = await syncQueueItem(serverUrl, authToken, item);
      if (result.status === "uploaded") uploaded++;
      if (result.status === "failed") failed++;
      if (result.status === "conflict") conflict++;
    } catch {
      failed++;
    }
  }

  return { uploaded, failed, conflict };
};

// Backward compatible wrappers
export const saveDraft = async (farmerPayload) =>
  enqueueItem({
    type: "farmer_create",
    payload: farmerPayload,
    meta: {
      title: `${farmerPayload.first_name || ""} ${farmerPayload.last_name || ""}`.trim(),
    },
  });

export const getDrafts = async () => getQueueItems();
export const removeDraft = async (draftId) => removeQueueItem(draftId);
export const syncDrafts = async (serverUrl, authToken) =>
  syncQueue(serverUrl, authToken);

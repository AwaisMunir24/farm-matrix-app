import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "farmer_draft_queue";

// Save a farmer payload as a draft
export const saveDraft = async (farmerPayload) => {
  try {
    const existing = await getDrafts();
    const draft = {
      id: `draft_${Date.now()}`,
      payload: farmerPayload,
      savedAt: new Date().toISOString(),
    };
    const updated = [...existing, draft];
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    return draft.id;
  } catch (e) {
    console.error("saveDraft error:", e);
    throw e;
  }
};

// Get all pending drafts
export const getDrafts = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("getDrafts error:", e);
    return [];
  }
};

// Remove a single draft by id (after successful upload)
export const removeDraft = async (draftId) => {
  try {
    const existing = await getDrafts();
    const updated = existing.filter((d) => d.id !== draftId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("removeDraft error:", e);
  }
};

// Sync all drafts to server — returns { uploaded, failed }
export const syncDrafts = async (serverUrl, authToken) => {
  const drafts = await getDrafts();
  if (!drafts.length) return { uploaded: 0, failed: 0 };

  let uploaded = 0;
  let failed = 0;

  for (const draft of drafts) {
    try {
      const res = await fetch(`${serverUrl}/api/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken,
        },
        body: JSON.stringify(draft.payload),
      });
      const result = await res.json();
      if (result.success) {
        await removeDraft(draft.id);
        uploaded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { uploaded, failed };
};

export const debugSync = async (serverUrl, authToken) => {
  console.log("=== DEBUG SYNC START ===");
  console.log("SERVER_URL:", serverUrl);
  console.log("authToken:", authToken ? `${authToken.substring(0, 20)}...` : "MISSING/NULL");
  
  const drafts = await getDrafts();
  console.log("Drafts in queue:", JSON.stringify(drafts, null, 2));
  
  if (!drafts.length) {
    console.log("NO DRAFTS FOUND - queue is empty");
    return;
  }

  if (!authToken) {
    console.log("AUTH TOKEN IS NULL/UNDEFINED - this will cause 401");
    return;
  }

  // Try syncing the first draft manually
  const draft = drafts[0];
  console.log("Attempting to upload draft:", draft.id);
  try {
    const res = await fetch(`${serverUrl}/api/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": authToken,
      },
      body: JSON.stringify(draft.payload),
    });
    console.log("Response status:", res.status);
    const result = await res.json();
    console.log("Response body:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
};

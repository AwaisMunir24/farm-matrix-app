import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONFIG
// To switch to dynamic auth later, set USE_STATIC_TOKEN = false
// and the app will automatically read from AsyncStorage instead.
// ─────────────────────────────────────────────────────────────────────────────

const USE_STATIC_TOKEN = true;

const STATIC_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc0MzcxMTExLCJleHAiOjE3NzUyMzUxMTF9.qAYbeTTv_qVlsDilJNs_aSw_6K9Tg_Tsk44FqqaUKHs";

const STATIC_USER = {
  id: 1,
  email: "admin@email.com",
  username: "honey001",
  role: "admin",
  token: STATIC_TOKEN,
};

// ─── Get the auth token ───────────────────────────────────────────────────────
export const getAuthToken = async () => {
  if (USE_STATIC_TOKEN) return STATIC_TOKEN;
  try {
    const stored = await AsyncStorage.getItem("user");
    if (stored) return JSON.parse(stored).token;
  } catch (e) {
    console.error("getAuthToken error:", e);
  }
  return null;
};

// ─── Get the full user object ─────────────────────────────────────────────────
export const getAuthUser = async () => {
  if (USE_STATIC_TOKEN) return STATIC_USER;
  try {
    const stored = await AsyncStorage.getItem("user");
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("getAuthUser error:", e);
  }
  return null;
};

// ─── Save user to storage (used on login) ────────────────────────────────────
export const saveAuthUser = async (user) => {
  try {
    await AsyncStorage.setItem("user", JSON.stringify(user));
  } catch (e) {
    console.error("saveAuthUser error:", e);
  }
};

// ─── Clear user from storage (used on logout) ────────────────────────────────
export const clearAuthUser = async () => {
  try {
    await AsyncStorage.removeItem("user");
  } catch (e) {
    console.error("clearAuthUser error:", e);
  }
};

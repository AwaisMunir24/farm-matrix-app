import AsyncStorage from "@react-native-async-storage/async-storage";

<<<<<<< HEAD
const KEYS = {
  USER: "auth_user",
  ONBOARDING_DONE: "onboarding_done",
=======
// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONFIG
// To switch to dynamic auth later, set USE_STATIC_TOKEN = false
// and the app will automatically read from AsyncStorage instead.
// ─────────────────────────────────────────────────────────────────────────────

const USE_STATIC_TOKEN = true;

const STATIC_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc0NTg1MDA3LCJleHAiOjE3NzU0NDkwMDd9.cqbnAub_GmuclCwR1VOdKHYnYc0ejs6oX6SwLK7OJzw";

const STATIC_USER = {
  id: 1,
  email: "admin@email.com",
  username: "honey001",
  role: "admin",
  token: STATIC_TOKEN,
>>>>>>> 40103c75492203a5c90af3127d3f0af14a36c2ac
};

// ── Token / User ──────────────────────────────────────────────────────────────

export const saveAuthUser = async (user) => {
  try {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (e) {
    console.error("saveAuthUser error:", e);
  }
};

export const getAuthUser = async () => {
  try {
    const stored = await AsyncStorage.getItem(KEYS.USER);
    if (!stored) return null;
    const user = JSON.parse(stored);
    // Decode JWT exp without a library and auto-clear if expired
    if (user?.token) {
      try {
        const payload = JSON.parse(atob(user.token.split(".")[1]));
        if (payload?.exp && Date.now() / 1000 > payload.exp) {
          await clearAuthUser();
          return null;
        }
      } catch {
        // malformed token — clear it
        await clearAuthUser();
        return null;
      }
    }
    return user;
  } catch (e) {
    console.error("getAuthUser error:", e);
    return null;
  }
};

export const getAuthToken = async () => {
  const user = await getAuthUser();
  return user?.token ?? null;
};

export const clearAuthUser = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.USER);
  } catch (e) {
    console.error("clearAuthUser error:", e);
  }
};

// ── Onboarding ────────────────────────────────────────────────────────────────

export const markOnboardingDone = async () => {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, "true");
  } catch (e) {
    console.error("markOnboardingDone error:", e);
  }
};

export const hasSeenOnboarding = async () => {
  try {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
    return val === "true";
  } catch (e) {
    console.error("hasSeenOnboarding error:", e);
    return false;
  }
};
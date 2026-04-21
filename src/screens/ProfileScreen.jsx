import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { getAuthUser, clearAuthUser } from "../utils/auth"; // adjust path as needed

const { width: SW } = Dimensions.get("window");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (firstName = "", lastName = "") => {
  const f = firstName.trim()[0] ?? "";
  const l = lastName.trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
};

const maskPhone = (phone = "") => {
  if (!phone) return "—";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return digits.slice(0, -4).replace(/./g, "•") + digits.slice(-4);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const InfoCard = ({ icon, label, value, mono = false }) => (
  <View style={card.row}>
    <View style={card.iconWrap}>
      <Feather name={icon} size={16} color="#39B54B" />
    </View>
    <View style={card.textWrap}>
      <Text style={card.label}>{label}</Text>
      <Text style={[card.value, mono && card.valueMono]} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
    <View style={card.verifiedDot} />
  </View>
);

const SectionTitle = ({ title }) => <Text style={sec.title}>{title}</Text>;

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getAuthUser();
      setUser(stored);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);
   console.log(user, "user info is here===")
;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F7F5" />
        <ActivityIndicator size="large" color="#39B54B" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  const firstName = user?.first_name || user?.firstName ||  user?.username;
  const lastName = user?.last_name || user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || user?.name || "Account";
  const email = user?.email || "";
  const phone = user?.phone || user?.mobile || "";
  const role = "Representative";
  const initials = getInitials(firstName, lastName);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7F5" />

      {/* ── Top Navigation Bar */}
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={styles.navBadge}>
          <View style={styles.navBadgeDot} />
          <Text style={styles.navBadgeText}>Active</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <View style={styles.heroOuter}>
          <LinearGradient
            colors={["#1B3A2D", "#2D5A3D", "#39B54B"]}
            style={styles.heroBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative circles */}
            <View style={styles.decCircle1} />
            <View style={styles.decCircle2} />
            <View style={styles.decCircle3} />

            {/* Avatar */}
            <View style={styles.avatarRing}>
              <LinearGradient
                colors={["#ffffff22", "#ffffff44"]}
                style={styles.avatarGrad}
              >
                <Text style={styles.avatarInitials}>{initials}</Text>
              </LinearGradient>
            </View>

            {/* Name & role */}
            <Text style={styles.heroName}>{fullName}</Text>
            <View style={styles.rolePill}>
              <Feather name="award" size={11} color="#39B54B" />
              <Text style={styles.roleText}>{role}</Text>
            </View>

            {/* ID strip */}
            {user?.id && (
              <Text style={styles.heroId}>
                ID #{String(user.id)}
              </Text>
            )}
          </LinearGradient>
        </View>


        {/* ── Contact Information ── */}
        <View style={styles.section}>
          <SectionTitle title="Contact Information" />
          <View style={styles.card}>
            <InfoCard icon="user" label="Full Name" value={fullName} />
            <View style={card.divider} />
            <InfoCard icon="mail" label="Email Address" value={email} />
            <View style={card.divider} />
            <InfoCard icon="phone" label="Phone Number" value={phone} mono />
          </View>
        </View>

        {/* ── Account Details ── */}
        {(user?.id || user?.created_at || user?.createdAt) && (
          <View style={styles.section}>
            <SectionTitle title="Account Details" />
            <View style={styles.card}>
              {user?.id && (
                <>
                  <InfoCard
                    icon="hash"
                    label="Account ID"
                    value={`#${String(user.id)}`}
                    mono
                  />
                  <View style={card.divider} />
                </>
              )}
              {(user?.created_at || user?.createdAt) && (
                <InfoCard
                  icon="calendar"
                  label="Member Since"
                  value={new Date(
                    user.created_at || user.createdAt,
                  ).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = "#39B54B";
const GREEN_DARK = "#2D8F3C";
const BG = "#F5F7F5";
const WHITE = "#FFFFFF";
const BORDER = "#ECEEED";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const TEXT_MUTED = "#9CA3AF";

const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
  },

  // ── Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 8 : 8,
    paddingBottom: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  navBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  navBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN_DARK,
    letterSpacing: 0.3,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 150 },

  // ── Hero
  heroOuter: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    overflow: "hidden",
    ...SHADOW,
  },
  heroBg: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -60,
    right: -40,
  },
  decCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -20,
    left: -20,
  },
  decCircle3: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: 40,
    left: 30,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    padding: 3,
    marginBottom: 16,
  },
  avatarGrad: {
    flex: 1,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 8,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_DARK,
    letterSpacing: 0.3,
  },
  heroId: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // ── Stats row
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  statItem: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
    ...SHADOW,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // ── Sections
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...SHADOW,
  },

  // ── Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 28,
    paddingVertical: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: 0.2,
  },

  // ── Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TEXT_MUTED,
  },
  footerText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});

// ── Card row styles (separate StyleSheet for sub-component)
const card = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 56,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  valueMono: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.5,
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1FAE5",
    borderWidth: 1.5,
    borderColor: GREEN,
  },
});

const sec = StyleSheet.create({
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
});

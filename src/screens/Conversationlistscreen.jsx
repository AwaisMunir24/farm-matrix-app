import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  TextInput,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { SERVER_URL } from "../utils";
import { getAuthUser } from "../utils/auth";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#34B349",
  primaryDark: "#279138",
  primaryLight: "#EBF8ED",
  bg: "#F0F4F0",
  white: "#FFFFFF",
  text: "#1A1A1A",
  textMuted: "#8A8A8A",
  border: "#E2EBE2",
  danger: "#E53935",
  dangerDark: "#C62828",
  dangerLight: "#FFEBEE",
  shadow: "#000",
  surface: "#FFFFFF",
  sectionText: "#5A5A5A",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
};

const getGroupLabel = (iso) => {
  if (!iso) return "Older";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Previous 7 Days";
  if (diffDays < 30) return "Previous 30 Days";
  return d.toLocaleDateString([], { month: "long", year: "numeric" });
};

const groupSessions = (sessions) => {
  const groups = {};
  sessions.forEach((s) => {
    const label = getGroupLabel(s.last_activity_at || s.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  });
  const order = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days"];
  const sorted = [];
  order.forEach((label) => {
    if (groups[label]) {
      sorted.push({ type: "header", label });
      groups[label].forEach((c) => sorted.push({ type: "item", data: c }));
      delete groups[label];
    }
  });
  Object.keys(groups)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach((label) => {
      sorted.push({ type: "header", label });
      groups[label].forEach((c) => sorted.push({ type: "item", data: c }));
    });
  return sorted;
};

// ─── Creative Delete Modal ─────────────────────────────────────────────────────
const DeleteModal = ({ visible, session, onConfirm, onCancel }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const trashBounce = useRef(new Animated.Value(1)).current;
  const trashRotate = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      particleAnim.setValue(0);
      // Backdrop fade in + modal scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 130,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Trash icon: bounce + slight rotation loop
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(trashBounce, {
              toValue: 1.18,
              duration: 480,
              useNativeDriver: true,
            }),
            Animated.timing(trashRotate, {
              toValue: 1,
              duration: 480,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(trashBounce, {
              toValue: 1,
              duration: 480,
              useNativeDriver: true,
            }),
            Animated.timing(trashRotate, {
              toValue: 0,
              duration: 480,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      trashBounce.setValue(1);
      trashRotate.setValue(0);
    }
  }, [visible]);

  const handleDelete = () => {
    // Shake + particle burst before closing
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 7,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -7,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 55,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start(() => onConfirm());
  };

  if (!visible) return null;

  const title = session?.title || "this conversation";
  const rotateInterp = trashRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[deleteStyles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel}
        />
        <Animated.View
          style={[
            deleteStyles.card,
            { transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] },
          ]}
        >
          {/* Top decorative bar with stripes */}
          <LinearGradient
            colors={[C.danger, C.dangerDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={deleteStyles.topBar}
          />

          {/* Particle dots decoration */}
          <Animated.View
            style={[
              deleteStyles.particleDot,
              deleteStyles.p1,
              {
                opacity: particleAnim.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0.25, 1, 0],
                }),
                transform: [
                  {
                    translateY: particleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              deleteStyles.particleDot,
              deleteStyles.p2,
              {
                opacity: particleAnim.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0.2, 1, 0],
                }),
                transform: [
                  {
                    translateY: particleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -22],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              deleteStyles.particleDot,
              deleteStyles.p3,
              {
                opacity: particleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.2, 1, 0],
                }),
                transform: [
                  {
                    translateY: particleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -18],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Trash icon */}
          <Animated.View
            style={[
              deleteStyles.iconCircle,
              { transform: [{ scale: trashBounce }, { rotate: rotateInterp }] },
            ]}
          >
            <LinearGradient
              colors={["#FFCDD2", C.dangerLight]}
              style={deleteStyles.iconCircleGrad}
            >
              <Text style={deleteStyles.trashIcon}>🗑️</Text>
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={deleteStyles.title}>Delete Conversation?</Text>
          <Text style={deleteStyles.sub}>
            You're about to permanently delete
          </Text>

          {/* Session name pill */}
          <View style={deleteStyles.namePill}>
            <Text style={deleteStyles.nameText} numberOfLines={2}>
              "{title}"
            </Text>
          </View>

          <View style={deleteStyles.warningBox}>
            <Text style={deleteStyles.warningIcon}>⚠️</Text>
            <Text style={deleteStyles.warningText}>
              This action cannot be undone.{"\n"}All messages will be lost
              forever.
            </Text>
          </View>

          {/* Divider */}
          <View style={deleteStyles.divider} />

          {/* Buttons */}
          <View style={deleteStyles.btnRow}>
            <TouchableOpacity
              style={deleteStyles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
            >
              <Text style={deleteStyles.cancelIcon}>↩</Text>
              <Text style={deleteStyles.cancelText}>Keep it</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              activeOpacity={0.85}
              style={deleteStyles.deleteBtnWrap}
            >
              <LinearGradient
                colors={[C.danger, C.dangerDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={deleteStyles.deleteBtn}
              >
                <Text style={deleteStyles.deleteBtnIcon}>🗑</Text>
                <Text style={deleteStyles.deleteBtnText}>Delete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const deleteStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 24,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
  topBar: { width: "100%", height: 6 },
  // Particle decorations
  particleDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.danger,
  },
  p1: { top: 70, left: 48 },
  p2: { top: 60, right: 54 },
  p3: { top: 90, left: SCREEN_W * 0.38 },
  iconCircle: { marginTop: 30, marginBottom: 14 },
  iconCircleGrad: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFCDD2",
  },
  trashIcon: { fontSize: 38 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  sub: { fontSize: 13, color: C.textMuted, marginBottom: 10 },
  namePill: {
    backgroundColor: C.dangerLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginHorizontal: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    maxWidth: "88%",
  },
  nameText: {
    fontSize: 13.5,
    color: C.dangerDark,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 19,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE082",
    gap: 8,
  },
  warningIcon: { fontSize: 15, marginTop: 1 },
  warningText: {
    flex: 1,
    fontSize: 12.5,
    color: "#6D4C00",
    lineHeight: 18,
    fontWeight: "500",
  },
  divider: { width: "100%", height: 1, backgroundColor: C.border },
  btnRow: { flexDirection: "row", width: "100%" },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: C.border,
    gap: 5,
  },
  cancelIcon: { fontSize: 16, color: C.textMuted },
  cancelText: { fontSize: 15, fontWeight: "600", color: C.textMuted },
  deleteBtnWrap: { flex: 1, overflow: "hidden" },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  deleteBtnIcon: { fontSize: 15 },
  deleteBtnText: { fontSize: 15, fontWeight: "700", color: C.white },
});

// ─── Session Card ─────────────────────────────────────────────────────────────
const SessionCard = React.memo(({ item, onPress, onLongPress, index }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        delay: index * 45,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        delay: index * 45,
        tension: 90,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  const title = item.title || "New conversation";
  const preview = item.last_message || "No messages yet";
  const msgCount = item.message_count || 0;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { opacity: fade, transform: [{ translateY: slide }, { scale }] },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => onLongPress(item)}
        delayLongPress={500}
        activeOpacity={1}
      >
        {/* Avatar */}
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          style={styles.cardAvatar}
        >
          <Text style={styles.cardAvatarText}>AI</Text>
        </LinearGradient>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.cardDate}>
              {formatDate(item.last_activity_at || item.created_at)}
            </Text>
          </View>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardPreview} numberOfLines={1}>
              {preview}
            </Text>
            {msgCount > 0 && (
              <View style={styles.msgBadge}>
                <Text style={styles.msgBadgeText}>{msgCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Long press hint */}
        <View style={styles.deleteHint}>
          <Text style={styles.deleteHintText}>⋯</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Group Header ─────────────────────────────────────────────────────────────
const GroupHeader = ({ label }) => (
  <View style={styles.groupHeader}>
    <Text style={styles.groupLabel}>{label}</Text>
  </View>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ onNewChat }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.emptyWrap}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <LinearGradient
          colors={[C.primaryLight, "#D4F0DA"]}
          style={styles.emptyCircle}
        >
          <Text style={styles.emptyEmoji}>🌱</Text>
        </LinearGradient>
      </Animated.View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySub}>
        Start a chat with your AI Farm{"\n"}Assistant for crop advice,{"\n"}
        weather insights & more.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={onNewChat}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          style={styles.emptyBtnGrad}
        >
          <Text style={styles.emptyBtnIcon}>✦</Text>
          <Text style={styles.emptyBtnText}>Start First Chat</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ─── Search Empty State ───────────────────────────────────────────────────────
const SearchEmpty = ({ query }) => (
  <View style={styles.searchEmptyWrap}>
    <Text style={styles.searchEmptyEmoji}>🔍</Text>
    <Text style={styles.searchEmptyTitle}>No results found</Text>
    <Text style={styles.searchEmptyText}>No conversations match "{query}"</Text>
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function ConversationListScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Search API state ────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  // ── Delete modal state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSessions(1, true);
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        delay: 250,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Refresh on screen focus
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      loadSessions(1, true);
    });
    return unsub;
  }, [navigation]);

  const loadSessions = (pageNum = 1, silent = false) => {
    if (!silent) setLoading(true);
    if (pageNum === 1) setRefreshing(true);

    getAuthUser()
      .then((user) => {
        const headers = user?.token ? { "x-auth-token": user.token } : {};
        return axios.get(`${SERVER_URL}/api/chatbot/sessions`, {
          params: { archived: false, page: pageNum, limit: 20 },
          headers,
        });
      })
      .then(({ data }) => {
        if (data.success) {
          const incoming = data.data.sessions || [];
          const totalPages = data.data.totalPages || 1;
          setSessions((prev) =>
            pageNum === 1 ? incoming : [...prev, ...incoming],
          );
          setHasMore(pageNum < totalPages);
          setPage(pageNum);
        }
      })
      .catch((err) => {
        console.error("loadSessions error:", err);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      });
  };

  const loadMore = () => {
    if (!hasMore || loadingMore || search.trim()) return;
    setLoadingMore(true);
    loadSessions(page + 1, true);
  };

  // ── Search via API with debounce ────────────────────────────────────────────
  const searchSessions = useCallback((q) => {
    clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const user = await getAuthUser();
        const headers = user?.token ? { "x-auth-token": user.token } : {};
        const { data } = await axios.get(
          `${SERVER_URL}/api/chatbot/sessions/search`,
          { params: { q: q.trim(), page: 1, limit: 20 }, headers },
        );
        if (data.success) {
          setSearchResults(data.data.sessions || []);
        }
      } catch (err) {
        console.error("searchSessions error:", err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }, []);

  const handleSearchChange = useCallback(
    (text) => {
      setSearch(text);
      searchSessions(text);
    },
    [searchSessions],
  );

  const clearSearch = useCallback(() => {
    clearTimeout(searchTimer.current);
    setSearch("");
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  // ── FIX: use navigation.push so every new chat is a fresh screen mount ──────
  const handleNewChat = useCallback(() => {
    navigation.push("Chat", {
      sessionId: null,
      sessionTitle: null,
      isNew: true,
      clearChat: true,
      timestamp: Date.now(),
    });
  }, [navigation]);

  const handleOpenSession = useCallback(
    (session) => {
      navigation.push("Chat", {
        sessionId: session.id,
        sessionTitle: session.title,
        isNew: false,
      });
    },
    [navigation],
  );

  // Long press → show delete modal
  const handleLongPress = useCallback((session) => {
    setDeleteTarget(session);
    setDeleteModalVisible(true);
  }, []);

  // Confirmed delete
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteModalVisible(false);
    setDeleteTarget(null);

    // Optimistic removal from both lists
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSearchResults((prev) => prev.filter((s) => s.id !== id));

    try {
      const user = await getAuthUser();
      const headers = user?.token ? { "x-auth-token": user.token } : {};
      await axios.delete(`${SERVER_URL}/api/chatbot/sessions/${id}`, {
        headers,
      });
    } catch (err) {
      console.error("deleteSession error:", err);
      loadSessions(1, true);
    }
  }, [deleteTarget]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
    setDeleteTarget(null);
  }, []);

  // Decide which sessions to display
  const displaySessions = search.trim() ? searchResults : sessions;
  const listData = groupSessions(displaySessions);

  const renderItem = ({ item, index }) => {
    if (item.type === "header") return <GroupHeader label={item.label} />;
    const cardIndex = listData
      .slice(0, index)
      .filter((i) => i.type === "item").length;
    return (
      <SessionCard
        item={item.data}
        onPress={handleOpenSession}
        onLongPress={handleLongPress}
        index={cardIndex}
      />
    );
  };

  // Determine empty component
  const renderEmpty = () => {
    if (search.trim() && !searchLoading) {
      return <SearchEmpty query={search} />;
    }
    if (!search.trim()) {
      return <EmptyState onNewChat={handleNewChat} />;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Creative Delete Modal */}
      <DeleteModal
        visible={deleteModalVisible}
        session={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* HEADER */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSub}>
            {sessions.length > 0
              ? `${sessions.length} conversation${sessions.length !== 1 ? "s" : ""}`
              : "Farm intelligence at your fingertips"}
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={handleNewChat}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={styles.newChatGrad}
            >
              <Text style={styles.newChatIcon}>✦</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* SEARCH — always visible once sessions exist */}
      {sessions.length > 0 && (
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            {searchLoading ? (
              <ActivityIndicator
                size="small"
                color={C.primary}
                style={{ marginRight: 8 }}
              />
            ) : (
              <Text style={styles.searchIcon}>🔍</Text>
            )}
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search conversations…"
              placeholderTextColor={C.textMuted}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* CONTENT */}
      {loading ? (
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadText}>Loading conversations…</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.type === "header"
              ? `h-${item.label}`
              : `s-${item.data.id}-${i}`
          }
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          onRefresh={() => {
            clearSearch();
            loadSessions(1, true);
          }}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreWrap}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      {sessions.length > 0 && !loading && (
        <Animated.View
          style={[styles.fab, { transform: [{ scale: fabScale }] }]}
        >
          <TouchableOpacity onPress={handleNewChat} activeOpacity={0.85}>
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={styles.fabGrad}
            >
              <Text style={styles.fabIcon}>✦</Text>
              <Text style={styles.fabText}>New Chat</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 34, color: C.primary, marginTop: -3 },
  headerCenter: { flex: 1, marginLeft: 6 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  newChatBtn: { marginLeft: 10 },
  newChatGrad: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  newChatIcon: { color: C.white, fontSize: 16 },

  searchWrap: {
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 0 },
  searchClear: { fontSize: 13, color: C.textMuted, paddingLeft: 8 },

  listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 100 },

  groupHeader: { paddingTop: 18, paddingBottom: 6, paddingHorizontal: 4 },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  cardWrapper: { marginBottom: 6 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardAvatarText: { color: C.white, fontWeight: "800", fontSize: 13 },
  cardContent: { flex: 1, minWidth: 0 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginRight: 8,
  },
  cardDate: { fontSize: 11, color: C.textMuted, flexShrink: 0 },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPreview: {
    flex: 1,
    fontSize: 13,
    color: C.textMuted,
    marginRight: 8,
    lineHeight: 17,
  },
  msgBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  msgBadgeText: { fontSize: 10, color: C.primaryDark, fontWeight: "700" },
  deleteHint: { paddingLeft: 8, paddingVertical: 4 },
  deleteHintText: { fontSize: 18, color: C.textMuted, fontWeight: "700" },

  loadWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadText: { marginTop: 12, color: C.textMuted, fontSize: 14 },
  loadMoreWrap: { paddingVertical: 16, alignItems: "center" },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  emptyEmoji: { fontSize: 46 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    marginBottom: 10,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13.5,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyBtn: { borderRadius: 14, overflow: "hidden" },
  emptyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 26,
    paddingVertical: 14,
    gap: 8,
  },
  emptyBtnIcon: { color: C.white, fontSize: 16 },
  emptyBtnText: { color: C.white, fontSize: 15, fontWeight: "700" },

  // Search empty
  searchEmptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  searchEmptyEmoji: { fontSize: 40, marginBottom: 14 },
  searchEmptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  searchEmptyText: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  fab: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: C.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 13,
    gap: 8,
  },
  fabIcon: { color: C.white, fontSize: 16 },
  fabText: { color: C.white, fontSize: 15, fontWeight: "700" },
});

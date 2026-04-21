import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Feather } from "@expo/vector-icons";
import { getDrafts, syncDrafts, removeDraft } from "../utils/offlineQueue";
import { SERVER_URL } from "../utils/index";

// ─── Draft Manager Modal ──────────────────────────────────────────────────────
const DraftManagerModal = ({
  visible,
  drafts,
  isOnline,
  onClose,
  onUploadOne,
  onDeleteOne,
  onUploadAll,
  uploadingId,
  uploadingAll,
}) => {
  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View>
              <Text style={modalStyles.title}>Pending Drafts</Text>
              <Text style={modalStyles.subtitle}>
                {drafts.length} farmer{drafts.length !== 1 ? "s" : ""} saved
                locally
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Feather name="x" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Upload All */}
          {isOnline && drafts.length > 1 && (
            <TouchableOpacity
              style={[
                modalStyles.uploadAllBtn,
                uploadingAll && modalStyles.uploadAllBtnDisabled,
              ]}
              onPress={onUploadAll}
              disabled={uploadingAll}
              activeOpacity={0.85}
            >
              {uploadingAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="upload-cloud" size={15} color="#fff" />
              )}
              <Text style={modalStyles.uploadAllText}>
                {uploadingAll
                  ? "Uploading all..."
                  : `Upload All (${drafts.length})`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Offline notice */}
          {!isOnline && (
            <View style={modalStyles.offlineBadge}>
              <Feather name="wifi-off" size={13} color="#B45309" />
              <Text style={modalStyles.offlineBadgeText}>
                No internet — connect to upload
              </Text>
            </View>
          )}

          {/* Draft List */}
          <FlatList
            data={drafts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ItemSeparatorComponent={() => (
              <View style={modalStyles.separator} />
            )}
            ListEmptyComponent={
              <View style={modalStyles.emptyState}>
                <Feather name="check-circle" size={32} color="#39B54B" />
                <Text style={modalStyles.emptyText}>All caught up!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isUploadingThis = uploadingId === item.id;
              const name = `${item.payload.first_name} ${item.payload.last_name}`;
              const code = item.payload.user_code;

              return (
                <View style={modalStyles.draftRow}>
                  {/* Left — avatar + info */}
                  <View style={modalStyles.draftAvatar}>
                    <Text style={modalStyles.draftAvatarText}>
                      {item.payload.first_name?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  <View style={modalStyles.draftInfo}>
                    <Text style={modalStyles.draftName}>{name}</Text>
                    <Text style={modalStyles.draftMeta}>
                      Code: {code} · {formatDate(item.savedAt)}
                    </Text>
                  </View>

                  {/* Right — actions */}
                  <View style={modalStyles.draftActions}>
                    {/* Upload */}
                    {isOnline && (
                      <TouchableOpacity
                        style={[
                          modalStyles.actionBtn,
                          modalStyles.uploadBtn,
                          (isUploadingThis || uploadingAll) &&
                            modalStyles.actionBtnDisabled,
                        ]}
                        onPress={() => onUploadOne(item)}
                        disabled={isUploadingThis || uploadingAll}
                        activeOpacity={0.8}
                      >
                        {isUploadingThis ? (
                          <ActivityIndicator size="small" color="#39B54B" />
                        ) : (
                          <Feather name="upload" size={14} color="#39B54B" />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Delete */}
                    <TouchableOpacity
                      style={[
                        modalStyles.actionBtn,
                        modalStyles.deleteBtn,
                        (isUploadingThis || uploadingAll) &&
                          modalStyles.actionBtnDisabled,
                      ]}
                      onPress={() => onDeleteOne(item)}
                      disabled={isUploadingThis || uploadingAll}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Banner Component ────────────────────────────────────────────────────
export default function OfflineSyncBanner({ authToken, onSyncComplete }) {
  const [drafts, setDrafts] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadingAll, setUploadingAll] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-70)).current;

  const refreshDrafts = useCallback(async () => {
    const d = await getDrafts();
    setDrafts(d);
  }, []);

  // Slide banner in/out
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: drafts.length > 0 ? 0 : -70,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

    // Auto-close modal when all drafts are gone
    if (drafts.length === 0) setModalVisible(false);
  }, [drafts.length]);

  // Watch connectivity + load drafts
  useEffect(() => {
    refreshDrafts();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
      refreshDrafts();
    });
    return unsubscribe;
  }, []);

  // ── Upload single draft ────────────────────────────────────────────────────
  const handleUploadOne = async (draft) => {
    if (!authToken) {
      Alert.alert("Error", "Auth token missing. Please log in again.");
      return;
    }
    setUploadingId(draft.id);
    try {
      const res = await fetch(`${SERVER_URL}/api/user`, {
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
        await refreshDrafts();
        if (onSyncComplete) onSyncComplete({ uploaded: 1, failed: 0 });
      } else {
        const msg = result.message || "Upload failed";
        Alert.alert("Upload Failed", msg);
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Network error. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  // ── Upload all drafts ──────────────────────────────────────────────────────
  const handleUploadAll = async () => {
    if (!authToken) {
      Alert.alert("Error", "Auth token missing. Please log in again.");
      return;
    }
    setUploadingAll(true);
    let uploaded = 0;
    let failed = 0;
    const currentDrafts = await getDrafts();

    for (const draft of currentDrafts) {
      try {
        const res = await fetch(`${SERVER_URL}/api/user`, {
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
      await refreshDrafts(); // update list as each one finishes
    }

    setUploadingAll(false);
    if (onSyncComplete) onSyncComplete({ uploaded, failed });
    if (failed > 0) {
      Alert.alert(
        "Partial Upload",
        `${uploaded} uploaded, ${failed} failed. Failed drafts are still saved.`,
      );
    }
  };

  // ── Delete single draft ────────────────────────────────────────────────────
  const handleDeleteOne = (draft) => {
    const name = `${draft.payload.first_name} ${draft.payload.last_name}`;
    Alert.alert(
      "Delete Draft",
      `Remove "${name}" from drafts? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeDraft(draft.id);
            await refreshDrafts();
          },
        },
      ],
    );
  };

  if (drafts.length === 0) return null;

  return (
    <>
      {/* ── Slide-in Banner ── */}
      <Animated.View
        style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Left */}
        <View style={styles.bannerLeft}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isOnline ? "#39B54B22" : "#EF444422" },
            ]}
          >
            <Feather
              name={isOnline ? "upload-cloud" : "wifi-off"}
              size={16}
              color={isOnline ? "#39B54B" : "#EF4444"}
            />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.bannerTitle}>
              {drafts.length} draft{drafts.length !== 1 ? "s" : ""} pending
            </Text>
            <Text style={styles.bannerSub}>
              {isOnline ? "Ready to upload" : "Waiting for connection…"}
            </Text>
          </View>
        </View>

        {/* Right */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.manageBtnText}>Manage</Text>
          <Feather name="chevron-up" size={13} color="#39B54B" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Draft Manager Modal ── */}
      <DraftManagerModal
        visible={modalVisible}
        drafts={drafts}
        isOnline={isOnline}
        onClose={() => setModalVisible(false)}
        onUploadOne={handleUploadOne}
        onDeleteOne={handleDeleteOne}
        onUploadAll={handleUploadAll}
        uploadingId={uploadingId}
        uploadingAll={uploadingAll}
      />
    </>
  );
}

// ─── Banner Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 999,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  bannerSub: { fontSize: 11, color: "#888", marginTop: 1 },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FBF1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#C8EDD0",
  },
  manageBtnText: { color: "#39B54B", fontSize: 12, fontWeight: "700" },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  subtitle: { fontSize: 12, color: "#888", marginTop: 2 },

  uploadAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#39B54B",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  uploadAllBtnDisabled: { backgroundColor: "#A5D6A7", elevation: 0, shadowOpacity: 0 },
  uploadAllText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  offlineBadgeText: { fontSize: 12, color: "#B45309", fontWeight: "600" },

  separator: { height: 1, backgroundColor: "#F0F0F0", marginHorizontal: 20 },

  draftRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  draftAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  draftAvatarText: { fontSize: 16, fontWeight: "800", color: "#39B54B" },
  draftInfo: { flex: 1 },
  draftName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  draftMeta: { fontSize: 11, color: "#999", marginTop: 2 },

  draftActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: { opacity: 0.4 },
  uploadBtn: { backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#C8EDD0" },
  deleteBtn: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },

  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: "#888", fontWeight: "600" },
});
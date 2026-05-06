import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { SERVER_URL } from "../utils/index";
import { getAuthUser } from "../utils/auth";
import {
  getQueueItems,
  removeQueueItem,
  subscribeQueueChanges,
  syncQueueItem,
} from "../utils/offlineQueue";

const TYPE_TITLES = {
  farmer_create: "Upload Farmer",
  field_create: "Upload Field",
  field_visit_create: "Upload Fieldbook Detail",
};

const TYPE_SUBTITLES = {
  farmer_create: "Add Farmer",
  field_create: "Add Field",
  field_visit_create: "FieldBook Visit",
};

const getItemTitle = (item) => {
  if (item.meta?.title) return item.meta.title;
  if (item.type === "farmer_create")
    return `${item.payload?.first_name || ""} ${item.payload?.last_name || ""}`.trim();
  if (item.type === "field_create") return item.payload?.field_name || "Field";
  return `Visit ${item.payload?.visit_date || ""}`.trim();
};

const ManagePendingUploads = ({ navigation, route }) => {
  const queueType = route?.params?.queueType || "farmer_create";
  const title = TYPE_TITLES[queueType] || "Manage Pending Uploads";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAll, setUploadingAll] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  const refresh = useCallback(async () => {
    const queue = await getQueueItems();
    setItems(queue.filter((q) => q.type === queueType));
    setLoading(false);
  }, [queueType]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeQueueChanges(refresh);
    return unsubscribe;
  }, [refresh]);

  const pendingCount = useMemo(() => items.length, [items.length]);

  const ensureOnlineAndToken = async () => {
    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && net.isInternetReachable !== false;
    if (!isOnline) {
      Alert.alert("Offline", "Connect internet to upload pending records.");
      return null;
    }
    const user = await getAuthUser();
    if (!user?.token) {
      Alert.alert("Session expired", "Please login again.");
      return null;
    }
    return user.token;
  };

  const handleUploadOne = async (item) => {
    const token = await ensureOnlineAndToken();
    if (!token) return;
    setUploadingId(item.id);
    try {
      const result = await syncQueueItem(SERVER_URL, token, item);
      if (result.status === "uploaded") {
        Alert.alert("Uploaded", "Record uploaded successfully.");
      } else if (result.status === "conflict") {
        Alert.alert("Skipped duplicate", "Conflict detected. Record skipped.");
      } else {
        Alert.alert("Failed", result.message || "Upload failed.");
      }
      await refresh();
    } finally {
      setUploadingId(null);
    }
  };

  const handleUploadAll = async () => {
    const token = await ensureOnlineAndToken();
    if (!token || items.length === 0) return;
    setUploadingAll(true);
    let uploaded = 0;
    let failed = 0;
    let conflict = 0;
    try {
      for (const item of items) {
        const result = await syncQueueItem(SERVER_URL, token, item);
        if (result.status === "uploaded") uploaded += 1;
        if (result.status === "failed") failed += 1;
        if (result.status === "conflict") conflict += 1;
      }
      Alert.alert(
        "Sync complete",
        `${uploaded} uploaded, ${failed} failed, ${conflict} duplicate/conflict skipped.`,
      );
      await refresh();
    } finally {
      setUploadingAll(false);
    }
  };

  const handleDeleteOne = async (item) => {
    await removeQueueItem(item.id);
    await refresh();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={18} color="#4E4E4E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          style={[
            styles.uploadAllBtn,
            (uploadingAll || pendingCount === 0) && styles.uploadAllBtnDisabled,
          ]}
          onPress={handleUploadAll}
          disabled={uploadingAll || pendingCount === 0}
        >
          {uploadingAll ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.uploadAllText}>Upload All ({pendingCount})</Text>
          )}
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#39B54B" />
            <Text style={styles.helperText}>Loading pending records...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.centerBox}>
                <Feather name="inbox" size={32} color="#C0C0C0" />
                <Text style={styles.helperText}>No pending records</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{getItemTitle(item)}</Text>
                  <Text style={styles.rowSubtitle}>
                    {TYPE_SUBTITLES[item.type] || "Pending"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.rowActionBtn}
                  onPress={() => handleUploadOne(item)}
                  disabled={uploadingAll || uploadingId === item.id}
                >
                  {uploadingId === item.id ? (
                    <ActivityIndicator size="small" color="#39B54B" />
                  ) : (
                    <Text style={styles.uploadText}>Upload</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rowActionBtn, { borderColor: "#FECACA" }]}
                  onPress={() => handleDeleteOne(item)}
                  disabled={uploadingAll || uploadingId === item.id}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#222" },
  body: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  uploadAllBtn: {
    backgroundColor: "#39B54B",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 10,
  },
  uploadAllBtnDisabled: {
    opacity: 0.5,
  },
  uploadAllText: { color: "#fff", fontWeight: "700" },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  helperText: { color: "#888", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
    gap: 8,
  },
  rowTitle: { fontSize: 13, fontWeight: "700", color: "#202020" },
  rowSubtitle: { fontSize: 11, color: "#888", marginTop: 2 },
  rowActionBtn: {
    borderWidth: 1,
    borderColor: "#BDEAC4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  uploadText: { color: "#2F8E3A", fontSize: 11, fontWeight: "700" },
  deleteText: { color: "#B91C1C", fontSize: 11, fontWeight: "700" },
});

export default ManagePendingUploads;

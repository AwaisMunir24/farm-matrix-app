import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import RightArrow from "../../assets/sidebar_rightarrow.svg";
import Downarrow from "../../assets/downarrow.svg";
import RightSubmenu from "../../assets/submenu.svg";
import { clearAuthUser } from "../utils/auth";
import { getAuthUser } from "../utils/auth";
import Uparrow from "../../assets/uparrow-sidevar.svg";
import {
  getPendingCounts,
  subscribeQueueChanges,
} from "../utils/offlineQueue";
import {
  getAddFieldOfflineReference,
  getOfflinePreparationSummary,
  prepareAddFarmerOfflineReference,
  prepareAddFieldOfflineReference,
} from "../utils/offlineReferenceData";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import {
  buildOfflineRegionCatalog,
  getOfflineMapPrefetchState,
  getTileCoverageStatus,
  prepareOfflineMapTiles,
  setOfflineMapPrefetchPaused,
} from "../utils/offlineMapTiles";
import { SERVER_URL } from "../utils/index";
const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.72;

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

const Sidebar = ({ isOpen, onClose, onLogout }) => {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isVisible = useRef(false);

  const [expanded, setExpanded] = useState(null);
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [preparingOffline, setPreparingOffline] = useState(false);
  const [offlinePrepProgress, setOfflinePrepProgress] = useState(null);
  const [offlineRegions, setOfflineRegions] = useState([]);
  const [loadingRegionList, setLoadingRegionList] = useState(false);
  const [selectedRegionIds, setSelectedRegionIds] = useState([]);
  const [coverageStatus, setCoverageStatus] = useState(null);
  const [prefetchPaused, setPrefetchPaused] = useState(false);
  const [lastPreparedAt, setLastPreparedAt] = useState(null);
  const [pendingCounts, setPendingCounts] = useState({
    total: 0,
    farmer: 0,
    field: 0,
    fieldVisit: 0,
  });

  useEffect(() => {
    if (isOpen) {
      isVisible.current = true;
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setExpanded(null);
      setActiveSubItem(null);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -SIDEBAR_WIDTH,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isVisible.current = false;
      });
    }
  }, [isOpen]);

  const refreshQueueState = async () => {
    const [counts, summary] = await Promise.all([
      getPendingCounts(),
      getOfflinePreparationSummary(),
    ]);
    setPendingCounts(counts);
    setLastPreparedAt(summary.lastPreparedAt);
  };

  const getCurrentLocationSafe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
    } catch {
      return null;
    }
  };

  const refreshOfflineMapState = async (clusters = []) => {
    const [controlState, currentLocation] = await Promise.all([
      getOfflineMapPrefetchState(),
      getCurrentLocationSafe(),
    ]);
    setPrefetchPaused(Boolean(controlState?.paused));
    const coverage = await getTileCoverageStatus(currentLocation);
    setCoverageStatus(coverage);

    const regions = buildOfflineRegionCatalog({
      clusters,
      currentLocation,
      radiusKm: 3,
    });
    const clusterRegions = regions.filter((r) => String(r.source).startsWith("cluster"));
    setOfflineRegions(clusterRegions);
    setSelectedRegionIds((prev) => {
      const validPrev = prev.filter((id) => clusterRegions.some((r) => r.id === id));
      if (validPrev.length) return validPrev;
      return clusterRegions.map((region) => region.id);
    });
  };

  const fetchEmployeeClusters = async () => {
    setLoadingRegionList(true);
    try {
      const net = await NetInfo.fetch();
      const isOnline = net.isConnected && net.isInternetReachable !== false;
      if (!isOnline) {
        const ref = await getAddFieldOfflineReference();
        await refreshOfflineMapState(ref?.clusters || []);
        return;
      }

      const user = await getAuthUser();
      if (!user?.token) {
        const ref = await getAddFieldOfflineReference();
        await refreshOfflineMapState(ref?.clusters || []);
        return;
      }

      const resp = await fetch(`${SERVER_URL}/api/cluster?limit=10000000`, {
        headers: {
          "x-auth-token": user.token,
          "Content-Type": "application/json",
        },
      });
      const json = await resp.json();
      const clusters = json?.data || [];
      await refreshOfflineMapState(clusters);
    } catch (e) {
      console.error("fetchEmployeeClusters error:", e);
      const ref = await getAddFieldOfflineReference();
      await refreshOfflineMapState(ref?.clusters || []);
    } finally {
      setLoadingRegionList(false);
    }
  };

  useEffect(() => {
    refreshQueueState();
    const unsubscribe = subscribeQueueChanges(refreshQueueState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshQueueState();
    fetchEmployeeClusters();
  }, [isOpen]);

  const handleNav = (screen) => {
    onClose();
    setTimeout(() => navigation.navigate(screen), 150);
  };

  const handleTopItem = (item) => {
    if (item.subItems) {
      setExpanded((prev) => (prev === item.label ? null : item.label));
    } else {
      handleNav(item.screen);
    }
  };

  const handleSubItem = (sub) => {
    setActiveSubItem(sub.label);
    onClose();
    setTimeout(() => navigation.navigate(sub.screen, sub.params), 150);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);
            try {
              await clearAuthUser();
              onClose();
              if (onLogout) onLogout();
            } catch (e) {
              console.error("Sign out error:", e);
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handlePrepareOfflineData = async () => {
    setPreparingOffline(true);
    await setOfflineMapPrefetchPaused(false);
    setPrefetchPaused(false);
    try {
      const net = await NetInfo.fetch();
      const isOnline = net.isConnected && net.isInternetReachable !== false;
      if (!isOnline) {
        Alert.alert(
          "No internet",
          "Connect to internet before preparing offline data.",
        );
        return;
      }

      const user = await getAuthUser();
      if (!user?.token) {
        Alert.alert("Session expired", "Please login again.");
        return;
      }
      if (!selectedRegionIds.length) {
        Alert.alert(
          "Select cluster",
          "Please select at least one cluster region before preparing offline map tiles.",
        );
        return;
      }

      const reference = await prepareAddFarmerOfflineReference({
        token: user.token,
        userRole: user.role,
      });
      const fieldRef = await prepareAddFieldOfflineReference({ token: user.token });

      const currentLocation = await getCurrentLocationSafe();

      const mapMeta = await prepareOfflineMapTiles({
        clusters: fieldRef?.clusters || [],
        currentLocation,
        selectedRegionIds,
        minZoom: 14,
        maxZoom: 17,
        maxTiles: 1200,
        clusterRadiusKm: 3,
        maxCacheMb: 250,
        maxAgeDays: 14,
        onProgress: (p) =>
          setOfflinePrepProgress(
            p.phase === "paused"
              ? "Tile prefetch paused. Tap Resume Tile Prefetch to continue."
              : `Downloading map tiles ${p.current}/${p.total} (${p.downloaded} new, ${p.cached} cached)`,
          ),
      });
      await refreshQueueState();
      await refreshOfflineMapState(fieldRef?.clusters || []);

      Alert.alert(
        "Offline data prepared",
        `Offline setup completed.\nClusters: ${reference.clusters.length}\nOrganizations: ${reference.organizations.length}\nRegions: ${mapMeta.regions?.length || 0}\nMap tiles: ${mapMeta.downloadedTiles} new, ${mapMeta.cachedTiles} cached\nCache size: ${mapMeta.cache?.totalMb || 0} MB`,
      );
    } catch (e) {
      console.error("prepare offline data error:", e);
      Alert.alert(
        "Prepare failed",
        e?.message || "Could not prepare offline data. Please try again.",
      );
    } finally {
      setOfflinePrepProgress(null);
      setPreparingOffline(false);
    }
  };

  const toggleRegion = (regionId) => {
    setSelectedRegionIds((prev) => {
      if (prev.includes(regionId)) return prev.filter((id) => id !== regionId);
      return [...prev, regionId];
    });
  };

  const handleTogglePause = async () => {
    const nextState = !prefetchPaused;
    await setOfflineMapPrefetchPaused(nextState);
    setPrefetchPaused(nextState);
    if (!nextState) {
      setOfflinePrepProgress("Resuming tile prefetch...");
    }
  };

  const formatLastPrepared = (iso) => {
    if (!iso) return "Not prepared yet";
    return new Date(iso).toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const menuItems = [
    {
      label: "Leaf Scan AI",
      icon: "🌿",
      screen: "Camera",
    },
    {
      label: "Upload Survey",
      icon: "📤",
      subItems: [
        {
          label: "Upload Farmer",
          screen: "ManagePendingUploads",
          params: { queueType: "farmer_create" },
          count: pendingCounts.farmer,
        },
        {
          label: "Upload Field",
          screen: "ManagePendingUploads",
          params: { queueType: "field_create" },
          count: pendingCounts.field,
        },
        {
          label: "Upload Fieldbook Detail",
          screen: "ManagePendingUploads",
          params: { queueType: "field_visit_create" },
          count: pendingCounts.fieldVisit,
        },
      ],
    },
    {
      label: "AI Ask Assistant",
      icon: "🤖",
      screen: "Chat",
    },
  ];

  if (!isOpen && !isVisible.current) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? "box-none" : "none"}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            paddingTop: STATUS_BAR_HEIGHT + 16,
            paddingBottom: 24,
          },
        ]}
      >
        {/* Close arrow */}
        {isOpen && (
          <TouchableOpacity
            style={styles.closeArrowBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <RightArrow width={24} height={24} />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>History</Text>

        {menuItems.map((item) => {
          const isExpanded = expanded === item.label;

          return (
            <View key={item.label}>
              {/* Top-level row */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleTopItem(item)}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>

                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.label === "Upload Survey" && pendingCounts.total > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{pendingCounts.total}</Text>
                  </View>
                )}

                <View style={styles.arrowCircle}>
                  {item.subItems ? (
                    <Text style={styles.chevron}>
                      {isExpanded ? (
                        <Downarrow width={18} height={18} />
                      ) : (
                        <RightSubmenu width={18} height={18} />
                      )}
                    </Text>
                  ) : (
                    // <Text style={styles.arrow}>↗</Text>
                    <Uparrow width={18} height={18} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Sub-items */}
              {item.subItems && isExpanded && (
                <View style={styles.subItemsContainer}>
                  {item.subItems.map((sub) => {
                    const isActive = activeSubItem === sub.label;
                    return (
                      <TouchableOpacity
                        key={sub.label}
                        style={[
                          styles.subItem,
                          isActive && styles.subItemActive,
                        ]}
                        onPress={() => handleSubItem(sub)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.subLabel,
                            isActive && styles.subLabelActive,
                          ]}
                        >
                          {sub.label}
                        </Text>
                        {sub.count > 0 && (
                          <View style={styles.subPendingBadge}>
                            <Text style={styles.subPendingBadgeText}>
                              {sub.count}
                            </Text>
                          </View>
                        )}
                        {/* <Text style={styles.subArrow}>↗</Text> */}
                        <Uparrow width={18} height={18} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[
            styles.prepareOfflineBtn,
            preparingOffline && styles.prepareOfflineBtnDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handlePrepareOfflineData}
          disabled={preparingOffline}
        >
          {preparingOffline ? (
            <View style={styles.preparingOfflineWrap}>
              <ActivityIndicator color="#39B54B" size="small" />
              {offlinePrepProgress ? (
                <Text style={styles.preparingOfflineText}>{offlinePrepProgress}</Text>
              ) : (
                <Text style={styles.preparingOfflineText}>Preparing offline data...</Text>
              )}
            </View>
          ) : (
            <Text style={styles.prepareOfflineText}>Prepare Offline Data</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.preparedAtText}>
          Last prepared: {formatLastPrepared(lastPreparedAt)}
        </Text>

        <View style={styles.offlinePanel}>
          <Text style={styles.offlinePanelTitle}>Offline Map Coverage</Text>
          <Text style={styles.offlinePanelSub}>
            {coverageStatus?.hasCache
              ? coverageStatus.covered
                ? `Covered (${coverageStatus.coveredRegionName || "cached region"})`
                : "Not covered at current location"
              : "No tile cache prepared yet"}
          </Text>
          {coverageStatus?.hasCache && (
            <Text style={styles.offlinePanelMeta}>
              Regions: {coverageStatus.regionsCount} · Cache:{" "}
              {coverageStatus.totalMb} MB
            </Text>
          )}

          <View style={styles.regionHeaderRow}>
            <Text style={styles.regionTitle}>Select cluster tiles:</Text>
            <TouchableOpacity
              onPress={() => setSelectedRegionIds(offlineRegions.map((r) => r.id))}
              activeOpacity={0.8}
            >
              <Text style={styles.regionActionText}>Select all</Text>
            </TouchableOpacity>
          </View>
          {loadingRegionList ? (
            <View style={styles.regionLoadingRow}>
              <ActivityIndicator size="small" color="#39B54B" />
              <Text style={styles.regionLoadingText}>Loading clusters...</Text>
            </View>
          ) : offlineRegions.length === 0 ? (
            <Text style={styles.regionEmptyText}>No clusters available</Text>
          ) : (
            <ScrollView style={styles.regionListWrap} nestedScrollEnabled>
              {offlineRegions.map((region) => {
                const selected = selectedRegionIds.includes(region.id);
                return (
                  <TouchableOpacity
                    key={region.id}
                    style={[styles.regionRow, selected && styles.regionRowSelected]}
                    onPress={() => toggleRegion(region.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.regionText, selected && styles.regionTextSelected]}>
                        {region.name}
                      </Text>
                      <Text style={styles.regionSubText}>
                        {region.source === "cluster_boundary"
                          ? "Boundary based"
                          : "Center radius based"}
                      </Text>
                    </View>
                    <Text style={styles.regionCheck}>{selected ? "✓" : "○"}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.pauseResumeBtn}
            onPress={handleTogglePause}
            activeOpacity={0.8}
          >
            <Text style={styles.pauseResumeText}>
              {prefetchPaused ? "Resume Tile Prefetch" : "Pause Tile Prefetch"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, signingOut && styles.signOutBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  closeArrowBtn: {
    position: "absolute",
    top: STATUS_BAR_HEIGHT + 16,
    right: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111",
    marginBottom: 20,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F7EB",
    borderWidth: 1.5,
    borderColor: "#39B54B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  iconText: { fontSize: 16 },
  menuLabel: { flex: 1, fontSize: 14, color: "#383838", fontWeight: "500" },
  pendingBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#39B54B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  pendingBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  arrowCircle: {
    borderRadius: 14,
    color: "#4E4E4E",
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: { fontSize: 13, color: "#39B54B", fontWeight: "600" },
  chevron: { fontSize: 13, color: "#888", fontWeight: "600" },
  subItemsContainer: {
    marginBottom: 4,
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 2,
  },
  subItemActive: {
    backgroundColor: "#F2F2F2",
  },
  subLabel: {
    flex: 1,
    fontSize: 12,
    color: "#000000",
    fontWeight: "500",
  },
  subLabelActive: {
    fontWeight: "500",
    color: "#111",
  },
  subPendingBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    marginRight: 8,
    backgroundColor: "#39B54B",
    justifyContent: "center",
    alignItems: "center",
  },
  subPendingBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  subArrow: {
    fontSize: 13,
    color: "#39B54B",
    fontWeight: "600",
  },
  prepareOfflineBtn: {
    borderWidth: 1,
    borderColor: "#BDEAC4",
    backgroundColor: "#F0FBF1",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  prepareOfflineBtnDisabled: {
    opacity: 0.7,
  },
  preparingOfflineWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  preparingOfflineText: {
    color: "#2F8E3A",
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  prepareOfflineText: {
    color: "#2F8E3A",
    fontSize: 13,
    fontWeight: "700",
  },
  preparedAtText: {
    fontSize: 11,
    color: "#777",
    marginBottom: 10,
    textAlign: "center",
  },
  offlinePanel: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  offlinePanelTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  offlinePanelSub: {
    marginTop: 3,
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
  },
  offlinePanelMeta: {
    marginTop: 2,
    fontSize: 10,
    color: "#6B7280",
  },
  regionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  regionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  regionActionText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "700",
  },
  regionListWrap: {
    maxHeight: 180,
  },
  regionLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  regionLoadingText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  regionEmptyText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 5,
    backgroundColor: "#fff",
  },
  regionRowSelected: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  regionText: {
    flex: 1,
    fontSize: 11,
    color: "#374151",
  },
  regionTextSelected: {
    color: "#166534",
    fontWeight: "700",
  },
  regionSubText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  regionCheck: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "700",
    marginLeft: 8,
  },
  pauseResumeBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#EEF2FF",
  },
  pauseResumeText: {
    fontSize: 11,
    color: "#3730A3",
    fontWeight: "700",
  },
  signOutBtn: {
    backgroundColor: "#39B54B",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  signOutBtnDisabled: { backgroundColor: "#A8D5AE" },
  signOutText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});

export default Sidebar;
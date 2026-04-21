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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import RightArrow from "../../assets/sidebar_rightarrow.svg";
import Downarrow from "../../assets/downarrow.svg";
import RightSubmenu from "../../assets/submenu.svg";
import { clearAuthUser } from "../utils/auth";
import Uparrow from "../../assets/uparrow-sidevar.svg";
const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.72;

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

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
      { label: "Upload Farmer", screen: "FarmerListing" },
      { label: "Upload Field", screen: "FieldsListing" },
      // { label: "Upload Field Book", screen: "FieldBookDetails" },
    ],
  },
  {
    label: "AI Ask Assistant",
    icon: "🤖",
    screen: "Chat",
  },
];

const Sidebar = ({ isOpen, onClose, onLogout }) => {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isVisible = useRef(false);

  const [expanded, setExpanded] = useState(null);
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

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
    handleNav(sub.screen);
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
          { transform: [{ translateX }], paddingTop: STATUS_BAR_HEIGHT + 16 },
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

        <View style={{ height: 24 }} />
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
  subArrow: {
    fontSize: 13,
    color: "#39B54B",
    fontWeight: "600",
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

import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Svg, { Path } from "react-native-svg";
import HomeScreen from "../screens/HomeScreen";
import MyFieldsScreen from "../screens/MyFieldScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MyProfile from "../../assets/Field-Map 1.svg";
import HomeIcon from "../../assets/home.svg";
import ProfileIcon from "../../assets/profile.svg";
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");

const TAB_BAR_HEIGHT = 92;
const CURVE_HEIGHT = 20; // total extra height for the wave area
const FLOAT_BUTTON_SIZE = 72;

const buildWavePath = (centerX) => {
  const w = width;
  const h = TAB_BAR_HEIGHT + CURVE_HEIGHT;
  const waveStartX = centerX - 85; // where left slope begins
  const waveEndX = centerX + 85; // where right slope ends
  const dipY = CURVE_HEIGHT + 52; // how low the bottom of the U goes

  return `
    M0,${CURVE_HEIGHT}
    L${waveStartX},${CURVE_HEIGHT}

    C${waveStartX + 40},${CURVE_HEIGHT}
     ${centerX - 52},${dipY}
     ${centerX},${dipY}

    C${centerX + 52},${dipY}
     ${waveEndX - 40},${CURVE_HEIGHT}
     ${waveEndX},${CURVE_HEIGHT}

    L${w},${CURVE_HEIGHT}
    L${w},${h}
    L0,${h}
    Z
  `;
};

const TabBarBackground = ({ activeIndex, routesCount }) => {
  const slotWidth = width / routesCount;
  const targetCenter = slotWidth * activeIndex + slotWidth / 2;
  const path = buildWavePath(targetCenter);

  return (
    <View style={styles.svgContainer} pointerEvents="none">
      <Svg width={width} height={TAB_BAR_HEIGHT + CURVE_HEIGHT}>
        <Path d={path} fill="#FFFFFF" />
      </Svg>
    </View>
  );
};

const getTabIcon = (routeName, size = 26, color = "#383838") => {
  if (routeName === "Fields Map")
    return <MyProfile width={size} height={size} color={color} />;
  if (routeName === "Profile")
    return <ProfileIcon width={size} height={size} color={color} />;
  return <HomeIcon width={size} height={size} color={color} />;
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  const focusedTabBarStyle = focusedOptions?.tabBarStyle;
  const normalizedTabBarStyles = Array.isArray(focusedTabBarStyle)
    ? focusedTabBarStyle
    : focusedTabBarStyle
      ? [focusedTabBarStyle]
      : [];
  const shouldHideTabBar = normalizedTabBarStyles.some(
    (style) => style && style.display === "none",
  );

  if (shouldHideTabBar) {
    return null;
  }

  const routesCount = state.routes.length;
  const slotWidth = width / routesCount;
  const activeIndex = state.index;
  const activeCenter = slotWidth * activeIndex + slotWidth / 2;
  const bubbleLeft = activeCenter - FLOAT_BUTTON_SIZE / 2;
  const bubbleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    bubbleScale.setValue(0.9);
    Animated.spring(bubbleScale, {
      toValue: 1,
      friction: 8,
      tension: 130,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, bubbleScale]);

  return (
    <View style={styles.customTabBarContainer}>
      <TabBarBackground activeIndex={activeIndex} routesCount={routesCount} />

      <Animated.View
        style={[
          styles.floatingActiveButton,
          { left: bubbleLeft, transform: [{ scale: bubbleScale }] },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["#5FD66E", "#34B349"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.customButtonCircle}
        >
          {getTabIcon(state.routes[activeIndex].name, 28, "#FFFFFF")}
        </LinearGradient>
      </Animated.View>

      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.85}
            >
              <View style={styles.iconArea}>
                {!isFocused && getTabIcon(route.name, 24, "#383838")}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const BottomTabNavigator = ({ onLogout }) => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen
        name="Fields Map"
        component={MyFieldsScreen}
      />

      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>

      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    height: TAB_BAR_HEIGHT + CURVE_HEIGHT,
    position: "absolute",
    elevation: 0,
    shadowOpacity: 0,
  },
  customTabBarContainer: {
    height: TAB_BAR_HEIGHT + CURVE_HEIGHT,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  svgContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: CURVE_HEIGHT + 14,
    paddingBottom: 12,
    height: TAB_BAR_HEIGHT + CURVE_HEIGHT,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconArea: {
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#383838",
    marginBottom: 2,
    textTransform: "capitalize",
  },
  tabLabelActive: {
    color: "#222222",
    fontWeight: "600",
  },
  floatingActiveButton: {
    position: "absolute",
    top: -(CURVE_HEIGHT + 24),
    width: FLOAT_BUTTON_SIZE,
    height: FLOAT_BUTTON_SIZE,
    zIndex: 5,
  },
  customButtonCircle: {
    width: FLOAT_BUTTON_SIZE,
    height: FLOAT_BUTTON_SIZE,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 14,
  },
});

export default BottomTabNavigator;

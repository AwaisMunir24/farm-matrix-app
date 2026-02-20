import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Svg, { Path } from "react-native-svg";
import HomeScreen from "../screens/HomeScreen";
import MyFieldsScreen from "../screens/MyFieldScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MyProfile from "../../assets/my-field.svg";
import HomeIcon from "../../assets/home.svg";
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get("window");

const TAB_BAR_HEIGHT = 92;
const CURVE_HEIGHT = 20; // total extra height for the wave area
const cx = width / 2; // horizontal center

//  Wave shape explanation:
//  Starts flat from left → slopes DOWN into a deep wide U → slopes back UP → flat to right
//  Uses cubic bezier (C) for very smooth, gradual, natural-looking curves
const TabBarBackground = () => {
  const w = width;
  const h = TAB_BAR_HEIGHT + CURVE_HEIGHT;

  // Key X positions

  const waveStartX = cx - 85; // where left slope begins
  const waveEndX = cx + 85; // where right slope ends
  const dipY = CURVE_HEIGHT + 52; // how low the bottom of the U goes

  const path = `
    M0,${CURVE_HEIGHT}
    L${waveStartX},${CURVE_HEIGHT}

    C${waveStartX + 40},${CURVE_HEIGHT}
     ${cx - 52},${dipY}
     ${cx},${dipY}

    C${cx + 52},${dipY}
     ${waveEndX - 40},${CURVE_HEIGHT}
     ${waveEndX},${CURVE_HEIGHT}

    L${w},${CURVE_HEIGHT}
    L${w},${h}
    L0,${h}
    Z
  `;

  return (
    <View style={styles.svgContainer} pointerEvents="none">
      <Svg width={w} height={h}>
        <Path d={path} fill="#FFFFFF" />
      </Svg>
    </View>
  );
};

const CustomHomeButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={styles.customButtonWrapper}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <LinearGradient
      colors={["#5FD66E", "#34B349"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.customButtonCircle}
    >
      {children}
    </LinearGradient>
  </TouchableOpacity>
);

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#39B54B",
        tabBarInactiveTintColor: "#383838",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tab.Screen
        name="My Fields"
        component={MyFieldsScreen}
        options={{
          tabBarIcon: ({ focused }) => <MyProfile width={24} height={24} />,
        }}
      />

      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <CustomHomeButton {...props} />,
          tabBarIcon: () => (
            // <Image
            //   source={require("../../assets/home.png")}
            //   style={styles.homeIcon}
            //   resizeMode="contain"
            // />
            <HomeIcon width={28} height={28} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../assets/profile.png")}
              style={[
                styles.icon,
                { tintColor: focused ? "#39B54B" : "#383838" },
              ]}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    height: TAB_BAR_HEIGHT + CURVE_HEIGHT,
    paddingBottom: 12,
    paddingTop: CURVE_HEIGHT + 14, // push labels/icons below the wave dip
    position: "absolute",
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#383838",
  },
  tabBarIcon: {
    marginBottom: -4,
  },
  icon: {
    width: 24,
    height: 24,
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

  // Button sits inside the deep U curve
  customButtonWrapper: {
    top: -(CURVE_HEIGHT + 32), // floats up so circle sits in the wave
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    marginHorizontal: "auto",
  },
  customButtonCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#39B54B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 14,
  },

  homeIcon: {
    width: 28,
    height: 28,
    tintColor: "#FFFFFF",
  },
});

export default BottomTabNavigator;

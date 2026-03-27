import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ImageBackground,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import WeatherIcon from "../../assets/weather-iconss.svg";
import SmallWeatherIcon from "../../assets/small-weather-icon.svg";

// ─── Local image asset ────────────────────────────────────────────────────────
// Place weather-bgg.png in your assets folder and update the path if needed
const BG_IMAGE = require("../../assets/weather-bgg.png");

const { width } = Dimensions.get("window");

// ─── Mock Data ────────────────────────────────────────────────────────────────

const FORECAST = [
  { label: "Today", date: "2 Jun", temp: 25, icon: "weather-partly-cloudy" },
  { label: "Mon", date: "3 Jun", temp: 28, icon: "weather-partly-cloudy" },
  { label: "Tue", date: "4 Jun", temp: 28, icon: "weather-partly-cloudy" },
  { label: "Wed", date: "5 Jun", temp: 28, icon: "weather-cloudy" },
  { label: "Thu", date: "6 Jun", temp: 26, icon: "weather-rainy" },
];

const HIGHLIGHTS = [
  {
    id: "wind",
    icon: "weather-windy",
    iconColor: "#5BA4CF",
    label: "Wind Speed",
    value: "7.90 km/h",
  },
  {
    id: "humidity",
    icon: "water",
    iconColor: "#4CAF92",
    label: "Humidity",
    value: "85%",
  },
  {
    id: "uv",
    icon: "weather-sunny-alert",
    iconColor: "#F5A623",
    label: "UV Index",
    value: "4 UV",
  },
  {
    id: "visibility",
    icon: "eye-outline",
    iconColor: "#4CAF92",
    label: "Visibility",
    value: "5.6 km",
  },
];

// ─── ForecastCard ─────────────────────────────────────────────────────────────

const ForecastCard = ({ item, isFirst }) => (
  <View style={[styles.forecastCard, isFirst && styles.forecastCardActive]}>
    <Text style={[styles.forecastLabel, isFirst && styles.forecastLabelActive]}>
      {item.label}
    </Text>
    <Text style={[styles.forecastDate, isFirst && styles.forecastDateActive]}>
      {item.date}
    </Text>
    <Text style={[styles.forecastTemp, isFirst && styles.forecastTempActive]}>
      {item.temp}°C
    </Text>
    <SmallWeatherIcon width={69} height={69} style={{ marginBottom: 10 }} />
  </View>
);

// ─── HighlightTile ────────────────────────────────────────────────────────────

const HighlightTile = ({ item }) => (
  <View style={styles.highlightTile}>
    <MaterialCommunityIcons name={item.icon} size={22} color={item.iconColor} />
    <View style={{ marginLeft: 10 }}>
      <Text style={styles.highlightLabel}>{item.label}</Text>
      <Text style={styles.highlightValue}>{item.value}</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Weather = () => {
  const [cluster, setCluster] = useState("");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero background image header ── */}
      <ImageBackground
        source={BG_IMAGE}
        style={styles.hero}
        imageStyle={styles.heroBgImage}
        resizeMode="cover"
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.heroTitle}>Weather Forecast</Text>

        {/* Weather icon + temperature */}
        <View style={styles.heroIconRow}>
          <WeatherIcon width={150} height={150} />
          <View style={styles.heroTempBlock}>
            <Text style={styles.heroTemp}>22°C</Text>
            <Text style={styles.heroFeels}>Feels like 17°</Text>
            <Text style={styles.heroRange}>High 27 | Low-10</Text>
          </View>
        </View>

        {/* Date & time */}
        <Text style={styles.heroDate}>MONDAY | 4:36 PM | 25 June, 25</Text>

        {/* Cluster selector */}
        <TouchableOpacity style={styles.clusterSelector} activeOpacity={0.8}>
          <Feather
            name="search"
            size={16}
            color="#94A3B8"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.clusterPlaceholder}>
            {cluster || "Select Cluster"}
          </Text>
          <Feather
            name="chevron-down"
            size={16}
            color="#94A3B8"
            style={{ marginLeft: "auto" }}
          />
        </TouchableOpacity>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 7-day forecast */}
          <Text style={styles.sectionTitle}>Next 7 Day Forecast</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastRow}
          >
            {FORECAST.map((item, idx) => (
              <ForecastCard key={item.date} item={item} isFirst={idx === 0} />
            ))}
          </ScrollView>

          {/* Today's highlights */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Today's Highlights
          </Text>
          <View style={styles.highlightGrid}>
            {HIGHLIGHTS.map((item) => (
              <HighlightTile key={item.id} item={item} />
            ))}
          </View>

          {/* Footer row */}
          <View style={styles.footerRow}>
            <View style={styles.footerItem}>
              <MaterialCommunityIcons
                name="weather-rainy"
                size={18}
                color="#94A3B8"
              />
              <Text style={styles.footerText}>Chance of rain</Text>
              <Text style={styles.footerValue}>2%</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <MaterialCommunityIcons
                name="circle-half-full"
                size={18}
                color="#94A3B8"
              />
              <Text style={styles.footerText}>Feels like</Text>
              <Text style={styles.footerValue}>38°</Text>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default Weather;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },

  // ── Hero ──────────────────────────────────
  hero: {
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: "100%",
  },

  heroBgImage: {},
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    marginTop: -28,
  },
  heroIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroTempBlock: {
    marginLeft: 12,
  },
  heroTemp: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "500",
    lineHeight: 54,
  },
  heroFeels: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: 500,
  },
  heroRange: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: 500,
  },
  heroDate: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  clusterSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: 300,
    marginHorizontal: "auto",
  },
  clusterPlaceholder: {
    color: "#94A3B8",
    fontSize: 14,
  },

  // ── Scroll area ───────────────────────────
  scrollArea: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 21,
    marginTop: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // ── Section title ─────────────────────────
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4E4E4E",
    marginBottom: 14,
  },

  // ── Forecast cards ────────────────────────
  forecastRow: {
    gap: 10,
    paddingRight: 4,
    marginBottom: 20,
  },
  forecastCard: {
    width: 70,
    backgroundColor: "#F5F5F5",
    borderRadius: 96,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  forecastCardActive: {
    backgroundColor: "#F5F5F5",
    borderWidth: 0,
    borderColor: "none",
  },
  forecastLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4E4E4E",
    paddingTop: 15,
  },
  forecastLabelActive: {
    color: "#4E4E4E",
  },
  forecastDate: {
    fontSize: 12,
    color: "#4E4E4E",
    marginTop: 2,
  },
  forecastDateActive: {
    color: "#4E4E4E",
  },
  forecastTemp: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4E4E4E",
    marginTop: 14,
  },
  forecastTempActive: {
    color: "#4E4E4E",
  },

  // ── Highlight grid ────────────────────────
  highlightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  highlightTile: {
    width: (width - 44) / 2,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  highlightLabel: {
    fontSize: 12,
    color: "#94A3B8",
  },
  highlightValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },

  // ── Footer row ────────────────────────────
  footerRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  footerItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: "#64748B",
  },
  footerValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
});

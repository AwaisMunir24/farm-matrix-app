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
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import axios from "axios";
import * as Location from "expo-location";
import WeatherIcon from "../../assets/weather-iconss.svg";
import SmallWeatherIcon from "../../assets/small-weather-icon.svg";
import Winds from "../../assets/winds.svg";
import Humidity from "../../assets/humidity.svg";
import UV from "../../assets/uv.svg";
import Eye from "../../assets/eyee.svg";
import { SERVER_URL } from "../utils/index";

const BG_IMAGE = require("../../assets/weather-bgg.png");

const { width } = Dimensions.get("window");

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc0NTg1MDA3LCJleHAiOjE3NzU0NDkwMDd9.cqbnAub_GmuclCwR1VOdKHYnYc0ejs6oX6SwLK7OJzw";

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
    <View style={styles.highlightIconWrapper}>{item.icon}</View>
    <View style={{ marginLeft: 10 }}>
      <Text style={styles.highlightLabel}>{item.label}</Text>
      <Text style={styles.highlightValue}>{item.value}</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Weather = ({ navigation }) => {
  const [cluster, setCluster] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Cluster states ──────────────────────────────────────────────────────────
  const [clusters, setClusters] = useState([]);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);

  // ── Fetch weather by coords ─────────────────────────────────────────────────
  const fetchWeather = (lat, lon) => {
    setLoading(true);

    axios
      .get(
        `${SERVER_URL}/api/weather/detail?lat=${lat}&lon=${lon}&units=metric`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        },
      )
      .then(function (response) {
        const data = response.data.data;
        const location = response.data.location;
        const today = data[0];

        setWeatherData({
          temperature: Math.round(parseFloat(today.temperature.avg)),
          feelsLike: Math.round(parseFloat(today.temperature.avg)),
          high: Math.round(parseFloat(today.temperature.max)),
          low: Math.round(parseFloat(today.temperature.min)),
          humidity: today.humidity,
          windSpeed: today.wind_speed,
          clouds: today.clouds,
          description: today.description,
          locationName: location.name,
          country: location.country,
        });

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const mapped = data.map(function (item, idx) {
          const d = new Date(item.date);
          return {
            label: idx === 0 ? "Today" : days[d.getDay()],
            date: d.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            }),
            temp: Math.round(parseFloat(item.temperature.avg)),
            description: item.description,
          };
        });

        setForecast(mapped);
        setLoading(false);
      })
      .catch(function (error) {
        console.error(
          "Weather fetch error:",
          error.response?.status,
          error.response?.data,
        );
        setLoading(false);
      });
  };

  // ── Fetch clusters ──────────────────────────────────────────────────────────
  const fetchClusters = () => {
    setClusterLoading(true);

    axios
      .get(
        `${SERVER_URL}/api/cluster?page=1&limit=10&search=&sortBy=id&order=ASC`,
        {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        },
      )
      .then(function (response) {
        // adjust based on your actual response shape
        const list =
          response.data.data ||
          response.data.clusters ||
          response.data.result ||
          [];
        setClusters(list);
        setClusterLoading(false);
      })
      .catch(function (error) {
        console.error(
          "Cluster fetch error:",
          error.response?.status,
          error.response?.data,
        );
        setClusterLoading(false);
      });
  };

  // ── On mount: get location + fetch clusters ─────────────────────────────────
  React.useEffect(() => {
    // fetch weather by GPS
    Location.requestForegroundPermissionsAsync().then(function (permResult) {
      if (permResult.status !== "granted") {
        console.warn("Location denied — using default coords");
        fetchWeather(31.4504, 73.135);
        return;
      }

      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then(function (location) {
          fetchWeather(location.coords.latitude, location.coords.longitude);
        })
        .catch(function (err) {
          console.error("Location error:", err);
          fetchWeather(31.4504, 73.135);
        });
    });

    // fetch clusters list
    fetchClusters();
  }, []);

  // ── Handle cluster selection ────────────────────────────────────────────────
  const handleClusterSelect = (item) => {
    setSelectedCluster(item);
    setCluster(item.cluster_name || item.name || "Selected Cluster");
    setDropdownOpen(false);

    const lat = parseFloat(item.center_latitude || item.latitude || 31.4504);
    const lon = parseFloat(item.center_longitude || item.longitude || 73.135);
    fetchWeather(lat, lon);
  };

  // ── Toggle dropdown ─────────────────────────────────────────────────────────
  const handleDropdownToggle = () => {
    setDropdownOpen((prev) => !prev);
  };

  const HIGHLIGHTS = [
    {
      id: "wind",
      icon: <Winds width={24} height={24} />,
      label: "Wind Speed",
      value: weatherData ? `${weatherData.windSpeed} km/h` : "--",
    },
    {
      id: "humidity",
      icon: <Humidity width={24} height={24} />,
      label: "Humidity",
      value: weatherData ? `${weatherData.humidity}%` : "--",
    },
    {
      id: "uv",
      icon: <UV width={24} height={24} />,
      label: "UV Index",
      value: "4 UV",
    },
    {
      id: "visibility",
      icon: <Eye width={24} height={24} />,
      label: "Visibility",
      value: "5.6 km",
    },
  ];

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
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.heroTitle}>Weather Forecast</Text>

        {loading ? (
          <View
            style={{
              height: 180,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <>
            {/* Weather icon + temperature */}
            <View style={styles.heroIconRow}>
              <WeatherIcon width={150} height={150} />
              <View style={styles.heroTempBlock}>
                <Text style={styles.heroTemp}>
                  {weatherData ? `${weatherData.temperature}°C` : "--°C"}
                </Text>
                <Text style={styles.heroFeels}>
                  {weatherData
                    ? `Feels like ${weatherData.feelsLike}°`
                    : "Feels like --°"}
                </Text>
                <Text style={styles.heroRange}>
                  {weatherData
                    ? `High ${weatherData.high} | Low ${weatherData.low}`
                    : "High -- | Low --"}
                </Text>
              </View>
            </View>

            {/* Location name */}
            <Text style={styles.heroDate}>
              {weatherData
                ? `${weatherData.locationName.toUpperCase()} | ${weatherData.country}`
                : "-- | --"}
            </Text>
          </>
        )}

        {/* ── Cluster selector + inline dropdown ── */}
        <View style={styles.clusterWrapper}>
          <TouchableOpacity
            style={styles.clusterSelector}
            activeOpacity={0.8}
            onPress={handleDropdownToggle}
          >
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
              name={dropdownOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#94A3B8"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>

          {/* ── Inline dropdown list ── */}
          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {clusterLoading ? (
                <View style={styles.dropdownLoader}>
                  <ActivityIndicator size="small" color="#34B349" />
                </View>
              ) : clusters.length === 0 ? (
                <View style={styles.dropdownEmpty}>
                  <Text style={styles.dropdownEmptyText}>
                    No clusters found
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={clusters}
                  keyExtractor={(item, index) =>
                    item.id ? item.id.toString() : index.toString()
                  }
                  nestedScrollEnabled
                  style={{ maxHeight: 200 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        selectedCluster?.id === item.id &&
                          styles.dropdownItemActive,
                      ]}
                      onPress={() => handleClusterSelect(item)}
                    >
                      <Feather
                        name="map-pin"
                        size={14}
                        color={
                          selectedCluster?.id === item.id
                            ? "#34B349"
                            : "#94A3B8"
                        }
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedCluster?.id === item.id &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        {item.cluster_name || item.name || "Unnamed Cluster"}
                      </Text>
                      {selectedCluster?.id === item.id && (
                        <Feather
                          name="check"
                          size={14}
                          color="#34B349"
                          style={{ marginLeft: "auto" }}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </View>

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
            {forecast.map((item, idx) => (
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
              <Text style={styles.footerValue}>
                {weatherData ? `${weatherData.clouds}%` : "2%"}
              </Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <MaterialCommunityIcons
                name="circle-half-full"
                size={18}
                color="#94A3B8"
              />
              <Text style={styles.footerText}>Feels like</Text>
              <Text style={styles.footerValue}>
                {weatherData ? `${weatherData.feelsLike}°` : "38°"}
              </Text>
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

  // ── Cluster selector ──────────────────────
  clusterWrapper: {
    alignItems: "center",
    marginBottom: 4,
    zIndex: 999,
  },
  clusterSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: 300,
  },
  clusterPlaceholder: {
    color: "#94A3B8",
    fontSize: 14,
  },

  // ── Dropdown ──────────────────────────────
  dropdownList: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: "hidden",
  },
  dropdownLoader: {
    padding: 16,
    alignItems: "center",
  },
  dropdownEmpty: {
    padding: 16,
    alignItems: "center",
  },
  dropdownEmptyText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  dropdownItemActive: {
    backgroundColor: "#F0FFF4",
  },
  dropdownItemText: {
    fontSize: 13,
    color: "#4E4E4E",
    fontWeight: "500",
  },
  dropdownItemTextActive: {
    color: "#34B349",
    fontWeight: "600",
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
    width: "48%",
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
    fontSize: 12,
    fontWeight: "600",
    color: "#4E4E4E",
    marginTop: 2,
  },
  highlightIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 12,
    fontWeight: "600",
    color: "#4E4E4E",
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#4E4E4E",
    marginHorizontal: 12,
  },
});

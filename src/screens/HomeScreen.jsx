import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import MenuBar from "../../assets/bars.svg";
import Logo from "../../assets/Logo.svg";
import BellIcon from "../../assets/bellicon.svg";
import FarmerImage from "../../assets/mini-farmer-icon.svg";
import FieldsIcon from "../../assets/mini-fields-icon.svg";
import UsersIcon from "../../assets/userss.svg";
import Uparrow from "../../assets/up_arrow.svg";
import LeafCards from "../../assets/leafs_cardss.svg";
import ScanButtonIcon from "../../assets/btn_scan_icon.svg";
import ScanImage from "../../assets/scaning_img.svg";
import WorldImg from "../../assets/worldimg.svg";
import SurveyIcon from "../../assets/buttonICON_surey.svg";
import SurveryImg from "../../assets/surveyImg.svg";
import PluseIcon from "../../assets/plus-icon.svg";
import WeatherIcon from "../../assets/weather-icon.svg";

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <MenuBar width={24} height={24} />
        </TouchableOpacity>
        <View style={{ width: 160, aspectRatio: 152 / 31 }}>
          <Logo width="100%" height="100%" />
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <BellIcon width={24} height={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginTop: 30,
            paddingHorizontal: 20,
            marginBottom: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <WeatherIcon width={79} hight={79} />
            <View style={{ marginLeft: 8 }}>
              <Text style={{ fontSize: 32, fontWeight: 500, color: "#4E4E4E" }}>
                22°C
              </Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: "#4E4E4E" }}>
                MONDAY
              </Text>
              <Text style={{ fontSize: 10, fontWeight: 500, color: "#4E4E4E" }}>
                4:36 PM | 25 June, 25
              </Text>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: 500, color: "#4E4E4E" }}>
              Feels like 17°
            </Text>
            <Text style={{ fontSize: 12, fontWeight: 500, color: "#4E4E4E" }}>
              High 27 | Low-10
            </Text>
          </View>
        </View>

        <View style={styles.topCardsContainer}>
          <View style={styles.card}>
            <View style={styles.innerCard}>
              <FarmerImage width={35} height={35} />
            </View>
            <Text style={styles.cardTitle}>Add new farmer</Text>
            <TouchableOpacity style={styles.addButton}>
              <PluseIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.innerCard}>
              <FieldsIcon width={35} height={35} />
            </View>
            <Text style={styles.cardTitle}>Add new field</Text>
            <TouchableOpacity style={styles.addButton}>
              <PluseIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickAccessContainer}>
          <TouchableOpacity style={styles.quickAccessButton}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <UsersIcon width={18} height={18} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#383838",
                  marginLeft: 12,
                }}
              >
                My Farmer
              </Text>
            </View>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 100,
                backgroundColor: "#fff",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Uparrow width={18} height={18} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAccessButton}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <LeafCards width={18} height={18} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#383838",
                  marginLeft: 12,
                }}
              >
                My Fields
              </Text>
            </View>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 100,
                backgroundColor: "#fff",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Uparrow width={18} height={18} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Leaf Scan AI */}
        <View style={styles.featureCard}>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Leaf Scan AI</Text>
            <Text style={styles.featureStep}>1. Take a picture of plant</Text>
            <Text style={styles.featureStep}>2. AI Detect Plant Disease</Text>
            <Text style={styles.featureStep}>
              3. Get a detail disease diagnosis
            </Text>

            {/* ✅ Simple navigate to Camera — nothing fancy */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate("Camera")}
            >
              <LinearGradient
                colors={["#5FD66E", "#34B349"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.startButtonGradient}
              >
                <ScanButtonIcon width={18} height={18} />
                <Text style={styles.startButtonText}>Start Analyzing</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View>
            <ScanImage width={133} height={130} />
          </View>
        </View>

        <View style={styles.cropSectionWrapper}>
          <View style={styles.cropSectionInner}>
            <View style={{ flexShrink: 0 }}>
              <WorldImg width={180} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cropScanHeading}>Crop Scan</Text>
              <Text style={styles.cropContent}>
                Satellite based smart crop monitoring
              </Text>
              <TouchableOpacity>
                <LinearGradient
                  colors={["#5FD66E", "#34B349"]}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 25,
                    marginTop: 8,
                    borderRadius: 5,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 12, textAlign: "center" }}
                  >
                    View Map
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.surveyWrapper}>
          <TouchableOpacity style={{ paddingHorizontal: 12 }}>
            <LinearGradient
              colors={["#5FD66E", "#34B349"]}
              style={{
                paddingVertical: 5,
                paddingHorizontal: 25,
                marginTop: 8,
                borderRadius: 5,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <SurveyIcon height={18} width={18} />
              <Text style={{ fontSize: 12, color: "#fff", marginLeft: 7 }}>
                Upload Survey
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ position: "relative", top: -6 }}>
            <SurveryImg width={145} height={115} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    backgroundColor: "#F9F9F9",
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    borderRadius: 9,
    borderColor: "#D8D8D8",
    borderWidth: 1,
  },
  scrollView: { flex: 1 },
  topCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: "row",
    paddingHorizontal: 10,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  innerCard: {
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 12, fontWeight: "500", color: "#383838" },
  addButton: { borderRadius: 8, overflow: "hidden", marginLeft: 3 },
  quickAccessContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  quickAccessButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 32,
    paddingRight: 12,
    paddingLeft: 14,
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    justifyContent: "space-between",
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#383838",
    marginBottom: 10,
  },
  featureStep: { fontSize: 12, color: "#3E3E3E", marginBottom: 2 },
  startButton: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 7,
    overflow: "hidden",
    marginTop: 10,
  },
  startButtonGradient: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  startButtonText: { fontSize: 12, color: "#fff", marginLeft: 7 },
  featureContent: { width: "50%" },
  cropSectionWrapper: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 15,
    marginTop: 14,
  },
  cropSectionInner: {
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  cropScanHeading: { fontSize: 14, fontWeight: "600", color: "#383838" },
  cropContent: {
    fontSize: 12,
    color: "#3E3E3E",
    marginTop: 8,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  surveyWrapper: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 15,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 120,
  },
});

export default HomeScreen;

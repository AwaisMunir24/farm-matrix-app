import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";

const OnboardingSwiper = ({ onComplete }) => {
  const swiperRef = useRef(null);

  const handleNext = () => {
    swiperRef.current?.scrollBy(1);
  };

  const handleSkip = () => {
    onComplete();
  };
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Swiper
        ref={swiperRef}
        style={styles.wrapper}
        showsButtons={false}
        loop={false}
        dot={<View style={styles.dot} />}
        activeDot={<View style={styles.activeDot} />}
        paginationStyle={styles.pagination}
      >
        {/* Slide 1 */}
        <View style={styles.slide}>
          <Image
            style={styles.logo}
            source={require("../../assets/logo.png")}
            resizeMode="contain"
          />
          <Text style={styles.title}>Satellite based</Text>
          <Text style={styles.subtitle}>reporting of your field</Text>
          <ImageBackground
            source={require("../../assets/swiperfirst.png")}
            resizeMode="cover"
            style={styles.bottomImage}
          />

          {/* <Image
            source={require("../../assets/swiperfirst.png")}
            style={styles.illustration}
            resizeMode="cover"
          /> */}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#5FD66E", "#34B349"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.nextText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Slide 2 */}
        <View style={styles.slide2}>
          <Image
            style={styles.logo}
            source={require("../../assets/logo.png")}
            resizeMode="contain"
          />
          <Text style={styles.title}>Leaf Scan AI</Text>
          <Text style={styles.subtitle}>plant disease analysis</Text>
          <Image
            source={require("../../assets/demotwo.png")}
            resizeMode="cover"
            style={styles.bottomImage2}
          />

          {/* <Image
            source={require("../../assets/swiperfirst.png")}
            style={styles.illustration}
            resizeMode="cover"
          /> */}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#5FD66E", "#34B349"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.nextText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Slide 3 */}
        <View style={styles.slide3}>
          <Image
            style={styles.logo}
            source={require("../../assets/logo.png")}
            resizeMode="contain"
          />
          <Text style={styles.title}>Field Weather</Text>
          <Text style={styles.subtitle}>detailed predictions</Text>
          <ImageBackground
            source={require("../../assets/third_demo.png")}
            resizeMode="contain"
            style={styles.bottomImage3}
          >
            {/* <View>
              <View>
                <Image
                  source={require("../../assets/wind.png")}
                  style={styles.slideThreeIcons}
                />
                <Text>Wind Speed</Text>
              </View>
            </View> */}
          </ImageBackground>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#5FD66E", "#34B349"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.nextText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Swiper>
    </View>
  );
};

export default OnboardingSwiper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F3",
    paddingTop: 60,
    marginTop: 0,
  },
  bottomImage: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  bottomImage2: {
    // position: "absolute",
    marginTop: 26,
  },

  bottomImage3: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    height: "100%",
  },
  wrapper: {},
  slide: {
    flex: 1,
    // paddingTop: 60,
    paddingHorizontal: 0,
    alignItems: "center",
    backgroundColor: "#F5F7F5",
    // backgroundColor: "red",
  },
  slide2: {
    flex: 1,
    // paddingTop: 60,
    paddingHorizontal: 0,
    alignItems: "center",
    backgroundColor: "#Fff !important",
  },
  slide3: {
    flex: 1,
    // paddingTop: 60,
    paddingHorizontal: 0,
    alignItems: "center",
    backgroundColor: "#fff !important",
  },
  logo: {
    // paddingTop: 160,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#383838",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 500,
    color: "#383838",
    textAlign: "center",
    marginBottom: 30,
  },
  infoContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  label: {
    fontSize: 16,
    color: "#383838",
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
    color: "#666",
    fontWeight: "400",
  },
  illustration: {
    width: 300,
    height: 250,
    marginTop: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 25,
    backgroundColor: "transparent",
  },
  skipText: {
    fontSize: 20,
    color: "#383838",
    fontWeight: 500,
  },
  nextButton: {
    borderRadius: 30,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#34B349",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  gradientButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 160,
  },
  nextText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: 500,
  },
  pagination: {
    bottom: 120,
  },
  dot: {
    backgroundColor: "#C4C4C4",
    width: 10,
    height: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#39B54B",
    width: 10,
    height: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  slideThreeIcons: {
    width: 20,
    height: 20,
  },
});

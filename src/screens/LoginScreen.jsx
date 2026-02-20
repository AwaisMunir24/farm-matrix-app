import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Entypo from "@expo/vector-icons/Entypo";
import EmailIcon from "../../assets/email.svg";
import Lock from "../../assets/lock.svg";
import LoginMan from "../../assets/loginMan.svg";
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    // Add your login logic here
    console.log("Login attempt:", email);
    console.log("Remember me:", rememberMe);
    // For now, just navigate to home
    if (onLogin) {
      onLogin();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.firstHeading}>
          <Text style={styles.mainHeading}>
            <Text style={{ color: "#39B54B" }}> Login </Text>Your Account
          </Text>
          <Image
            source={require("../../assets/login-leaf.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.loginScreen}>
          {/* <Image
            source={require("../../assets/login-img.png")}
            resizeMode="contain"
          /> */}
          <LoginMan width={375} height={262} />
        </View>

        {/* Input Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={{ position: "relative" }}>
              <EmailIcon width={24} height={24} style={styles.icons} />

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={{ position: "relative" }}>
              <Lock width={24} height={24} style={styles.icons} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={togglePasswordVisibility}
                activeOpacity={0.7}
              >
                <Image
                  source={
                    showPassword
                      ? require("../../assets/eye.png")
                      : require("../../assets/eye.png")
                  }
                  style={styles.eyeIconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me Checkbox */}
          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={toggleRememberMe}
            activeOpacity={0.7}
          >
            <View style={styles.checkbox}>
              {rememberMe && (
                <View style={styles.checkboxChecked}>
                  {/* <Text style={styles.checkmark}> */}
                  <Entypo
                    name="check"
                    size={14}
                    color="black"
                    style={{ color: "#39B54B", paddingTop: 1 }}
                  />
                  {/* </Text> */}
                </View>
              )}
            </View>
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#5FD66E", "#34B349"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientButton}
            >
              <Text style={styles.loginButtonText}>Sign in</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  firstHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  logo: {
    marginLeft: 12,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: 600,
    color: "#444444",
    textAlign: "center",
    marginBottom: 8,
  },
  loginScreen: {
    marginVertical: 58,
    // backgroundColor: "red",
    textAlign: "center",
  },

  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 16,
  },

  input: {
    backgroundColor: "#EFEFEF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#CACACA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontStyle: "italic",
    fontWeight: 500,
    paddingLeft: 70,
    paddingRight: 50,
  },
  icons: {
    position: "absolute",
    zIndex: 111,
    left: 20,
    top: 16,
  },
  eyeIcon: {
    position: "absolute",
    right: 20,
    top: 16,
    zIndex: 111,
    padding: 5,
  },
  eyeIconImage: {
    width: 16,
    height: 16,
  },

  // Remember Me Styles
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    // backgroundColor: "red",
    paddingTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D8D8D8",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    width: "100%",
    height: "100%",
    // backgroundColor: "#39B54B",
    borderRadius: 2,
    justifyContent: "start",
    alignItems: "center",
  },
  checkmark: {
    color: "#39B54B",
    fontSize: 12,
    fontWeight: 400,
  },
  rememberMeText: {
    fontSize: 14,
    color: "#000",
    fontWeight: 400,
  },

  loginButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#34B349",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    marginBottom: 20,
  },
  gradientButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: 700,
  },
});

export default LoginScreen;

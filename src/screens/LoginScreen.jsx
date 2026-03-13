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
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Entypo from "@expo/vector-icons/Entypo";
import { Feather } from "@expo/vector-icons";
import EmailIcon from "../../assets/email.svg";
import Lock from "../../assets/lock.svg";
import LoginMan from "../../assets/loginMan.svg";
import { saveAuthUser } from "../utils/auth"; // adjust path if needed

// ─────────────────────────────────────────────────────────────────────────────
// DUMMY CREDENTIALS  (matches STATIC_USER in your auth file)
// ─────────────────────────────────────────────────────────────────────────────
const DUMMY_EMAIL = "admin@email.com";
const DUMMY_PASSWORD = "admin123";
const DUMMY_USER = {
  id: 1,
  email: "admin@email.com",
  username: "honey001",
  role: "admin",
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJ1c2VybmFtZSI6ImhvbmV5MDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzczMzg3NjUwLCJleHAiOjE3NzQyNTE2NTB9.4RdVplcVD13LxXou4oNUJexPA6AGZLhCj3UKOFHzxj0",
};

// ─────────────────────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ── validation helpers ────────────────────────────────────────────────────
  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // ── login handler ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError("");

    // — basic field validation —
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    // Simulate a short network delay so it feels real
    await new Promise((r) => setTimeout(r, 800));

    // — credential check —
    if (
      email.trim().toLowerCase() === DUMMY_EMAIL &&
      password === DUMMY_PASSWORD
    ) {
      // Save user to AsyncStorage (used by getAuthUser / getAuthToken)
      await saveAuthUser(DUMMY_USER);
      setIsLoading(false);
      if (onLogin) onLogin();
    } else {
      setIsLoading(false);
      setError("Invalid email or password. Please try again.");
    }
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
        showsVerticalScrollIndicator={false}
      >
        {/* ── Heading ── */}
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

        {/* ── Illustration ── */}
        <View style={styles.loginScreen}>
          <LoginMan width={375} height={262} />
        </View>

        {/* ── Form ── */}
        <View style={styles.formContainer}>
          {/* Email */}
          <View style={styles.inputContainer}>
            <View style={{ position: "relative" }}>
              <EmailIcon width={24} height={24} style={styles.icons} />
              <TextInput
                style={[
                  styles.input,
                  error && !email.trim() && styles.inputError,
                ]}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>
          {/* Password */}
          <View style={styles.inputContainer}>
            <View style={{ position: "relative" }}>
              <Lock width={24} height={24} style={styles.icons} />
              <TextInput
                style={[styles.input, error && !password && styles.inputError]}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError("");
                }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword((p) => !p)}
                activeOpacity={0.7}
              >
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={18}
                  color="#CACACA"
                />
              </TouchableOpacity>
            </View>
          </View>
          {/* Error message */}
          {!!error && (
            <View style={styles.errorBox}>
              <Feather
                name="alert-circle"
                size={14}
                color="#E53935"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {/* Remember Me */}
          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe((p) => !p)}
            activeOpacity={0.7}
          >
            <View style={styles.checkbox}>
              {rememberMe && (
                <View style={styles.checkboxChecked}>
                  <Entypo
                    name="check"
                    size={14}
                    color="#39B54B"
                    style={{ paddingTop: 1 }}
                  />
                </View>
              )}
            </View>
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </TouchableOpacity>
          {/* Hint strip
          <View style={styles.hintBox}>
            <Feather
              name="info"
              size={13}
              color="#39B54B"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.hintText}>
              Demo credentials:{" "}
              <Text style={styles.hintBold}>admin@email.com</Text>
              {" / "}
              <Text style={styles.hintBold}>admin123</Text>
            </Text>
          </View> */}
          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <LinearGradient
              colors={
                isLoading ? ["#A8D5AE", "#A8D5AE"] : ["#5FD66E", "#34B349"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign in</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES  (100% original — only error, hint, and disabled additions)
// ─────────────────────────────────────────────────────────────────────────────
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
    fontWeight: "600",
    color: "#444444",
    textAlign: "center",
    marginBottom: 8,
  },
  loginScreen: {
    marginVertical: 58,
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
    fontWeight: "500",
    paddingLeft: 70,
    paddingRight: 50,
  },
  inputError: {
    borderColor: "#E53935",
    backgroundColor: "#FFF5F5",
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

  // Error box
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#E53935",
    fontWeight: "500",
    flex: 1,
  },

  // Remember Me
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
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
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  rememberMeText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "400",
  },

  // Hint strip
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 18,
  },
  hintText: {
    fontSize: 12,
    color: "#4E4E4E",
    flex: 1,
  },
  hintBold: {
    fontWeight: "700",
    color: "#15803D",
  },

  // Login button
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
  loginButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  gradientButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  loginButtonText: {
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default LoginScreen;

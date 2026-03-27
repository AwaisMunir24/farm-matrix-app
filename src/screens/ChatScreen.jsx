import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  Dimensions,
} from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { SERVER_URL } from "../utils";

const { width: SCREEN_W } = Dimensions.get("window");
const FARMER_ID = 1;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#34B349",
  primaryDark: "#279138",
  primaryLight: "#EBF8ED",
  bg: "#F0F4F0",
  white: "#FFFFFF",
  text: "#1A1A1A",
  textMuted: "#8A8A8A",
  border: "#E2EBE2",
  danger: "#E53935",
  online: "#4CAF50",
  shadow: "#000",
};

// ─────────────────────────────────────────────────────────────────────────────
// Typing Dots Indicator
// ─────────────────────────────────────────────────────────────────────────────
const TypingIndicator = () => {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingAvatar}>
        <Text style={styles.typingAvatarText}>AI</Text>
      </View>
      <View style={styles.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              {
                transform: [{
                  translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }),
                }],
                opacity: dot.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Waveform Bars (Recording)
// ─────────────────────────────────────────────────────────────────────────────
const WaveformBars = () => {
  const COUNT = 26;
  const bars = useRef(
    Array.from({ length: COUNT }, () => new Animated.Value(0.25))
  ).current;

  useEffect(() => {
    const anims = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i % 6) * 70),
          Animated.timing(bar, {
            toValue: 0.35 + Math.random() * 0.65,
            duration: 180 + Math.random() * 220,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.15,
            duration: 180 + Math.random() * 220,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.waveformContainer}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            { transform: [{ scaleY: bar }] },
            i % 3 === 1 && { backgroundColor: C.primaryDark },
          ]}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Recording Timer
// ─────────────────────────────────────────────────────────────────────────────
const RecordingTimer = ({ isRecording }) => {
  const [secs, setSecs] = useState(0);
  const iv = useRef(null);

  useEffect(() => {
    if (isRecording) {
      setSecs(0);
      iv.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } else {
      clearInterval(iv.current);
      setSecs(0);
    }
    return () => clearInterval(iv.current);
  }, [isRecording]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return <Text style={styles.recTimer}>{fmt(secs)}</Text>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────────────────────
const MessageBubble = React.memo(({ item, speakingId, setSpeakingId }) => {
  const isUser = item.role === "user";
  const isSpeaking = speakingId === item.id;
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(isUser ? 18 : -18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fade, { toValue: 1, useNativeDriver: true, tension: 90, friction: 8 }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 90, friction: 8 }),
    ]).start();
  }, []);

  const handleSpeak = () => {
    if (isSpeaking) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(item.id);
    Speech.speak(item.content, {
      rate: 0.9,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
    });
  };

  const isVoicePlaceholder = item.content === "🎤 Recording...";

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
        { opacity: fade, transform: [{ translateX: slide }] },
      ]}
    >
      {!isUser && (
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          style={styles.aiAvatar}
        >
          <Text style={styles.aiAvatarText}>AI</Text>
        </LinearGradient>
      )}

      {isUser ? (
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleUser]}
        >
          {isVoicePlaceholder ? (
            <View style={styles.voiceLoading}>
              <Text style={styles.micSmall}>🎙</Text>
              <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />
            </View>
          ) : (
            <Text style={styles.userText}>{item.content}</Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.timeUser}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit",
              })}
            </Text>
            <Text style={styles.ticks}>✓✓</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleAi]}>
          <Text style={styles.aiText}>{item.content}</Text>
          <View style={styles.metaRowAi}>
            <Text style={styles.timeAi}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit",
              })}
            </Text>
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={handleSpeak}
              activeOpacity={0.7}
            >
              <Text style={styles.speakIcon}>{isSpeaking ? "⏹" : "🔊"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Date Separator
// ─────────────────────────────────────────────────────────────────────────────
const DateSeparator = () => (
  <View style={styles.dateSep}>
    <View style={styles.dateSepLine} />
    <View style={styles.dateSepPill}>
      <Text style={styles.dateSepText}>Today</Text>
    </View>
    <View style={styles.dateSepLine} />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────
const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <LinearGradient
      colors={[C.primaryLight, "#D4F0DA"]}
      style={styles.emptyCircle}
    >
      <Text style={styles.emptyEmoji}>🌱</Text>
    </LinearGradient>
    <Text style={styles.emptyTitle}>Your AI Farm Assistant</Text>
    <Text style={styles.emptySub}>
      Ask me about crop diseases, weather, irrigation,{"\n"}fertilizers, or anything about your farm.
    </Text>
    {["What's wrong with my wheat?", "Best time to irrigate?", "Fertilizer for rice?"].map((s) => (
      <View key={s} style={styles.chip}>
        <Text style={styles.chipText}>{s}</Text>
      </View>
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// CHAT SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatScreen({ navigation, route }) {
  const initialMessage = route?.params?.initialMessage;
  const openMic = route?.params?.openMic;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [speakingId, setSpeakingId] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordUri, setRecordUri] = useState(null);

  const flatRef = useRef();

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && initialMessage) sendText(initialMessage);
    if (!loading && openMic) startRecording();
  }, [loading]);

  useEffect(() => () => Speech.stop(), []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/chatbot/conversation/${FARMER_ID}`);
      const json = await res.json();
      if (json.success) setMessages(json.data.messages || []);
    } catch {}
    finally { setLoading(false); }
  };

  // ── Send Text ──────────────────────────────────────────────────────────────
  const sendText = useCallback(async (override) => {
    const text = (override || input).trim();
    if (!text || sending) return;

    const tempId = `t-${Date.now()}`;
    setMessages((p) => [...p, { id: tempId, role: "user", content: text, created_at: new Date().toISOString() }]);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const res = await fetch(`${SERVER_URL}/api/chatbot/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmer_id: FARMER_ID, message: text }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((p) => [
          ...p.filter((m) => m.id !== tempId),
          { ...json.data.user_message, role: "user" },
          { ...json.data.assistant_message, role: "assistant" },
        ]);
      } else throw new Error();
    } catch {
      setMessages((p) => p.filter((m) => m.id !== tempId));
      Alert.alert("Failed to send", "Please try again.");
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }, [input, sending]);

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return Alert.alert("Microphone permission required");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      setRecordUri(uri);
    } catch {}
  };

  const cancelRecording = async () => {
    if (recording) { try { await recording.stopAndUnloadAsync(); } catch {} }
    setRecording(null);
    setIsRecording(false);
    setRecordUri(null);
  };

  // ── Send Voice ─────────────────────────────────────────────────────────────
  const sendVoice = async () => {
    if (!recordUri) return;
    const tempId = `tv-${Date.now()}`;
    const uri = recordUri;
    setMessages((p) => [...p, { id: tempId, role: "user", content: "🎤 Recording...", created_at: new Date().toISOString() }]);
    setRecordUri(null);
    setSending(true);
    scrollToBottom();

    const fd = new FormData();
    fd.append("farmer_id", String(FARMER_ID));
    fd.append("audio", { uri, type: "audio/m4a", name: "voice.m4a" });

    try {
      const res = await fetch(`${SERVER_URL}/api/chatbot/voice`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        setMessages((p) => [
          ...p.map((m) =>
            m.id === tempId
              ? { ...m, content: json.data.transcription || "🎤 Voice message" }
              : m
          ),
          { ...json.data.assistant_message, role: "assistant" },
        ]);
      } else throw new Error();
    } catch {
      setMessages((p) => p.filter((m) => m.id !== tempId));
      Alert.alert("Voice send failed", "Please try again.");
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.hdrAvatar}>
          <Text style={styles.hdrAvatarText}>AI</Text>
        </LinearGradient>

        <View style={styles.hdrInfo}>
          <Text style={styles.hdrName}>Farm Assistant</Text>
          <View style={styles.hdrStatusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.hdrStatus}>Always online</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <Text style={styles.moreBtnText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {loading ? (
          <View style={styles.loadWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadText}>Loading conversation…</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(item, i) => item.id?.toString() || `m${i}`}
            renderItem={({ item }) => (
              <MessageBubble item={item} speakingId={speakingId} setSpeakingId={setSpeakingId} />
            )}
            contentContainerStyle={[styles.list, messages.length === 0 && { flex: 1 }]}
            ListEmptyComponent={<EmptyState />}
            ListHeaderComponent={messages.length > 0 ? <DateSeparator /> : null}
            ListFooterComponent={sending ? <TypingIndicator /> : null}
            onContentSizeChange={scrollToBottom}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* VOICE PREVIEW BAR */}
        {recordUri && !isRecording && (
          <View style={styles.previewBar}>
            <TouchableOpacity style={styles.cancelCircle} onPress={() => setRecordUri(null)} activeOpacity={0.7}>
              <Text style={styles.cancelX}>✕</Text>
            </TouchableOpacity>
            <View style={styles.previewCenter}>
              <View style={styles.voiceReadyDot} />
              <Text style={styles.voiceReadyText}>Voice message ready</Text>
            </View>
            <TouchableOpacity onPress={sendVoice} activeOpacity={0.85}>
              <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.previewSend}>
                <Text style={styles.previewSendIcon}>➤</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* RECORDING BAR (WhatsApp-style) */}
        {isRecording && (
          <View style={styles.recBar}>
            <View style={styles.recLeft}>
              <View style={styles.recDot} />
              <RecordingTimer isRecording={isRecording} />
            </View>
            <WaveformBars />
            <TouchableOpacity style={styles.recCancel} onPress={cancelRecording} activeOpacity={0.7}>
              <Text style={styles.recCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STOP BUTTON (while recording) */}
        {isRecording && (
          <View style={styles.stopRow}>
            <TouchableOpacity style={styles.stopBtn} onPress={stopRecording} activeOpacity={0.85}>
              <LinearGradient colors={["#E53935", "#C62828"]} style={styles.stopGrad}>
                <Text style={styles.stopIcon}>⏹</Text>
                <Text style={styles.stopText}>Stop & Send</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT BAR */}
        {!isRecording && !recordUri && (
          <View style={styles.inputBar}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Ask anything about your farm…"
                placeholderTextColor={C.textMuted}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
            </View>

            {input.trim() ? (
              <TouchableOpacity onPress={() => sendText()} disabled={sending} activeOpacity={0.85}>
                <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.actionBtn}>
                  <Text style={styles.sendIcon}>➤</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPressIn={startRecording} disabled={sending} activeOpacity={0.85}>
                <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.actionBtn}>
                  <Text style={styles.micIcon}>🎤</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 4,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center", marginRight: 4 },
  backIcon: { fontSize: 34, color: C.primary, marginTop: -3 },
  hdrAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  hdrAvatarText: { color: C.white, fontWeight: "800", fontSize: 13 },
  hdrInfo: { flex: 1 },
  hdrName: { fontSize: 15, fontWeight: "700", color: C.text },
  hdrStatusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.online, marginRight: 5 },
  hdrStatus: { fontSize: 11, color: C.textMuted },
  moreBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  moreBtnText: { fontSize: 22, color: C.textMuted },

  // Chat list
  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  loadWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadText: { marginTop: 12, color: C.textMuted, fontSize: 14 },

  // Date separator
  dateSep: { flexDirection: "row", alignItems: "center", marginVertical: 14, paddingHorizontal: 10 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: C.border },
  dateSepPill: {
    backgroundColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4, marginHorizontal: 10,
  },
  dateSepText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },

  // Bubbles
  bubbleRow: { flexDirection: "row", marginBottom: 6, alignItems: "flex-end" },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
    marginRight: 8, marginBottom: 4,
  },
  aiAvatarText: { color: C.white, fontWeight: "800", fontSize: 11 },
  bubble: {
    maxWidth: SCREEN_W * 0.74,
    borderRadius: 20,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
  },
  userText: { color: C.white, fontSize: 14.5, lineHeight: 20 },
  aiText: { color: C.text, fontSize: 14.5, lineHeight: 20 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 5, gap: 4 },
  timeUser: { fontSize: 10, color: "rgba(255,255,255,0.75)" },
  ticks: { fontSize: 10, color: "rgba(255,255,255,0.85)" },
  metaRowAi: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 5 },
  timeAi: { fontSize: 10, color: C.textMuted },
  speakBtn: {
    marginLeft: 8, backgroundColor: C.primaryLight,
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  speakIcon: { fontSize: 12 },
  voiceLoading: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  micSmall: { fontSize: 18 },

  // Typing indicator
  typingRow: { flexDirection: "row", alignItems: "flex-end", marginHorizontal: 14, marginBottom: 8 },
  typingAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primary,
    justifyContent: "center", alignItems: "center",
    marginRight: 8, marginBottom: 4,
  },
  typingAvatarText: { color: C.white, fontWeight: "800", fontSize: 11 },
  typingBubble: {
    backgroundColor: C.white, borderRadius: 20, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  typingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.primary, marginHorizontal: 3,
  },

  // Empty state
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  emptyCircle: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 10 },
  emptySub: { fontSize: 13.5, color: C.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  chip: {
    backgroundColor: C.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1.5, borderColor: C.border, marginBottom: 8, width: "100%",
  },
  chipText: { fontSize: 13, color: C.primaryDark, fontWeight: "500" },

  // Voice preview bar
  previewBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 4,
  },
  cancelCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#FFE8E8",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  cancelX: { color: C.danger, fontWeight: "700", fontSize: 14 },
  previewCenter: { flex: 1, flexDirection: "row", alignItems: "center" },
  voiceReadyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginRight: 8 },
  voiceReadyText: { fontSize: 14, color: C.text, fontWeight: "500" },
  previewSend: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: "center", alignItems: "center", marginLeft: 12,
  },
  previewSendIcon: { color: C.white, fontSize: 16, marginLeft: 2 },

  // Recording bar
  recBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white,
    paddingHorizontal: 14, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  recLeft: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.danger, marginRight: 8 },
  recTimer: { fontSize: 14, color: C.danger, fontWeight: "700" },
  waveformContainer: { flex: 1, flexDirection: "row", alignItems: "center", height: 36 },
  waveBar: {
    width: 3, height: 22,
    backgroundColor: C.primary, borderRadius: 2, marginHorizontal: 1,
  },
  recCancel: {
    marginLeft: 12, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "#FFE8E8", borderRadius: 12,
  },
  recCancelText: { color: C.danger, fontWeight: "600", fontSize: 13 },

  // Stop row
  stopRow: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  stopBtn: { borderRadius: 14, overflow: "hidden" },
  stopGrad: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 13,
  },
  stopIcon: { fontSize: 16, marginRight: 8 },
  stopText: { color: C.white, fontSize: 15, fontWeight: "700" },

  // Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: C.white,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 4,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: C.bg, borderRadius: 24,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 2,
    marginRight: 10, minHeight: 44, maxHeight: 120,
    justifyContent: "center",
  },
  textInput: { fontSize: 14.5, color: C.text, maxHeight: 110, paddingVertical: 8 },
  actionBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  sendIcon: { color: C.white, fontSize: 17, marginLeft: 2 },
  micIcon: { fontSize: 20 },
});
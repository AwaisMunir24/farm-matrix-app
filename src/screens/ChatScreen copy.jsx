import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { SERVER_URL } from "../utils";
import { SafeAreaView } from "react-native-safe-area-context";

const FARMER_ID = 1;

// ─────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────
const MessageBubble = ({ item, speakingId, setSpeakingId }) => {
  const isUser = item.role === "user";
  const isSpeaking = speakingId === item.id;

  const handleSpeak = () => {
    if (isSpeaking) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }

    Speech.stop();

    setSpeakingId(item.id);

    Speech.speak(item.content, {
      // language: "ur-PK",
      rate: 0.9,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
    });
  };

  return (
    <View style={[styles.row, isUser ? styles.right : styles.left]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text>AI</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.user : styles.ai]}>
        <Text style={isUser ? styles.userText : styles.aiText}>
          {item.content}
        </Text>

        {/* 🔊 SPEAKER BUTTON */}
        <TouchableOpacity style={styles.speaker} onPress={handleSpeak}>
          <Text>{isSpeaking ? "⏹" : "🔊"}</Text>
        </TouchableOpacity>

        <Text style={styles.time}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
};
// ─────────────────────────────────────────────
// Chat Screen
// ─────────────────────────────────────────────
export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [speakingId, setSpeakingId] = useState(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordUri, setRecordUri] = useState(null);
  const [sound, setSound] = useState(null);

  const flatRef = useRef();

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const load = async () => {
    try {
      const res = await fetch(
        `${SERVER_URL}/api/chatbot/conversation/${FARMER_ID}`,
      );
      const json = await res.json();
      if (json.success) setMessages(json.data.messages);
    } catch {}
  };

  // ── TEXT SEND ──
  const sendText = async () => {
    if (!input.trim() || sending) return;

    const temp = {
      id: Date.now(),
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((p) => [...p, temp]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/chatbot/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmer_id: FARMER_ID, message: temp.content }),
      });

      const json = await res.json();
      if (json.success) {
        setMessages((p) => [...p, json.data.assistant_message]);
      }
    } catch {
      Alert.alert("Error sending message");
    } finally {
      setSending(false);
    }
  };
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // ── RECORDING ──
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return Alert.alert("Permission required");

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(recording);
    } catch (e) {}
  };

  const stopRecording = async () => {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setRecordUri(uri);
  };

  // ── PLAY RECORDED AUDIO ──
  const playRecorded = async () => {
    if (!recordUri) return;

    const { sound } = await Audio.Sound.createAsync({ uri: recordUri });
    setSound(sound);
    await sound.playAsync();
  };

  // ── SEND VOICE ──
const sendVoice = async () => {
  if (!recordUri) return;

  const tempId = Date.now();

  // ✅ Show user voice immediately
  const tempMsg = {
    id: tempId,
    role: "user",
    content: "🎤 Recording...",
    created_at: new Date().toISOString(),
  };

  setMessages((prev) => [...prev, tempMsg]);
  setRecordUri(null);
  setSending(true);

  const formData = new FormData();
  formData.append("farmer_id", String(FARMER_ID));
  formData.append("audio", {
    uri: recordUri,
    type: "audio/m4a",
    name: "voice.m4a",
  });

  try {
    const res = await fetch(`${SERVER_URL}/api/chatbot/voice`, {
      method: "POST",
      body: formData,
    });

    const json = await res.json();

    if (json.success) {
      const transcription =
        json.data?.transcription || "🎤 Voice message";

      const aiMsg = {
        ...json.data.assistant_message,
        role: "assistant",
      };

      // ✅ UPDATE temp message instead of removing
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                content: transcription, // replace with real text
              }
            : m
        )
      );

      // ✅ Then add AI response
      setMessages((prev) => [...prev, aiMsg]);
    }
  } catch (err) {
    Alert.alert("Voice failed");

    // ❌ Remove only if failed
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  } finally {
    setSending(false);
  }
};
  return (
    <SafeAreaView style={styles.container}>
      {/* CHAT */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        extraData={messages} // ✅ force re-render
        renderItem={({ item }) => (
          <MessageBubble
            item={item}
            speakingId={speakingId}
            setSpeakingId={setSpeakingId}
          />
        )}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
      />

      {/* RECORD PREVIEW */}
      {recordUri && (
        <View style={styles.voicePreview}>
          <TouchableOpacity onPress={playRecorded}>
            <Text>▶</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={sendVoice}>
            <Text>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRecordUri(null)}>
            <Text>❌</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* INPUT */}
      <KeyboardAvoidingView behavior="padding">
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything..."
            multiline
          />

          <TouchableOpacity
            onPress={recording ? stopRecording : startRecording}
            style={styles.icon}
            disabled={sending}
          >
            <Text>{recording ? "⏹" : "🎤"}</Text>
          </TouchableOpacity>

          <TouchableOpacity  onPress={sendText} disabled={!input.trim()}>
            <Text style={{ opacity: input.trim() ? 1 : 0.3 }}>➤</Text>
          </TouchableOpacity>
        </View>

        {sending && (
          <View style={{ padding: 10 }}>
            <ActivityIndicator size="small" />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES (PRO LEVEL)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7F5" },

  row: { flexDirection: "row", margin: 10 },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },

  bubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: "75%",
  },

  user: {
    backgroundColor: "#34B349",
    borderBottomRightRadius: 4,
  },

  ai: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
  },

  userText: { color: "#fff" },
  aiText: { color: "#000" },

  avatar: {
    width: 30,
    height: 30,
    backgroundColor: "#34B349",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },

  speaker: {
    marginTop: 5,
    alignSelf: "flex-end",
  },

  time: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 4,
    textAlign: "right",
  },

  inputBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },

  input: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
  },

  icon: {
    marginHorizontal: 8,
  },

  voicePreview: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#eee",
  },
});

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { getAuthToken } from "../utils/auth";
import { SERVER_URL } from "../utils/index";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = 120;
const CARD_GAP = 12;

// ─── Helper ──────────────────────────────────────────────────────────────────
const formatActivityName = (activity) => {
  if (!activity) return "Unknown Activity";
  return activity
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  return new Date(isoDate)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
};

// ─── Full-screen image modal ──────────────────────────────────────────────────
import { Modal } from "react-native";

const ImageModal = ({ visible, image, onClose }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={modalStyles.overlay}>
      <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
        <Feather name="x" size={22} color="#fff" />
      </TouchableOpacity>
      {image && (
        <View style={modalStyles.content}>
          <Image
            source={{ uri: image.src }}
            style={modalStyles.image}
            resizeMode="contain"
          />
          <Text style={modalStyles.date}>{image.date}</Text>
          <Text style={modalStyles.title}>{image.title}</Text>
          {image.comment ? (
            <Text style={modalStyles.comment}>{image.comment}</Text>
          ) : null}
          {image.representative ? (
            <Text style={modalStyles.rep}>By: {image.representative}</Text>
          ) : null}
        </View>
      )}
    </View>
  </Modal>
);

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { alignItems: "center", width: "100%" },
  image: { width: SCREEN_WIDTH - 40, height: 260, borderRadius: 14 },
  date: { marginTop: 14, fontSize: 12, color: "#ccc" },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
    textAlign: "center",
  },
  comment: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  rep: { fontSize: 12, color: "#39B54B", marginTop: 6 },
});

// ─── Main Slider Component ────────────────────────────────────────────────────
const FarmingSliderMobile = ({ getId, refreshTrigger }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const scrollRef = useRef(null);
  const [scrollIndex, setScrollIndex] = useState(0);

  const fetchFieldVisits = () => {
    setLoading(true);
    getAuthToken().then((token) => {
      axios
        .get(`${SERVER_URL}/api/fieldVisit/fieldbook/${getId}`, {
          headers: {
            "x-auth-token": token,
            "Content-Type": "application/json",
          },
        })
        .then((resp) => {
          const processedImages = [];
          if (
            resp.data.success &&
            resp.data.data &&
            Array.isArray(resp.data.data)
          ) {
            resp.data.data.forEach((visit) => {
              if (
                visit.images &&
                Array.isArray(visit.images) &&
                visit.images.length > 0
              ) {
                visit.images.forEach((image) => {
                  processedImages.push({
                    src: image.url,
                    date: formatDate(visit.visit_date),
                    title: formatActivityName(visit.farming_activity),
                    comment: visit.comment,
                    representative: visit.representative
                      ? `${visit.representative.first_name} ${visit.representative.last_name}`
                      : null,
                  });
                });
              }
            });
          }
          setImages(processedImages);
        })
        .catch((err) => console.error("FarmingSliderMobile fetch error:", err))
        .finally(() => setLoading(false));
    });
  };

  useEffect(() => {
    if (getId) fetchFieldVisits();
  }, [getId, refreshTrigger]);

  const scrollLeft = () => {
    const nextIndex = Math.max(0, scrollIndex - 1);
    setScrollIndex(nextIndex);
    scrollRef.current?.scrollTo({
      x: nextIndex * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
  };

  const scrollRight = () => {
    const nextIndex = Math.min(images.length - 1, scrollIndex + 1);
    setScrollIndex(nextIndex);
    scrollRef.current?.scrollTo({
      x: nextIndex * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.emptyBox}>
        <ActivityIndicator size="small" color="#39B54B" />
        <Text style={styles.emptyText}>Loading images…</Text>
      </View>
    );
  }

  // ── Empty state ──
  if (images.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Feather name="image" size={28} color="#CCC" />
        <Text style={styles.emptyText}>No visit images yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Arrow: Left */}
      {/* {images.length > 3 && (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowLeft]}
          onPress={scrollLeft}
          activeOpacity={0.7}
          disabled={scrollIndex === 0}
        >
          <Feather
            name="chevron-left"
            size={18}
            color={scrollIndex === 0 ? "#CCC" : "#4E4E4E"}
          />
        </TouchableOpacity>
      )} */}

      {/* Horizontal Scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          setScrollIndex(Math.round(x / (CARD_WIDTH + CARD_GAP)));
        }}
      >
        {images.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => setSelectedImage(item)}
          >
            <Image
              source={{ uri: item.src }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <Text style={styles.cardDate} numberOfLines={1}>
              {item.date}
            </Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Arrow: Right */}
      {/* {images.length > 3 && (
        <TouchableOpacity
          style={[styles.arrow, styles.arrowRight]}
          onPress={scrollRight}
          activeOpacity={0.7}
          disabled={scrollIndex >= images.length - 1}
        >
          <Feather
            name="chevron-right"
            size={18}
            color={scrollIndex >= images.length - 1 ? "#CCC" : "#4E4E4E"}
          />
        </TouchableOpacity>
      )} */}

      {/* Full-screen preview modal */}
      <ImageModal
        visible={!!selectedImage}
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </View>
  );
};

export default FarmingSliderMobile;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Empty / loading
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginBottom: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#AAA",
    marginTop: 6,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 4,
    gap: CARD_GAP,
  },

  // Image card
  card: {
    width: CARD_WIDTH,
    alignItems: "center",
  },
  cardImage: {
    width: CARD_WIDTH,
    height: 90,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F0F0F0",
  },
  cardDate: {
    fontSize: 11,
    color: "#7A7A7A",
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4E4E4E",
    textAlign: "center",
  },

  // Arrows
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  arrowLeft: { marginRight: 4 },
  arrowRight: { marginLeft: 4 },
});

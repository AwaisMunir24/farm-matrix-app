import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import axios from "axios";
import { SERVER_URL } from "../utils";
import { getAuthToken } from "../utils/auth";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Auth helper ─────────────────────────────────────────────────────────────
const getAuthHeaders = async () => {
  try {
    const token = await getAuthToken();
    return { "Content-Type": "application/json", "x-auth-token": token };
  } catch {
    return { "Content-Type": "application/json" };
  }
};

// ─── Urdu helpers ─────────────────────────────────────────────────────────────
const toUrduNumber = (num) => {
  if (num == null || num === "") return "";
  const urduDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(num).replace(/\d/g, (d) => urduDigits[d]);
};

const URDU_MONTHS = [
  "جنوری",
  "فروری",
  "مارچ",
  "اپریل",
  "مئی",
  "جون",
  "جولائی",
  "اگست",
  "ستمبر",
  "اکتوبر",
  "نومبر",
  "دسمبر",
];
const URDU_DAYS = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];

const toUrduDate = (dateString) => {
  const date = new Date(dateString);
  return {
    day: URDU_DAYS[date.getDay()],
    date: `${toUrduNumber(date.getDate())} ${URDU_MONTHS[date.getMonth()]}، ${toUrduNumber(date.getFullYear())}`,
  };
};

const CROP_URDU = {
  Cotton: "کپاس",
  Rice: "چاول",
  Wheat: "گندم",
  Corn: "مکئی",
  Sugarcane: "گنا",
  Vegetable: "سبزیاں",
};
const toUrduCrop = (crop) => CROP_URDU[crop] || crop || "—";

const WEATHER_ICON = (icon) => {
  if (!icon) return "☁️";
  if (icon.startsWith("01")) return "☀️";
  if (icon.startsWith("02") || icon.startsWith("03")) return "🌤️";
  if (icon.startsWith("04")) return "☁️";
  if (icon.startsWith("09") || icon.startsWith("10")) return "🌧️";
  if (icon.startsWith("11")) return "⛈️";
  if (icon.startsWith("13")) return "❄️";
  return "🌫️";
};

const WEATHER_DESC_URDU = (desc = "") => {
  if (desc.includes("clear")) return "صاف آسمان";
  if (desc.includes("cloud")) return "ابر آلود";
  if (desc.includes("rain")) return "بارش";
  if (desc.includes("thunder")) return "گرج چمک";
  if (desc.includes("snow")) return "برف";
  if (desc.includes("mist") || desc.includes("fog")) return "دھند";
  return desc;
};

const calculateCropAge = (fieldBookData) => {
  const sowing =
    fieldBookData?.sowing_detail?.[0]?.sowing_date ||
    fieldBookData?.sowing_detail?.sowing_date;
  if (!sowing) return null;
  const diffDays = Math.ceil((Date.now() - new Date(sowing)) / 864e5);
  return diffDays;
};

// ─── Mini line chart (pure RN, no deps) ──────────────────────────────────────
const MiniUrduChart = ({ data, color, title, height = 70 }) => {
  if (!data?.length) return null;
  const vals = data.map((d) => d.value).filter((v) => v != null && !isNaN(v));
  if (!vals.length) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const chartW = SW - 80;

  const pts = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * chartW,
    y: height - ((d.value - min) / range) * height,
    val: d.value,
  }));

  return (
    <View style={uc.chartBlock}>
      <Text style={uc.chartTitle}>{title}</Text>
      <View style={{ height: height + 8, width: "100%" }}>
        <View style={{ height, position: "relative" }}>
          {[0, 0.5, 1].map((t) => (
            <View key={t} style={[uc.gridLine, { top: t * height }]} />
          ))}
          {pts.slice(0, -1).map((p, i) => {
            const next = pts[i + 1];
            const dx = next.x - p.x;
            const dy = next.y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y - 1,
                  width: len,
                  height: 2.5,
                  backgroundColor: color,
                  transformOrigin: "0 50%",
                  transform: [{ rotate: `${angle}deg` }],
                  opacity: 0.9,
                }}
              />
            );
          })}
          {pts.map((p, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: p.x - 3.5,
                top: p.y - 3.5,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: color,
                borderWidth: 1.5,
                borderColor: "#fff",
              }}
            />
          ))}
        </View>
        <View style={uc.chartXRow}>
          <Text style={uc.chartXLabel}>{data[0]?.name}</Text>
          <Text style={uc.chartXLabel}>
            {data[Math.floor(data.length / 2)]?.name}
          </Text>
          <Text style={uc.chartXLabel}>{data[data.length - 1]?.name}</Text>
        </View>
      </View>
      <View style={uc.chartFooter}>
        <Text style={[uc.chartCurrentVal, { color }]}>
          آخری قدر: {data[data.length - 1]?.value?.toFixed(3)}
        </Text>
        <Text style={uc.chartPoints}>{data.length} ریکارڈ</Text>
      </View>
    </View>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────
const UrduSectionHeader = ({ title, emoji }) => (
  <View style={uc.sectionHeader}>
    <LinearGradient
      colors={["#E5FAE9", "#d1fae5"]}
      style={uc.sectionHeaderGrad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text style={uc.sectionHeaderText}>
        {emoji ? `${emoji} ` : ""}
        {title}
      </Text>
      <View style={uc.sectionHeaderLine} />
    </LinearGradient>
  </View>
);

// ─── Info row ─────────────────────────────────────────────────────────────────
const UrduInfoRow = ({ label, value }) => (
  <View style={uc.infoRow}>
    <Text style={uc.infoValue}>{value || "—"}</Text>
    <Text style={uc.infoLabel}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const UrduFieldReportModal = ({
  visible,
  onClose,
  fieldData,
  fieldBookData,
}) => {
  const [weatherData, setWeatherData] = useState(null);
  const [chartData, setChartData] = useState({ ndvi: [], ndmi: [], ndre: [] });
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [generating, setGenerating] = useState(false);

  const cropAge = useMemo(
    () => calculateCropAge(fieldBookData),
    [fieldBookData],
  );

  // ── Fetch weather
  const fetchWeather = useCallback(async () => {
    if (!fieldData?.center_latitude) {
      setLoadingWeather(false);
      return;
    }
    setLoadingWeather(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${SERVER_URL}/api/weather/detail`, {
        params: {
          lat: fieldData.center_latitude,
          lon: fieldData.center_longitude,
          units: "metric",
        },
        headers,
      });
      if (res.data?.success) setWeatherData(res.data);
    } catch (e) {
      console.error("report weather:", e?.message);
    } finally {
      setLoadingWeather(false);
    }
  }, [fieldData]);

  // ── Fetch satellite time-series for charts
  const fetchCharts = useCallback(async () => {
    if (!fieldData?.id) {
      setLoadingCharts(false);
      return;
    }
    setLoadingCharts(true);
    try {
      const headers = await getAuthHeaders();
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 60 * 864e5)
        .toISOString()
        .split("T")[0];

      const fetchIndex = async (indexType) => {
        try {
          const res = await axios.get(
            `${SERVER_URL}/api/satellite/field/${fieldData.id}/timeseries`,
            { params: { startDate, endDate, indexType }, headers },
          );
          if (res.data?.success && Array.isArray(res.data.data)) {
            return res.data.data
              .map((item) => ({
                name: new Date(item.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                value: parseFloat(
                  (item.mean ?? item.value ?? item.meanValue ?? 0).toFixed(4),
                ),
              }))
              .filter((d) => !isNaN(d.value))
              .sort((a, b) => new Date(a.name) - new Date(b.name));
          }
        } catch {
          return [];
        }
        return [];
      };

      const [ndvi, ndmi, ndre] = await Promise.all([
        fetchIndex("NDVI"),
        fetchIndex("NDMI"),
        fetchIndex("NDRE"),
      ]);
      setChartData({ ndvi, ndmi, ndre });
    } catch (e) {
      console.error("report charts:", e?.message);
    } finally {
      setLoadingCharts(false);
    }
  }, [fieldData]);

  useEffect(() => {
    if (visible) {
      fetchWeather();
      fetchCharts();
    }
  }, [visible]);

  // ─── Build HTML for PDF ────────────────────────────────────────────────────
  const buildReportHTML = () => {
    const farmer = fieldData?.farmer || {};
    const farmerName =
      `${farmer.first_name || ""} ${farmer.last_name || ""}`.trim() || "—";
    const cropType = toUrduCrop(fieldData?.cropType);
    const area = fieldData?.area_of_field?.toFixed(2) || "—";
    const today = toUrduDate(new Date());

    // Weather rows
    const weatherRows = (weatherData?.data || [])
      .slice(0, 6)
      .map((item) => {
        const ud = toUrduDate(item.date);
        const icon = WEATHER_ICON(item.icon);
        const desc = WEATHER_DESC_URDU(item.description);
        const tMin = toUrduNumber(Math.round(item.temperature?.min ?? 0));
        const tMax = toUrduNumber(Math.round(item.temperature?.max ?? 0));
        return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 8px;font-size:22px;text-align:center;">${icon}</td>
          <td style="padding:10px 8px;font-family:Noto Nastaliq Urdu,serif;font-size:14px;text-align:right;direction:rtl;">${desc}</td>
          <td style="padding:10px 8px;font-size:13px;text-align:center;">${tMin}° — ${tMax}°</td>
          <td style="padding:10px 8px;font-family:Noto Nastaliq Urdu,serif;font-size:14px;text-align:right;direction:rtl;">${ud.day}</td>
          <td style="padding:10px 8px;font-family:Noto Nastaliq Urdu,serif;font-size:14px;text-align:right;direction:rtl;padding-right:16px;">${ud.date}</td>
        </tr>`;
      })
      .join("");

    // SVG chart helper
    const buildSVGChart = (data, stroke, fill) => {
      if (!data?.length)
        return '<p style="color:#9CA3AF;text-align:center;font-size:12px;">ڈیٹا دستیاب نہیں</p>';
      const vals = data.map((d) => d.value);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      const W = 520,
        H = 100;
      const pts = data
        .map((d, i) => {
          const x = 10 + (i / (data.length - 1)) * (W - 20);
          const y = H - 10 - ((d.value - min) / range) * (H - 20);
          return `${x},${y}`;
        })
        .join(" ");
      const polyFill =
        pts +
        ` ${10 + ((data.length - 1) / (data.length - 1)) * (W - 20)},${H} 10,${H}`;
      return `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px;">
          <defs>
            <linearGradient id="g${stroke.replace("#", "")}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${stroke}" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="${stroke}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          ${[0, 25, 50, 75, 100].map((t) => `<line x1="10" y1="${H - 10 - (t / 100) * (H - 20)}" x2="${W - 10}" y2="${H - 10 - (t / 100) * (H - 20)}" stroke="#f3f4f6" stroke-width="1"/>`).join("")}
          <polygon points="${polyFill}" fill="url(#g${stroke.replace("#", "")})" />
          <polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${data
            .map((d, i) => {
              const x = 10 + (i / (data.length - 1)) * (W - 20);
              const y = H - 10 - ((d.value - min) / range) * (H - 20);
              return `<circle cx="${x}" cy="${y}" r="3.5" fill="${stroke}" stroke="white" stroke-width="1.5"/>`;
            })
            .join("")}
          <text x="10" y="${H + 2}" font-size="9" fill="#9CA3AF">${data[0]?.name}</text>
          <text x="${W / 2}" y="${H + 2}" font-size="9" fill="#9CA3AF" text-anchor="middle">${data[Math.floor(data.length / 2)]?.name}</text>
          <text x="${W - 10}" y="${H + 2}" font-size="9" fill="#9CA3AF" text-anchor="end">${data[data.length - 1]?.name}</text>
        </svg>`;
    };

    return `<!DOCTYPE html>
<html dir="rtl" lang="ur">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Noto Nastaliq Urdu',serif; background:#fff; color:#111; direction:rtl; }
  .page { max-width:794px; margin:0 auto; padding:32px 28px; }
  
  /* Header */
  .report-title { text-align:center; font-size:34px; font-weight:700; color:#111827; margin-bottom:10px; }
  .title-bar { height:6px; background:linear-gradient(to left,#16a34a,#22c55e,#16a34a); border-radius:3px; margin:0 auto 40px; width:220px; }
  
  .logo-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:36px; border-bottom:1px solid #e5e7eb; padding-bottom:20px; }
  .logo-placeholder { font-size:22px; font-weight:800; color:#39B54B; letter-spacing:-0.5px; }
  .contact-block { text-align:right; line-height:1.9; font-size:13px; color:#374151; }
  .contact-label { color:#39B54B; font-weight:600; }

  /* Section header */
  .sec-hdr { background:linear-gradient(to left,#E5FAE9,#d1fae5); border-bottom:3px solid #39B54B; border-radius:12px 12px 0 0; padding:14px 20px; margin-bottom:0; display:flex; align-items:center; justify-content:flex-start; direction:rtl; gap:10px; }  .sec-hdr-text { font-size:20px; font-weight:700; color:#111827; }
  .sec-body { border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px; padding:16px 20px; margin-bottom:28px; }

  /* Farmer info */
  .farmer-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 32px; }
  .farmer-item { display:flex; justify-content:flex-start; direction:rtl; align-items:baseline; gap:8px; padding:8px 0; border-bottom:1px solid #f3f4f6; }
  .farmer-label { font-size:14px; color:#6B7280; white-space:nowrap; }
  .farmer-value { font-size:15px; font-weight:700; color:#111827; }

  /* Weather table */
  .wx-table { width:100%; border-collapse:collapse; }
  .wx-table thead tr { background:#E5FAE9; border-bottom:3px solid #39B54B; }
  .wx-table thead th { padding:12px 8px; font-size:14px; color:#374151; text-align:right; }
  .wx-table tbody tr:last-child { border-bottom:none !important; }

  /* Charts */
  .chart-block { margin-bottom:20px; background:#FAFAFA; border-radius:10px; padding:14px 16px; border:1px solid #f3f4f6; }
  .chart-label-row { display:flex; justify-content:space-between; direction:rtl; align-items:center; margin-bottom:8px; }
  .chart-name { font-size:15px; font-weight:700; }
  .chart-last { font-size:12px; color:#6B7280; }
.chart-label-row { display:flex; justify-content:space-between; direction:rtl; align-items:center; margin-bottom:8px; }
  /* Analysis */
  .analysis-text { font-size:15px; line-height:2.2; text-align:right; color:#374151; padding:4px 0; }
  .instruction-text { font-size:14px; line-height:2.2; text-align:right; color:#374151; }

  /* Footer */
  .footer { margin-top:40px; padding-top:16px; border-top:2px solid #e5e7eb; display:flex; direction:rtl; justify-content:space-between; align-items:center; }
  .footer-date { font-size:12px; color:#9CA3AF; }
  .footer-logo { font-size:14px; font-weight:700; color:#39B54B; }
  .footer-url { font-size:11px; color:#9CA3AF; direction:ltr; }

  /* Badge */
  .badge { display:inline-block; background:#DCFCE7; color:#166534; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; margin-right:8px; }

  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">

  <!-- Title -->
  <h1 class="report-title">فارم میٹرکس رپورٹ</h1>
  <div class="title-bar"></div>

  <!-- Logo row -->
  <div class="logo-row">
    <div class="logo-placeholder">🌿 Farm Matrix</div>
    <div class="contact-block">
      <div><span class="contact-label">ویب سائٹ:</span> www.farmmatrix.co</div>
      <div><span class="contact-label">ای میل:</span> info@farmmatrix.co</div>
      <div><span class="contact-label">رپورٹ تاریخ:</span> ${today.date}</div>
    </div>
  </div>

  <!-- Farmer Info -->
  <div class="sec-hdr">
    <span class="sec-hdr-text">👤 کسان کی معلومات</span>
  </div>
  <div class="sec-body">
    <div class="farmer-grid">
      <div class="farmer-item">
       <span class="farmer-label">کسان کا نام:</span>
        <span class="farmer-value">${farmerName}</span>
       
      </div>
      <div class="farmer-item">
        <span class="farmer-label">رابطہ نمبر:</span>
        <span class="farmer-value">${toUrduNumber(farmer.phone || "—")}</span>
      
      </div>
      <div class="farmer-item">
         <span class="farmer-label">کاشت فصل:</span>
        <span class="farmer-value">${cropType}</span>
     
      </div>
      <div class="farmer-item">
       <span class="farmer-label">فصل کی عمر:</span>
        <span class="farmer-value">${cropAge ? `${toUrduNumber(cropAge)} دن` : "—"}</span>
       
      </div>
      <div class="farmer-item">
       <span class="farmer-label">رقبہ:</span>
        <span class="farmer-value">${toUrduNumber(area)} ایکڑ</span>
       
      </div>
      <div class="farmer-item">
       <span class="farmer-label">کھیت کا نام:</span>
        <span class="farmer-value">${fieldData?.field_name || "—"}</span>
       
      </div>
      ${
        fieldData?.village_name
          ? `
      <div class="farmer-item">
       <span class="farmer-label">گاؤں:</span>
        <span class="farmer-value">${fieldData.village_name}</span>
       
      </div>`
          : ""
      }
      ${
        fieldData?.tehsil
          ? `
      <div class="farmer-item">
       <span class="farmer-label">تحصیل:</span>
        <span class="farmer-value">${fieldData.tehsil}</span>
       
      </div>`
          : ""
      }
    </div>
  </div>

  <!-- Weather -->
  <div class="sec-hdr">
    <span class="sec-hdr-text">🌤️ فارم پر آئندہ موسم کی پیشن گوئی</span>
  </div>
  <div class="sec-body" style="padding:0;">
    ${
      weatherRows
        ? `
    <table class="wx-table">
      <thead>
        <tr>
          <th style="text-align:right;">موسم</th>
          <th style="text-align:right;">تفصیل</th>
          <th style="text-align:right;">درجہ حرارت</th>
          <th style="text-align:right;">دن</th>
          <th style="text-align:right; padding-right:16px;">تاریخ</th>
        </tr>
      </thead>
      <tbody>${weatherRows}</tbody>
    </table>`
        : `<p style="padding:20px;text-align:center;color:#9CA3AF;font-size:14px;">موسم کا ڈیٹا دستیاب نہیں</p>`
    }
  </div>

  <!-- Satellite Analysis -->
  <div class="sec-hdr">
    <span class="sec-hdr-text">🛰️ سیٹلائٹ تجزیہ</span>
  </div>
  <div class="sec-body">
    <p style="text-align:right;font-size:15px;margin-bottom:20px;color:#374151;">
      کھیت کا رقبہ: <strong style="color:#39B54B;">${toUrduNumber(area)} ایکڑ</strong>
    </p>

    <div class="chart-block">
      <div class="chart-label-row">
        <span class="chart-last" style="direction:ltr;">${chartData.ndvi[chartData.ndvi.length - 1]?.value?.toFixed(3) ?? ""}</span>
        <span class="chart-name" style="color:#22c55e;">🌿 پودوں کی صحت (NDVI)</span>
      </div>
      ${buildSVGChart(chartData.ndvi, "#22c55e", "#DCFCE7")}
    </div>

    <div class="chart-block">
      <div class="chart-label-row">
        <span class="chart-last" style="direction:ltr;">${chartData.ndmi[chartData.ndmi.length - 1]?.value?.toFixed(3) ?? ""}</span>
        <span class="chart-name" style="color:#3b82f6;">💧 مٹی کی نمی (NDMI)</span>
      </div>
      ${buildSVGChart(chartData.ndmi, "#3b82f6", "#DBEAFE")}
    </div>

    <div class="chart-block">
      <div class="chart-label-row">
        <span class="chart-last" style="direction:ltr;">${chartData.ndre[chartData.ndre.length - 1]?.value?.toFixed(3) ?? ""}</span>
        <span class="chart-name" style="color:#f59e0b;">⚗️ نائٹروجن (NDRE)</span>
      </div>
      ${buildSVGChart(chartData.ndre, "#f59e0b", "#FEF3C7")}
    </div>
  </div>

  <!-- Analysis -->
  <div class="sec-hdr">
    <span class="sec-hdr-text">📊 تجزیہ اور تجویز</span>
  </div>
  <div class="sec-body">
    <p class="analysis-text">
      آپ کی فصل کی صحت اچھی ہے۔ سیٹلائٹ ڈیٹا کے مطابق پودوں کی نشوونما معمول پر ہے۔
      موسم کے مطابق پانی دیں اور کیڑوں سے بچاؤ کے لیے احتیاطی تدابیر اختیار کریں۔
    </p>
  </div>

  <!-- Instructions -->
  <div class="sec-hdr">
    <span class="sec-hdr-text">📋 خصوصی ہدایت</span>
  </div>
  <div class="sec-body">
    <p class="instruction-text">
      تفصیلی تجزیہ اور فصل کی صحت کی تشخیص کے لئے، براہ کرم اپنے کھیت کی فصل کی تصویریں، بیماری کے پتے، کیڑے، قسم کا نام، بوائی کی تاریخ اور مٹی کے تجزیہ کی رپورٹ اگر دستیاب ہو تو شیئر کریں۔ ہماری ٹیم آپ کو آپ کی فصل کی حفاظت کے ممکنہ حل کے بارے میں مشورہ فراہم کرے گی۔
    </p>
  </div>

  <!-- Warning -->
  <div class="sec-hdr">
    <span class="sec-hdr-text">⚠️ ضروری انتباہ</span>
  </div>
  <div class="sec-body">
    <p class="instruction-text">
      فصل کی اسکیننگ رپورٹ کسانوں کو ان کے کھیت کے بارے میں مزید معلومات حاصل کرنے میں مدد کرتی ہیں۔ فارم میٹرکس صرف تیسرے فریق کے ذریعہ فراہم کردہ سیٹلائٹ سے جمع کردہ حقائق اور معلومات فراہم کرتا ہے۔
    </p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-url">www.farmmatrix.co</div>
    <div class="footer-logo">🌿 Farm Matrix</div>
    <div class="footer-date">${today.date}</div>
  </div>

</div>
</body>
</html>`;
  };

  // ─── Generate & share PDF ─────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const html = buildReportHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 794,
        height: 1123,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "فارم میٹرکس رپورٹ",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("✅ محفوظ ہو گئی", `رپورٹ یہاں محفوظ ہے:\n${uri}`);
      }
    } catch (e) {
      console.error("PDF error:", e);
      Alert.alert("خرابی", "PDF بنانے میں مسئلہ ہوا۔ دوبارہ کوشش کریں۔");
    } finally {
      setGenerating(false);
    }
  };

  const isLoading = loadingWeather || loadingCharts;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View style={uc.overlay}>
        <View style={uc.sheet}>
          {/* ── Drag pill */}
          <View style={uc.dragPill} />

          {/* ── Header gradient */}
          <LinearGradient
            colors={["#1a4731", "#39B54B"]}
            style={uc.headerGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity
              style={uc.closeBtn}
              onPress={onClose}
              disabled={generating}
            >
              <Feather name="x" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <View style={uc.headerMid}>
              <Text style={uc.headerTitle}>فارم میٹرکس رپورٹ</Text>
              <Text style={uc.headerSub}>
                {fieldData?.field_name} · {toUrduCrop(fieldData?.cropType)}
              </Text>
            </View>

            <TouchableOpacity
              style={[uc.dlBtn, (isLoading || generating) && uc.dlBtnDisabled]}
              onPress={handleDownloadPDF}
              disabled={isLoading || generating}
              activeOpacity={0.8}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="download" size={16} color="#fff" />
              )}
              <Text style={uc.dlBtnText}>
                {generating ? "بن رہی ہے…" : isLoading ? "لوڈ…" : "PDF"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* ── Content */}
          {isLoading ? (
            <View style={uc.loadingCenter}>
              <ActivityIndicator size="large" color="#39B54B" />
              <Text style={uc.loadingLabel}>رپورٹ تیار ہو رہی ہے…</Text>
            </View>
          ) : (
            <ScrollView
              style={uc.scroll}
              contentContainerStyle={uc.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Contact info bar */}
              <View style={uc.contactBar}>
                <View style={uc.contactItem}>
                  <Text style={uc.contactVal}>www.farmmatrix.co</Text>
                  <Text style={uc.contactKey}>:ویب سائٹ</Text>
                </View>
                <View style={uc.contactDivider} />
                <View style={uc.contactItem}>
                  <Text style={uc.contactVal}>info@farmmatrix.co</Text>
                  <Text style={uc.contactKey}>:ای میل</Text>
                </View>
              </View>

              {/* ── Farmer Info */}
              <UrduSectionHeader title="کسان کی معلومات" emoji="👤" />
              <View style={uc.sectionBody}>
                <View style={uc.infoGrid}>
                  <UrduInfoRow
                    label="کسان کا نام"
                    value={`${fieldData?.farmer?.first_name || ""} ${fieldData?.farmer?.last_name || ""}`.trim()}
                  />
                  <UrduInfoRow
                    label="رابطہ نمبر"
                    value={toUrduNumber(fieldData?.farmer?.phone)}
                  />
                  <UrduInfoRow
                    label="کاشت فصل"
                    value={toUrduCrop(fieldData?.cropType)}
                  />
                  <UrduInfoRow
                    label="فصل کی عمر"
                    value={cropAge ? `${toUrduNumber(cropAge)} دن` : null}
                  />
                  <UrduInfoRow
                    label="رقبہ"
                    value={`${toUrduNumber(fieldData?.area_of_field?.toFixed(2))} ایکڑ`}
                  />
                  <UrduInfoRow
                    label="کھیت کا نام"
                    value={fieldData?.field_name}
                  />
                  {fieldData?.village_name && (
                    <UrduInfoRow label="گاؤں" value={fieldData.village_name} />
                  )}
                  {fieldData?.tehsil && (
                    <UrduInfoRow label="تحصیل" value={fieldData.tehsil} />
                  )}
                </View>
              </View>

              {/* ── Weather */}
              <UrduSectionHeader title="آئندہ موسم کی پیشن گوئی" emoji="🌤️" />
              <View style={[uc.sectionBody, { padding: 0 }]}>
                {weatherData?.data?.length ? (
                  <>
                    {/* Table header */}
                    <View style={uc.wxHead}>
                      <Text style={[uc.wxHeadCell, { flex: 0.6 }]}>موسم</Text>
                      <Text style={[uc.wxHeadCell, { flex: 1.2 }]}>تفصیل</Text>
                      <Text style={[uc.wxHeadCell, { flex: 1.4 }]}>
                        درجہ حرارت
                      </Text>
                      <Text style={[uc.wxHeadCell, { flex: 0.9 }]}>دن</Text>
                      <Text
                        style={[uc.wxHeadCell, { flex: 1.5, paddingRight: 12 }]}
                      >
                        تاریخ
                      </Text>
                    </View>
                    {weatherData.data.slice(0, 6).map((item, idx) => {
                      const ud = toUrduDate(item.date);
                      const isLast =
                        idx === Math.min(weatherData.data.length, 6) - 1;
                      return (
                        <View
                          key={idx}
                          style={[uc.wxRow, isLast && { borderBottomWidth: 0 }]}
                        >
                          <Text
                            style={[
                              uc.wxCell,
                              { flex: 0.6, fontSize: 20, textAlign: "center" },
                            ]}
                          >
                            {WEATHER_ICON(item.icon)}
                          </Text>
                          <Text style={[uc.wxCell, uc.urdu, { flex: 1.2 }]}>
                            {WEATHER_DESC_URDU(item.description)}
                          </Text>
                          <Text
                            style={[
                              uc.wxCell,
                              { flex: 1.4, textAlign: "center", fontSize: 12 },
                            ]}
                          >
                            {toUrduNumber(Math.round(item.temperature?.min))}°–
                            {toUrduNumber(Math.round(item.temperature?.max))}°
                          </Text>
                          <Text style={[uc.wxCell, uc.urdu, { flex: 0.9 }]}>
                            {ud.day}
                          </Text>
                          <Text
                            style={[
                              uc.wxCell,
                              uc.urdu,
                              { flex: 1.5, paddingRight: 12, fontSize: 11 },
                            ]}
                          >
                            {ud.date}
                          </Text>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <Text style={uc.emptyText}>موسم کا ڈیٹا دستیاب نہیں</Text>
                )}
              </View>

              {/* ── Satellite Analysis */}
              <UrduSectionHeader title="سیٹلائٹ تجزیہ" emoji="🛰️" />
              <View style={uc.sectionBody}>
                <Text style={uc.areaLine}>
                  کھیت کا رقبہ:{" "}
                  <Text style={{ color: "#39B54B", fontWeight: "700" }}>
                    {toUrduNumber(fieldData?.area_of_field?.toFixed(2))} ایکڑ
                  </Text>
                </Text>

                <MiniUrduChart
                  data={chartData.ndvi}
                  color="#22c55e"
                  title="🌿  پودوں کی صحت  (NDVI)"
                />
                <MiniUrduChart
                  data={chartData.ndmi}
                  color="#3b82f6"
                  title="💧  مٹی کی نمی  (NDMI)"
                />
                <MiniUrduChart
                  data={chartData.ndre}
                  color="#f59e0b"
                  title="⚗️  نائٹروجن  (NDRE)"
                />
              </View>

              {/* ── Analysis */}
              <UrduSectionHeader title="تجزیہ اور تجویز" emoji="📊" />
              <View style={uc.sectionBody}>
                <Text style={uc.bodyText}>
                  آپ کی فصل کی صحت اچھی ہے۔ سیٹلائٹ ڈیٹا کے مطابق پودوں کی
                  نشوونما معمول پر ہے۔ موسم کے مطابق پانی دیں اور کیڑوں سے بچاؤ
                  کے لیے احتیاطی تدابیر اختیار کریں۔
                </Text>
              </View>

              {/* ── Instructions */}
              <UrduSectionHeader title="خصوصی ہدایت" emoji="📋" />
              <View style={uc.sectionBody}>
                <Text style={uc.bodyText}>
                  تفصیلی تجزیہ اور فصل کی صحت کی تشخیص کے لئے، براہ کرم اپنے
                  کھیت کی فصل کی تصویریں، بیماری کے پتے، کیڑے، قسم کا نام، بوائی
                  کی تاریخ اور مٹی کے تجزیہ کی رپورٹ اگر دستیاب ہو تو شیئر کریں۔
                  ہماری ٹیم آپ کو آپ کی فصل کی حفاظت کے ممکنہ حل کے بارے میں
                  مشورہ فراہم کرے گی۔
                </Text>
              </View>

              {/* ── Warning */}
              <UrduSectionHeader title="ضروری انتباہ" emoji="⚠️" />
              <View style={uc.sectionBody}>
                <Text style={uc.bodyText}>
                  فصل کی اسکیننگ رپورٹ کسانوں کو ان کے کھیت کے بارے میں مزید
                  معلومات حاصل کرنے میں مدد کرتی ہیں۔ فارم میٹرکس صرف تیسرے فریق
                  کے ذریعہ فراہم کردہ سیٹلائٹ سے جمع کردہ حقائق اور معلومات
                  فراہم کرتا ہے۔
                </Text>
              </View>

              {/* Footer */}
              <View style={uc.footer}>
                <Text style={uc.footerDate}>{toUrduDate(new Date()).date}</Text>
                <LinearGradient
                  colors={["#39B54B", "#22863a"]}
                  style={uc.footerBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={uc.footerBadgeText}>🌿 Farm Matrix</Text>
                </LinearGradient>
                <Text style={uc.footerUrl}>www.farmmatrix.co</Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default UrduFieldReportModal;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const GREEN = "#39B54B";
const GREEN_LIGHT = "#E5FAE9";
const SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

const uc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SH * 0.93,
    minHeight: SH * 0.75,   // ensures content is always visible
    overflow: "hidden",
},
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: -4,
  },

  // Header
  headerGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerMid: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    writingDirection: "rtl",
  },
  headerSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginTop: 2,
    textTransform: "capitalize",
  },
  dlBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  dlBtnDisabled: { opacity: 0.5 },
  dlBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // Loading
loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,          // ← ensures it's visible even without flex parent height
    paddingVertical: 80,
},
dingLabel: {
    marginTop: 14,
    fontSize: 14,
    color: "#6B7280",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Contact bar
  contactBar: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 0,
  },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  contactKey: {
    fontSize: 11,
    color: GREEN,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },
  contactVal: { fontSize: 11, color: "#374151" },
  contactDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  // Section header
  sectionHeader: { marginTop: 20, marginHorizontal: 14 },
  sectionHeaderGrad: {
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 3,
    borderBottomColor: GREEN,
    position: "relative",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },
  sectionHeaderLine: {
    position: "absolute",
    bottom: -3,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: GREEN,
  },

  sectionBody: {
    marginHorizontal: 14,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#E5E7EB",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
  },

  // Info grid
  infoGrid: { gap: 0 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },

  // Weather table
  wxHead: {
    flexDirection: "row",
    backgroundColor: GREEN_LIGHT,
    borderBottomWidth: 3,
    borderBottomColor: GREEN,
    paddingVertical: 10,
  },
  wxHeadCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textAlign: "right",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    paddingHorizontal: 4,
  },
  wxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  wxCell: {
    fontSize: 13,
    color: "#374151",
    textAlign: "right",
    paddingHorizontal: 4,
  },
  urdu: {
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
  },

  // Area line
  areaLine: {
    fontSize: 14,
    textAlign: "right",
    color: "#374151",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },

  // Chart block
  chartBlock: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
    marginBottom: 10,
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },
  chartXRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  chartXLabel: { fontSize: 9, color: "#9CA3AF" },
  chartFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  chartCurrentVal: { fontSize: 11, fontWeight: "700" },
  chartPoints: { fontSize: 10, color: "#9CA3AF" },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#F3F4F6",
  },

  // Body text
  bodyText: {
    fontSize: 14,
    lineHeight: 30,
    textAlign: "right",
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
    writingDirection: "rtl",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerDate: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: Platform.OS === "ios" ? "Geeza Pro" : "sans-serif",
  },
  footerBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  footerBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  footerUrl: { fontSize: 10, color: "#9CA3AF", direction: "ltr" },
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const OFFLINE_MAP_META_KEY = "offline_map_tiles_meta_v1";
const OFFLINE_MAP_CONTROL_KEY = "offline_map_tiles_control_v1";
const TILE_ROOT = `${FileSystem.documentDirectory}offline-map-tiles-v1`;
const TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_SIZE = 256;
const DEFAULT_MIN_ZOOM = 14;
const DEFAULT_MAX_ZOOM = 17;
const DEFAULT_RADIUS_KM = 3;
const DEFAULT_MAX_TILES = 1500;
const DEFAULT_MAX_CACHE_MB = 250;
const DEFAULT_MAX_AGE_DAYS = 14;
const DOWNLOAD_RETRIES = 2;
const BATCH_SIZE = 40;

const DEFAULT_BOUNDS = [
  // Lahore (fallback zone when no cluster/location is available)
  { minLat: 31.30, minLon: 74.10, maxLat: 31.72, maxLon: 74.55 },
];

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeCenter = (center) => {
  if (!center) return null;
  const lat = toNumber(center.latitude ?? center.lat);
  const lon = toNumber(center.longitude ?? center.lng ?? center.lon);
  if (lat === null || lon === null) return null;
  return {
    latitude: clamp(lat, -85, 85),
    longitude: clamp(lon, -180, 180),
  };
};

const nowMs = () => Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePoint = (value) => {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 2) {
    const lon = toNumber(value[0]);
    const lat = toNumber(value[1]);
    if (lat === null || lon === null) return null;
    return { latitude: clamp(lat, -85, 85), longitude: clamp(lon, -180, 180) };
  }
  return normalizeCenter(value);
};

const bboxFromCenter = (center, radiusKm = DEFAULT_RADIUS_KM) => {
  const radius = Math.max(Number(radiusKm) || DEFAULT_RADIUS_KM, 0.3);
  const latDelta = radius / 111.32;
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  const lonDelta = radius / (111.32 * Math.max(cosLat, 0.2));
  return {
    minLat: clamp(center.latitude - latDelta, -85, 85),
    maxLat: clamp(center.latitude + latDelta, -85, 85),
    minLon: clamp(center.longitude - lonDelta, -180, 180),
    maxLon: clamp(center.longitude + lonDelta, -180, 180),
  };
};

const normalizeBounds = (bbox) => {
  if (!bbox) return null;
  const minLat = toNumber(bbox.minLat);
  const maxLat = toNumber(bbox.maxLat);
  const minLon = toNumber(bbox.minLon);
  const maxLon = toNumber(bbox.maxLon);
  if (
    minLat === null ||
    maxLat === null ||
    minLon === null ||
    maxLon === null ||
    minLat >= maxLat ||
    minLon >= maxLon
  ) {
    return null;
  }
  return {
    minLat: clamp(minLat, -85, 85),
    maxLat: clamp(maxLat, -85, 85),
    minLon: clamp(minLon, -180, 180),
    maxLon: clamp(maxLon, -180, 180),
  };
};

const flattenCoordinates = (input, out = []) => {
  if (!input) return out;
  if (Array.isArray(input)) {
    if (input.length >= 2 && !Array.isArray(input[0]) && !Array.isArray(input[1])) {
      const pt = normalizePoint(input);
      if (pt) out.push(pt);
      return out;
    }
    for (const item of input) flattenCoordinates(item, out);
    return out;
  }
  const pt = normalizePoint(input);
  if (pt) out.push(pt);
  return out;
};

const boundsFromPoints = (points = []) => {
  if (!points.length) return null;
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  return normalizeBounds({
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  });
};

const isPointInsideBounds = (point, bounds) =>
  Boolean(
    point &&
      bounds &&
      point.latitude >= bounds.minLat &&
      point.latitude <= bounds.maxLat &&
      point.longitude >= bounds.minLon &&
      point.longitude <= bounds.maxLon,
  );

const lngToTileX = (lon, zoom) =>
  Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));

const latToTileY = (lat, zoom) => {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      n,
  );
};

const buildTileListForBounds = (bounds, minZoom, maxZoom, maxTiles) => {
  const allTiles = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = lngToTileX(bounds.minLon, z);
    const maxX = lngToTileX(bounds.maxLon, z);
    const minY = latToTileY(bounds.maxLat, z);
    const maxY = latToTileY(bounds.minLat, z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        allTiles.push({ z, x, y });
        if (allTiles.length >= maxTiles) return allTiles;
      }
    }
  }
  return allTiles;
};

const dedupeTiles = (tiles) => {
  const seen = new Set();
  const unique = [];
  for (const t of tiles) {
    const key = `${t.z}/${t.x}/${t.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }
  return unique;
};

const tilePath = ({ z, x, y }) => `${TILE_ROOT}/${z}/${x}/${y}.png`;

const tileUrl = ({ z, x, y }) =>
  TILE_URL_TEMPLATE.replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));

const ensureDir = async (dir) => {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
};

const bytesToMb = (bytes) => Number((bytes / (1024 * 1024)).toFixed(2));
const tileKey = (t) => `${t.z}/${t.x}/${t.y}`;

const downloadTileWithRetry = async (tile) => {
  const path = tilePath(tile);
  const parentDir = `${TILE_ROOT}/${tile.z}/${tile.x}`;
  await ensureDir(parentDir);

  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) return { status: "cached" };

  let lastErr = null;
  for (let attempt = 0; attempt <= DOWNLOAD_RETRIES; attempt++) {
    try {
      await FileSystem.downloadAsync(tileUrl(tile), path, {
        headers: {
          Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
        },
      });
      return { status: "downloaded" };
    } catch (e) {
      lastErr = e;
    }
  }
  return { status: "failed", error: String(lastErr?.message || lastErr) };
};

const extractClusterRegions = (clusters = []) => {
  const regions = [];
  const usedNames = new Set();

  const uniqueName = (baseName) => {
    let name = baseName || "Cluster";
    let suffix = 1;
    while (usedNames.has(name)) {
      suffix += 1;
      name = `${baseName} (${suffix})`;
    }
    usedNames.add(name);
    return name;
  };

  for (const c of clusters) {
    const clusterName = uniqueName(
      String(c?.cluster_name || c?.name || c?.title || "Cluster").trim(),
    );

    const boundaryCandidates = [
      c?.boundary,
      c?.boundaries,
      c?.polygon,
      c?.geometry,
      c?.geometry?.coordinates,
      c?.geojson,
      c?.geojson?.coordinates,
      c?.coordinates,
      c?.area_coordinates,
      c?.cluster_boundary,
    ];
    let boundaryPoints = [];
    for (const candidate of boundaryCandidates) {
      const points = flattenCoordinates(
        candidate?.coordinates ? candidate.coordinates : candidate,
      );
      if (points.length >= 3) {
        boundaryPoints = points;
        break;
      }
    }
    const boundaryBounds = boundsFromPoints(boundaryPoints);
    if (boundaryBounds) {
      const center = {
        latitude: (boundaryBounds.minLat + boundaryBounds.maxLat) / 2,
        longitude: (boundaryBounds.minLon + boundaryBounds.maxLon) / 2,
      };
      regions.push({
        id: `cluster_${String(c?.id ?? clusterName).replace(/\s+/g, "_")}`,
        name: clusterName,
        center,
        bounds: boundaryBounds,
        source: "cluster_boundary",
      });
      continue;
    }

    const direct = normalizeCenter(c);
    if (direct) {
      regions.push({
        id: `cluster_${String(c?.id ?? clusterName).replace(/\s+/g, "_")}`,
        name: clusterName,
        center: direct,
        bounds: bboxFromCenter(direct, DEFAULT_RADIUS_KM),
        source: "cluster",
      });
      continue;
    }

    const centroid = normalizeCenter(c?.centroid);
    if (centroid) {
      regions.push({
        id: `cluster_${String(c?.id ?? clusterName).replace(/\s+/g, "_")}`,
        name: clusterName,
        center: centroid,
        bounds: bboxFromCenter(centroid, DEFAULT_RADIUS_KM),
        source: "cluster",
      });
      continue;
    }

    const point = normalizeCenter(c?.location || c?.point || c?.coordinates);
    if (point) {
      regions.push({
        id: `cluster_${String(c?.id ?? clusterName).replace(/\s+/g, "_")}`,
        name: clusterName,
        center: point,
        bounds: bboxFromCenter(point, DEFAULT_RADIUS_KM),
        source: "cluster",
      });
    }
  }
  return regions;
};

const collectAllFiles = async (dir) => {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return [];
  const names = await FileSystem.readDirectoryAsync(dir);
  const all = [];
  for (const name of names) {
    const full = `${dir}/${name}`;
    const stat = await FileSystem.getInfoAsync(full);
    if (!stat.exists) continue;
    if (stat.isDirectory) {
      const nested = await collectAllFiles(full);
      all.push(...nested);
      continue;
    }
    all.push({
      path: full,
      size: Number(stat.size || 0),
      mtimeMs: Number(stat.modificationTime || 0) * 1000,
    });
  }
  return all;
};

const getCacheStats = async () => {
  const files = await collectAllFiles(TILE_ROOT);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  return { files, totalBytes, totalMb: bytesToMb(totalBytes) };
};

const readControlState = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_MAP_CONTROL_KEY);
    return raw ? JSON.parse(raw) : { paused: false };
  } catch {
    return { paused: false };
  }
};

const writeControlState = async (state) =>
  AsyncStorage.setItem(OFFLINE_MAP_CONTROL_KEY, JSON.stringify(state));

export const buildOfflineRegionCatalog = ({
  clusters = [],
  currentLocation = null,
  radiusKm = DEFAULT_RADIUS_KM,
} = {}) => {
  const normalizedRadius = Math.max(Number(radiusKm) || DEFAULT_RADIUS_KM, 0.3);
  const clusterRegions = extractClusterRegions(clusters).map((r) => ({
    ...r,
    bounds: r.source === "cluster_boundary" ? r.bounds : bboxFromCenter(r.center, normalizedRadius),
    radiusKm: normalizedRadius,
  }));
  const normalizedLocation = normalizeCenter(currentLocation);
  const regions = [...clusterRegions];

  if (normalizedLocation) {
    regions.push({
      id: "current_location",
      name: "Current Location",
      center: normalizedLocation,
      bounds: bboxFromCenter(normalizedLocation, normalizedRadius),
      source: "current_location",
      radiusKm: normalizedRadius,
    });
  }

  if (!regions.length) {
    regions.push({
      id: "fallback_lahore",
      name: "Lahore (Default)",
      center: { latitude: 31.5204, longitude: 74.3587 },
      bounds: DEFAULT_BOUNDS[0],
      source: "fallback",
      radiusKm: normalizedRadius,
    });
  }

  return regions.map((r) => ({ ...r, bounds: normalizeBounds(r.bounds) })).filter((r) => r.bounds);
};

export const setOfflineMapPrefetchPaused = async (paused) =>
  writeControlState({ paused: Boolean(paused), updatedAt: new Date().toISOString() });

export const getOfflineMapPrefetchState = async () => readControlState();

export const cleanupOfflineMapCache = async ({
  maxAgeDays = DEFAULT_MAX_AGE_DAYS,
  maxCacheMb = DEFAULT_MAX_CACHE_MB,
} = {}) => {
  const ageCutoffMs = nowMs() - Math.max(1, Number(maxAgeDays) || DEFAULT_MAX_AGE_DAYS) * 24 * 60 * 60 * 1000;
  const maxBytes = Math.max(20, Number(maxCacheMb) || DEFAULT_MAX_CACHE_MB) * 1024 * 1024;
  const stats = await getCacheStats();

  let removedByAge = 0;
  for (const file of stats.files) {
    if (file.mtimeMs > 0 && file.mtimeMs < ageCutoffMs) {
      await FileSystem.deleteAsync(file.path, { idempotent: true });
      removedByAge++;
    }
  }

  const afterAge = await getCacheStats();
  const sortedByOldest = [...afterAge.files].sort((a, b) => a.mtimeMs - b.mtimeMs);
  let bytes = afterAge.totalBytes;
  let removedBySize = 0;

  for (const file of sortedByOldest) {
    if (bytes <= maxBytes) break;
    await FileSystem.deleteAsync(file.path, { idempotent: true });
    bytes -= file.size;
    removedBySize++;
  }

  const finalStats = await getCacheStats();
  return {
    removedByAge,
    removedBySize,
    totalFiles: finalStats.files.length,
    totalCacheMb: finalStats.totalMb,
  };
};

export const getOfflineMapTileMeta = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_MAP_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("getOfflineMapTileMeta error:", e);
    return null;
  }
};

export const getOfflineMapTilePathTemplate = async () => {
  const info = await FileSystem.getInfoAsync(TILE_ROOT);
  if (!info.exists) return null;
  return `${TILE_ROOT}/{z}/{x}/{y}.png`;
};

export const getTileCoverageStatus = async (point = null) => {
  const meta = await getOfflineMapTileMeta();
  if (!meta) {
    return {
      hasCache: false,
      covered: false,
      reason: "No offline tile data prepared",
    };
  }
  const location = normalizeCenter(point);
  const regions = meta.regions || [];
  const coveredRegion =
    location && regions.find((r) => isPointInsideBounds(location, r.bounds));
  const totalMb = Number(meta.cache?.totalMb || 0);
  const ageHours = meta.preparedAt
    ? Math.max(0, (nowMs() - new Date(meta.preparedAt).getTime()) / (1000 * 60 * 60))
    : null;
  return {
    hasCache: true,
    covered: Boolean(coveredRegion),
    coveredRegionName: coveredRegion?.name || null,
    reason: coveredRegion
      ? "Covered by cached region"
      : "Current location outside cached regions",
    preparedAt: meta.preparedAt || null,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(1)),
    totalMb,
    regionsCount: regions.length,
  };
};

export const boundsToMapRegion = (bounds, padding = 1.3) => {
  if (!bounds) return null;
  const latSpan = Math.max((bounds.maxLat - bounds.minLat) * padding, 0.003);
  const lonSpan = Math.max((bounds.maxLon - bounds.minLon) * padding, 0.003);
  return {
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLon + bounds.maxLon) / 2,
    latitudeDelta: latSpan,
    longitudeDelta: lonSpan,
  };
};

export const getOfflineCoverageInspector = async () => {
  const meta = await getOfflineMapTileMeta();
  if (!meta) return { preparedAt: null, regions: [] };
  const regions = (meta.regions || []).map((r) => {
    const stats = meta.regionStats?.[r.id] || {};
    const planned = Number(stats.planned || 0);
    const cached = Number(stats.cached || 0);
    const downloaded = Number(stats.downloaded || 0);
    const failed = Number(stats.failed || 0);
    const available = cached + downloaded;
    let status = "missing";
    if (planned > 0 && failed === 0 && available >= planned) status = "complete";
    else if (available > 0) status = "partial";
    return {
      id: r.id,
      name: r.name,
      bounds: r.bounds,
      source: r.source,
      status,
      planned,
      cached,
      downloaded,
      failed,
      completionPct: planned > 0 ? Math.round((available / planned) * 100) : 0,
    };
  });
  return {
    preparedAt: meta.preparedAt || null,
    cacheMb: Number(meta?.cache?.totalMb || 0),
    regions,
  };
};

export const prepareOfflineMapTiles = async ({
  clusters = [],
  currentLocation = null,
  selectedRegionIds = [],
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  maxTiles = DEFAULT_MAX_TILES,
  clusterRadiusKm = DEFAULT_RADIUS_KM,
  maxCacheMb = DEFAULT_MAX_CACHE_MB,
  maxAgeDays = DEFAULT_MAX_AGE_DAYS,
  onProgress = null,
} = {}) => {
  const normalizedMinZoom = clamp(Number(minZoom) || DEFAULT_MIN_ZOOM, 10, 18);
  const normalizedMaxZoom = clamp(
    Number(maxZoom) || DEFAULT_MAX_ZOOM,
    normalizedMinZoom,
    19,
  );
  const normalizedMaxTiles = clamp(
    Number(maxTiles) || DEFAULT_MAX_TILES,
    100,
    5000,
  );
  const availableRegions = buildOfflineRegionCatalog({
    clusters,
    currentLocation,
    radiusKm: clusterRadiusKm,
  });
  const selectedSet = new Set((selectedRegionIds || []).filter(Boolean));
  const activeRegions =
    selectedSet.size > 0
      ? availableRegions.filter((r) => selectedSet.has(r.id))
      : availableRegions;
  const boundsToUse = activeRegions.map((r) => r.bounds).filter(Boolean);

  await ensureDir(TILE_ROOT);
  const cleanupBefore = await cleanupOfflineMapCache({ maxCacheMb, maxAgeDays });

  const regionStats = {};
  const tileToRegions = new Map();
  let plannedTiles = [];
  for (const region of activeRegions) {
    const remaining = normalizedMaxTiles - plannedTiles.length;
    if (remaining <= 0) break;
    const tiles = buildTileListForBounds(
      region.bounds,
      normalizedMinZoom,
      normalizedMaxZoom,
      remaining,
    );
    for (const t of tiles) {
      const key = tileKey(t);
      if (!tileToRegions.has(key)) tileToRegions.set(key, new Set());
      tileToRegions.get(key).add(region.id);
    }
    regionStats[region.id] = {
      planned: tiles.length,
      cached: 0,
      downloaded: 0,
      failed: 0,
    };
    plannedTiles = plannedTiles.concat(tiles);
  }

  plannedTiles = dedupeTiles(plannedTiles).slice(0, normalizedMaxTiles);
  const total = plannedTiles.length;
  let downloaded = 0;
  let cached = 0;
  let failed = 0;
  let paused = false;
  const startedAt = new Date().toISOString();

  for (let i = 0; i < plannedTiles.length; i += BATCH_SIZE) {
    const control = await readControlState();
    paused = Boolean(control?.paused);
    if (paused) {
      if (onProgress) {
        onProgress({
          phase: "paused",
          current: i,
          total,
          downloaded,
          cached,
          failed,
        });
      }
      while (paused) {
        await sleep(750);
        const state = await readControlState();
        paused = Boolean(state?.paused);
      }
    }

    const batch = plannedTiles.slice(i, i + BATCH_SIZE);
    for (let j = 0; j < batch.length; j++) {
      const tile = batch[j];
      const key = tileKey(tile);
      const regionIds = Array.from(tileToRegions.get(key) || []);
      const result = await downloadTileWithRetry(tile);
      if (result.status === "downloaded") downloaded++;
      if (result.status === "cached") cached++;
      if (result.status === "failed") failed++;
      for (const rid of regionIds) {
        if (!regionStats[rid]) continue;
        if (result.status === "downloaded") regionStats[rid].downloaded += 1;
        if (result.status === "cached") regionStats[rid].cached += 1;
        if (result.status === "failed") regionStats[rid].failed += 1;
      }

      if (onProgress) {
        onProgress({
          phase: "downloading",
          current: i + j + 1,
          total,
          downloaded,
          cached,
          failed,
        });
      }
    }
    await sleep(1);
  }
  const cleanupAfter = await cleanupOfflineMapCache({ maxCacheMb, maxAgeDays });
  const cacheStats = await getCacheStats();

  const meta = {
    version: 2,
    preparedAt: new Date().toISOString(),
    startedAt,
    tileRoot: TILE_ROOT,
    pathTemplate: `${TILE_ROOT}/{z}/{x}/{y}.png`,
    provider: "openstreetmap",
    minZoom: normalizedMinZoom,
    maxZoom: normalizedMaxZoom,
    requestedTiles: total,
    downloadedTiles: downloaded,
    cachedTiles: cached,
    failedTiles: failed,
    boundsCount: boundsToUse.length,
    bounds: boundsToUse,
    regions: activeRegions.map((r) => ({
      id: r.id,
      name: r.name,
      source: r.source,
      center: r.center,
      bounds: r.bounds,
      radiusKm: r.radiusKm,
    })),
    selectedRegionIds:
      selectedSet.size > 0 ? Array.from(selectedSet) : activeRegions.map((r) => r.id),
    tileSize: TILE_SIZE,
    cleanup: {
      before: cleanupBefore,
      after: cleanupAfter,
      policy: { maxCacheMb, maxAgeDays },
    },
    cache: {
      totalFiles: cacheStats.files.length,
      totalBytes: cacheStats.totalBytes,
      totalMb: cacheStats.totalMb,
    },
    regionStats,
  };

  await AsyncStorage.setItem(OFFLINE_MAP_META_KEY, JSON.stringify(meta));
  return meta;
};

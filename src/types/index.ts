export type NavigationTab = 'landing' | 'dashboard' | 'analyze' | 'map' | 'reports' | 'about';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'offline';
  service: string;
  version: string;
  timestamp?: string;
  model_available?: boolean;
}

export type VerificationStatusType = 'VERIFIED_SATELLITE_INPUT' | 'SUPPORTED_BUT_UNVERIFIED' | 'REJECTED';

export interface CheckItem {
  passed: boolean;
  details?: string;
  actual?: any;
  expected?: any;
}

export interface VerificationChecks {
  file_integrity: CheckItem;
  image_decode: CheckItem;
  dimensions: CheckItem;
  channels: CheckItem;
  dtype: CheckItem;
  modality: CheckItem;
  geospatial_metadata: CheckItem;
  model_compatibility: CheckItem;
}

export interface ModelContractInfo {
  model_name: string;
  model_version: string;
  modality: string;
  expected_channels: number;
  expected_dimensions: number[];
  expected_dtype: string;
  normalization_mean: number[];
  normalization_std: number[];
  preprocessing_version: string;
}

export interface VerificationResponse {
  verification_id: string;
  status: VerificationStatusType;
  accepted_for_inference: boolean;
  file_hash_sha256: string;
  filename: string;
  size_bytes: number;
  checks: VerificationChecks;
  reasons: string[];
  warnings: string[];
  model_contract: ModelContractInfo;
  timestamp: string;
}

export interface SpatialFloodZone {
  zone_id: number;
  pixel_count: number;
  area_ha: number | null;
  fraction_of_total_flood: number;
  pixel_bounds: [number, number, number, number]; // [min_row, min_col, max_row, max_col]
  geographic_bounds?: { south: number; west: number; north: number; east: number } | null;
  centroid_latlng?: [number, number] | null;
  mean_probability: number;
  category: 'MAJOR_INUNDATION_BODY' | 'SECONDARY_FLOOD_BASIN' | 'LOCALIZED_PONDING';
}

export interface ProbabilityDistributionStats {
  p_min: number;
  p_max: number;
  p_mean: number;
  p_std: number;
  uncertainty_bands: {
    non_flood_certain: number; // p < 0.35
    transition_uncertain: number; // 0.35 <= p < 0.65
    moderate_certainty: number; // 0.65 <= p < 0.85
    core_certainty: number; // p >= 0.85
  };
}

export interface FloodAnalysisResult {
  status: 'SUCCESS' | 'REJECTED' | 'FAILED';
  analysis_id: string;
  verification_id: string;
  file_hash_sha256?: string;
  checkpoint_hash?: string;
  filename: string;
  crs_type?: string;
  epsg_code?: number | null;
  epsg_urn?: string | null;
  crs_name?: string | null;
  origin_lat?: number | null;
  origin_lon?: number | null;
  native_origin_x?: number | null;
  native_origin_y?: number | null;
  pixel_scale?: number[] | null;
  affine_transform?: number[] | null;
  is_rotated?: boolean;
  rotation_angle_deg?: number | null;
  geographic_bounds?: { south: number; west: number; north: number; east: number } | null;
  corner_coordinates_latlng?: [number, number][] | null;
  nodata_value?: number | string | null;
  nodata_pixel_count?: number;
  angular_resolution_deg?: number[] | null;
  approx_ground_resolution_m?: number[] | null;
  projected_resolution_m?: number[] | null;
  flood_detected: boolean;
  flood_pixel_count: number;
  valid_pixel_count?: number;
  total_pixels: number;
  flooded_pixel_fraction?: number;
  coverage_percent: number;
  confidence_mean: number;
  probability_stats?: ProbabilityDistributionStats;
  connected_regions: number;
  spatial_zones?: SpatialFloodZone[];
  physical_area_ha: number | null;
  physical_area_notes: string;
  area_calculation_method?: string;
  spatial_resolution_m?: number[] | null;
  geospatial_validity?: boolean;
  inference_latency_ms: number;
  threshold_used: number;
  overlay_data_url?: string;
  mask_png_data_url?: string;
  confidence_heatmap_data_url?: string;
  created_at: string;
}

export interface RainViewerRadarFrame {
  time: number;
  path: string;
}

export interface RainViewerMetadata {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RainViewerRadarFrame[];
    nowcast: RainViewerRadarFrame[];
  };
}

export interface OpenMeteoCurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  weather_code: number;
  cloud_cover: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  surface_pressure?: number;
  wind_gusts_10m?: number;
}

export interface OpenMeteoHourlyForecast {
  time: string[];
  precipitation: number[];
  rain: number[];
  showers: number[];
  weather_code: number[];
  wind_speed_10m: number[];
}

export interface LiveWeatherData {
  source: string;
  coordinates: { lat: number; lon: number };
  rainViewer?: {
    host: string;
    frames: RainViewerRadarFrame[];
    nowcastFrames: RainViewerRadarFrame[];
    selectedFrameIndex: number;
    generatedTime: string;
  };
  currentWeather?: OpenMeteoCurrentWeather;
  currentUnits?: Record<string, string>;
  forecast?: OpenMeteoHourlyForecast;
  forecastUnits?: Record<string, string>;
  retrieval_timestamp: string | null;
  last_successful_refresh: string | null;
  last_attempted_refresh: string | null;
  status: 'FRESH' | 'STALE DATA' | 'SOURCE UNAVAILABLE';
  error_message?: string;
}

export interface HydrologyObservation {
  source: string;
  sensor_model?: string;
  coordinates: { lat: number; lon: number };
  current_river_discharge_m3s: number | null;
  current_precipitation_rate: number | null;
  precipitation_unit: string;
  daily_discharge_series?: number[];
  series_timestamps?: string[];
  source_timestamp: string | null;
  retrieval_timestamp: string | null;
  last_successful_refresh: string | null;
  last_attempted_refresh: string | null;
  status: 'FRESH' | 'STALE DATA' | 'SOURCE UNAVAILABLE';
  cache_status?: string;
  cache_age_seconds?: number;
  uncertainty_notes?: string;
  error_message?: string;
}

export interface SatelliteCatalogProduct {
  source: string;
  collection: string;
  found?: boolean;
  product_id?: string;
  platform?: string;
  instrument?: string;
  processing_level?: string;
  acquisition_timestamp?: string | null;
  published_timestamp?: string | null;
  cloud_cover_percent?: number | null;
  spatial_resolution_m?: number;
  orbit_state?: string;
  footprint_geometry?: any;
  retrieval_timestamp: string | null;
  last_successful_refresh: string | null;
  last_attempted_refresh: string | null;
  status: 'FRESH' | 'STALE DATA' | 'SOURCE UNAVAILABLE';
  cache_age_seconds?: number;
  provenance_verified?: boolean;
  error_message?: string;
}

export interface AnalysisSubmissionResponse {
  status: string;
  analysis_id: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  message: string;
  created_at?: string;
  verification_result?: VerificationResponse;
  analysis_result?: FloodAnalysisResult;
}

export interface ModelEvaluationMetrics {
  status?: string;
  message?: string;
  dataset?: string;
  test_chips_count?: number;
  checkpoint_available?: boolean;
  primary_metrics?: {
    iou?: number;
    dice?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    pixel_accuracy?: number;
  };
  inference_latency_ms?: {
    mean?: number;
    median?: number;
    min?: number;
    max?: number;
    hardware?: string;
  };
  confusion_matrix?: {
    true_positives?: number;
    false_positives?: number;
    false_negatives?: number;
    true_negatives?: number;
  };
}

export interface AnalysisSummary {
  id: string;
  analysis_id?: string;
  verification_id?: string;
  file_hash_sha256?: string;
  checkpoint_hash?: string;
  timestamp: string;
  filename: string;
  crs_type?: string;
  crs_name?: string | null;
  origin_lat?: number | null;
  origin_lon?: number | null;
  pixel_scale?: number[] | null;
  angular_resolution_deg?: number[] | null;
  approx_ground_resolution_m?: number[] | null;
  projected_resolution_m?: number[] | null;
  status: string;
  flood_detected?: boolean;
  connected_regions?: number;
  floodedAreaHa: string;
  physical_area_ha?: number | null;
  coverage_percent?: number;
  flood_pixel_count?: number;
  valid_pixel_count?: number;
  total_pixels?: number;
  confidence_mean?: number;
  threshold_used?: number;
  area_calculation_method?: string;
  spatial_resolution_m?: number[] | null;
  geospatial_validity?: boolean;
  geographic_bounds?: { north: number; south: number; east: number; west: number } | null;
  mask_png_data_url?: string;
  overlay_data_url?: string;
  confidence_heatmap_data_url?: string;
  spatial_zones?: Array<any>;
  corner_coordinates_latlng?: [number, number][] | null;
  inference_latency_ms?: number;
  physical_area_notes?: string;
  affectedRoads: string;
  affectedBridges: string;
  isolatedZones: string;
  priorityScore: string;
  isDemoSample?: boolean;
  created_at?: string;
}

export interface MapLayerState {
  satelliteBasemap: boolean;
  floodExtent: boolean;
  affectedRoads: boolean;
  affectedBridges: boolean;
  isolatedCommunities: boolean;
  priorityZones: boolean;
  tacticalGrid: boolean;
}

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

export interface FloodAnalysisResult {
  status: 'SUCCESS' | 'REJECTED' | 'FAILED';
  analysis_id: string;
  verification_id: string;
  filename: string;
  flood_detected: boolean;
  flood_pixel_count: number;
  valid_pixel_count?: number;
  total_pixels: number;
  flooded_pixel_fraction?: number;
  coverage_percent: number;
  confidence_mean: number;
  connected_regions: number;
  physical_area_ha: number | null;
  physical_area_notes: string;
  area_calculation_method?: string;
  spatial_resolution_m?: number[] | null;
  geospatial_validity?: boolean;
  inference_latency_ms: number;
  threshold_used: number;
  overlay_data_url?: string;
  created_at: string;
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
  timestamp: string;
  filename: string;
  status: string;
  floodedAreaHa: string;
  affectedRoads: string;
  affectedBridges: string;
  isolatedZones: string;
  priorityScore: string;
  isDemoSample?: boolean;
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

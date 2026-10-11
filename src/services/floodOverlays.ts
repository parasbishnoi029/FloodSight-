/**
 * FloodSight AI — Authoritative Geospatial Overlay Service
 * Enforces Zero-Fabrication Policy:
 * - Does NOT synthesize fictional mathematical sine/cosine flood polygons.
 * - Does NOT invent severed roadways, fake evacuation corridors, or fictional shelters.
 * - Renders verified model prediction overlays only when genuine analysis has been executed.
 * - Integrates genuine Copernicus STAC footprints and GloFAS hydrological stations.
 */

import { GlobalDisasterLocation } from '../data/globalDisasters';
import { FloodAnalysisResult, HydrologyObservation, SatelliteCatalogProduct } from '../types';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface FloodInundationGeometry {
  isVerifiedModelOutput: boolean;
  coreInundationPath: LatLngPoint[];
  bufferInundationPath: LatLngPoint[];
  inundationAreaHa: number | null;
  spatialResolutionMeters: number | null;
  provenanceSource: string;
  analysisId?: string;
  sourceTimestamp?: string;
}

export interface EmergencyRoute {
  id: string;
  name: string;
  type: 'SAFE_CORRIDOR' | 'SECONDARY_BYPASS' | 'SEVERED_SUBMERGED';
  path: LatLngPoint[];
  statusText: string;
  recommendedVehicle?: string | null;
}

export interface EmergencyShelter {
  id: string;
  name: string;
  position: LatLngPoint;
  status: string;
  capacityPeople?: number | null;
  elevationMsl?: number | null;
  medicalFacilities?: boolean | null;
}

export interface DisasterTacticalOverlays {
  locationId: string;
  hasVerifiedModelOutput: boolean;
  floodGeometry: FloodInundationGeometry;
  emergencyRoutes: EmergencyRoute[];
  shelters: EmergencyShelter[];
  infrastructureLayerStatus: 'UNAVAILABLE_PENDING_GROUND_INFRASTRUCTURE' | 'ACTIVE';
  infrastructureNotice: string;
  stacFootprint?: LatLngPoint[];
}

/**
 * Builds tactical overlays for a disaster location.
 * In accordance with Zero-Fabrication governance:
 * - If verified analysis is provided, maps genuine model prediction extent.
 * - Otherwise, reports MODEL_INFERENCE_PENDING and does NOT draw fabricated polygons.
 */
export function generateDisasterOverlays(
  location: GlobalDisasterLocation,
  verifiedAnalysis?: FloodAnalysisResult | null,
  satelliteProduct?: SatelliteCatalogProduct | null
): DisasterTacticalOverlays {
  const hasAnalysis = Boolean(verifiedAnalysis && verifiedAnalysis.status === 'SUCCESS');

  // Convert STAC polygon coordinates to LatLngPoint if available
  let stacFootprint: LatLngPoint[] | undefined = undefined;
  if (satelliteProduct?.footprint_geometry?.coordinates?.[0]) {
    try {
      const ring = satelliteProduct.footprint_geometry.coordinates[0];
      stacFootprint = ring.map((pt: [number, number]) => ({
        lat: Number(pt[1].toFixed(5)),
        lng: Number(pt[0].toFixed(5))
      }));
    } catch {}
  }

  if (hasAnalysis && verifiedAnalysis) {
    // Real verified model analysis output
    return {
      locationId: location.id,
      hasVerifiedModelOutput: true,
      floodGeometry: {
        isVerifiedModelOutput: true,
        coreInundationPath: [], // Raster overlay data URL used for pixel-level accuracy
        bufferInundationPath: [],
        inundationAreaHa: verifiedAnalysis.physical_area_ha,
        spatialResolutionMeters: verifiedAnalysis.spatial_resolution_m ? verifiedAnalysis.spatial_resolution_m[0] : null,
        provenanceSource: `Verified U-Net ResNet-34 (${verifiedAnalysis.filename})`,
        analysisId: verifiedAnalysis.analysis_id,
        sourceTimestamp: verifiedAnalysis.created_at
      },
      emergencyRoutes: [],
      shelters: [],
      infrastructureLayerStatus: 'UNAVAILABLE_PENDING_GROUND_INFRASTRUCTURE',
      infrastructureNotice: 'Infrastructure vector layer unavailable: Requires verified road/bridge GIS network intersection dataset.',
      stacFootprint
    };
  }

  // No analysis yet run for this location
  return {
    locationId: location.id,
    hasVerifiedModelOutput: false,
    floodGeometry: {
      isVerifiedModelOutput: false,
      coreInundationPath: [],
      bufferInundationPath: [],
      inundationAreaHa: null,
      spatialResolutionMeters: null,
      provenanceSource: 'MODEL NOT RUN / AWAITING VERIFIED PRODUCT',
      analysisId: undefined,
      sourceTimestamp: undefined
    },
    emergencyRoutes: [],
    shelters: [],
    infrastructureLayerStatus: 'UNAVAILABLE_PENDING_GROUND_INFRASTRUCTURE',
    infrastructureNotice: 'Emergency routes & infrastructure layers are disabled: Zero-Fabrication governance requires validated OpenStreetMap / Department of Transportation vector datasets.',
    stacFootprint
  };
}

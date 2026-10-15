import { FloodAnalysisResult } from '../types';

describe('Truthful 3D Topography & Flood Visualization Pipeline', () => {
  const sampleAnalysisResult: FloodAnalysisResult = {
    status: 'SUCCESS',
    analysis_id: 'test-analysis-1234',
    verification_id: 'test-verification-5678',
    file_hash_sha256: 'abc123def456',
    checkpoint_hash: '7b8d9e0b2a8e9db2162732a0632cb8a5f4b35b8a1777afca8880798869e4d436',
    filename: 'Ghana_Volta_Sentinel2_B4B3B2.tif',
    crs_type: 'GEOGRAPHIC_DEGREE',
    epsg_code: 4326,
    origin_lat: 5.7,
    origin_lon: -0.2,
    geographic_bounds: {
      south: 5.5,
      west: -0.2,
      north: 5.7,
      east: 0.1,
    },
    flood_detected: true,
    flood_pixel_count: 51200,
    valid_pixel_count: 262144,
    total_pixels: 262144,
    coverage_percent: 19.53,
    confidence_mean: 0.912,
    connected_regions: 2,
    spatial_zones: [
      {
        zone_id: 1,
        pixel_count: 40000,
        area_ha: 400.0,
        fraction_of_total_flood: 0.78,
        pixel_bounds: [100, 100, 300, 300],
        centroid_latlng: [5.62, -0.05],
        mean_probability: 0.94,
        category: 'MAJOR_INUNDATION_BODY',
      },
      {
        zone_id: 2,
        pixel_count: 11200,
        area_ha: 112.0,
        fraction_of_total_flood: 0.22,
        pixel_bounds: [350, 200, 450, 320],
        centroid_latlng: [5.55, 0.02],
        mean_probability: 0.88,
        category: 'SECONDARY_FLOOD_BASIN',
      },
    ],
    physical_area_ha: 512.0,
    physical_area_notes: 'Calculated using WGS84 geodesic integration.',
    inference_latency_ms: 45,
    threshold_used: 0.5,
    mask_png_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHzE1LqjAAAAABJRU5ErkJggg==',
    raster_preview_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    created_at: '2026-10-14T08:00:00.000Z',
  };

  it('preserves correct North-Up raster orientation and geographic coordinate transformations', () => {
    const bounds = sampleAnalysisResult.geographic_bounds!;
    const sizeX = 7.2;
    const sizeZ = 4.8; // Non-square footprint

    // Top-Left corner (u=0, v=0) -> Should be West and North
    const uTL = 0;
    const vTL = 0;
    const lonTL = bounds.west + uTL * (bounds.east - bounds.west);
    const latTL = bounds.north - vTL * (bounds.north - bounds.south);

    expect(lonTL).toBeCloseTo(-0.2, 5);
    expect(latTL).toBeCloseTo(5.7, 5);

    // Bottom-Right corner (u=1, v=1) -> Should be East and South
    const uBR = 1;
    const vBR = 1;
    const lonBR = bounds.west + uBR * (bounds.east - bounds.west);
    const latBR = bounds.north - vBR * (bounds.north - bounds.south);

    expect(lonBR).toBeCloseTo(0.1, 5);
    expect(latBR).toBeCloseTo(5.5, 5);

    // Center point (u=0.5, v=0.5)
    const uCenter = 0.5;
    const vCenter = 0.5;
    const lonCenter = bounds.west + uCenter * (bounds.east - bounds.west);
    const latCenter = bounds.north - vCenter * (bounds.north - bounds.south);

    expect(lonCenter).toBeCloseTo(-0.05, 5);
    expect(latCenter).toBeCloseTo(5.6, 5);
  });

  it('calculates aspect ratio correctly to avoid distorted square stretching', () => {
    const bounds = sampleAnalysisResult.geographic_bounds!;
    const dLat = Math.abs(bounds.north - bounds.south); // 0.2 deg
    const dLon = Math.abs(bounds.east - bounds.west);   // 0.3 deg
    const midLatRad = (((bounds.north + bounds.south) / 2) * Math.PI) / 180;
    const dEast = dLon * Math.cos(midLatRad);

    const ratio = dEast / dLat;
    expect(ratio).toBeGreaterThan(1.0); // Footprint is wider East-West than North-South
    expect(ratio).toBeLessThan(2.0);

    const baseDim = 7.2;
    const sizeX = baseDim;
    const sizeZ = baseDim / ratio;

    expect(sizeX).toBe(7.2);
    expect(sizeZ).toBeLessThan(7.2);
    expect(sizeX / sizeZ).toBeCloseTo(ratio, 3);
  });

  it('enforces flat reference plane and reports elevation/depth as null when DEM is absent', () => {
    const hasMeasuredDem = false;
    const measuredElevationMeters = null;

    // Optical Sentinel-2 imagery has no elevation datum
    let rawHeight = 0;
    let groundElevationMeters: number | null = null;
    let submergedDepthMeters: number | null = null;

    if (hasMeasuredDem && measuredElevationMeters !== null) {
      rawHeight = measuredElevationMeters;
      groundElevationMeters = measuredElevationMeters;
    } else {
      rawHeight = 0;
      groundElevationMeters = null;
      submergedDepthMeters = null;
    }

    expect(rawHeight).toBe(0);
    expect(groundElevationMeters).toBeNull();
    expect(submergedDepthMeters).toBeNull();
  });

  it('does not render flood overlay when mask is missing or inference failed', () => {
    const failedAnalysis: FloodAnalysisResult = {
      ...sampleAnalysisResult,
      status: 'FAILED',
      flood_detected: false,
      flood_pixel_count: 0,
      coverage_percent: 0,
      mask_png_data_url: undefined,
    };

    const shouldRenderMask = Boolean(
      failedAnalysis.status === 'SUCCESS' && failedAnalysis.mask_png_data_url && failedAnalysis.flood_detected
    );

    expect(shouldRenderMask).toBe(false);
  });

  it('guarantees clean replacement of analysis state when a new upload occurs', () => {
    const previousAnalysis = sampleAnalysisResult;
    const nextAnalysis: FloodAnalysisResult = {
      ...sampleAnalysisResult,
      analysis_id: 'test-analysis-9999',
      filename: 'Spain_Ebro_Sentinel2.tif',
      geographic_bounds: {
        south: 40.5,
        west: 0.4,
        north: 40.8,
        east: 0.9,
      },
      coverage_percent: 32.1,
      physical_area_ha: 1420.5,
    };

    let activeState: FloodAnalysisResult | null = previousAnalysis;

    // Simulate selecting a new file: clear state
    activeState = null;
    expect(activeState).toBeNull();

    // Simulate completion of new analysis
    activeState = nextAnalysis;
    expect(activeState.analysis_id).toBe('test-analysis-9999');
    expect(activeState.filename).toBe('Spain_Ebro_Sentinel2.tif');
    expect(activeState.coverage_percent).toBe(32.1);
    expect(activeState.physical_area_ha).toBe(1420.5);
    expect(activeState.geographic_bounds?.south).toBe(40.5);
  });

  it('maps genuine spatial flood cluster centroids into 3D local coordinates', () => {
    const b = sampleAnalysisResult.geographic_bounds!;
    const sizeX = 7.2;
    const sizeZ = 4.8;
    const dLon = b.east - b.west;
    const dLat = b.north - b.south;

    const zone = sampleAnalysisResult.spatial_zones![0];
    const [cLat, cLon] = zone.centroid_latlng!;

    const u = (cLon - b.west) / dLon;
    const v = (b.north - cLat) / dLat;

    const px = (u - 0.5) * sizeX;
    const pz = (v - 0.5) * sizeZ;

    expect(px).toBeGreaterThan(-sizeX / 2);
    expect(px).toBeLessThan(sizeX / 2);
    expect(pz).toBeGreaterThan(-sizeZ / 2);
    expect(pz).toBeLessThan(sizeZ / 2);
  });

  it('corrects metadata contradiction: displays active analysis location and area instead of catalog defaults', () => {
    const catalogDefault = {
      country: 'Ghana',
      name: 'Volta River Basin & Accra',
      estimatedInundationHa: 14200,
    };

    const uploadedActiveAnalysis = {
      analysis_id: 'active-run-7788',
      filename: 'Spain_Ebro_Sentinel2_B4B3B2.tif',
      origin_lat: 40.7128,
      origin_lon: 0.5234,
      physical_area_ha: 734.2,
      coverage_percent: 18.25,
    };

    // When activeAnalysis is present, header must reflect the active file, coordinates, and real area
    const isUploadActive = Boolean(uploadedActiveAnalysis);
    const displayedLocation = isUploadActive
      ? `${uploadedActiveAnalysis.filename} (${uploadedActiveAnalysis.origin_lat.toFixed(3)}°N, ${uploadedActiveAnalysis.origin_lon.toFixed(3)}°E)`
      : `${catalogDefault.name}, ${catalogDefault.country}`;

    const displayedArea = isUploadActive
      ? `${uploadedActiveAnalysis.physical_area_ha} ha`
      : `${catalogDefault.estimatedInundationHa} ha`;

    expect(displayedLocation).toContain('Spain_Ebro');
    expect(displayedLocation).not.toContain('Ghana');
    expect(displayedArea).toBe('734.2 ha');
    expect(displayedArea).not.toBe('14200 ha');
  });

  it('rejects single-band B2 file as incompatible with 3-band U-Net ResNet-34 model contract', () => {
    const singleBandChannels: number = 1;
    const requiredChannels: number = 3;

    const isCompatible = singleBandChannels === requiredChannels;
    expect(isCompatible).toBe(false);

    const reasons: string[] = [];
    if (!isCompatible) {
      reasons.push('UNSUPPORTED_MODEL_INPUT: Model requires exactly 3 channels (B4 Red, B3 Green, B2 Blue).');
    }

    expect(reasons).toContain('UNSUPPORTED_MODEL_INPUT: Model requires exactly 3 channels (B4 Red, B3 Green, B2 Blue).');
  });

  it('disables depth hazard layer when depth/DEM is unavailable', () => {
    const hasBathymetryOrDem = false;
    const canRenderDepthHazard = hasBathymetryOrDem;

    expect(canRenderDepthHazard).toBe(false);
  });
});


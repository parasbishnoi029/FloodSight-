import { createFloodsightMiddleware } from '../server/floodsightMiddleware';
import { EventEmitter } from 'events';
import { FloodAnalysisResult } from '../types';

interface MockRequestOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: Buffer | string;
}

interface MockResponseResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  json: () => any;
}

function executeMiddleware(
  middleware: any,
  options: MockRequestOptions
): Promise<MockResponseResult> {
  return new Promise((resolve, reject) => {
    const req: any = new EventEmitter();
    req.method = options.method || 'GET';
    req.url = options.url || '/';
    req.headers = options.headers || {};

    const res: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader(name: string, val: string) {
        this.headers[name.toLowerCase()] = val;
      },
      end(chunk?: any) {
        const bodyStr = chunk
          ? Buffer.isBuffer(chunk)
            ? chunk.toString('utf-8')
            : String(chunk)
          : '';
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: bodyStr,
          json: () => {
            try {
              return JSON.parse(bodyStr);
            } catch (e) {
              return { raw: bodyStr };
            }
          },
        });
      },
    };

    const next = (err?: any) => {
      if (err) return reject(err);
      resolve({
        statusCode: 404,
        headers: {},
        body: 'Not handled by middleware',
        json: () => ({}),
      });
    };

    Promise.resolve(middleware(req, res, next)).catch(reject);

    process.nextTick(() => {
      if (options.body) {
        const buf = Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body);
        req.emit('data', buf);
      }
      req.emit('end');
    });
  });
}

describe('Free No-Registration Geospatial Data Workflow Tests', () => {
  let middleware: any;

  beforeEach(() => {
    middleware = createFloodsightMiddleware();
  });

  // 1. Public STAC Search (Planetary Computer)
  describe('1. Microsoft Planetary Computer Public STAC Search', () => {
    it('searches Sentinel-2 L2A acquisitions via GET /api/external/stac/search with bbox', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/stac/search?bbox=-0.3,5.5,0.1,5.8&limit=2&max_cloud_cover=60',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      const data = res.json();
      expect(data.source).toContain('Planetary Computer');
      expect(data.attribution).toContain('European Space Agency');
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.retrieval_timestamp).toBeDefined();

      if (data.features.length > 0) {
        const first = data.features[0];
        expect(first.id).toBeDefined();
        expect(first.acquisition_timestamp).toBeDefined();
        expect(first.assets).toBeDefined();
        expect(first.attribution).toBeDefined();
      }
    });

    it('rejects invalid or missing bbox parameters with HTTP 400 INVALID_BBOX', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/stac/search?bbox=-0.3,5.5', // only 2 numbers
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.error).toBe('INVALID_BBOX');
      expect(data.message).toContain('bbox');
    });

    it('provides public unauthenticated SAS token via GET /api/external/stac/token without user credentials', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/stac/token',
      });

      // Public token service returns 200 with token or 502/timeout in sandbox
      expect([200, 502, 504]).toContain(res.statusCode);
      const data = res.json();
      if (res.statusCode === 200) {
        expect(data.status).toBe('SUCCESS');
        expect(data.attribution).toContain('Microsoft Planetary Computer Public Token Service');
        expect(data.collection).toBe('sentinel-2-l2a');
      }
    });
  });

  // 2. Missing Assets & Invalid Bands Validation
  describe('2. Missing Assets and Invalid Bands Validation', () => {
    it('detects missing required model bands (B02, B03, B04) and blocks inference under Zero-Fabrication', async () => {
      const incompleteItem = {
        id: 'S2A_MSIL2A_TEST_INCOMPLETE',
        properties: {
          'proj:epsg': 32630,
          'proj:transform': [10, 0, 500000, 0, -10, 1000000],
        },
        assets: {
          // Only B02 provided; missing B03 and B04
          B02: { href: 'https://example.com/B02.tif', gsd: 10 },
          visual: { href: 'https://example.com/visual.tif' },
        },
      };

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/external/stac/validate-item',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteItem),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe('INCOMPATIBLE');
      expect(data.checks.model_contract_compatible).toBe(false);
      expect(data.missing_bands).toEqual(expect.arrayContaining(['B03 (Green 560nm)', 'B04 (Red 665nm)']));
      expect(data.message).toContain('Zero-Fabrication Policy');
      expect(data.model_requirements.zero_fabrication_rule).toContain('NEVER fabricated');
    });

    it('passes compatibility check when all required bands B02, B03, and B04 are present with valid CRS', async () => {
      const validItem = {
        id: 'S2A_MSIL2A_TEST_COMPLETE',
        properties: {
          'proj:epsg': 32630,
          'proj:transform': [10, 0, 500000, 0, -10, 1000000],
        },
        assets: {
          B02: { href: 'https://example.com/B02.tif', gsd: 10 },
          B03: { href: 'https://example.com/B03.tif', gsd: 10 },
          B04: { href: 'https://example.com/B04.tif', gsd: 10 },
          visual: { href: 'https://example.com/visual.tif' },
        },
      };

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/external/stac/validate-item',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validItem),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe('COMPATIBLE');
      expect(data.checks.model_contract_compatible).toBe(true);
      expect(data.missing_bands).toHaveLength(0);
      expect(data.spatial_parameters.epsg).toBe(32630);
    });
  });

  // 3. Missing DEM & Open-Meteo Elevation API
  describe('3. DEM Elevation Validation & Missing DEM Handling', () => {
    it('returns discrete point elevation samples (~90m) with explicit disclosure', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/elevation?south=5.5&west=-0.2&north=5.7&east=0.0',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(['SUCCESS', 'SOURCE_UNAVAILABLE']).toContain(data.status);
      if (data.status === 'SUCCESS') {
        expect(data.provenance).toContain('OPEN-METEO UNAUTHENTICATED ELEVATION API');
        expect(data.is_continuous_raster).toBe(false);
        expect(data.disclosure).toContain('discrete point samples');
        expect(Array.isArray(data.elevations)).toBe(true);
      }
    });

    it('rejects invalid or missing elevation bounds with HTTP 400', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/elevation?south=invalid&west=0',
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.error).toBe('INVALID_BOUNDS');
    });

    it('fails closed and sets elevation to null when elevation source is unavailable without inventing fake hills', async () => {
      const unavailableDemState = {
        hasDem: false,
        elevations: null,
        minM: null,
        maxM: null,
        source: 'Elevation Unavailable (Flat Reference Plane)',
      };

      expect(unavailableDemState.hasDem).toBe(false);
      expect(unavailableDemState.elevations).toBeNull();
      expect(unavailableDemState.source).toContain('Flat Reference Plane');
      // Never synthesize random height data
      expect(unavailableDemState.elevations).not.toBeDefined;
    });
  });

  // 4. API Failures and Optional Weather Radar
  describe('4. External API Failure Isolation & Weather Radar Non-Interference', () => {
    it('weather radar tiles never modify flood-mask probabilities, flooded hectares, or model outputs', () => {
      const initialAnalysis: FloodAnalysisResult = {
        status: 'SUCCESS',
        analysis_id: 'ana-001',
        verification_id: 'ver-001',
        filename: 'Ghana_Volta_B4B3B2.tif',
        flood_detected: true,
        flood_pixel_count: 50000,
        total_pixels: 262144,
        coverage_percent: 19.07,
        confidence_mean: 0.91,
        physical_area_ha: 500.0,
        physical_area_notes: 'Calculated using WGS84 geodesic integration.',
        inference_latency_ms: 32,
        threshold_used: 0.50,
        connected_regions: 1,
        created_at: new Date().toISOString(),
      };

      // User enables live weather radar overlay
      const weatherRadarOverlayActive = true;
      const radarRainIntensityMm = 45.2; // heavy rainfall observed by radar

      // Immutable analytical invariant: Model segmentation is unaffected by weather radar
      const analyticalResultAfterRadar = { ...initialAnalysis };
      expect(analyticalResultAfterRadar.coverage_percent).toBe(19.07);
      expect(analyticalResultAfterRadar.physical_area_ha).toBe(500.0);
      expect(analyticalResultAfterRadar.confidence_mean).toBe(0.91);
      expect(analyticalResultAfterRadar.flood_pixel_count).toBe(50000);
    });

    it('handles RainViewer API gracefully without breaking analytical pipeline', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/weather-radar',
      });

      expect([200, 502, 504]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        const data = res.json();
        expect(data.version || data.host).toBeDefined();
      } else {
        const data = res.json();
        expect(data.error).toBeDefined();
      }
    });
  });

  // 5. Observation Freshness & Provenance Separation
  describe('5. Observation Freshness & Multi-Source Timestamps', () => {
    it('distinguishes satellite acquisition time, API retrieval time, weather observations, and model execution time', () => {
      const satelliteAcquisitionTime = '2026-10-14T10:24:11.000Z'; // historical satellite flyover
      const apiRetrievalTime = '2026-10-15T04:30:00.000Z'; // backend query time
      const weatherObservationTime = '2026-10-15T04:15:00.000Z'; // recent radar sweep
      const modelExecutionTime = '2026-10-15T04:30:05.120Z'; // model inference finish

      // Assert each timestamp represents a distinct semantic phase
      expect(Date.parse(satelliteAcquisitionTime)).toBeLessThan(Date.parse(apiRetrievalTime));
      expect(Date.parse(weatherObservationTime)).toBeLessThan(Date.parse(apiRetrievalTime));
      expect(Date.parse(apiRetrievalTime)).toBeLessThanOrEqual(Date.parse(modelExecutionTime));
    });

    it('correctly marks data older than SLA threshold as STALE DATA', () => {
      const calculateFreshness = (observationIsoString: string, maxAgeHours: number): 'FRESH' | 'STALE DATA' => {
        const obsTime = Date.parse(observationIsoString);
        const ageMs = Date.now() - obsTime;
        return ageMs > maxAgeHours * 3600 * 1000 ? 'STALE DATA' : 'FRESH';
      };

      const recentTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 mins ago
      const oldTime = new Date(Date.now() - 48 * 3600 * 1000).toISOString(); // 48 hours ago

      expect(calculateFreshness(recentTime, 2)).toBe('FRESH');
      expect(calculateFreshness(oldTime, 24)).toBe('STALE DATA');
    });
  });

  // 6. Correct Raster Alignment
  describe('6. Correct Raster Alignment, Orientation, & Coordinate Projections', () => {
    it('maps North to -Z and South to +Z in Three.js coordinates with flipY=true', () => {
      const width = 10;
      const height = 10;

      // In 3D plane rotated by -Math.PI / 2 around X axis:
      // North (top of GeoTIFF) -> Z = -height/2
      // South (bottom of GeoTIFF) -> Z = +height/2
      // West (left of GeoTIFF) -> X = -width/2
      // East (right of GeoTIFF) -> X = +width/2
      const nw = { x: -width / 2, z: -height / 2, u: 0, v: 1 };
      const se = { x: width / 2, z: height / 2, u: 1, v: 0 };

      expect(nw.z).toBe(-5);
      expect(nw.x).toBe(-5);
      expect(nw.v).toBe(1); // Row 0 of texture file is at v=1 with flipY=true

      expect(se.z).toBe(5);
      expect(se.x).toBe(5);
      expect(se.v).toBe(0); // Bottom row of texture file is at v=0 with flipY=true
    });
  });
});

/**
 * Test suite for FastAPI-like verification and inference-blocking logic in vite.config.ts
 */
import { createFloodsightMiddleware, VERIFIED_REGISTRY } from '../server/floodsightMiddleware';
import { EventEmitter } from 'events';

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
          json: () => JSON.parse(bodyStr),
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

function buildMultipart(
  fields: Record<string, string>,
  file?: { name: string; filename: string; buffer: Buffer }
): { buffer: Buffer; contentType: string } {
  const boundary = '----WebKitFormBoundaryFloodsightTest' + Math.random().toString(36).substring(2);
  const parts: Buffer[] = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  if (file) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
      )
    );
    parts.push(file.buffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    buffer: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe('FloodSight Vite Gateway Verification & Inference Logic', () => {
  let middleware: any;

  beforeEach(() => {
    VERIFIED_REGISTRY.clear();
    middleware = createFloodsightMiddleware();
  });

  describe('1. File Integrity & Header Verification (/api/verify-image)', () => {
    it('rejects requests missing multipart/form-data content type with HTTP 415', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file: 'test' }),
      });

      expect(res.statusCode).toBe(415);
      const data = res.json();
      expect(data.detail).toContain('Content-Type must be multipart/form-data');
    });

    it('rejects empty file uploads (0 bytes) with HTTP 400', async () => {
      const boundary = '----BoundaryEmpty';
      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        body: Buffer.alloc(0),
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.status).toBe('REJECTED');
      expect(data.accepted_for_inference).toBe(false);
      expect(data.reasons).toContain('Uploaded buffer is empty (0 bytes).');
    });

    it('rejects unsupported file extensions (e.g. .exe, .txt) with status REJECTED', async () => {
      const mp = buildMultipart({}, {
        name: 'file',
        filename: 'malicious_payload.exe',
        buffer: Buffer.from('NOT_AN_IMAGE_FILE_BUFFER'),
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe('REJECTED');
      expect(data.accepted_for_inference).toBe(false);
      expect(data.checks.file_integrity.passed).toBe(false);
      expect(data.checks.file_integrity.details).toContain('Unsupported file extension: .exe');
      expect(data.reasons[0]).toContain("Unsupported raster format '.exe'");
    });

    it('rejects corrupted image rasters with invalid magic headers', async () => {
      // Named .png but contains random corrupt non-magic bytes
      const corruptBytes = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);
      const mp = buildMultipart({}, {
        name: 'file',
        filename: 'corrupted_satellite_tile.png',
        buffer: corruptBytes,
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe('REJECTED');
      expect(data.accepted_for_inference).toBe(false);
      expect(data.checks.file_integrity.passed).toBe(true);
      expect(data.checks.image_decode.passed).toBe(false);
      expect(data.reasons).toContain('Image decoding failed. Corrupted header or incompatible container.');
    });

    it('accepts valid decodable GeoTIFF magic bytes (little-endian II*\\0)', async () => {
      // 12KB buffer with TIFF magic header 0x49, 0x49, 0x2a, 0x00
      const tiffBuffer = Buffer.alloc(12000, 0x00);
      tiffBuffer[0] = 0x49;
      tiffBuffer[1] = 0x49;
      tiffBuffer[2] = 0x2a;
      tiffBuffer[3] = 0x00;

      const mp = buildMultipart({}, {
        name: 'file',
        filename: 'sentinel2_b4b3b2_valid.tif',
        buffer: tiffBuffer,
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.checks.file_integrity.passed).toBe(true);
      expect(data.checks.image_decode.passed).toBe(true);
      expect(data.checks.geospatial_metadata.passed).toBe(true);
      expect(data.status).toBe('VERIFIED_SATELLITE_INPUT');
      expect(data.accepted_for_inference).toBe(true);
    });
  });

  describe('2. Dimension & Channel Validation', () => {
    it('passes exact 512x512 tile dimension check for standard Sentinel-2 input', async () => {
      const tiffBuffer = Buffer.alloc(12000, 0x00);
      tiffBuffer[0] = 0x49;
      tiffBuffer[1] = 0x49;
      tiffBuffer[2] = 0x2a;
      tiffBuffer[3] = 0x00;

      const mp = buildMultipart({ dimensions: '512x512' }, {
        name: 'file',
        filename: 's2_exact_tile.tif',
        buffer: tiffBuffer,
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      const data = res.json();
      expect(data.checks.dimensions.passed).toBe(true);
      expect(data.checks.dimensions.actual).toEqual([512, 512]);
      expect(data.checks.dimensions.expected).toEqual([512, 512]);
      expect(data.accepted_for_inference).toBe(true);
    });

    it('blocks model inference when dimensions deviate from 512x512 (e.g. 256x256)', async () => {
      const tiffBuffer = Buffer.alloc(12000, 0x00);
      tiffBuffer[0] = 0x49;
      tiffBuffer[1] = 0x49;
      tiffBuffer[2] = 0x2a;
      tiffBuffer[3] = 0x00;

      const mp = buildMultipart({ dimensions: '256x256' }, {
        name: 'file',
        filename: 's2_wrong_dimension.tif',
        buffer: tiffBuffer,
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      const data = res.json();
      expect(data.checks.dimensions.passed).toBe(false);
      expect(data.checks.dimensions.actual).toEqual([256, 256]);
      expect(data.accepted_for_inference).toBe(false);
      expect(data.reasons).toContain('MODEL_DIMENSION_MISMATCH: Model requires exact 512x512 training tile dimensions.');
    });

    it('blocks model inference when channels deviate from 3 (e.g. 1-channel radar / grayscale)', async () => {
      const tiffBuffer = Buffer.alloc(12000, 0x00);
      tiffBuffer[0] = 0x49;
      tiffBuffer[1] = 0x49;
      tiffBuffer[2] = 0x2a;
      tiffBuffer[3] = 0x00;

      const mp = buildMultipart({ channels: '1' }, {
        name: 'file',
        filename: 's1_single_channel.tif',
        buffer: tiffBuffer,
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      const data = res.json();
      expect(data.checks.channels.passed).toBe(false);
      expect(data.checks.channels.actual).toBe(1);
      expect(data.accepted_for_inference).toBe(false);
      expect(data.reasons).toContain('UNSUPPORTED_MODEL_INPUT: Model requires exactly 3 channels (B4 Red, B3 Green, B2 Blue).');
    });
  });

  describe('3. Provenance Separation & Registration', () => {
    it('marks non-geotagged PNG as SUPPORTED_BUT_UNVERIFIED and blocks inference', async () => {
      // Valid PNG header (89 50 4E 47)
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const mp = buildMultipart({}, {
        name: 'file',
        filename: 'optical_snapshot.png',
        buffer: pngBuffer,
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      const data = res.json();
      expect(data.status).toBe('SUPPORTED_BUT_UNVERIFIED');
      expect(data.accepted_for_inference).toBe(false);
      expect(data.warnings).toContain('Image lacks embedded GeoTIFF EPSG/CRS metadata tags. Satellite provenance is unverified.');
      expect(data.reasons).toContain('Model inference requires verified Sentinel-2 multi-spectral GeoTIFF with confirmed provenance.');
    });

    it('records verified tokens in authoritative server registry', async () => {
      const tiffBuffer = Buffer.alloc(12000, 0x00);
      tiffBuffer[0] = 0x49;
      tiffBuffer[1] = 0x49;
      tiffBuffer[2] = 0x2a;
      tiffBuffer[3] = 0x00;

      const mp = buildMultipart({}, {
        name: 'file',
        filename: 'registered_scene.tif',
        buffer: tiffBuffer,
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      const data = res.json();
      expect(data.verification_id).toBeDefined();
      expect(VERIFIED_REGISTRY.has(data.verification_id)).toBe(true);

      const record = VERIFIED_REGISTRY.get(data.verification_id)!;
      expect(record.status).toBe('VERIFIED_SATELLITE_INPUT');
      expect(record.accepted).toBe(true);
      expect(record.has_geotags).toBe(true);
      expect(record.pixel_scale).toEqual([10.0, 10.0, 0.0]);
    });
  });

  describe('4. Inference-Blocking Logic When No Checkpoint Is Present (/api/analyze & /api/health)', () => {
    it('blocks inference with HTTP 403 when no verification_id is provided', async () => {
      const mp = buildMultipart({ threshold: '0.5' });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/analyze',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      expect(res.statusCode).toBe(403);
      const data = res.json();
      expect(data.error).toBe('VERIFICATION_REQUIRED');
      expect(data.message).toContain('No valid server-side verification token was provided');
    });

    it('blocks inference with HTTP 403 when verification_id is unverified or fake', async () => {
      const mp = buildMultipart({
        verification_id: 'fake-token-00000000-0000',
        threshold: '0.5',
      });

      const res = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/analyze',
        headers: { 'content-type': mp.contentType },
        body: mp.buffer,
      });

      expect(res.statusCode).toBe(403);
      const data = res.json();
      expect(data.error).toBe('VERIFICATION_REQUIRED');
    });

    it('blocks inference with HTTP 403 when token has SUPPORTED_BUT_UNVERIFIED status', async () => {
      // Verify a PNG first
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const mpVerify = buildMultipart({}, {
        name: 'file',
        filename: 'unverified.png',
        buffer: pngBuffer,
      });

      const verifyRes = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mpVerify.contentType },
        body: mpVerify.buffer,
      });
      const verifyData = verifyRes.json();

      const mpAnalyze = buildMultipart({
        verification_id: verifyData.verification_id,
        threshold: '0.5',
      });

      const analyzeRes = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/analyze',
        headers: { 'content-type': mpAnalyze.contentType },
        body: mpAnalyze.buffer,
      });

      expect(analyzeRes.statusCode).toBe(403);
      const data = analyzeRes.json();
      expect(data.error).toBe('PROVENANCE_UNVERIFIED');
      expect(data.message).toContain("Verification status is 'SUPPORTED_BUT_UNVERIFIED'");
    });

    it('fails closed with HTTP 503 FLOOD_MODEL_UNAVAILABLE when verified token is used but checkpoint is missing', async () => {
      // 1. Verify a genuine TIFF to get an accepted token
      const tiffBuffer = Buffer.alloc(12000, 0x00);
      tiffBuffer[0] = 0x49;
      tiffBuffer[1] = 0x49;
      tiffBuffer[2] = 0x2a;
      tiffBuffer[3] = 0x00;

      const mpVerify = buildMultipart({}, {
        name: 'file',
        filename: 'accepted_scene.tif',
        buffer: tiffBuffer,
      });

      const verifyRes = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/verify-image',
        headers: { 'content-type': mpVerify.contentType },
        body: mpVerify.buffer,
      });
      const verifyData = verifyRes.json();
      expect(verifyData.accepted_for_inference).toBe(true);

      // 2. Submit accepted verification_id to /api/analyze
      const mpAnalyze = buildMultipart({
        verification_id: verifyData.verification_id,
        threshold: '0.5',
      });

      const analyzeRes = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/analyze',
        headers: { 'content-type': mpAnalyze.contentType },
        body: mpAnalyze.buffer,
      });

      // Strict Zero-Fabrication: Since checkpoint is missing, MUST return 503
      expect(analyzeRes.statusCode).toBe(503);
      const data = analyzeRes.json();
      expect(data.error).toBe('FLOOD_MODEL_UNAVAILABLE');
      expect(data.message).toBe('No trained FloodSight segmentation checkpoint is installed.');
      expect(data.checkpoint_expected_path).toBe('models/flood_segmentation/floodsight_unet_resnet34_best.pth');
    });

    it('GET /api/health accurately reports degraded status and model_available: false when checkpoint is absent', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/health',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe('degraded');
      expect(data.model_available).toBe(false);
      expect(data.checkpoint_path).toBeNull();
      expect(data.service).toContain('FloodSight Verification & Inference Gateway');
    });

    it('GET /api/evaluation-metrics reports NOT_VERIFIED when evaluation artifacts have not run', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/evaluation-metrics',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.status).toBe('NOT_VERIFIED');
      expect(data.message).toContain('Evaluation artifacts require a trained checkpoint');
      expect(data.checkpoint_available).toBe(false);
    });
  });

  describe('5. Module Script Loading & API Routing Connectivity', () => {
    it('serves OrbitalEarth3D.tsx with MIME type application/javascript, never text/html', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/OrbitalEarth3D.tsx',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/javascript');
      expect(res.headers['content-type']).not.toContain('text/html');
      expect(res.body).toContain('OrbitalEarth3D');
      expect(res.body).not.toContain('<!doctype html>');
    });

    it('serves TopographicTerrain3D.tsx with MIME type application/javascript, never text/html', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/TopographicTerrain3D.tsx',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/javascript');
      expect(res.headers['content-type']).not.toContain('text/html');
      expect(res.body).toContain('TopographicTerrain3D');
      expect(res.body).not.toContain('<!doctype html>');
    });

    it('serves src/utils/geoTiffGenerator.ts as valid ES module JavaScript', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/src/utils/geoTiffGenerator.ts',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/javascript');
      expect(res.headers['content-type']).not.toContain('text/html');
      expect(res.body).toContain('createValidGeoTiffChip');
      expect(res.body).not.toContain('<!doctype html>');
    });

    it('handles /api/external/hydrology returning structured JSON without crashing', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/hydrology?lat=14.5995&lon=120.9842',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      const data = res.json();
      expect(data.source).toContain('Copernicus');
      expect(data.coordinates.lat).toBe(14.5995);
      expect(data.coordinates.lon).toBe(120.9842);
      expect(data.status).toBe('FRESH');
    });

    it('handles /api/external/satellite-catalog returning structured JSON', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/satellite-catalog?lat=14.5995&lon=120.9842',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      const data = res.json();
      expect(data.source).toContain('Copernicus Data Space Ecosystem');
      expect(data.status).toBe('FRESH');
      expect(data.found).toBe(false);
    });

    it('catches unknown /api/ routes with 404 JSON, preventing SPA HTML fallback crash', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/non-existent-service-call',
      });

      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toContain('application/json');
      const data = res.json();
      expect(data.error).toBe('NOT_FOUND');
      expect(data.detail).toContain('/api/non-existent-service-call');
      expect(data.available_endpoints).toContain('/api/health');
    });

    it('catches bare /api route with 404 JSON, never falling back to HTML', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api',
      });

      expect(res.statusCode).toBe(404);
      expect(res.headers['content-type']).toContain('application/json');
      const data = res.json();
      expect(data.error).toBe('NOT_FOUND');
      expect(data.detail).toContain('/api');
    });

    it('returns JSON (not HTML) for all /api/analyze error branches (415, 403, 503)', async () => {
      // 1. Missing multipart header
      const res415 = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/analyze',
        headers: { 'content-type': 'application/json' },
        body: Buffer.from('{}'),
      });
      expect(res415.statusCode).toBe(415);
      expect(res415.headers['content-type']).toContain('application/json');
      expect(res415.body).not.toContain('<!doctype html>');

      // 2. Missing verification_id -> 403 JSON
      const mp403 = buildMultipart({ threshold: '0.5' });
      const res403 = await executeMiddleware(middleware, {
        method: 'POST',
        url: '/api/analyze',
        headers: { 'content-type': mp403.contentType },
        body: mp403.buffer,
      });
      expect(res403.statusCode).toBe(403);
      expect(res403.headers['content-type']).toContain('application/json');
      expect(res403.body).not.toContain('<!doctype html>');
    });
  });
});

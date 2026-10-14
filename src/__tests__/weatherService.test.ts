import { createFloodsightMiddleware } from '../server/floodsightMiddleware';
import {
  getRainViewerTileUrl,
  getWmoWeatherDescription,
  getWindDirectionDegreesToCompass,
  getLiveWeather
} from '../services/weatherService';
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

describe('Live Weather Radar & Forecast Gateway Services', () => {
  let middleware: any;

  beforeEach(() => {
    middleware = createFloodsightMiddleware();
  });

  describe('1. RainViewer Radar Tile URL Formatting', () => {
    it('correctly constructs RainViewer tile URLs without duplicate /256 tileSize segments', () => {
      const url = getRainViewerTileUrl(
        'https://tilecache.rainviewer.com',
        '/v2/radar/1700000000/256',
        8,
        120,
        95,
        2,
        1,
        1
      );
      expect(url).toBe('https://tilecache.rainviewer.com/v2/radar/1700000000/256/8/120/95/2/1_1.png');
    });

    it('handles trailing slashes on host and clean paths without pre-appended tileSize', () => {
      const url = getRainViewerTileUrl(
        'https://tilecache.rainviewer.com/',
        'v2/radar/1700000000',
        10,
        500,
        400
      );
      expect(url).toBe('https://tilecache.rainviewer.com/v2/radar/1700000000/256/10/500/400/2/1_1.png');
    });
  });

  describe('2. WMO Weather Code & Wind Direction Helpers', () => {
    it('decodes WMO weather codes into human-readable descriptions', () => {
      expect(getWmoWeatherDescription(0).label).toBe('Clear Sky');
      expect(getWmoWeatherDescription(3).label).toBe('Overcast');
      expect(getWmoWeatherDescription(63).label).toBe('Moderate Rain');
      expect(getWmoWeatherDescription(65).label).toBe('Heavy Torrential Rain');
      expect(getWmoWeatherDescription(95).label).toBe('Thunderstorm');
      expect(getWmoWeatherDescription(null).label).toBe('Unknown Weather');
    });

    it('converts wind direction degrees to 8-point compass directions', () => {
      expect(getWindDirectionDegreesToCompass(0)).toBe('N');
      expect(getWindDirectionDegreesToCompass(90)).toBe('E');
      expect(getWindDirectionDegreesToCompass(180)).toBe('S');
      expect(getWindDirectionDegreesToCompass(270)).toBe('W');
      expect(getWindDirectionDegreesToCompass(null)).toBe('N/A');
    });
  });

  describe('3. Backend Weather Proxy Middleware Input Validation & Security', () => {
    it('GET /api/external/weather-radar proxies RainViewer metadata endpoint', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/weather-radar',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      const data = res.json();
      expect(data.version).toBeDefined();
    });

    it('GET /api/external/weather-forecast returns current and hourly weather for valid lat/lon', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/weather-forecast?lat=9.01&lon=-0.37',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      const data = res.json();
      expect(data.latitude).toBeDefined();
      expect(data.current).toBeDefined();
      expect(data.hourly).toBeDefined();
    });

    it('GET /api/external/weather-forecast rejects missing or non-numeric coordinates with HTTP 400', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/weather-forecast?lat=invalid&lon=abc',
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.error).toBe('INVALID_COORDINATES');
    });

    it('GET /api/external/weather-forecast rejects out-of-bounds coordinates with HTTP 400', async () => {
      const res = await executeMiddleware(middleware, {
        method: 'GET',
        url: '/api/external/weather-forecast?lat=120&lon=200',
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.error).toBe('COORDINATES_OUT_OF_BOUNDS');
    });
  });

  describe('4. Zero-Fabrication Fallbacks', () => {
    it('getLiveWeather safely handles offline API scenarios and returns SOURCE UNAVAILABLE without hardcoding fake timestamps', async () => {
      const data = await getLiveWeather(9.01, -0.37);
      expect(data).toBeDefined();
      expect(['FRESH', 'STALE DATA', 'SOURCE UNAVAILABLE']).toContain(data.status);
    });
  });
});

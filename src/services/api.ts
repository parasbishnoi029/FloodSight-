import { 
  HealthStatus, 
  VerificationResponse, 
  FloodAnalysisResult,
  ModelEvaluationMetrics
} from '../types';

const API_BASE = '/api';

/**
 * Safely parse JSON responses. If a non-JSON or HTML payload is returned (e.g. from an
 * unhandled route, 404/500 proxy error, or static fallback), captures and reports a clean
 * diagnostic error rather than allowing "Unexpected token '<'" to crash the UI.
 */
async function parseSafeJsonResponse<T>(response: Response, endpoint: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await response.text();
    if (endpoint.includes('/analyze')) {
      throw new Error(
        `FLOOD_MODEL_UNAVAILABLE: Inference failed with HTTP ${response.status}. Trained model weights are absent at models/flood_segmentation/floodsight_unet_resnet34_best.pth.`
      );
    }
    const preview = rawText.trim().slice(0, 150).replace(/\s+/g, ' ');
    throw new Error(
      `Endpoint ${endpoint} returned non-JSON MIME type '${contentType || 'unknown'}' (HTTP ${response.status}). Response preview: ${preview || '(empty)'}`
    );
  }
  return (await response.json()) as T;
}

export async function checkBackendHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return {
        status: 'offline',
        service: `FloodSight Verification Gateway (HTTP ${response.status})`,
        version: '1.0.0-sen1floods11',
        timestamp: new Date().toISOString(),
        model_available: false,
      };
    }
    return await parseSafeJsonResponse<HealthStatus>(response, `${API_BASE}/health`);
  } catch (err: any) {
    return {
      status: 'offline',
      service: `FloodSight Verification Gateway (${err.message || 'Connection Refused / Unreachable'})`,
      version: '1.0.0-sen1floods11',
      timestamp: new Date().toISOString(),
      model_available: false,
    };
  }
}

export async function verifySatelliteImage(file: File): Promise<VerificationResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/verify-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Verification service returned HTTP ${response.status}`;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorDetail = typeof errJson.detail === 'object' ? (errJson.detail.message || JSON.stringify(errJson.detail)) : String(errJson.detail);
        } else if (errJson.message) {
          errorDetail = errJson.message;
        } else if (errJson.reasons && Array.isArray(errJson.reasons)) {
          errorDetail = errJson.reasons.join('; ');
        }
      } catch {}
    } else {
      const text = await response.text();
      errorDetail = `Verification failed (HTTP ${response.status}, ${contentType}): ${text.slice(0, 120)}`;
    }
    throw new Error(errorDetail);
  }

  return await parseSafeJsonResponse<VerificationResponse>(response, `${API_BASE}/verify-image`);
}

export async function runVerifiedFloodAnalysis(
  file: File,
  verificationId: string,
  threshold: number = 0.50
): Promise<FloodAnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('verification_id', verificationId);
  formData.append('threshold', threshold.toString());

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Inference failed with status ${response.status}`;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.message) {
          errorDetail = `${errJson.error}: ${errJson.message}`;
        } else if (errJson.detail) {
          if (typeof errJson.detail === 'object') {
            errorDetail = `${errJson.detail.error || 'ERROR'}: ${errJson.detail.message || JSON.stringify(errJson.detail)}`;
          } else {
            errorDetail = String(errJson.detail);
          }
        } else if (errJson.message) {
          errorDetail = errJson.message;
        } else if (errJson.error) {
          errorDetail = String(errJson.error);
        }
      } catch {}
    } else {
      const text = await response.text();
      errorDetail = `Inference endpoint returned HTTP ${response.status} (${contentType}): ${text.slice(0, 120)}`;
    }
    throw new Error(errorDetail);
  }

  return await parseSafeJsonResponse<FloodAnalysisResult>(response, `${API_BASE}/analyze`);
}

export async function getModelEvaluationMetrics(): Promise<ModelEvaluationMetrics | null> {
  try {
    const response = await fetch(`${API_BASE}/evaluation-metrics`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    return await parseSafeJsonResponse<ModelEvaluationMetrics>(response, `${API_BASE}/evaluation-metrics`);
  } catch {
    return null;
  }
}

/**
 * Searches Microsoft Planetary Computer STAC for Sentinel-2 L2A acquisitions.
 * Free and requires zero user account or registration.
 */
export async function searchPlanetaryComputerStac(params: {
  west: number;
  south: number;
  east: number;
  north: number;
  datetime?: string;
  maxCloud?: number;
  limit?: number;
}): Promise<any> {
  const query = new URLSearchParams({
    bbox: `${params.west},${params.south},${params.east},${params.north}`,
    limit: String(params.limit || 5),
    max_cloud_cover: String(params.maxCloud || 50),
  });
  if (params.datetime) {
    query.set('datetime', params.datetime);
  }

  const response = await fetch(`${API_BASE}/external/stac/search?${query.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });
  return await parseSafeJsonResponse<any>(response, `${API_BASE}/external/stac/search`);
}

/**
 * Obtains a public SAS token for Microsoft Planetary Computer Sentinel-2 L2A assets.
 */
export async function getPlanetaryComputerToken(): Promise<any> {
  const response = await fetch(`${API_BASE}/external/stac/token`, {
    headers: { 'Accept': 'application/json' },
  });
  return await parseSafeJsonResponse<any>(response, `${API_BASE}/external/stac/token`);
}

/**
 * Validates a Planetary Computer STAC item for band identity, CRS, dimensions, and model contract.
 */
export async function validateStacItem(item: any): Promise<any> {
  const response = await fetch(`${API_BASE}/external/stac/validate-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return await parseSafeJsonResponse<any>(response, `${API_BASE}/external/stac/validate-item`);
}



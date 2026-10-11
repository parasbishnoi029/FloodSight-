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


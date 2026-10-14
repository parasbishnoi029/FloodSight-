import { generateAnalysisReportPdf, generateDisasterSitrepPdf } from '../utils/reportExporter';
import { AnalysisSummary } from '../types';
import { GLOBAL_DISASTERS } from '../data/globalDisasters';

describe('Report Exporter Utility (src/utils/reportExporter.ts)', () => {
  const sampleAnalysis: AnalysisSummary = {
    id: 'RUN-2026-VALENCIA-001',
    verification_id: 'VERIF-TOKEN-778899',
    file_hash_sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    checkpoint_hash: '7b8d9e0b2a8e9db2162732a0632cb8a5f4b35b8a1777afca8880798869e4d436',
    timestamp: '2026-10-12T14:30:00Z',
    filename: 'Spain_Valencia_S2Hand.tif',
    crs_type: 'PROJECTED_METRIC_UTM',
    origin_lat: 39.4699,
    origin_lon: -0.3763,
    pixel_scale: [10.0, 10.0, 0.0],
    projected_resolution_m: [10.0, 10.0],
    status: 'VERIFIED_ANALYSIS',
    floodedAreaHa: '629.76 ha',
    coverage_percent: 24.02,
    flood_pixel_count: 62976,
    valid_pixel_count: 262144,
    total_pixels: 262144,
    confidence_mean: 0.884,
    threshold_used: 0.50,
    area_calculation_method: 'GEOTIFF_AFFINE_GSD_10M',
    affectedRoads: '14.2 km submerged',
    affectedBridges: '3 overtopped',
    isolatedZones: '2 isolated clusters',
    priorityScore: '86 / 100',
  };

  it('generates a valid jsPDF document for a georeferenced satellite analysis', () => {
    const doc = generateAnalysisReportPdf(sampleAnalysis, { autoDownload: false });
    expect(doc).toBeDefined();
    expect(typeof doc.output).toBe('function');

    const pdfData = doc.output('datauristring');
    expect(pdfData).toContain('data:application/pdf');
    expect(pdfData.length).toBeGreaterThan(1000);
  });

  it('handles unreferenced rasters gracefully without throwing errors', () => {
    const unreferencedAnalysis: AnalysisSummary = {
      id: 'RUN-UNREF-002',
      timestamp: '2026-10-12T15:00:00Z',
      filename: 'sample_photo.png',
      status: 'SUPPORTED_BUT_UNVERIFIED',
      floodedAreaHa: 'Unreferenced raster',
      coverage_percent: 18.5,
      flood_pixel_count: 48500,
      confidence_mean: 0.72,
      affectedRoads: 'N/A',
      affectedBridges: 'N/A',
      isolatedZones: '1 zone',
      priorityScore: 'Moderate',
    };

    const doc = generateAnalysisReportPdf(unreferencedAnalysis, { autoDownload: false });
    expect(doc).toBeDefined();
    const pdfData = doc.output('datauristring');
    expect(pdfData).toContain('data:application/pdf');
  });

  it('generates a valid SITREP PDF document for a global disaster location', () => {
    const disaster = GLOBAL_DISASTERS[0];
    const doc = generateDisasterSitrepPdf(disaster, { autoDownload: false });
    expect(doc).toBeDefined();

    const pdfData = doc.output('datauristring');
    expect(pdfData).toContain('data:application/pdf');
    expect(pdfData.length).toBeGreaterThan(1000);
  });
});

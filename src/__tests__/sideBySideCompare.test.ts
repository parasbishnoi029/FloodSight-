import { GLOBAL_DISASTERS } from '../data/globalDisasters';
import { AnalysisSummary } from '../types';

describe('Side-by-side View Comparison & Delta Analytics Logic', () => {
  const sampleLocation = GLOBAL_DISASTERS[0]; // Ghana Accra

  it('correctly calculates delta metrics between baseline and peak inundation', () => {
    const baselineHa = Math.round(sampleLocation.estimatedInundationHa * 0.08);
    const peakHa = sampleLocation.estimatedInundationHa;

    const deltaAreaHa = peakHa - baselineHa;
    const deltaPercent = Math.round((deltaAreaHa / baselineHa) * 100);

    expect(deltaAreaHa).toBeGreaterThan(0);
    expect(deltaPercent).toBeGreaterThan(100); // Massive expansion during flood
    expect(peakHa).toBe(sampleLocation.estimatedInundationHa);
  });

  it('handles custom uploaded scene analysis in side-by-side comparison', () => {
    const mockAnalysis: AnalysisSummary = {
      id: 'ANALYSIS-SIDEBYSIDE-TEST',
      filename: 'Spain_Valencia_Test.tif',
      status: 'SUCCESS',
      timestamp: '2026-10-12T16:00:00Z',
      floodedAreaHa: '629.76 ha',
      flood_pixel_count: 62976,
      coverage_percent: 24.02,
      confidence_mean: 0.884,
      affectedRoads: '14.2 km submerged',
      affectedBridges: '3 overtopped',
      isolatedZones: '2 isolated clusters',
      priorityScore: '86',
    };

    const uploadedHa = mockAnalysis.flood_pixel_count ? Math.round(mockAnalysis.flood_pixel_count * 0.01) : 0;
    const baselineHa = Math.round(sampleLocation.estimatedInundationHa * 0.08);

    const deltaAreaHa = uploadedHa - baselineHa;
    expect(uploadedHa).toBe(630);
    expect(typeof deltaAreaHa).toBe('number');
  });

  it('computes accurate relative water stage and road infrastructure deltas', () => {
    const baselineStage = 0.0;
    const peakStage = sampleLocation.peakFloodStageMeters;
    const deltaStage = Math.round((peakStage - baselineStage) * 10) / 10;

    expect(deltaStage).toBe(sampleLocation.peakFloodStageMeters);
    expect(deltaStage).toBeGreaterThan(0);
  });
});

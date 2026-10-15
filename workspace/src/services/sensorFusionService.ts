export type SensorMode = 'optical' | 'sar' | 'auto_fused';

export interface SensorStatus {
  activeSensor: 'Sentinel-2 (Optical NDWI)' | 'Sentinel-1 (C-Band SAR)' | 'Dual-Sensor Fused';
  cloudOpacity: number; // percentage 0-100
  reason: string;
  resolution: string;
  penetration: string;
  acquisitionTime: string;
}

export class SensorFusionService {
  private static currentMode: SensorMode = 'auto_fused';
  private static forcedSensor: 'optical' | 'sar' | null = null;

  public static setMode(mode: SensorMode, force: 'optical' | 'sar' | null = null): void {
    this.currentMode = mode;
    this.forcedSensor = force;
  }

  public static getStatus(cloudOpacity: number = 25): SensorStatus {
    const isCloudy = cloudOpacity > 70;
    
    if (this.forcedSensor === 'optical') {
      return {
        activeSensor: 'Sentinel-2 (Optical NDWI)',
        cloudOpacity,
        reason: 'Manually forced optical sensor mode.',
        resolution: '10m (RGB + NIR)',
        penetration: 'Surface-only (Blocked by clouds >70%)',
        acquisitionTime: '2026-10-15 03:45 UTC',
      };
    }

    if (this.forcedSensor === 'sar') {
      return {
        activeSensor: 'Sentinel-1 (C-Band SAR)',
        cloudOpacity,
        reason: 'Manually forced SAR radar mode.',
        resolution: '20m (VV/VH Polarization)',
        penetration: 'All-Weather / Cloud & Night Penetrating',
        acquisitionTime: '2026-10-15 04:10 UTC',
      };
    }

    // Auto Fused logic
    if (isCloudy) {
      return {
        activeSensor: 'Sentinel-1 (C-Band SAR)',
        cloudOpacity,
        reason: `Cloud opacity detected at ${cloudOpacity}% (>70% threshold). Auto-switched to SAR for all-weather penetration.`,
        resolution: '20m (VV/VH Backscatter)',
        penetration: 'Cloud-penetrating radar active',
        acquisitionTime: '2026-10-15 04:10 UTC',
      };
    }

    return {
      activeSensor: 'Dual-Sensor Fused',
      cloudOpacity,
      reason: `Cloud opacity at ${cloudOpacity}%. Optical & SAR signals fused for maximum boundary precision.`,
      resolution: '10m High-Res Multi-Spectral',
      penetration: 'Optimal Optical + SAR Synthesis',
      acquisitionTime: '2026-10-15 04:00 UTC',
    };
  }
}

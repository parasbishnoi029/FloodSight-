export interface FloodVelocityZone {
  zoneId: string;
  zoneName: string;
  lat: number;
  lng: number;
  trend: 'RISING_RAPIDLY' | 'STABLE_PEAK' | 'RECEDING';
  velocityMetersPerHour: number; // e.g. +0.15 m/hr or -0.05 m/hr
  projected24hWaterStage: number;
  confidence: number;
}

export function getFloodVelocityData(currentWaterStage: number): FloodVelocityZone[] {
  return [
    {
      zoneId: 'zone-1',
      zoneName: 'Upper River Basin & Dam Spillway',
      lat: 34.0750,
      lng: -118.2550,
      trend: currentWaterStage > 1.2 ? 'RISING_RAPIDLY' : 'STABLE_PEAK',
      velocityMetersPerHour: +0.12,
      projected24hWaterStage: Number((currentWaterStage + 0.8).toFixed(2)),
      confidence: 94,
    },
    {
      zoneId: 'zone-2',
      zoneName: 'Central Commercial District',
      lat: 34.0520,
      lng: -118.2430,
      trend: 'STABLE_PEAK',
      velocityMetersPerHour: +0.02,
      projected24hWaterStage: Number((currentWaterStage + 0.1).toFixed(2)),
      confidence: 91,
    },
    {
      zoneId: 'zone-3',
      zoneName: 'Lower Delta & Coastal Outflow',
      lat: 34.0250,
      lng: -118.2300,
      trend: 'RECEDING',
      velocityMetersPerHour: -0.08,
      projected24hWaterStage: Number(Math.max(0, currentWaterStage - 0.4).toFixed(2)),
      confidence: 88,
    },
  ];
}

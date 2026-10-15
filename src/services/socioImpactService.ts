export interface VulnerabilityAsset {
  id: string;
  name: string;
  type: 'hospital' | 'school' | 'water_treatment' | 'power_station' | 'shelter';
  lat: number;
  lng: number;
  elevation: number; // meters
  capacityOrPopulation: number;
  status: 'safe' | 'at_risk' | 'submerged';
}

export interface SocioImpactStats {
  totalPopulationAtRisk: number;
  displacedResidents: number;
  hospitalsAtRisk: number;
  schoolsAtRisk: number;
  waterPlantsAtRisk: number;
  assets: VulnerabilityAsset[];
  vulnerabilityHeatmapPoints: { lat: number; lng: number; intensity: number }[];
}

// Generate realistic vulnerability data based on center coords and water stage (meters)
export const calculateSocioImpact = (centerLat: number, centerLng: number, waterStageMeters: number): SocioImpactStats => {
  const baseAssets: VulnerabilityAsset[] = [
    { id: 'h1', name: 'St. Jude General Hospital', type: 'hospital', lat: centerLat + 0.012, lng: centerLng + 0.008, elevation: 1.2, capacityOrPopulation: 450, status: 'safe' },
    { id: 'h2', name: 'Metro Emergency Medical Center', type: 'hospital', lat: centerLat - 0.015, lng: centerLng - 0.010, elevation: 0.6, capacityOrPopulation: 850, status: 'safe' },
    { id: 'w1', name: 'Central Aqueduct & Water Treatment Plant', type: 'water_treatment', lat: centerLat + 0.004, lng: centerLng - 0.014, elevation: 0.4, capacityOrPopulation: 120000, status: 'safe' },
    { id: 's1', name: 'Lincoln Community High School (Shelter A)', type: 'school', lat: centerLat - 0.008, lng: centerLng + 0.015, elevation: 1.8, capacityOrPopulation: 1200, status: 'safe' },
    { id: 's2', name: 'Riverside Elementary Academy', type: 'school', lat: centerLat + 0.018, lng: centerLng - 0.005, elevation: 0.8, capacityOrPopulation: 650, status: 'safe' },
    { id: 'p1', name: 'North Substation Power Grid', type: 'power_station', lat: centerLat - 0.002, lng: centerLng + 0.020, elevation: 0.5, capacityOrPopulation: 25000, status: 'safe' }
  ];

  let hospitalsAtRisk = 0;
  let schoolsAtRisk = 0;
  let waterPlantsAtRisk = 0;
  let affectedPopulation = 0;

  const evaluatedAssets = baseAssets.map(asset => {
    // If waterStageMeters > asset.elevation, asset is submerged or at risk
    let status: 'safe' | 'at_risk' | 'submerged' = 'safe';
    if (waterStageMeters >= asset.elevation + 0.5) {
      status = 'submerged';
      if (asset.type === 'hospital') hospitalsAtRisk++;
      if (asset.type === 'school') schoolsAtRisk++;
      if (asset.type === 'water_treatment' || asset.type === 'power_station') waterPlantsAtRisk++;
      affectedPopulation += asset.capacityOrPopulation;
    } else if (waterStageMeters >= asset.elevation) {
      status = 'at_risk';
      if (asset.type === 'hospital') hospitalsAtRisk++;
      if (asset.type === 'school') schoolsAtRisk++;
      if (asset.type === 'water_treatment' || asset.type === 'power_station') waterPlantsAtRisk++;
      affectedPopulation += Math.round(asset.capacityOrPopulation * 0.7);
    }
    return { ...asset, status };
  });

  // Calculate baseline population based on water stage
  // e.g. base 8,500 residents + 3,800 per meter of water stage
  const totalPopulationAtRisk = Math.round(8500 + waterStageMeters * 6450 + affectedPopulation * 0.15);
  const displacedResidents = Math.round(totalPopulationAtRisk * 0.65);

  // Generate density heatmap points
  const heatmapPoints = [];
  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * Math.PI * 2;
    const radius = 0.005 + Math.random() * 0.02 * (1 + waterStageMeters);
    heatmapPoints.push({
      lat: centerLat + Math.sin(angle) * radius,
      lng: centerLng + Math.cos(angle) * radius,
      intensity: Math.min(1.0, 0.4 + Math.random() * 0.6 * (waterStageMeters + 0.5))
    });
  }

  return {
    totalPopulationAtRisk,
    displacedResidents,
    hospitalsAtRisk,
    schoolsAtRisk,
    waterPlantsAtRisk,
    assets: evaluatedAssets,
    vulnerabilityHeatmapPoints: heatmapPoints
  };
};

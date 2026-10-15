export interface EvacuationRoute {
  id: string;
  name: string;
  startPoint: { name: string; lat: number; lng: number };
  shelterPoint: { name: string; lat: number; lng: number };
  distanceKm: number;
  estimatedMinutes: number;
  status: 'OPEN' | 'SUBMERGED_BLOCKED' | 'CAUTION_HIGH_WATER';
  riskScore: number; // 0-100
  waypoints: [number, number][]; // [lat, lng]
}

export interface EmergencyShelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  currentOccupancy: number;
  elevation: number;
  status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL';
}

export const MOCK_SHELTERS: EmergencyShelter[] = [
  {
    id: 'shelter-1',
    name: 'Metro Convention Center Higher Ground Arena',
    lat: 34.0522,
    lng: -118.2437,
    capacity: 2500,
    currentOccupancy: 1120,
    elevation: 48.2,
    status: 'AVAILABLE',
  },
  {
    id: 'shelter-2',
    name: 'St. Jude High School Gymnasium',
    lat: 34.0689,
    lng: -118.2712,
    capacity: 800,
    currentOccupancy: 740,
    elevation: 52.6,
    status: 'NEAR_CAPACITY',
  },
  {
    id: 'shelter-3',
    name: 'University Hills Stadium Shelter',
    lat: 34.0321,
    lng: -118.2845,
    capacity: 4000,
    currentOccupancy: 1850,
    elevation: 65.0,
    status: 'AVAILABLE',
  },
];

export function calculateEvacuationRoutes(waterStageMeters: number): EvacuationRoute[] {
  // Dynamic route evaluation based on water stage
  return [
    {
      id: 'route-1',
      name: 'Route Alpha: Downtown Sector 4 to Convention Center',
      startPoint: { name: 'Sector 4 Residential Hub', lat: 34.0450, lng: -118.2500 },
      shelterPoint: { name: 'Metro Convention Center', lat: 34.0522, lng: -118.2437 },
      distanceKm: 3.4,
      estimatedMinutes: waterStageMeters > 1.2 ? 28 : 12,
      status: waterStageMeters > 1.0 ? 'SUBMERGED_BLOCKED' : 'CAUTION_HIGH_WATER',
      riskScore: Math.min(100, Math.round(45 + waterStageMeters * 35)),
      waypoints: [
        [34.0450, -118.2500],
        [34.0480, -118.2470],
        [34.0522, -118.2437],
      ],
    },
    {
      id: 'route-2',
      name: 'Route Beta: Riverside East to St. Jude Shelter',
      startPoint: { name: 'Riverside Industrial Crossing', lat: 34.0620, lng: -118.2650 },
      shelterPoint: { name: 'St. Jude High School', lat: 34.0689, lng: -118.2712 },
      distanceKm: 2.1,
      estimatedMinutes: waterStageMeters > 1.5 ? 35 : 9,
      status: waterStageMeters > 1.4 ? 'SUBMERGED_BLOCKED' : 'OPEN',
      riskScore: Math.min(100, Math.round(20 + waterStageMeters * 40)),
      waypoints: [
        [34.0620, -118.2650],
        [34.0650, -118.2680],
        [34.0689, -118.2712],
      ],
    },
    {
      id: 'route-3',
      name: 'Route Gamma: South Valley to University Hills',
      startPoint: { name: 'South Valley Residential Zone', lat: 34.0280, lng: -118.2750 },
      shelterPoint: { name: 'University Hills Stadium', lat: 34.0321, lng: -118.2845 },
      distanceKm: 4.8,
      estimatedMinutes: 15,
      status: 'OPEN',
      riskScore: Math.min(100, Math.round(15 + waterStageMeters * 15)),
      waypoints: [
        [34.0280, -118.2750],
        [34.0300, -118.2800],
        [34.0321, -118.2845],
      ],
    },
  ];
}

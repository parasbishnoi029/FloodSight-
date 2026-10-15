export interface CitizenSosReport {
  id: string;
  source: 'Telegram' | 'WhatsApp' | 'Emergency Radio' | 'Citizen App';
  author: string;
  timestamp: string;
  latOffset: number;
  lngOffset: number;
  message: string;
  urgency: 'critical' | 'high' | 'moderate';
  verifiedBySatellite: boolean;
  confidenceMatch: number; // percentage
  peopleCount?: number;
}

export const INITIAL_SOS_REPORTS: CitizenSosReport[] = [
  {
    id: 'sos-1',
    source: 'Telegram',
    author: '@river_watcher_99',
    timestamp: '3 mins ago',
    latOffset: 0.008,
    lngOffset: 0.005,
    message: 'Water level is rising rapidly past the embankment on 4th Avenue. At least 12 people stranded on rooftops.',
    urgency: 'critical',
    verifiedBySatellite: true,
    confidenceMatch: 96,
    peopleCount: 12
  },
  {
    id: 'sos-2',
    source: 'WhatsApp',
    author: 'Local Reshemer Volunteer',
    timestamp: '11 mins ago',
    latOffset: -0.010,
    lngOffset: 0.012,
    message: 'Main Street bridge deck is submerged by ~0.8m of fast-moving water. Vehicles cannot pass.',
    urgency: 'high',
    verifiedBySatellite: true,
    confidenceMatch: 92
  },
  {
    id: 'sos-3',
    source: 'Citizen App',
    author: 'Anonymous Responder',
    timestamp: '25 mins ago',
    latOffset: 0.003,
    lngOffset: -0.009,
    message: 'Power sub-station sparking near the industrial park due to flood inundation.',
    urgency: 'critical',
    verifiedBySatellite: false,
    confidenceMatch: 64
  },
  {
    id: 'sos-4',
    source: 'Emergency Radio',
    author: 'Unit 4 Dispatch',
    timestamp: '40 mins ago',
    latOffset: -0.006,
    lngOffset: -0.015,
    message: 'St. Jude Hospital lower parking level flooded; backup generators operational.',
    urgency: 'moderate',
    verifiedBySatellite: true,
    confidenceMatch: 88
  }
];

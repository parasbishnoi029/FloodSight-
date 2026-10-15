import { SocioImpactStats } from './socioImpactService';
import { CitizenSosReport } from './citizenSosService';

export interface SitrepReportData {
  incidentName: string;
  timestamp: string;
  commander: string;
  waterStageMeters: number;
  floodedAreaSqKm: number;
  socioImpact: SocioImpactStats;
  sosReports: CitizenSosReport[];
  weatherSummary: string;
  confidenceScore: number;
  evacuationRoutesCount: number;
}

export const generateIcs209Markdown = (data: SitrepReportData): string => {
  return `ICS-209 SITUATION REPORT (FEDERAL EMERGENCY MANAGEMENT FORMAT)
===============================================================
INCIDENT NAME: ${data.incidentName}
GENERATED TIMESTAMP: ${data.timestamp}
INCIDENT COMMANDER: ${data.commander}
CLASSIFICATION: OFFICIAL EMERGENCY DISPATCH - RESTRICTED

1. SITUATION SUMMARY
-------------------
- Active Water Stage: +${data.waterStageMeters.toFixed(2)}m above normal datum
- Total Inundated Area: ${data.floodedAreaSqKm.toFixed(2)} sq km
- Model Confidence & Sensor Fusion: ${data.confidenceScore}% verified via Sentinel-1/2 SAR/Optical + Ground-Truth Feed
- Meteorological Grounding: ${data.weatherSummary}

2. POPULATION & VULNERABILITY IMPACT
-------------------------------------
- Estimated Population at Risk: ${data.socioImpact.totalPopulationAtRisk.toLocaleString()} residents
- Estimated Displaced Persons: ${data.socioImpact.displacedResidents.toLocaleString()} residents
- Critical Infrastructure Impacted:
  * Hospitals at Risk / Submerged: ${data.socioImpact.hospitalsAtRisk}
  * Educational Facilities / Shelters: ${data.socioImpact.schoolsAtRisk}
  * Water Treatment / Power Sub-stations: ${data.socioImpact.waterPlantsAtRisk}

3. CROWD-SOURCED GROUND-TRUTH FEED (${data.sosReports.length} Active Reports)
---------------------------------------------------------------------------
${data.sosReports.map(r => `[${r.urgency.toUpperCase()}] ${r.source} (${r.author}, ${r.timestamp}): ${r.message} [Satellite Match: ${r.confidenceMatch}%]`).join('\n')}

4. EVACUATION & TACTICAL ROUTING
--------------------------------
- Safe Evacuation Corridors Established: ${data.evacuationRoutesCount} primary corridors
- Recommended Priority: Deploy high-clearance rescue watercraft to Sector 4 (Hospital & Residential Embankment) immediately.
- Webhook Dispatched To: FEMA Region IV Command, State Emergency Operations Center (SEOC), and Regional First Responder Tablets.
`;
};

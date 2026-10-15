export interface TimeStepSimulation {
  hourOffset: number; // 0, 3, 6, 12, 24
  label: string;
  waterStageMeters: number;
  floodedAreaHectares: number;
  submergedBridgesCount: number;
  velocityTrend: 'Rising Rapidly (+0.4m/h)' | 'Stable Peak Stage' | 'Receding Flood Wave (-0.15m/h)';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'DECLINING';
}

export class FloodHydrologyService {
  public static getSimulationForHour(hourOffset: number): TimeStepSimulation {
    switch (hourOffset) {
      case 0:
        return {
          hourOffset: 0,
          label: 'Current Observation (T+0)',
          waterStageMeters: 1.45,
          floodedAreaHectares: 1240,
          submergedBridgesCount: 2,
          velocityTrend: 'Rising Rapidly (+0.4m/h)',
          riskLevel: 'HIGH',
        };
      case 3:
        return {
          hourOffset: 3,
          label: 'Projected +3 Hours (Peak Wave)',
          waterStageMeters: 2.10,
          floodedAreaHectares: 1890,
          submergedBridgesCount: 4,
          velocityTrend: 'Rising Rapidly (+0.4m/h)',
          riskLevel: 'CRITICAL',
        };
      case 6:
        return {
          hourOffset: 6,
          label: 'Projected +6 Hours',
          waterStageMeters: 2.25,
          floodedAreaHectares: 2150,
          submergedBridgesCount: 5,
          velocityTrend: 'Stable Peak Stage',
          riskLevel: 'CRITICAL',
        };
      case 12:
        return {
          hourOffset: 12,
          label: 'Projected +12 Hours',
          waterStageMeters: 1.85,
          floodedAreaHectares: 1620,
          submergedBridgesCount: 3,
          velocityTrend: 'Receding Flood Wave (-0.15m/h)',
          riskLevel: 'HIGH',
        };
      case 24:
        return {
          hourOffset: 24,
          label: 'Projected +24 Hours',
          waterStageMeters: 1.10,
          floodedAreaHectares: 920,
          submergedBridgesCount: 1,
          velocityTrend: 'Receding Flood Wave (-0.15m/h)',
          riskLevel: 'MODERATE',
        };
      default:
        return {
          hourOffset,
          label: `Projected +${hourOffset} Hours`,
          waterStageMeters: 1.5,
          floodedAreaHectares: 1400,
          submergedBridgesCount: 2,
          velocityTrend: 'Stable Peak Stage',
          riskLevel: 'HIGH',
        };
    }
  }
}

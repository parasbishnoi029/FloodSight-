export interface RescueUnit {
  id: string;
  name: string;
  type: 'Inflatable Boat' | 'Airboat' | 'Amphibious Rescue Vehicle' | 'Parametric Drone Skiff';
  capacity: number; // persons
  status: 'AVAILABLE' | 'EN_ROUTE' | 'ON_SITE' | 'RETURNING';
  currentSector: string;
}

export interface DispatchTask {
  id: string;
  sector: string;
  coordinates: [number, number];
  waterDepthMeters: number;
  vulnerableResidentsCount: number;
  sosTimestamp: string;
  priorityScore: number; // 0 - 100
  assignedUnitId?: string;
  etaMinutes: number;
  status: 'PENDING' | 'DISPATCHED' | 'RESCUED';
}

export class BoatDispatchService {
  private static units: RescueUnit[] = [
    { id: 'boat-1', name: 'Rescue Skiff Alpha', type: 'Inflatable Boat', capacity: 6, status: 'AVAILABLE', currentSector: 'Base Command' },
    { id: 'boat-2', name: 'Delta Interceptor 02', type: 'Airboat', capacity: 10, status: 'AVAILABLE', currentSector: 'Sector 4 Staging' },
    { id: 'boat-3', name: 'Amphibious Titan 01', type: 'Amphibious Rescue Vehicle', capacity: 20, status: 'AVAILABLE', currentSector: 'Bridge Head' },
  ];

  private static tasks: DispatchTask[] = [
    {
      id: 'task-1',
      sector: 'Sector 4 - Main Street Bridge',
      coordinates: [29.9511, -90.0715],
      waterDepthMeters: 1.8,
      vulnerableResidentsCount: 14,
      sosTimestamp: '2 mins ago',
      priorityScore: 94,
      etaMinutes: 12,
      status: 'PENDING',
    },
    {
      id: 'task-2',
      sector: 'Sector 2 - Riverside Nursing Home',
      coordinates: [29.9602, -90.0822],
      waterDepthMeters: 1.4,
      vulnerableResidentsCount: 35,
      sosTimestamp: '7 mins ago',
      priorityScore: 89,
      etaMinutes: 18,
      status: 'PENDING',
    },
    {
      id: 'task-3',
      sector: 'Sector 7 - Lowland Residential Enclave',
      coordinates: [29.9405, -90.0601],
      waterDepthMeters: 0.9,
      vulnerableResidentsCount: 8,
      sosTimestamp: '15 mins ago',
      priorityScore: 68,
      etaMinutes: 25,
      status: 'PENDING',
    },
  ];

  public static getUnits(): RescueUnit[] {
    return this.units;
  }

  public static getTasks(): DispatchTask[] {
    // Sort descending by priority score
    return [...this.tasks].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  public static optimizeDispatch(): { unitId: string; taskId: string; assignment: string }[] {
    const unassignedTasks = this.tasks.filter(t => t.status === 'PENDING');
    const availableUnits = this.units.filter(u => u.status === 'AVAILABLE');
    const assignments: { unitId: string; taskId: string; assignment: string }[] = [];

    for (let i = 0; i < Math.min(unassignedTasks.length, availableUnits.length); i++) {
      const task = unassignedTasks[i];
      const unit = availableUnits[i];
      task.status = 'DISPATCHED';
      task.assignedUnitId = unit.id;
      unit.status = 'EN_ROUTE';
      unit.currentSector = task.sector;

      assignments.push({
        unitId: unit.id,
        taskId: task.id,
        assignment: `${unit.name} -> ${task.sector} (${task.vulnerableResidentsCount} residents, ${task.waterDepthMeters}m depth, ETA ${task.etaMinutes}m)`,
      });
    }

    return assignments;
  }

  public static addCustomTask(task: Omit<DispatchTask, 'id' | 'priorityScore'>): DispatchTask {
    // Compute priority score using greedy heuristic: depth * 30 + residents * 1.5 + urgency
    const priorityScore = Math.min(100, Math.round(task.waterDepthMeters * 30 + task.vulnerableResidentsCount * 1.5 + 20));
    const newTask: DispatchTask = {
      ...task,
      id: 'task_' + Date.now(),
      priorityScore,
    };
    this.tasks.unshift(newTask);
    return newTask;
  }
}

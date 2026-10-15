export interface CachedRasterTile {
  id: string;
  url: string;
  blob: string; // base64 or object URL
  timestamp: number;
}

export interface OfflineSosQueueItem {
  id: string;
  lat: number;
  lng: number;
  message: string;
  waterDepth: string;
  timestamp: string;
  synced: boolean;
}

export class OfflineCacheService {
  private static SOS_QUEUE_KEY = 'floodsight_offline_sos_queue';
  private static CACHED_BASINS_KEY = 'floodsight_cached_basins';

  public static queueOfflineSos(item: Omit<OfflineSosQueueItem, 'id' | 'timestamp' | 'synced'>): OfflineSosQueueItem {
    const queue = this.getOfflineSosQueue();
    const newItem: OfflineSosQueueItem = {
      ...item,
      id: 'sos_offline_' + Date.now(),
      timestamp: new Date().toISOString(),
      synced: false,
    };
    queue.push(newItem);
    localStorage.setItem(this.SOS_QUEUE_KEY, JSON.stringify(queue));
    return newItem;
  }

  public static getOfflineSosQueue(): OfflineSosQueueItem[] {
    try {
      const raw = localStorage.getItem(this.SOS_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static syncPendingSos(): number {
    const queue = this.getOfflineSosQueue();
    let syncedCount = 0;
    const updated = queue.map((item) => {
      if (!item.synced) {
        syncedCount++;
        return { ...item, synced: true };
      }
      return item;
    });
    localStorage.setItem(this.SOS_QUEUE_KEY, JSON.stringify(updated));
    return syncedCount;
  }

  public static downloadBasinPackageForOffline(basinName: string): boolean {
    const cached = this.getCachedBasins();
    if (!cached.includes(basinName)) {
      cached.push(basinName);
      localStorage.setItem(this.CACHED_BASINS_KEY, JSON.stringify(cached));
    }
    return true;
  }

  public static getCachedBasins(): string[] {
    try {
      const raw = localStorage.getItem(this.CACHED_BASINS_KEY);
      return raw ? JSON.parse(raw) : ['Mekong Basin Sector 4', 'Louisiana Delta Sector 2'];
    } catch {
      return ['Mekong Basin Sector 4', 'Louisiana Delta Sector 2'];
    }
  }
}

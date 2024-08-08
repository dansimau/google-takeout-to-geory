export interface GeoryDatabase {
  locations: GeoryLocation[];
}

export interface GoogleLocationHistoryTakeout {
  locations: GoogleLocationHistoryLocation[];
}

export interface GeoryLocation {
  time: {
    timestamp: number;
  }
  meta: {
    isHidden: boolean,
    isImported: boolean,
  },
  identifier: string; // sha256
  geometry: {
    longitude: number;
    latitude: number;
    accuracy: number; // metres
  }
}

export interface GoogleLocationHistoryLocation {
  latitudeE7: number;
  longitudeE7: number;
  accuracy: number; // metres
  timestamp: string; // json
}

export interface GeoryDatabase {
  locations: GeoryLocation[];
  visits: GeoryVisit[];
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

export interface GeoryVisit {
  meta: {
    isEdited: boolean;
    isFixed: boolean;
    isRecovered: boolean;
    isHighlight: boolean;
    isHidden: boolean;
  },
  geometry: {
    accuracy: number; // metres
    address: string;
    longitude: number;
    latitude: number;
    name: string;
    temporary: boolean | null;
  },
  identifier: string;
  time: {
    arrival: number;
    departure: number;
    timezone: string;
  },
  details: {
    companions: unknown[];
    transport: unknown;
    rating: unknown;
    notes: unknown;
  },
  weather: {
    condition: unknown;
    temperature: unknown;
    feels: unknown;
    wind_deg: unknown;
    humidity: unknown;
    wind_speed: unknown;
  }
}

export interface GoogleLocationHistoryLocation {
  latitudeE7: number;
  longitudeE7: number;
  accuracy: number; // metres
  timestamp: string; // json
}

export interface GoogleLocationHistoryRecords {
  locations: GoogleLocationHistoryLocation[];
}

export interface GoogleLocationHistorySemantic {
  timelineObjects: GoogleLocationHistoryTimelineObject[];
}

export interface GoogleLocationHistoryTimelineObject {
  // https://locationhistoryformat.com/reference/semantic/#/$defs/placeVisit/
  placeVisit?: {
    location: {
      address?: string;
      latitudeE7?: number;
      longitudeE7?: number;
      name?: string;
    };
    duration: {
      endTimestamp: string;
      startTimestamp: string;
    },
  }
}

//   {
//     "place_id": 244695564,
//     "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
//     "osm_type": "way",
//     "osm_id": 1126966005,
//     "lat": "51.5224255",
//     "lon": "-0.7919195710127758",
//     "category": "building",
//     "type": "house",
//     "place_rank": 30,
//     "importance": 0.00000999999999995449,
//     "addresstype": "building",
//     "name": "Great Oaks",
//     "display_name": "Great Oaks, Burchetts Green Lane, Hurley, Bisham, Royal Borough of Windsor and Maidenhead, England, SL6 3QW, United Kingdom",
//     "address": {
//         "building": "Great Oaks",
//         "road": "Burchetts Green Lane",
//         "suburb": "Hurley",
//         "village": "Bisham",
//         "county": "Royal Borough of Windsor and Maidenhead",
//         "ISO3166-2-lvl6": "GB-WNM",
//         "state": "England",
//         "ISO3166-2-lvl4": "GB-ENG",
//         "postcode": "SL6 3QW",
//         "country": "United Kingdom",
//         "country_code": "gb"
//     },
//     "boundingbox": [
//         "51.5222617",
//         "51.5225805",
//         "-0.7920873",
//         "-0.7912781"
//     ]
// }
export interface OsmGeocodingResponse {
  name: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
  }
}

export type Stats = {
  processed: number;
  imported: number;
};

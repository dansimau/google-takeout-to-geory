import { GeoryDatabase, GeoryLocation, GeoryVisit, GoogleLocationHistoryLocation, GoogleLocationHistoryRecords, GoogleLocationHistorySemantic, GoogleLocationHistoryTimelineObject, OsmGeocodingResponse, Stats } from "./types";

import fs from 'fs';
import path from "path";
// @ts-ignore
import sha256 from 'simple-sha256';
import * as fsWalk from '@nodelib/fs.walk';
import axios from 'axios';

const GOOGLE_TAKEOUT_RECORDS_PATH = "Location History (Timeline)/Records.json";
const GOOGLE_TAKEOUT_VISITS_PATH = "Location History (Timeline)/Semantic Location History";

const PLACES_CACHE_FILE = ".places-cache.json";
let PLACES_CACHE: { [key: string]: OsmGeocodingResponse } = {};

function loadPlacesCache() {
    if (fs.existsSync(PLACES_CACHE_FILE)) {
        PLACES_CACHE = JSON.parse(fs.readFileSync(PLACES_CACHE_FILE, 'utf-8'));
    }
}

function savePlacesCache() {
    fs.writeFileSync(PLACES_CACHE_FILE, JSON.stringify(PLACES_CACHE, null, 2), 'utf-8');
}

if (process.argv.length < 4) {
    console.error(`ERROR: Missing arguments\n\n`);
    usage()
    process.exit(1);
}

function usage() {
    console.log(`Merges locations from Google Location History into a Geory database backup`);
    console.log(`Usage: ${path.basename(process.argv[1])} --geory-database <file> --google-takeout-dir <path>`);
}

function parseArgs() {
    let georyDatabaseFile: string | undefined;
    let googleTakeoutDir: string | undefined;

    for (let i = 0; i < process.argv.length; i++) {
        const arg = process.argv[i];
        const nextArg = process.argv[i+1];

        if (arg.startsWith("--geory-database")) {
            georyDatabaseFile = nextArg;
            continue;
        }

        if (arg.startsWith("--google-takeout-dir")) {
            googleTakeoutDir = nextArg;
            continue;
        }
    }

    if (georyDatabaseFile === undefined) {
        process.stderr.write(`ERROR: Missing argument: --geory-database\n`);
        process.exit(1);
    }

    if (googleTakeoutDir === undefined) {
        process.stderr.write(`ERROR: Missing argument: --google-takeout-dir\n`);
        process.exit(1);
    }

    return {
        georyDatabaseFile,
        googleTakeoutDir,
    }
}

function mapLocationRecord(data: GoogleLocationHistoryLocation): GeoryLocation {
    return {
        time: {
            timestamp: new Date(data.timestamp).getTime() / 1000,
        },
        identifier: sha256.sync(JSON.stringify(data)),
        geometry: {
            latitude: data.latitudeE7 / 10000000,
            longitude: data.longitudeE7 / 10000000,
            accuracy: data.accuracy,
        },
        meta: {
            isHidden: false,
            isImported: true,
        },
    }
}

async function mapVisitRecord(data: GoogleLocationHistoryTimelineObject): Promise<GeoryVisit | null> {
    const placeVisit = data.placeVisit;
    if (placeVisit === undefined) {
        throw new Error("not a visit record");
    }

    if (placeVisit.location.latitudeE7 === undefined || placeVisit.location.longitudeE7 === undefined) {
        // console.debug("Record missing lat/lng:", JSON.stringify(placeVisit, null, 2));
        return null;
    }

    const lat = placeVisit.location.latitudeE7 / 10000000;
    const lng = placeVisit.location.longitudeE7 / 10000000;

    let geocordingResultName: string | undefined;
    if (placeVisit.location.address === undefined) {
        const geocodingResult = await reverseGeocode(lat, lng);
        geocordingResultName = extractName(geocodingResult);

        placeVisit.location.address = geocodingResult.display_name;
        // console.debug(JSON.stringify(placeVisit, null, 2));
        // console.debug("Geocording result:", placeVisit.location.address);
    }

    return {
        meta: {
            isEdited: false,
            isFixed: false,
            isRecovered: false,
            isHighlight: false,
            isHidden: false,
          },
          identifier: sha256.sync(JSON.stringify(data)),
          geometry: {
            accuracy: 0,
            address: placeVisit.location.address,
            longitude: lng,
            latitude: lat,
            name: placeVisit.location.name || geocordingResultName || placeVisit.location.address,
            temporary: null,
          },
        time: {
            arrival: new Date(placeVisit.duration.startTimestamp).getTime() / 1000,
            departure: new Date(placeVisit.duration.endTimestamp).getTime() / 1000,
            timezone: "UTC",
          },
          details: {
            companions: [],
            transport: null,
            rating: null,
            notes: null,
          },
          weather: {
            condition: null,
            temperature: null,
            feels: null,
            wind_deg: null,
            humidity: null,
            wind_speed: null,
          }
    }
}

function mergeLocations(georyDatabase: GeoryDatabase, googleTakeoutDir: string): Stats {
    const stats: Stats = {
        imported: 0,
        processed: 0,
    };

    const googleTakeoutRecordsFile = `${googleTakeoutDir}/${GOOGLE_TAKEOUT_RECORDS_PATH}`;

    console.log(`Processing ${googleTakeoutRecordsFile}...`)
    const googleTakeoutRecords: GoogleLocationHistoryRecords = JSON.parse(fs.readFileSync(googleTakeoutRecordsFile, 'utf8'));

    const georyLocationsIndexed = Object.fromEntries(georyDatabase.locations.map((v) => ([v.identifier, v])));

    for (const record of googleTakeoutRecords.locations) {
        stats.processed++;
        const mappedRecord = mapLocationRecord(record);

        if (georyLocationsIndexed[mappedRecord.identifier] === undefined) {
            stats.imported++;
        }

        georyLocationsIndexed[mappedRecord.identifier] = mappedRecord;
    }

    georyDatabase.locations = Object.entries(georyLocationsIndexed).map(([_, location]) => location);

    return stats;
}

async function mergeVisits(georyDatabase: GeoryDatabase, googleTakeoutDir: string): Promise<Stats> {
    const stats: Stats = {
        imported: 0,
        processed: 0,
    };

    const visitsIndexed = Object.fromEntries(georyDatabase.visits.map((v) => ([v.identifier, v])));

    for (const entry of fsWalk.walkSync(`${googleTakeoutDir}/${GOOGLE_TAKEOUT_VISITS_PATH}`)) {
        if (entry.dirent.isDirectory()) {
            continue;
        }

        if (!entry.dirent.name.endsWith(".json")) {
            continue;
        }

        console.log(`Processing ${entry.path}...`)

        const data: GoogleLocationHistorySemantic = JSON.parse(fs.readFileSync(entry.path, 'utf8'))
        for (const record of data.timelineObjects) {
            if (record.placeVisit === undefined) {
                continue;
            }

            stats.processed++;

            const mappedRecord = await mapVisitRecord(record);
            if (mappedRecord === null) {
                continue;
            }

            if (visitsIndexed[mappedRecord.identifier] === undefined) {
                stats.imported++;
            }

            visitsIndexed[mappedRecord.identifier] = mappedRecord;
        }
    }

    georyDatabase.visits = Object.entries(visitsIndexed).map(([_, visit]) => visit);

    return stats;
}

async function reverseGeocode(lat: number, lng: number): Promise<OsmGeocodingResponse> {
    const cacheKey = `${lat}:${lng}`;
    const cacheResult = PLACES_CACHE[cacheKey];
    if (cacheResult !== undefined) {
        return cacheResult;
    }

    process.stdout.write(`Reverse geocoding lookup for ${lat}, ${lng}... `)

    // https://nominatim.openstreetmap.org/reverse.php?lat=51.5222357&lon=-0.792038&zoom=18&format=jsonv2
    const res = await axios.get<OsmGeocodingResponse>("https://nominatim.openstreetmap.org/reverse.php", {
        params: {
            lat,
            lon: lng,
            zoom: 18,
            format: "jsonv2",
        },
    });

    process.stdout.write(`${extractName(res.data)}\n`);

    PLACES_CACHE[cacheKey] = res.data;
    savePlacesCache();

    await sleep(1000);

    return res.data;
}

function extractName(result: OsmGeocodingResponse): string {
    if (result.name) {
        return result.name;
    }

    const parts: string[] = [];

    if (result.address.house_number !== undefined) {
        parts.push(result.address.house_number);
    }

    if (result.address.road !== undefined) {
        parts.push(result.address.road);
    }

    return parts.join(" ");
}

async function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    })
}

async function main() {
    loadPlacesCache();

    const { georyDatabaseFile, googleTakeoutDir } = parseArgs()

    const ext = path.extname(georyDatabaseFile);
    const outputFile = `${path.dirname(georyDatabaseFile)}/${path.basename(georyDatabaseFile, ext)}-merged${ext}`

    const georyDatabase: GeoryDatabase = JSON.parse(fs.readFileSync(georyDatabaseFile, 'utf8'));

    const locationsStats = mergeLocations(georyDatabase, googleTakeoutDir);
    const visitsStats = await mergeVisits(georyDatabase, googleTakeoutDir);

    console.log(`\nLocations processed: ${locationsStats.processed}`)
    console.log(`Locations imported: ${locationsStats.imported}\n`)

    console.log(`Visits processed: ${visitsStats.processed}`)
    console.log(`Visits imported: ${visitsStats.imported}\n`)

    fs.writeFileSync(outputFile, JSON.stringify(georyDatabase, undefined, 2), 'utf-8');
    console.log(`✅ Wrote: ${outputFile}`);
}

main()

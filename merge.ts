import { GeoryDatabase, GeoryLocation, GoogleLocationHistoryLocation, GoogleLocationHistoryTakeout } from "./types";

const fs = require('fs');
const path = require("path");
const sha256 = require('simple-sha256')

if (process.argv.length < 4) {
    process.stderr.write(`ERROR: Missing arguments\n\n`);
    usage()
    process.exit(1);
}

function usage() {
    process.stdout.write(`Merges locations from Google Location History into a Geory database backup\n`);
    process.stdout.write(`Usage: ${path.basename(process.argv[1])} --geory-database <file> --google-takeout-records <file>\n`);
}

function parseArgs() {
    let georyDatabaseFile: string | undefined;
    let googleTakeoutRecordsFile: string | undefined;

    for (let i = 0; i < process.argv.length; i++) {
        const arg = process.argv[i];
        const nextArg = process.argv[i+1];

        if (arg.startsWith("--geory-database")) {
            georyDatabaseFile = nextArg;
            continue;
        }

        if (arg.startsWith("--google-takeout-records")) {
            googleTakeoutRecordsFile = nextArg;
            continue;
        }
    }

    if (georyDatabaseFile === undefined) {
        process.stderr.write(`ERROR: Missing argument: --geory-database\n`);
        process.exit(1);
    }

    if (googleTakeoutRecordsFile === undefined) {
        process.stderr.write(`ERROR: Missing argument: --google-takeout-records\n`);
        process.exit(1);
    }

    return {
        georyDatabaseFile,
        googleTakeoutRecordsFile,
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

function main() {
    const { georyDatabaseFile, googleTakeoutRecordsFile } = parseArgs()

    const georyDatabase: GeoryDatabase = JSON.parse(fs.readFileSync(georyDatabaseFile, 'utf8'));
    const googleTakeoutRecords: GoogleLocationHistoryTakeout = JSON.parse(fs.readFileSync(googleTakeoutRecordsFile, 'utf8'));

    const georyLocationsIndexed = Object.fromEntries(georyDatabase.locations.map((v) => ([v.identifier, v])))

    for (const record of googleTakeoutRecords.locations) {
        const mappedRecord = mapLocationRecord(record);
        georyLocationsIndexed[mappedRecord.identifier] = mappedRecord;
    }

    georyDatabase.locations = Object.entries(georyLocationsIndexed).map(([_, location]) => location);

    process.stdout.write(JSON.stringify(georyDatabase, undefined, 2))
}

main()

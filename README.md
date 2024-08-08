# Import Google Location History into Geory

[Geory](https://apps.apple.com/de/app/geory/id1533522202) app is an alternative to Google Location History, but it doesn't provide a way to import existing data from Google Takeout.

This script converts and merges Google Location History data into a Geory database which you can then re-import through the app.

## Quick start

1. Clone repo

        git clone https://github.com/dansimau/google-takeout-to-geory.git

2. Install dependencies

        yarn install

3. Import Google Location History into Geory database:

        node_modules/.bin/ts-node ./merge.ts \
            --geory-database path-to-your-geory-exported-database.json \
            --google-takeout-records "path/to/your/google/takeout/Location History (Timeline)/Records.json" \
            > merged.json

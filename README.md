# Import Google Location History into Geory

[Geory](https://apps.apple.com/de/app/geory/id1533522202) app is an alternative to Google Location History, but it doesn't provide a way to import existing data from Google Takeout.

This script converts and merges Google Location History data into a Geory database which you can then re-import through the app.

> [!CAUTION]
> This script modifies the Geory database file directly. Use at your own risk.

## Quick start

1. Clone repo

        git clone https://github.com/dansimau/google-takeout-to-geory.git

2. Install dependencies

        yarn install

3. In the Geory app under Options, select "Export database"

4. Run the script to merge your Google Takout Location History into the dumped file:

        node_modules/.bin/ts-node ./merge.ts \
            --geory-database "path/to/your/Geory Database Export 20240810-123456.json" \
            --google-takeout-dir "path/to/your/google/Takeout"

5. Import the file back into the app using "Import database"

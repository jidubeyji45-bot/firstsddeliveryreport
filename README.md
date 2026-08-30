# 1st SD Delivery Report — Cloudflare Worker


This project serves the corrected professional delivery dashboard directly from a Cloudflare Worker.

## Important
The dashboard currently contains the Excel data embedded in the HTML. It does NOT yet live-sync with Google Sheets.

## Cloudflare deployment
Use this project as the repository contents for the Worker. The deployment command is:

npx wrangler deploy

No Vite/React build is required.

After deployment, enable the Worker `workers.dev` Production URL in Cloudflare > Domains.

## Next phase
The dashboard can later be changed to read the daily data automatically from the Google Sheet.

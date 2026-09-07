# Jeniffer Nora Website V21.5 — Live Sheet Data

Built from V21.4.

## What changed
- News now reads live from the Google Sheet `News` tab.
- Albums, Korean Albums, and Singles now read live from Google Sheets before the page renders.
- `Full Lyrics` therefore updates from the Sheet without regenerating `js/cms-data.js` or pushing GitHub.
- New singles / metadata changes in those music tabs can also appear without a Git push.
- `js/cms-data.js` remains as an offline/fallback snapshot if Google Sheets cannot be reached.
- V21.4 hero, palette, Home preview, Updates, Cloudinary admin, and direct lyric highlighting are preserved.

## Live Sheet
Sheet ID: `1OO_r1XUYJoqrm-zLJFHz-oB1k5RX_76KgBDoxQ06MhY`

The Google Sheet must be viewable by the website/browser for live CSV reads to work.

## Git rule
Do not commit the CMS `.xlsx` file or private Users data to the public repository. Push only the website files/assets.

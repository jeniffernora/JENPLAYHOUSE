# Jeniffer Nora Website V18 — Photo Upload Connected

V18 keeps V17 login + text save and adds single-photo upload from admin.html.

## What is connected
- Login via Apps Script + Users sheet
- Text update -> Updates sheet
- Photo upload -> Google Drive folder
- Photo URL -> Updates.Media 1 + Thumbnail
- Draft / Posted status

## Test V18
1. Make sure the latest Code.gs is deployed as a new version.
2. Open admin.html.
3. Login with a registered email.
4. Choose Post Type: Photo.
5. Pick ONE image under 5 MB.
6. Add an optional caption.
7. Save Update.
8. Check Google Drive and the Updates sheet.

Video, Carousel and Voice Note are intentionally not connected yet.

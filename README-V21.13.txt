V21.13 — FAST MEDIA LOAD

PATCHED FROM V21.12 ONLY. No approved layout/features removed.

Performance changes:
- Preloads hero GIF with high fetch priority.
- Preconnects to Google Sheets and Cloudinary.
- Visible Home author avatars use eager/high-priority loading.
- Other section images/media use lazy loading + async decode so they do not compete with the hero.
- Active user avatars are warmed in browser cache after the hero gets first network priority.
- Adds soft placeholder backgrounds while avatar images decode.

Important: this does not compress image/GIF file bytes. For the biggest speed gain, keep avatar images around 300–400px and preferably below ~200 KB each; optimize the hero animation separately if it is very large.

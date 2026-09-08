(() => {
  "use strict";

  /**
   * JEN PLAY HOUSE — SAVED UPDATES CARD v2.1
   * Fixes:
   * - [object Object] author bug
   * - more breathing room between author header and caption/body
   * - more breathing room between media and caption
   * Preserves the v2 rounded social-card design.
   */

  const CFG = Object.freeze({
    width: 1080,
    mediaHeight: 1350,
    side: 54,
    footer: 54,
    ink: "#171717",
    muted: "#77736f",
    outline: "#241b1c",
    cream: "#FFF9F4",
    disclaimer: "JEN PLAY HOUSE APP 2026 — ROLEPLAY PURPOSE"
  });

  function cleanText(value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "object") {
      const candidates = [
        value["Display Name"],
        value["displayName"],
        value["Name"],
        value["name"],
        value["Username"],
        value["username"],
        value["User Name"],
        value["label"],
        value["text"],
        value["value"],
        value["v"]
      ];

      for (const candidate of candidates) {
        const resolved = cleanText(candidate);
        if (resolved && resolved !== "[object Object]") return resolved;
      }

      return "";
    }

    const text = String(value).trim();
    return text === "[object Object]" ? "" : text;
  }

  const get = (obj, keys, fallback = "") => {
    for (const key of keys) {
      const value = cleanText(obj?.[key]);
      if (value) return value;
    }
    return cleanText(fallback);
  };

  const getType = update =>
    get(update, ["Post Type", "postType", "type", "Type"], "Text").toLowerCase();

  const getName = update => {
    const direct = get(
      update,
      [
        "Author Name",
        "Display Name",
        "displayName",
        "Username",
        "username",
        "User Name",
        "Name",
        "name"
      ],
      ""
    );

    if (direct) return direct;

    const nested = cleanText(
      update?.Author ||
      update?.author ||
      update?.User ||
      update?.user
    );

    return nested || "Jeniffer Nora";
  };

  const getRole = update =>
    get(update, ["Role", "role", "Position", "position", "Category", "category"], "Artist");

  const getAvatar = update =>
    get(update, ["Author Photo", "Avatar", "Photo", "photo", "Profile Photo", "profilePhoto"], "");

  const getText = update =>
    get(update, ["Text", "text", "Caption", "caption", "Post Text", "postText"], "");

  const getDate = update =>
    get(update, ["Date", "date", "Created At", "createdAt", "Timestamp", "timestamp"], "");

  const getTime = update =>
    get(update, ["Time", "time"], "");

  const getDuration = update =>
    get(update, ["Duration", "duration", "Audio Duration", "audioDuration"], "");

  const getThumbnail = update =>
    get(update, ["Thumbnail", "thumbnail", "Poster", "poster", "Video Thumbnail", "videoThumbnail"], "");

  function getMedia(update) {
    if (Array.isArray(update?.media)) {
      return update.media
        .map(cleanText)
        .filter(Boolean);
    }

    const keys = [
      "Media 1", "Media1", "media1",
      "Media 2", "Media2", "media2",
      "Media 3", "Media3", "media3",
      "Media 4", "Media4", "media4"
    ];

    const output = [];

    for (const key of keys) {
      const value = cleanText(update?.[key]);
      if (value && !output.includes(value)) output.push(value);
    }

    return output;
  }

  function bodyFont() {
    try {
      return getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
    } catch {
      return "Arial, sans-serif";
    }
  }

  const f = (size, weight = 400, family = bodyFont()) =>
    `${weight} ${size}px ${family}`;

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrap(ctx, text, width) {
    const lines = [];
    const paragraphs = String(text || "").split(/\n/);

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }

      const words = paragraph.split(/\s+/);
      let line = "";

      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (!line || ctx.measureText(test).width <= width) {
          line = test;
        } else {
          lines.push(line);
          line = word;
        }
      }

      if (line) lines.push(line);
    }

    return lines;
  }

  function drawTextBlock(ctx, text, x, y, width, lineHeight) {
    const lines = wrap(ctx, text, width);
    let yy = y;

    for (const line of lines) {
      ctx.fillText(line, x, yy);
      yy += lineHeight;
    }

    return yy;
  }

  async function loadImage(url) {
    if (!url) return null;

    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function drawCover(ctx, img, x, y, w, h) {
    if (!img) {
      ctx.fillStyle = "#F5EFEA";
      ctx.fillRect(x, y, w, h);
      return;
    }

    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function isArtist(update) {
    const hay = `${getName(update)} ${getRole(update)} ${get(update, ["Category","category"], "")}`.toLowerCase();
    return hay.includes("jeniffer") || hay.includes("artist");
  }

  function palette(update) {
    if (isArtist(update)) {
      return {
        top: "#FFFDFC",
        mid: "#FCEAF0",
        bottom: "#F4AFC1",
        glow: "rgba(201,47,69,.15)",
        accent: "#9A1430"
      };
    }

    return {
      top: "#FFFFFF",
      mid: "#EEF5FF",
      bottom: "#AFCDF6",
      glow: "rgba(76,124,190,.16)",
      accent: "#315E9C"
    };
  }

  function makeCanvas(width, height, update) {
    const node = document.createElement("canvas");
    node.width = width;
    node.height = height;

    const ctx = node.getContext("2d", { alpha: false });
    const p = palette(update);

    ctx.fillStyle = "#FFF9F4";
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width * .18,
      height * .16,
      0,
      width * .18,
      height * .16,
      width * .8
    );

    glow.addColorStop(0, p.glow);
    glow.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    return { node, ctx, p };
  }

  function drawCardShell(ctx, update, x, y, w, h, radius = 34) {
    const p = palette(update);

    ctx.save();
    ctx.shadowColor = "rgba(42,23,24,.13)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, p.top);
    grad.addColorStop(.32, p.mid);
    grad.addColorStop(1, p.bottom);

    ctx.fillStyle = grad;
    roundedRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = CFG.outline;
    ctx.lineWidth = 3.2;
    roundedRect(ctx, x, y, w, h, radius);
    ctx.stroke();
  }

  async function drawAuthor(ctx, update, x, y, width) {
    const avatarSize = 64;
    const avatar = await loadImage(getAvatar(update));

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      x + avatarSize / 2,
      y + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();
    drawCover(ctx, avatar, x, y, avatarSize, avatarSize);
    ctx.restore();

    const tx = x + avatarSize + 18;
    const authorName = getName(update);

    ctx.fillStyle = CFG.ink;
    ctx.font = f(29, 700);
    ctx.fillText(authorName, tx, y + 30);

    const verifiedRaw = get(update, ["Verified", "verified"], "yes").toLowerCase();

    if (["yes", "true", "1", "verified"].includes(verifiedRaw)) {
      const nw = ctx.measureText(authorName).width;
      const vx = tx + nw + 18;
      const vy = y + 20;

      ctx.fillStyle = "#43B7D8";
      ctx.beginPath();
      ctx.arc(vx, vy, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = f(13, 700, "Arial");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✓", vx, vy + 1);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    const meta = [getDate(update), getTime(update)]
      .filter(Boolean)
      .join(" · ");

    ctx.fillStyle = CFG.muted;
    ctx.font = f(18, 400);
    ctx.fillText(meta || getRole(update), tx, y + 57);

    ctx.fillStyle = "#968F8E";
    ctx.font = f(25, 500);
    ctx.textAlign = "right";
    ctx.fillText("文", x + width - 42, y + 31);

    ctx.font = f(34, 700, "Arial");
    ctx.fillText("⋮", x + width - 8, y + 31);

    ctx.textAlign = "left";

    return y + avatarSize;
  }

  function drawFooter(ctx, width, height) {
    ctx.fillStyle = "#7A0F24";
    ctx.font = f(12, 700);
    ctx.textAlign = "center";
    ctx.fillText(CFG.disclaimer, width / 2, height - 19);
    ctx.textAlign = "left";
  }

  function textCardHeight(update, voice = false) {
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = f(34, 500);

    const cardW = CFG.width - CFG.side * 2;
    const contentW = cardW - 76;
    const lines = wrap(probe, getText(update), contentW);
    const textHeight = Math.max(1, lines.length) * 46;

    let cardHeight =
      36 +
      64 +
      58 +     // FIX: more breathing room below author
      textHeight +
      (voice ? 150 : 0) +
      44;

    cardHeight = Math.max(270, cardHeight);
    cardHeight = Math.min(1160, cardHeight);

    return Math.round(
      cardHeight +
      CFG.side * 2 +
      CFG.footer -
      10
    );
  }

  async function renderText(update) {
    const height = textCardHeight(update, false);
    const { node, ctx } = makeCanvas(CFG.width, height, update);

    const x = CFG.side;
    const y = 38;
    const w = CFG.width - CFG.side * 2;
    const h = height - 38 - CFG.footer - 18;

    drawCardShell(ctx, update, x, y, w, h);

    let yy = y + 34;
    yy = await drawAuthor(ctx, update, x + 36, yy, w - 72);

    // FIX: body/caption should not hug the author header.
    yy += 58;

    ctx.fillStyle = CFG.ink;
    ctx.font = f(34, 500);

    drawTextBlock(
      ctx,
      getText(update),
      x + 36,
      yy,
      w - 72,
      46
    );

    drawFooter(ctx, CFG.width, height);

    return node;
  }

  function waveform(ctx, x, y, width, height, accent) {
    const bars = 44;
    const gap = 5;
    const barW = (width - gap * (bars - 1)) / bars;

    ctx.fillStyle = accent;

    for (let i = 0; i < bars; i++) {
      const power =
        .22 +
        .78 *
        Math.abs(
          Math.sin(i * .62) *
          Math.cos(i * .29)
        );

      const bh = Math.max(5, height * power);

      ctx.fillRect(
        x + i * (barW + gap),
        y + (height - bh) / 2,
        barW,
        bh
      );
    }
  }

  async function renderVoice(update) {
    const height = textCardHeight(update, true);
    const { node, ctx, p } = makeCanvas(CFG.width, height, update);

    const x = CFG.side;
    const y = 38;
    const w = CFG.width - CFG.side * 2;
    const h = height - 38 - CFG.footer - 18;

    drawCardShell(ctx, update, x, y, w, h);

    let yy = y + 34;
    yy = await drawAuthor(ctx, update, x + 36, yy, w - 72);
    yy += 48;

    if (getText(update)) {
      ctx.fillStyle = CFG.ink;
      ctx.font = f(31, 500);

      yy = drawTextBlock(
        ctx,
        getText(update),
        x + 36,
        yy,
        w - 72,
        42
      ) + 28;
    }

    const boxX = x + 36;
    const boxW = w - 72;
    const boxH = 108;

    ctx.fillStyle = "rgba(255,255,255,.72)";
    roundedRect(ctx, boxX, yy, boxW, boxH, 26);
    ctx.fill();

    ctx.strokeStyle = "rgba(36,27,28,.45)";
    ctx.lineWidth = 2;
    roundedRect(ctx, boxX, yy, boxW, boxH, 26);
    ctx.stroke();

    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(boxX + 54, yy + boxH / 2, 27, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = f(24, 700, "Arial");
    ctx.textAlign = "center";
    ctx.fillText("♪", boxX + 54, yy + 63);
    ctx.textAlign = "left";

    waveform(
      ctx,
      boxX + 105,
      yy + 34,
      boxW - 220,
      42,
      p.accent
    );

    ctx.fillStyle = CFG.muted;
    ctx.font = f(15, 600);
    ctx.textAlign = "right";
    ctx.fillText(
      getDuration(update) || "VOICE NOTE",
      boxX + boxW - 18,
      yy + 61
    );
    ctx.textAlign = "left";

    drawFooter(ctx, CFG.width, height);

    return node;
  }

  async function renderMedia(update, url, kind, slideIndex = 0, totalSlides = 1) {
    const { node, ctx } = makeCanvas(
      CFG.width,
      CFG.mediaHeight,
      update
    );

    const x = CFG.side;
    const y = 34;
    const w = CFG.width - CFG.side * 2;
    const h = CFG.mediaHeight - y - CFG.footer - 18;

    drawCardShell(ctx, update, x, y, w, h);

    let yy = y + 30;
    yy = await drawAuthor(ctx, update, x + 34, yy, w - 68);

    // FIX: do not press media against author header.
    yy += 40;

    const innerX = x + 34;
    const innerW = w - 68;
    const hasText = Boolean(getText(update));

    ctx.font = f(25, 500);
    const capLines = hasText
      ? wrap(ctx, getText(update), innerW)
      : [];

    // FIX: reserve more room before caption below media.
    const captionH =
      capLines.length
        ? capLines.length * 34 + 52
        : 0;

    const mediaBottom =
      y + h - 34 - captionH;

    const mediaH =
      Math.max(350, mediaBottom - yy);

    const img = await loadImage(url);

    ctx.save();
    roundedRect(ctx, innerX, yy, innerW, mediaH, 24);
    ctx.clip();
    drawCover(ctx, img, innerX, yy, innerW, mediaH);
    ctx.restore();

    ctx.strokeStyle = "rgba(36,27,28,.50)";
    ctx.lineWidth = 2;
    roundedRect(ctx, innerX, yy, innerW, mediaH, 24);
    ctx.stroke();

    if (kind === "video") {
      ctx.fillStyle = "rgba(255,255,255,.88)";
      ctx.strokeStyle = "rgba(36,27,28,.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        CFG.width / 2,
        yy + mediaH / 2,
        50,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#7A0F24";
      ctx.beginPath();
      ctx.moveTo(
        CFG.width / 2 - 10,
        yy + mediaH / 2 - 20
      );
      ctx.lineTo(
        CFG.width / 2 + 24,
        yy + mediaH / 2
      );
      ctx.lineTo(
        CFG.width / 2 - 10,
        yy + mediaH / 2 + 20
      );
      ctx.closePath();
      ctx.fill();
    }

    if (totalSlides > 1) {
      ctx.fillStyle = "rgba(20,16,17,.58)";
      roundedRect(
        ctx,
        innerX + innerW - 72,
        yy + 14,
        56,
        30,
        15
      );
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = f(13, 700);
      ctx.textAlign = "center";
      ctx.fillText(
        `${slideIndex + 1}/${totalSlides}`,
        innerX + innerW - 44,
        yy + 34
      );
      ctx.textAlign = "left";
    }

    if (capLines.length) {
      ctx.fillStyle = CFG.ink;
      ctx.font = f(25, 500);

      // FIX: caption sits lower, not attached to the media edge.
      let cy = yy + mediaH + 52;

      for (const line of capLines) {
        ctx.fillText(line, innerX, cy);
        cy += 34;
      }
    }

    drawFooter(ctx, CFG.width, CFG.mediaHeight);

    return node;
  }

  function filename(update, suffix) {
    const raw =
      `${getName(update)}-${getDate(update) || "update"}-${suffix}`;

    return raw
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) + ".png";
  }

  function toBlob(canvasNode) {
    return new Promise((resolve, reject) => {
      canvasNode.toBlob(
        blob =>
          blob
            ? resolve(blob)
            : reject(
                new Error(
                  "Could not create image."
                )
              ),
        "image/png",
        1
      );
    });
  }

  async function save(canvasNode, name) {
    const blob = await toBlob(canvasNode);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = name;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      1500
    );
  }

  async function render(update = {}) {
    await document.fonts?.ready;

    const type = getType(update);
    const media = getMedia(update);

    if (type.includes("carousel")) {
      if (!media.length) {
        throw new Error(
          "Carousel post has no media."
        );
      }

      const slides = [];

      for (let i = 0; i < media.length; i++) {
        slides.push(
          await renderMedia(
            update,
            media[i],
            "photo",
            i,
            media.length
          )
        );
      }

      return slides;
    }

    if (type.includes("video")) {
      const source =
        getThumbnail(update) ||
        media[0];

      if (!source) {
        throw new Error(
          "Video post needs a thumbnail/poster."
        );
      }

      return [
        await renderMedia(
          update,
          source,
          "video",
          0,
          1
        )
      ];
    }

    if (
      type.includes("voice") ||
      type.includes("audio")
    ) {
      return [
        await renderVoice(update)
      ];
    }

    if (
      type.includes("photo") ||
      type.includes("image")
    ) {
      if (!media.length) {
        throw new Error(
          "Photo post has no media."
        );
      }

      return [
        await renderMedia(
          update,
          media[0],
          "photo",
          0,
          1
        )
      ];
    }

    return [
      await renderText(update)
    ];
  }

  async function exportUpdate(update = {}) {
    const type = getType(update);
    const outputs = await render(update);

    for (let i = 0; i < outputs.length; i++) {
      let suffix = "text";

      if (type.includes("carousel")) {
        suffix = `carousel-${i + 1}`;
      } else if (type.includes("video")) {
        suffix = "video";
      } else if (
        type.includes("voice") ||
        type.includes("audio")
      ) {
        suffix = "voice-note";
      } else if (
        type.includes("photo") ||
        type.includes("image")
      ) {
        suffix = "photo";
      }

      await save(
        outputs[i],
        filename(update, suffix)
      );
    }
  }

  window.JenUpdateCardExport =
    Object.freeze({
      render,
      export: exportUpdate
    });
})();
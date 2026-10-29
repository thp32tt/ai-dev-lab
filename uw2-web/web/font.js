const eucKr = new TextDecoder("euc-kr");

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError("font input must be bytes");
}

function decodeKssCode(storedLo, storedHi) {
  // ALL_FONT.16P stores the two-byte KSS/EUC-KR code transposed.
  return eucKr.decode(Uint8Array.of(storedHi, storedLo));
}

function rows16From28(bytes, offset) {
  const rows = new Uint16Array(16);
  // The shipped glyph is 16x14; center it in the 16-pixel cell used by HANKAKU.
  for (let y = 0; y < 14; y++) {
    rows[y + 1] = (bytes[offset + y * 2] << 8) | bytes[offset + y * 2 + 1];
  }
  return rows;
}

function rows8From16(bytes, offset) {
  const rows = new Uint16Array(16);
  for (let y = 0; y < 16; y++) rows[y] = bytes[offset + y] << 8;
  return rows;
}

export function parseUw2Fonts(allFontBuffer, hankakuBuffer) {
  const all = asBytes(allFontBuffer);
  const half = asBytes(hankakuBuffer);
  if (all.length % 30 !== 0) {
    throw new Error(`ALL_FONT.16P size ${all.length} is not a 30-byte record table`);
  }
  if (half.length !== 96 * 16) {
    throw new Error(`HANKAKU.FNT size ${half.length} is not 96x16 bytes`);
  }

  const glyphs = new Map();
  const records = all.length / 30;
  for (let i = 0; i < records; i++) {
    const off = i * 30;
    const char = decodeKssCode(all[off], all[off + 1]);
    if (!char || char === "�") continue;
    glyphs.set(char, {
      char,
      source: "ALL_FONT.16P",
      width: 16,
      height: 16,
      rows: rows16From28(all, off + 2),
      storedCode: [all[off], all[off + 1]],
      eucKrCode: [all[off + 1], all[off]],
      record: i,
    });
  }

  for (let code = 0x20; code <= 0x7f; code++) {
    const i = code - 0x20;
    glyphs.set(String.fromCharCode(code), {
      char: String.fromCharCode(code),
      source: "HANKAKU.FNT",
      width: 8,
      height: 16,
      rows: rows8From16(half, i * 16),
      ascii: code,
      record: i,
    });
  }

  return {
    glyphs,
    allFontRecords: records,
    halfWidthRecords: 96,
    cellHeight: 16,
    cache: new Map(),
  };
}

export function measureUw2Text(font, text, letterSpacing = 0) {
  let x = 0;
  let max = 0;
  for (const ch of String(text ?? "")) {
    if (ch === "\n") {
      if (x > max) max = x;
      x = 0;
      continue;
    }
    const g = font?.glyphs?.get(ch);
    x += (g?.width ?? 16) + letterSpacing;
  }
  return Math.max(max, x ? x - letterSpacing : 0);
}

function colorKey(color) {
  if (Array.isArray(color)) return color.join(",");
  return String(color ?? "#24160c");
}

function parseColor(color) {
  if (Array.isArray(color)) return color;
  const s = String(color ?? "#24160c").trim();
  const m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >>> 16) & 255, (n >>> 8) & 255, n & 255, 255];
  }
  return [36, 22, 12, 255];
}

function glyphCanvas(font, glyph, color) {
  if (typeof document === "undefined") return null;
  const key = `${glyph.char}|${colorKey(color)}`;
  let canvas = font.cache.get(key);
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = glyph.width;
  canvas.height = 16;
  const g = canvas.getContext("2d");
  const img = g.createImageData(glyph.width, 16);
  const rgba = parseColor(color);
  for (let y = 0; y < 16; y++) {
    const row = glyph.rows[y] ?? 0;
    for (let x = 0; x < glyph.width; x++) {
      const bit = glyph.width === 8 ? (0x8000 >>> x) : (0x8000 >>> x);
      if (!(row & bit)) continue;
      const p = (y * glyph.width + x) * 4;
      img.data[p] = rgba[0];
      img.data[p + 1] = rgba[1];
      img.data[p + 2] = rgba[2];
      img.data[p + 3] = rgba[3];
    }
  }
  g.putImageData(img, 0, 0);
  font.cache.set(key, canvas);
  return canvas;
}

export function drawUw2Text(ctx, font, text, x, y, opts = {}) {
  if (!font?.glyphs) return { x, y, width: 0, height: 0, missing: [] };
  const startX = Math.round(x);
  let px = startX;
  let py = Math.round(y);
  const lineHeight = opts.lineHeight ?? 16;
  const spacing = opts.letterSpacing ?? 0;
  const scale = opts.scale ?? 1;
  const color = opts.color ?? "#24160c";
  const missing = [];
  let maxX = px;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const ch of String(text ?? "")) {
    if (ch === "\n") {
      maxX = Math.max(maxX, px);
      px = startX;
      py += lineHeight * scale;
      continue;
    }
    const glyph = font.glyphs.get(ch);
    if (!glyph) {
      missing.push(ch);
      px += 16 * scale;
      continue;
    }
    const src = glyphCanvas(font, glyph, color);
    if (src) {
      ctx.drawImage(
        src,
        px,
        py,
        glyph.width * scale,
        16 * scale,
      );
    }
    px += (glyph.width + spacing) * scale;
  }
  ctx.restore();
  maxX = Math.max(maxX, px);
  return {
    x: px,
    y: py,
    width: maxX - startX,
    height: (py - y) + 16 * scale,
    missing,
  };
}
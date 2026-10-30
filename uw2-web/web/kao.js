import { decodeLS11 } from "./ls11.js";

export const KAO_LZW_SHA256 =
  "ffd3fb6660f92fef089861aa42bc7c2a4a50370cb27017f3cd2149361580ef87";

export const KAO_RECORD_LAYOUT = Object.freeze({
  large: Object.freeze({ width: 64, height: 80, rowBytes: 8, planes: 3, bytes: 1920 }),
  small: Object.freeze({ width: 48, height: 48, rowBytes: 6, planes: 3, bytes: 864 }),
});

function layoutForLength(length) {
  if (length === KAO_RECORD_LAYOUT.large.bytes) return KAO_RECORD_LAYOUT.large;
  if (length === KAO_RECORD_LAYOUT.small.bytes) return KAO_RECORD_LAYOUT.small;
  throw new Error(`unsupported KAO record length ${length}`);
}

export function decodeKaoPlanarRecord(record) {
  if (!(record instanceof Uint8Array)) record = new Uint8Array(record);
  const layout = layoutForLength(record.length);
  const { width, height, rowBytes, planes } = layout;
  const indices = new Uint8Array(width * height);

  // MAIN.EXE 0x595E/0x584D consumes KAO bytes as three sequential VGA plane
  // bytes for each 8-pixel group, then advances to the next group. Plane masks
  // are 1,2,4. Pixels therefore use bits 7..0 of plane0/1/2.
  let src = 0;
  for (let y = 0; y < height; y++) {
    for (let byteX = 0; byteX < rowBytes; byteX++) {
      const p0 = record[src++];
      const p1 = record[src++];
      const p2 = record[src++];
      for (let bit = 7; bit >= 0; bit--) {
        const x = byteX * 8 + (7 - bit);
        indices[y * width + x] =
          ((p0 >>> bit) & 1) |
          (((p1 >>> bit) & 1) << 1) |
          (((p2 >>> bit) & 1) << 2);
      }
    }
  }

  return { width, height, indices };
}

export function decodeKaoArchive(arrayBuffer) {
  const archive = decodeLS11(arrayBuffer);
  const records = archive.decoded.map((part, index) => ({
    index,
    ...decodeKaoPlanarRecord(part.data),
    byteLength: part.data.length,
  }));
  return {
    magic: archive.magic,
    records,
    largeCount: records.filter(x => x.byteLength === KAO_RECORD_LAYOUT.large.bytes).length,
    smallCount: records.filter(x => x.byteLength === KAO_RECORD_LAYOUT.small.bytes).length,
  };
}

export const PROTAGONIST_KAO_RECORDS = Object.freeze([0,1,2,3,4,5]);

export function protagonistPortrait(kaoArchive, protagonistId) {
  const id = Number(protagonistId) | 0;
  const record = PROTAGONIST_KAO_RECORDS[id];
  if (record == null) return null;
  return kaoArchive?.records?.[record] ?? null;
}
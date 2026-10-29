export const HORIZON_KAO_PALETTE = Object.freeze([
  [0, 0, 0],
  [0, 160, 96],
  [208, 64, 0],
  [240, 160, 96],
  [0, 64, 208],
  [0, 160, 240],
  [208, 96, 160],
  [240, 224, 208],
]);

function bitAt(byte, bitIndex) {
  return (byte >> (7 - bitIndex)) & 1;
}

export function decodePlanarIndexed(raw, width, height, bpp, alignLength = 1, bigEndian = true) {
  const expected = (width * height * bpp) / 8;
  if (!Number.isInteger(expected) || raw.length < expected) {
    throw new Error(`planar image needs ${expected} bytes, got ${raw.length}`);
  }

  const out = new Uint8Array(width * height);
  const segmentBytes = alignLength * bpp;
  const pixelsPerSegment = alignLength * 8;
  const segments = expected / segmentBytes;
  let outPos = 0;
  let inPos = 0;

  for (let segment = 0; segment < segments; segment++) {
    for (let j = 0; j < pixelsPerSegment; j++) {
      let index = 0;
      const byteInPlane = Math.floor(j / 8);
      const bitInByte = j & 7;
      for (let plane = 0; plane < bpp; plane++) {
        const planeByte = raw[inPos + plane * alignLength + byteInPlane];
        const bit = bitAt(planeByte, bitInByte);
        const shift = bigEndian ? (bpp - plane - 1) : plane;
        index |= bit << shift;
      }
      if (outPos < out.length) out[outPos++] = index;
    }
    inPos += segmentBytes;
  }
  return out;
}

export function indexedToRgba(indexed, palette = HORIZON_KAO_PALETTE) {
  const rgba = new Uint8ClampedArray(indexed.length * 4);
  for (let i = 0; i < indexed.length; i++) {
    const c = palette[indexed[i]] ?? [0, 0, 0];
    const p = i * 4;
    rgba[p] = c[0];
    rgba[p + 1] = c[1];
    rgba[p + 2] = c[2];
    rgba[p + 3] = 255;
  }
  return rgba;
}

export function drawIndexedCanvas(canvas, indexed, width, height, scale = 2, palette = HORIZON_KAO_PALETTE) {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width * scale}px`;
  canvas.style.height = `${height * scale}px`;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const image = new ImageData(indexedToRgba(indexed, palette), width, height);
  ctx.putImageData(image, 0, 0);
}
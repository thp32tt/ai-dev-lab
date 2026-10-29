import { decodeLS11 } from "./ls11.js";
import { UW2_WORLD_PALETTE } from "./koei-image.js";

function decodePlanar16(raw, at) {
  const out = new Uint8Array(16 * 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let v = 0;
      for (let p = 0; p < 4; p++) {
        const b = raw[at + p * 32 + y * 2 + (x >> 3)];
        v |= ((b >> (7 - (x & 7))) & 1) << p;
      }
      out[y * 16 + x] = v;
    }
  }
  return out;
}

export function decodeKoreanChar(arrayBuffer) {
  const d = decodeLS11(arrayBuffer);
  const heroes = [];
  for (let c = 0; c < Math.min(6, d.decoded.length); c++) {
    const raw = d.decoded[c].data;
    const n = Math.floor(raw.length / 640);
    const frames = [];
    for (let f = 0; f < Math.min(8, n); f++) {
      const px = new Uint8Array(32 * 32);
      // Korean DOS chunk: 640 bytes/frame. The first four 128-byte
      // planar blocks reconstruct the 2x2 color quadrants. The final
      // 128 bytes are a blitter mask/control block whose exact combine
      // semantics are still under REA analysis; color index 0 is clear.
      for (let q = 0; q < 4; q++) {
        const tile = decodePlanar16(raw, f * 640 + q * 128);
        const bx = (q & 1) * 16, by = (q >> 1) * 16;
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            px[(by + y) * 32 + bx + x] = tile[y * 16 + x];
          }
        }
      }
      frames.push(px);
    }
    heroes.push(frames);
  }
  return { heroes, folkChunk: d.decoded[6]?.data ?? null };
}

function frameIndex(facing, stepParity) {
  const base = facing === "up" ? 0 :
               facing === "left" ? 2 :
               facing === "down" ? 4 : 6;
  return base + (stepParity & 1);
}

export function drawHeroSprite(ctx, chars, heroId, state, dx, dy) {
  const frames = chars?.heroes?.[heroId];
  if (!frames?.length) return false;
  const frame = frames[Math.min(frames.length - 1, frameIndex(state.facing, state.stepParity))];
  const c = document.createElement("canvas"); c.width = 32; c.height = 32;
  const xctx = c.getContext("2d"); const img = xctx.createImageData(32,32);
  for (let i = 0; i < frame.length; i++) {
    const ci = frame[i], p = i * 4;
    if (ci === 0) { img.data[p+3] = 0; continue; }
    const rgb = UW2_WORLD_PALETTE[ci] ?? [0,0,0];
    img.data[p] = rgb[0]; img.data[p+1] = rgb[1]; img.data[p+2] = rgb[2]; img.data[p+3] = 255;
  }
  xctx.putImageData(img,0,0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, dx + state.playerX * 16, dy + state.playerY * 16);
  return true;
}
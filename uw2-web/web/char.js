import { decodeLS11 } from "./ls11.js";

export const CHAR_PALETTE = Object.freeze([
  [0x00,0x00,0x00,255], undefined,
  [0x00,0xA2,0x61,255], undefined,
  [0xD3,0x41,0x00,255], undefined,
  [0xF3,0xA2,0x61,255], undefined,
  [0x00,0x41,0xD3,255], undefined,
  [0x00,0xA2,0xF3,255], undefined,
  [0xD3,0x61,0xA2,255], undefined,
  [0xF3,0xE3,0xD3,255], undefined,
]);

function bit(raw, index) {
  return (raw[index >> 3] >> (7 - (index & 7))) & 1;
}

export function decodeCharacterChunk(raw, frames) {
  const expected = frames * 4 * 160;
  if (raw.length !== expected) {
    throw new Error(`CHAR chunk size ${raw.length}, expected ${expected} for ${frames} frames`);
  }

  const rgbaFrames = [];
  let pointer = 0;
  for (let frame = 0; frame < frames; frame++) {
    const rgba = new Uint8ClampedArray(32 * 32 * 4);
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      for (let pixel = 0; pixel < 256; pixel++) {
        let colorIndex = 0;
        for (let plane = 0; plane < 4; plane++) {
          colorIndex = (colorIndex << 1) | bit(raw, pointer + pixel + plane * 256);
        }
        const transparent = bit(raw, pointer + pixel + 1024) === 1;
        const x = (quadrant & 1) * 16 + (pixel & 15);
        const y = (quadrant >> 1) * 16 + (pixel >> 4);
        const at = (y * 32 + x) * 4;

        if (transparent) {
          rgba[at] = 0;
          rgba[at + 1] = 0;
          rgba[at + 2] = 0;
          rgba[at + 3] = 0;
        } else {
          const c = CHAR_PALETTE[colorIndex];
          if (!c) throw new Error(`CHAR missing palette index ${colorIndex}`);
          rgba[at] = c[0];
          rgba[at + 1] = c[1];
          rgba[at + 2] = c[2];
          rgba[at + 3] = c[3];
        }
      }
      pointer += 1280; // bits = 4*256 colour + 256 transparency
    }
    rgbaFrames.push(rgba);
  }
  return rgbaFrames;
}

export function decodeKoreanChar(arrayBuffer) {
  const archive = decodeLS11(arrayBuffer);
  if (archive.decoded.length !== 7) {
    throw new Error(`CHAR.LZW parts ${archive.decoded.length}, expected 7`);
  }

  const heroes = [];
  for (let character = 0; character < 6; character++) {
    heroes.push(decodeCharacterChunk(archive.decoded[character].data, 8));
  }
  const folk = decodeCharacterChunk(archive.decoded[6].data, 24);
  return {
    heroes,
    folk,
    chunkSizes: archive.decoded.map(x => x.data.length),
  };
}

export function heroFrameIndex(facing, stepParity) {
  // Shipped order is two frames each: up, left, down, right.
  const base = facing === "up" ? 0 :
               facing === "left" ? 2 :
               facing === "down" ? 4 : 6;
  return base + (stepParity & 1);
}

function drawRgbaFrame(ctx, frame, x, y) {
  if (!frame) return false;
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const xctx = c.getContext("2d");
  const image = new ImageData(frame, 32, 32);
  xctx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, x, y);
  return true;
}

export function drawHeroSprite(ctx, chars, heroId, state, dx, dy) {
  const frames = chars?.heroes?.[heroId];
  if (!frames?.length) return false;
  const frame = frames[heroFrameIndex(state.facing, state.stepParity)];
  return drawRgbaFrame(
    ctx,
    frame,
    dx + state.playerX * 16,
    dy + state.playerY * 16,
  );
}

export function folkFrameIndex(actor, animationParity = 0) {
  if (!actor?.active) return -1;
  if (actor.walker) {
    const direction = actor.type & 3;
    return 2 * ((actor.slot & 1) * 4 + direction) + ((actor.x + actor.y) & 1);
  }
  return 16 + 2 * (actor.type & 3) + (animationParity & 1);
}

export function drawFolkSprite(ctx, chars, frameIndex, screenX, screenY, dx = 0, dy = 0) {
  const frame = chars?.folk?.[frameIndex];
  return drawRgbaFrame(ctx, frame, dx + screenX * 16, dy + screenY * 16);
}
import { decodeLS11 } from "./ls11.js";
import { decodePlanarIndexed, UW2_WORLD_PALETTE } from "./koei-image.js";

export const PORT_TILE_SIZE = 16;
export const PORT_MAP_WIDTH = 96;
export const PORT_MAP_HEIGHT = 96;
export const PORT_TILES_PER_BANK = 240;

export function decodePortAssets(portChipBuffer, portMapBuffer, chipNoBuffer) {
  const chipContainer = decodeLS11(portChipBuffer);
  const mapContainer = decodeLS11(portMapBuffer);
  const chipNo = new Uint8Array(chipNoBuffer);

  const banks = [];
  const walkBounds = [];
  for (let bank = 0; bank < 7; bank++) {
    const entry = chipContainer.decoded[bank * 2];
    if (!entry || entry.data.length !== 30720) {
      throw new Error(`PORTCHIP bank ${bank} missing expected 30720-byte image entry`);
    }
    const indexed = decodePlanarIndexed(entry.data, 16, 3840, 4, 32, true);
    const tiles = [];
    for (let t = 0; t < PORT_TILES_PER_BANK; t++) {
      const tile = new Uint8Array(PORT_TILE_SIZE * PORT_TILE_SIZE);
      for (let y = 0; y < PORT_TILE_SIZE; y++) {
        const src = (t * PORT_TILE_SIZE + y) * PORT_TILE_SIZE;
        tile.set(indexed.subarray(src, src + PORT_TILE_SIZE), y * PORT_TILE_SIZE);
      }
      tiles.push(tile);
    }
    banks.push(tiles);
    const meta = chipContainer.decoded[bank * 2 + 1];
    if (!meta || meta.data.length !== 4) {
      throw new Error(`PORTCHIP bank ${bank} missing 4-byte walk bounds`);
    }
    walkBounds.push(Array.from(meta.data));
  }

  const maps = mapContainer.decoded.map((entry, index) => {
    if (entry.data.length !== PORT_MAP_WIDTH * PORT_MAP_HEIGHT) {
      throw new Error(`PORTMAP entry ${index} size ${entry.data.length}, expected 9216`);
    }
    return entry.data;
  });

  if (chipNo.length !== 100) {
    throw new Error(`CHIP_NO.DAT size ${chipNo.length}, expected 100`);
  }

  return { banks, maps, chipNo, walkBounds };
}

export function renderPortMapToCanvas(canvas, portAssets, portId, scale = 0.25) {
  if (!Number.isInteger(portId) || portId < 0 || portId >= portAssets.maps.length) {
    throw new Error(`invalid port map id ${portId}`);
  }
  const bankId = portId < portAssets.chipNo.length ? portAssets.chipNo[portId] : 0;
  const bank = portAssets.banks[bankId];
  if (!bank) throw new Error(`missing PORTCHIP bank ${bankId}`);

  const map = portAssets.maps[portId];
  const fullW = PORT_MAP_WIDTH * PORT_TILE_SIZE;
  const fullH = PORT_MAP_HEIGHT * PORT_TILE_SIZE;
  const off = document.createElement("canvas");
  off.width = fullW;
  off.height = fullH;
  const offCtx = off.getContext("2d");
  const image = offCtx.createImageData(fullW, fullH);

  for (let my = 0; my < PORT_MAP_HEIGHT; my++) {
    for (let mx = 0; mx < PORT_MAP_WIDTH; mx++) {
      const tileId = map[my * PORT_MAP_WIDTH + mx];
      const tile = bank[tileId];
      if (!tile) continue;

      for (let ty = 0; ty < PORT_TILE_SIZE; ty++) {
        for (let tx = 0; tx < PORT_TILE_SIZE; tx++) {
          const colorIndex = tile[ty * PORT_TILE_SIZE + tx];
          const c = UW2_WORLD_PALETTE[colorIndex] ?? [0, 0, 0];
          const x = mx * PORT_TILE_SIZE + tx;
          const y = my * PORT_TILE_SIZE + ty;
          const p = (y * fullW + x) * 4;
          image.data[p] = c[0];
          image.data[p + 1] = c[1];
          image.data[p + 2] = c[2];
          image.data[p + 3] = 255;
        }
      }
    }
  }
  offCtx.putImageData(image, 0, 0);

  canvas.width = Math.round(fullW * scale);
  canvas.height = Math.round(fullH * scale);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

  return { bankId, tileCount: bank.length, mapWidth: PORT_MAP_WIDTH, mapHeight: PORT_MAP_HEIGHT };
}

export function renderPortViewport(ctx, portAssets, portId, dx, dy, dw, dh) {
  if (!portAssets || portId === 0xff || portId >= portAssets.maps.length) return null;
  const bankId = portId < portAssets.chipNo.length ? portAssets.chipNo[portId] : 0;
  const bank = portAssets.banks[bankId];
  const map = portAssets.maps[portId];
  if (!bank || !map) return null;

  // Until REA identifies the avatar/world coordinates, focus on the non-background
  // content centroid rather than claiming a player position.
  const freq = new Uint32Array(256);
  for (const v of map) freq[v]++;
  let bg = 0;
  for (let i = 1; i < freq.length; i++) if (freq[i] > freq[bg]) bg = i;

  let sx = 0, sy = 0, count = 0;
  for (let y = 0; y < PORT_MAP_HEIGHT; y++) {
    for (let x = 0; x < PORT_MAP_WIDTH; x++) {
      if (map[y * PORT_MAP_WIDTH + x] === bg) continue;
      sx += x; sy += y; count++;
    }
  }
  const focusX = count ? sx / count : PORT_MAP_WIDTH / 2;
  const focusY = count ? sy / count : PORT_MAP_HEIGHT / 2;
  const tilesWide = Math.ceil(dw / PORT_TILE_SIZE);
  const tilesHigh = Math.ceil(dh / PORT_TILE_SIZE);
  const startX = Math.max(0, Math.min(PORT_MAP_WIDTH - tilesWide, Math.round(focusX - tilesWide / 2)));
  const startY = Math.max(0, Math.min(PORT_MAP_HEIGHT - tilesHigh, Math.round(focusY - tilesHigh / 2)));

  const tmp = document.createElement("canvas");
  tmp.width = dw;
  tmp.height = dh;
  const tctx = tmp.getContext("2d");
  const img = tctx.createImageData(dw, dh);

  for (let py = 0; py < dh; py++) {
    for (let px = 0; px < dw; px++) {
      const worldX = startX * PORT_TILE_SIZE + px;
      const worldY = startY * PORT_TILE_SIZE + py;
      const mx = Math.floor(worldX / PORT_TILE_SIZE);
      const my = Math.floor(worldY / PORT_TILE_SIZE);
      if (mx >= PORT_MAP_WIDTH || my >= PORT_MAP_HEIGHT) continue;
      const tileId = map[my * PORT_MAP_WIDTH + mx];
      const tile = bank[tileId];
      if (!tile) continue;
      const tx = worldX & 15;
      const ty = worldY & 15;
      const ci = tile[ty * 16 + tx];
      const c = UW2_WORLD_PALETTE[ci] ?? [0, 0, 0];
      const p = (py * dw + px) * 4;
      img.data[p] = c[0];
      img.data[p + 1] = c[1];
      img.data[p + 2] = c[2];
      img.data[p + 3] = 255;
    }
  }
  tctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, dx, dy);
  return { bankId, startX, startY, backgroundTile: bg, focusX, focusY };
}
export function renderTownView(ctx, portAssets, portId, state, dx = 16, dy = 16, drawFallbackMarker = true) {
  const bankId = portId < portAssets.chipNo.length ? portAssets.chipNo[portId] : 3;
  const bank = portAssets.banks[bankId];
  const map = portAssets.maps[portId];
  if (!bank || !map) return null;

  const viewTiles = 23;
  const pxSize = viewTiles * PORT_TILE_SIZE;
  const tmp = document.createElement("canvas");
  tmp.width = pxSize;
  tmp.height = pxSize;
  const tctx = tmp.getContext("2d");
  const img = tctx.createImageData(pxSize, pxSize);

  for (let vy = 0; vy < viewTiles; vy++) {
    for (let vx = 0; vx < viewTiles; vx++) {
      const mx = state.viewX + vx;
      const my = state.viewY + vy;
      if (mx < 0 || my < 0 || mx >= PORT_MAP_WIDTH || my >= PORT_MAP_HEIGHT) continue;
      const tileId = map[my * PORT_MAP_WIDTH + mx];
      const tile = bank[tileId];
      if (!tile) continue;
      for (let ty = 0; ty < 16; ty++) {
        for (let tx = 0; tx < 16; tx++) {
          const ci = tile[ty * 16 + tx];
          const c = UW2_WORLD_PALETTE[ci] ?? [0,0,0];
          const x = vx * 16 + tx;
          const y = vy * 16 + ty;
          const pos = (y * pxSize + x) * 4;
          img.data[pos] = c[0];
          img.data[pos + 1] = c[1];
          img.data[pos + 2] = c[2];
          img.data[pos + 3] = 255;
        }
      }
    }
  }
  tctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, dx, dy);

  const playerScreenX = dx + state.playerX * 16;
  const playerScreenY = dy + state.playerY * 16;
  if (drawFallbackMarker) {
    ctx.save();
    ctx.fillStyle = "rgba(255,238,128,.35)";
    ctx.fillRect(playerScreenX, playerScreenY, 32, 32);
    ctx.strokeStyle = "#ffe680";
    ctx.lineWidth = 2;
    ctx.strokeRect(playerScreenX + 1, playerScreenY + 1, 30, 30);
    ctx.restore();
  }

  return { bankId, width: pxSize, height: pxSize, playerScreenX, playerScreenY };
}
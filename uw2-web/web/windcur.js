export const WIND_COLS = 30;
export const WIND_ROWS = 15;
export const WIND_PAGE_BYTES = 450;
export const WIND_PAGES = 3;
export const WIND_CHIPS_PER_CELL = 72;

export const FLOW_DIR_NAMES = Object.freeze([
  "북","북동","동","남동","남","남서","서","북서"
]);
export const FLOW_DX = Object.freeze([0,1,1,1,0,-1,-1,-1]);
export const FLOW_DY = Object.freeze([-1,-1,0,1,1,1,0,-1]);

export function parseWindCur(arrayBuffer) {
  const raw = new Uint8Array(arrayBuffer);
  if (raw.length !== WIND_PAGE_BYTES * WIND_PAGES) {
    throw new Error(`WINDCUR.DAT size ${raw.length}, expected 1350`);
  }
  return raw;
}

export function splitFlow(byte) {
  return { dir:(byte >> 3) & 7, speed:byte & 7, flags:(byte >> 6) & 3 };
}

export function flowAt(raw, page, chipX, chipY) {
  const col = Math.max(0, Math.min(WIND_COLS - 1, Math.floor(chipX / WIND_CHIPS_PER_CELL)));
  const row = Math.max(0, Math.min(WIND_ROWS - 1, Math.floor(chipY / WIND_CHIPS_PER_CELL)));
  const index = page * WIND_PAGE_BYTES + row * WIND_COLS + col;
  return { ...splitFlow(raw[index]), raw:raw[index], col, row, page };
}

export function windPageForMonth(monthOneBased) {
  const zero = monthOneBased - 1;
  return zero >= 3 && zero <= 8 ? 0 : 1;
}

export function environmentAt(raw, monthOneBased, chipX, chipY) {
  const wind = flowAt(raw, windPageForMonth(monthOneBased), chipX, chipY);
  const current = flowAt(raw, 2, chipX, chipY);
  return { wind, current };
}

export function flowVector(flow) {
  return { x:FLOW_DX[flow.dir & 7] * flow.speed, y:FLOW_DY[flow.dir & 7] * flow.speed };
}
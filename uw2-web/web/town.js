export const BUILDING_NAMES = Object.freeze([
  "교역소", "주점", "조선소", "항", "여관", "왕궁",
  "조합", "NPC", "은행", "ITEM", "교회/모스크", "점술가",
]);

export const BUILDING_MENU_INDEX = Object.freeze([
  6, 15, 22, 9, 4, 16, 1, null, 0, 5, 7, 17,
]);

export function parsePortDoors(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length % 24 !== 0) throw new Error("ZA_DAT.DAT size is not multiple of 24");
  const records = [];
  for (let port = 0; port < bytes.length / 24; port++) {
    const doors = [];
    const base = port * 24;
    for (let id = 0; id < 12; id++) {
      const x = bytes[base + id * 2];
      const y = bytes[base + id * 2 + 1];
      const present = !((x === 0 && y === 0) || (x === 0xff && y === 0xff));
      doors.push({ id, name: BUILDING_NAMES[id], x, y, present });
    }
    records.push(doors);
  }
  return records;
}

export function canStandAt(portAssets, portId, x, y) {
  if (!portAssets || portId < 0 || portId >= portAssets.maps.length) return false;
  if (x < 0 || y < 0 || x > 94 || y > 94) return false;
  const bankId = portId < portAssets.chipNo.length ? portAssets.chipNo[portId] : 3;
  const bounds = portAssets.walkBounds[bankId];
  const map = portAssets.maps[portId];
  if (!bounds || !map) return false;

  const left = map[(y + 1) * 96 + x];
  const right = map[(y + 1) * 96 + x + 1];
  const a = bounds[1], b = bounds[2], c = bounds[3];

  // Exact rule from the original town-walk collision routine:
  // left >= b => blocked
  // a <= right < b => blocked
  // right >= c => blocked
  return left < b && (right < a || (right >= b && right < c));
}

function doorAt(doors, x, y) {
  if (!doors) return null;
  return doors.find(d => d.present && d.x === x && d.y === y) ?? null;
}

const DIR = Object.freeze({
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
});

export class PortWalkingRuntime {
  constructor(slot, portAssets, portDoors) {
    if (!slot || slot.port === 0xff) throw new Error("port walking requires an in-port save");
    if (!slot.portState) throw new Error("save has no decoded port view/player state");
    this.slot = slot;
    this.portAssets = portAssets;
    this.portDoors = portDoors;
    this.portId = slot.port;
    this.doors = portDoors[this.portId] ?? [];
    this.viewX = slot.portState.viewX;
    this.viewY = slot.portState.viewY;
    this.playerX = slot.portState.playerX;
    this.playerY = slot.portState.playerY;
    this.facing = "down";
    this.stepParity = 0;
    this.actors = (slot.townActors ?? []).map(a => ({ ...a }));
    this.insideBuilding = null;
    this.lastEvent = "load-save-position";
  }

  get mapX() { return this.viewX + this.playerX; }
  get mapY() { return this.viewY + this.playerY; }

  snapshot() {
    return {
      portId: this.portId,
      portName: this.slot.portName,
      viewX: this.viewX,
      viewY: this.viewY,
      playerX: this.playerX,
      playerY: this.playerY,
      mapX: this.mapX,
      mapY: this.mapY,
      facing: this.facing,
      stepParity: this.stepParity,
      actors: this.actors.map(a => ({ ...a })),
      building: this.insideBuilding ? {
        id: this.insideBuilding.id,
        name: this.insideBuilding.name,
        x: this.insideBuilding.x,
        y: this.insideBuilding.y,
      } : null,
      lastEvent: this.lastEvent,
    };
  }

  _actorNear(x, y, ignoreSlot = -1) {
    return this.actors.some(a =>
      a.active && a.slot !== ignoreSlot &&
      Math.abs(a.x - x) <= 1 && Math.abs(a.y - y) <= 1
    );
  }

  _playerNear(x, y) {
    return Math.abs(this.mapX - x) <= 1 && Math.abs(this.mapY - y) <= 1;
  }

  _insideView(nx, ny) {
    return nx >= 0 && nx <= 22 && ny >= 0 && ny <= 22;
  }

  _scroll(stepX, stepY) {
    if (stepX < 0 && this.playerX <= 3 && this.viewX > 0) {
      this.viewX--; this.playerX++;
    } else if (stepX > 0 && this.playerX >= 19 && this.viewX < 72) {
      this.viewX++; this.playerX--;
    }
    if (stepY < 0 && this.playerY <= 3 && this.viewY > 0) {
      this.viewY--; this.playerY++;
    } else if (stepY > 0 && this.playerY >= 19 && this.viewY < 72) {
      this.viewY++; this.playerY--;
    }
  }

  _findWayAround(dx, dy) {
    const cx = this.mapX, cy = this.mapY;
    // Original searches (dy,dx) and (-dy,-dx), then prefers the latter on ties.
    const sides = [[dy, dx], [-dy, -dx]];
    const found = [null, null];

    for (let si = 0; si < 2; si++) {
      const [sx, sy] = sides[si];
      for (let k = 1; k <= 19; k++) {
        const sideX = cx + sx * k;
        const sideY = cy + sy * k;
        if (sideX < 0 || sideY < 0 || sideX > 94 || sideY > 94) break;
        if (!canStandAt(this.portAssets, this.portId, sideX, sideY) ||
            this._actorNear(sideX, sideY)) break;

        const aheadX = sideX + dx;
        const aheadY = sideY + dy;
        if (aheadX < 0 || aheadY < 0 || aheadX > 94 || aheadY > 94) break;
        if (canStandAt(this.portAssets, this.portId, aheadX, aheadY) &&
            !this._actorNear(aheadX, aheadY)) {
          found[si] = k;
          break;
        }
      }
    }

    if (found[0] == null && found[1] == null) return null;
    if (found[0] != null && found[1] == null) return sides[0];
    if (found[0] == null && found[1] != null) return sides[1];
    return found[0] < found[1] ? sides[0] : sides[1];
  }

  move(direction) {
    if (this.insideBuilding) return { moved: false, building: this.insideBuilding };
    const step = DIR[direction];
    if (!step) return { moved: false };
    const [dx, dy] = step;
    this.facing = direction;

    const targetPX = this.playerX + dx;
    const targetPY = this.playerY + dy;
    if (!this._insideView(targetPX, targetPY)) {
      this.lastEvent = "view-edge-block";
      return { moved: false };
    }

    let actualDx = dx, actualDy = dy;
    const targetX = this.mapX + dx;
    const targetY = this.mapY + dy;
    let moved = canStandAt(this.portAssets, this.portId, targetX, targetY) &&
      !this._actorNear(targetX, targetY);

    if (!moved) {
      const around = this._findWayAround(dx, dy);
      if (around) {
        [actualDx, actualDy] = around;
        const px = this.playerX + actualDx;
        const py = this.playerY + actualDy;
        if (this._insideView(px, py) &&
            canStandAt(this.portAssets, this.portId, this.mapX + actualDx, this.mapY + actualDy) &&
            !this._actorNear(this.mapX + actualDx, this.mapY + actualDy)) {
          moved = true;
        }
      }
    }

    if (moved) {
      this.playerX += actualDx;
      this.playerY += actualDy;
      this.stepParity ^= 1;
      this.facing = actualDy < 0 ? "up" : actualDy > 0 ? "down" : actualDx < 0 ? "left" : "right";
      this._scroll(actualDx, actualDy);
      const door = doorAt(this.doors, this.mapX, this.mapY);
      if (door) {
        this.insideBuilding = door;
        this.lastEvent = `enter-building-${door.id}`;
        return { moved: true, building: door };
      }
      this.lastEvent = "walk";
      this.advanceActors();
      return { moved: true };
    }

    // The original uses the held direction for view maintenance if no step was taken.
    this._scroll(dx, dy);
    this.lastEvent = "blocked";
    this.advanceActors();
    return { moved: false };
  }

  advanceActors(rng = Math.random) {
    const dirSteps = [[0,-1],[1,0],[0,1],[-1,0]];
    for (let slot = 0; slot < 4; slot++) {
      const a = this.actors[slot];
      if (!a?.active) continue;

      if (Math.floor(rng() * 10) === 0) a.type = Math.floor(rng() * 4);
      if (Math.floor(rng() * 3) !== 0) continue;

      const [dx,dy] = dirSteps[a.type & 3];
      const nx = a.x + dx, ny = a.y + dy;
      const blocked =
        nx < 0 || ny < 0 || nx > 94 || ny > 94 ||
        !canStandAt(this.portAssets, this.portId, nx, ny) ||
        this._actorNear(nx, ny, slot) ||
        this._playerNear(nx, ny);

      if (!blocked) {
        a.x = nx; a.y = ny;
      } else {
        const turn = Math.floor(rng() * 3) - 1;
        a.type = (a.type + turn + 4) & 3;
      }
    }
  }

  leaveBuilding() {
    if (!this.insideBuilding) return false;
    this.insideBuilding = null;
    // Original building flow leaves the player one tile below the door.
    if (this.playerY < 22 &&
        canStandAt(this.portAssets, this.portId, this.mapX, this.mapY + 1)) {
      this.playerY += 1;
      this._scroll(0, 1);
    }
    this.lastEvent = "leave-building";
    return true;
  }
}
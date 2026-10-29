const WIND_TABLE = Object.freeze([
  [10,8,10,9,9,8,10,10],
  [10,9,10,10,10,10,10,10],
  [8,9,10,10,10,10,10,10],
  [6,7,8,9,9,10,9,10],
  [4,6,6,7,7,8,9,10],
  [6,7,8,9,9,10,9,10],
  [8,9,10,10,10,10,10,10],
  [10,9,10,10,10,10,10,10],
]);

function truncDiv(n, d) {
  return d === 0 ? 0 : Math.trunc(n / d);
}

export function shipSeaSpeed(ship, heading, wind) {
  if (!ship || !wind) return 0;
  const row = Math.abs((wind.dir & 7) - (heading & 7));
  const sailType = ship.sailType & 7;
  const effectiveWind = ship.oared ? Math.max(3, wind.speed) : wind.speed;
  let f = truncDiv(WIND_TABLE[row][sailType] * ship.power * effectiveWind, 150);

  const navRatio = Math.min(
    100,
    truncDiv(ship.navigationPercent * ship.currentCrew, Math.max(1, ship.requiredCrew)),
  );
  f = truncDiv(f * navRatio, 100);

  // Normal-range game formula. The original 16-bit intermediate has a historical
  // overflow quirk above 327 units; ordinary legal loads use this exact result.
  const loadFactor = Math.min(
    150,
    180 - truncDiv(100 * ship.load, Math.max(1, ship.capacity)),
  );
  f = truncDiv(f * loadFactor, 100);

  f = Math.min(30, f + truncDiv(f * ship.navigationLevel, 10));
  f = Math.min(40, truncDiv(f * ship.seamanship, 75));
  if (row === 3 || row === 4 || row === 5) {
    f = truncDiv(ship.tacking * f, 100);
  }
  return Math.max(0, f);
}

export function fleetSeaSpeed(fleet, heading, wind) {
  if (!fleet?.ships?.length || !wind) {
    return { speed: 0, knots: 0, ships: [] };
  }
  const details = fleet.ships.map(ship => {
    return {
      index: ship.index,
      modelId: ship.modelId,
      name: ship.name,
      speed: shipSeaSpeed(ship, heading, wind),
    };
  });
  const hasOared = fleet.ships.some(ship => ship.oared);
  let speed = Math.min(...details.map(x => x.speed));
  if (wind.speed === 0 && !hasOared) speed = 0;
  else speed = Math.max(2, speed);
  return { speed, knots: Math.floor((speed + 1) / 2), ships: details };
}
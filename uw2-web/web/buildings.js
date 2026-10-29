export const RESOURCE_KEYS = Object.freeze(["water","food","lumber","shot"]);
export const RESOURCE_NAMES = Object.freeze(["물","식량","자재","포탄"]);

export function harborSupplyPrices(slot) {
  const meta = slot?.portMeta;
  if (!meta) {
    return { water: 0, food: null, lumber: null, shot: null, unresolved: true };
  }
  const rate2 = meta.rates?.[2] ?? 0;
  const rate9 = meta.rates?.[9] ?? 0;
  return {
    water: 0,
    food: Math.floor(20 * (rate2 + 50) / 100),
    lumber: Math.floor(90 * (rate9 + 50) / 100),
    shot: Math.floor(120 * (rate2 + 50) / 100),
    unresolved: false,
  };
}

export function shipCargoUsed(ship) {
  if (!ship) return 0;
  const provisions =
    Math.floor((ship.water ?? 0) / 10) +
    Math.floor((ship.food ?? 0) / 10) +
    Math.max(0, ship.lumber ?? 0) +
    Math.max(0, ship.shot ?? 0);
  const goods = (ship.goods ?? []).reduce((n,g)=>n+Math.max(0,g.quantity ?? 0),0);
  return provisions + goods;
}

export function shipCargoFree(ship) {
  // The active ship instance's cargo field (+0x17 in the instance record)
  // is the game's cargo-space limit. Model capacity is a different quantity.
  return Math.max(0, (ship?.cargo ?? 0) - shipCargoUsed(ship));
}

function adjustSpeedLoad(ship, deltaCargo) {
  ship.load = Math.max(0, (ship.load ?? 0) + deltaCargo);
}

export function resourceUnitsAboard(ship, resource) {
  if (!ship) return 0;
  if (resource === "water" || resource === "food") {
    return Math.floor((ship[resource] ?? 0) / 10);
  }
  return Math.max(0, ship[resource] ?? 0);
}

export function maxSupplyLoad(slot, ship, resource) {
  if (!slot || !ship || !RESOURCE_KEYS.includes(resource)) return 0;
  const free = shipCargoFree(ship);
  if (free <= 0) return 0;
  const prices = harborSupplyPrices(slot);
  const price = prices[resource];
  if (price == null) return 0;
  if (price === 0) return free;
  return Math.max(0, Math.min(free, Math.floor((slot.money ?? 0) / price)));
}

export function loadSupply(slot, shipIndex, resource, requested) {
  const ship = slot?.fleet?.ships?.[shipIndex];
  if (!ship || !RESOURCE_KEYS.includes(resource)) return { quantity: 0, cost: 0 };
  const max = maxSupplyLoad(slot, ship, resource);
  const quantity = Math.max(0, Math.min(max, Math.floor(requested || 0)));
  if (!quantity) return { quantity: 0, cost: 0 };

  const price = harborSupplyPrices(slot)[resource] ?? 0;
  const cost = price * quantity;
  if (resource === "water" || resource === "food") ship[resource] += quantity * 10;
  else ship[resource] += quantity;
  adjustSpeedLoad(ship, quantity);
  slot.money = Math.max(0, slot.money - cost);
  return { quantity, cost, unitPrice: price };
}

export function unloadSupply(slot, shipIndex, resource, requested) {
  const ship = slot?.fleet?.ships?.[shipIndex];
  if (!ship || !RESOURCE_KEYS.includes(resource)) return { quantity: 0 };
  const aboard = resourceUnitsAboard(ship, resource);
  const quantity = Math.max(0, Math.min(aboard, Math.floor(requested || 0)));
  if (!quantity) return { quantity: 0 };

  if (resource === "water" || resource === "food") ship[resource] -= quantity * 10;
  else ship[resource] -= quantity;
  adjustSpeedLoad(ship, -quantity);
  return { quantity };
}

export function harborDepartureStatus(slot) {
  const ships = slot?.fleet?.ships ?? [];
  if (!ships.length) return { allowed: false, messageId: 59, days: 0, reason: "no-ships" };

  for (const ship of ships) {
    const navCrew = Math.floor((ship.currentCrew ?? 0) * (ship.navigationPercent ?? 0) / 100);
    if (navCrew <= 0) {
      return { allowed: false, messageId: 57, days: 0, reason: "no-navigation-crew", shipIndex: ship.index };
    }
  }

  const totalCrew = ships.reduce((n,s)=>n+(s.currentCrew??0),0);
  const totalWater = ships.reduce((n,s)=>n+(s.water??0),0);
  const totalFood = ships.reduce((n,s)=>n+(s.food??0),0);
  if (totalCrew <= 0) return { allowed: false, messageId: 57, days: 0, reason: "no-crew" };

  const days = Math.floor(Math.min(totalWater,totalFood) / totalCrew);
  if (days <= 0) return { allowed: false, messageId: 59, days: 0, reason: "no-provisions" };
  if (days < 10) return { allowed: true, needsConfirm: true, messageId: 60, days, reason: "short-provisions" };
  if (days <= 180) return { allowed: true, needsConfirm: true, messageId: 61, days, reason: "normal" };
  return { allowed: true, needsConfirm: true, messageId: 58, days, reason: "six-months-plus" };
}

export function consumeDepartureDay(slot) {
  const ships = slot?.fleet?.ships ?? [];
  for (const ship of ships) {
    const crew = Math.max(0, ship.currentCrew ?? 0);
    const beforeWaterUnits = Math.floor((ship.water ?? 0) / 10);
    const beforeFoodUnits = Math.floor((ship.food ?? 0) / 10);
    ship.water = Math.max(0, (ship.water ?? 0) - crew);
    ship.food = Math.max(0, (ship.food ?? 0) - crew);
    const afterWaterUnits = Math.floor(ship.water / 10);
    const afterFoodUnits = Math.floor(ship.food / 10);
    const released = (beforeWaterUnits-afterWaterUnits)+(beforeFoodUnits-afterFoodUnits);
    adjustSpeedLoad(ship, -released);
  }
}

const MONTH_DAYS = Object.freeze([31,28,31,30,31,30,31,31,30,31,30,31]);

export function advanceDateTicks(dateTime, ticks) {
  if (!dateTime) return null;
  for (let i=0;i<Math.max(0,Math.floor(ticks));i++) {
    dateTime.timeTick = ((dateTime.timeTick ?? 0) + 1) % 72;
    if (dateTime.timeTick === 0) {
      dateTime.day = (dateTime.day ?? 1) + 1;
      const md = MONTH_DAYS[((dateTime.month ?? 1)-1)%12] ?? 30;
      if (dateTime.day > md) {
        dateTime.day = 1;
        dateTime.month = (dateTime.month ?? 1) + 1;
        if (dateTime.month > 12) {
          dateTime.month = 1;
          dateTime.year = (dateTime.year ?? 1501) + 1;
        }
      }
    }
  }
  dateTime.hour = Math.floor((dateTime.timeTick ?? 0) / 3);
  dateTime.minute = ((dateTime.timeTick ?? 0) % 3) * 20;
  return dateTime;
}

export function lodgeCheckIn(dateTime) {
  if (!dateTime) return null;
  // Check In returns at 08:00 next day.
  dateTime.day = (dateTime.day ?? 1) + 1;
  let md = MONTH_DAYS[((dateTime.month ?? 1)-1)%12] ?? 30;
  if (dateTime.day > md) {
    dateTime.day = 1;
    dateTime.month = (dateTime.month ?? 1) + 1;
    if (dateTime.month > 12) {
      dateTime.month = 1;
      dateTime.year = (dateTime.year ?? 1501) + 1;
    }
  }
  dateTime.timeTick = 24;
  dateTime.hour = 8;
  dateTime.minute = 0;
  return dateTime;
}

export function buildingVisitTicks(rng=Math.random) {
  return 2 + Math.floor(rng()*3);
}
export const RESOURCE_KEYS = Object.freeze(["water","food","lumber","shot"]);
export const RESOURCE_NAMES = Object.freeze(["물","식량","자재","포탄"]);
// Browser-native transaction ceilings: the original ship instance fields
// are u16 source records. No unverified DOS supply-price parity is asserted.
const U16_MAX=65535;
const GOLD_LIMIT=600_000_000;
const u16=n=>Number.isSafeInteger(n)&&n>=0&&n<=U16_MAX;
function validSupplyShip(ship){
  return !!ship&&
    ['cargo','load','water','food','lumber','shot'].every(k=>u16(ship[k]))&&
    Array.isArray(ship.goods)&&ship.goods.length>=1&&ship.goods.length<=5&&
    ship.goods.every((g,i)=>g&&g.slot===i&&u16(g.quantity)&&u16(g.id)&&g.id<=255);
}
function validSupplySlot(slot){
  return !!slot&&Number.isSafeInteger(slot.money)&&
    slot.money>=0&&slot.money<=GOLD_LIMIT;
}
function validSupplyPriceSource(slot){
  const rates=slot?.portMeta?.rates;
  return Array.isArray(rates)&&rates.length>=10&&
    [rates[2],rates[9]].every(x=>u16(x)&&x<=255);
}
function sourceSupplyPrice(slot,resource){
  if(!RESOURCE_KEYS.includes(resource))return null;
  // The 30 source supply ports use common town map #100 and do not have
  // the 100 ordinary ports' price metadata. Keep original free water in
  // that already-supported native browser path; other prices remain HOLD.
  if(resource==='water'&&slot?.port===100&&slot?.portMeta==null)return 0;
  if(!validSupplyPriceSource(slot))return null;
  return harborSupplyPrices(slot)[resource];
}
function validSupplyFleet(slot){
  const ships=slot?.fleet?.ships;
  return validSupplySlot(slot)&&Array.isArray(ships)&&
    ships.length>=1&&ships.length<=10&&
    ships.every(ship=>validSupplyShip(ship)&&u16(ship.currentCrew)&&
      u16(ship.navigationPercent)&&ship.navigationPercent<=100);
}

export function harborSupplyPrices(slot) {
  if (!validSupplyPriceSource(slot)) {
    return { water: 0, food: null, lumber: null, shot: null, unresolved: true };
  }
  const rate2 = slot.portMeta.rates[2];
  const rate9 = slot.portMeta.rates[9];
  return {
    water: 0,
    food: Math.floor(20 * (rate2 + 50) / 100),
    lumber: Math.floor(90 * (rate9 + 50) / 100),
    shot: Math.floor(120 * (rate2 + 50) / 100),
    unresolved: false,
  };
}

export function shipCargoUsed(ship) {
  if (!validSupplyShip(ship)) return 0;
  const provisions =
    Math.floor((ship.water ?? 0) / 10) +
    Math.floor((ship.food ?? 0) / 10) +
    Math.max(0, ship.lumber ?? 0) +
    Math.max(0, ship.shot ?? 0);
  const goods = (ship.goods ?? []).reduce((n,g)=>n+Math.max(0,g.quantity ?? 0),0);
  return provisions + goods;
}

export function shipCargoFree(ship) {
  // The active ship's original u16 cargo limit is not the model capacity.
  // Invalid fields/overfull source records cannot mint new cargo space.
  if(!validSupplyShip(ship))return 0;
  return Math.max(0,ship.cargo-shipCargoUsed(ship));
}

function adjustSpeedLoad(ship, deltaCargo) {
  ship.load = Math.max(0, (ship.load ?? 0) + deltaCargo);
}

export function resourceUnitsAboard(ship, resource) {
  if (!validSupplyShip(ship)||!RESOURCE_KEYS.includes(resource)) return 0;
  if (resource === "water" || resource === "food") {
    return Math.floor((ship[resource] ?? 0) / 10);
  }
  return Math.max(0, ship[resource] ?? 0);
}

export function maxSupplyLoad(slot, ship, resource) {
  if(!validSupplySlot(slot)||!validSupplyShip(ship)||
     !RESOURCE_KEYS.includes(resource))return 0;
  const free=shipCargoFree(ship);
  const price=sourceSupplyPrice(slot,resource);
  if(free<=0||!Number.isSafeInteger(price)||price<0)return 0;
  // Ship resources and the velocity load are actual u16 source records.
  const remainingResource=resource==='water'||resource==='food'
    ?Math.floor((U16_MAX-ship[resource])/10)
    :U16_MAX-ship[resource];
  const max=Math.min(free,U16_MAX-ship.load,remainingResource);
  if(max<=0)return 0;
  return price===0?max:Math.min(max,Math.floor(slot.money/price));
}

export function loadSupply(slot, shipIndex, resource, requested) {
  const ship=slot?.fleet?.ships?.[shipIndex];
  if(!Number.isSafeInteger(shipIndex)||shipIndex<0||
     !Number.isSafeInteger(requested)||requested<=0||
     !validSupplySlot(slot)||!validSupplyShip(ship)||
     sourceSupplyPrice(slot,resource)===null)
    return {quantity:0,cost:0,reason:'invalid-supply-state'};
  const max=maxSupplyLoad(slot,ship,resource);
  const quantity=Math.min(max,requested);
  if(quantity<=0)return {quantity:0,cost:0,reason:'supply-limit'};
  const price=sourceSupplyPrice(slot,resource);
  const cost=price*quantity;
  // All limits and wallet affordability are checked before any mutation.
  if(!Number.isSafeInteger(cost)||cost<0||cost>slot.money)
    return {quantity:0,cost:0,reason:'supply-cost-invalid'};
  if(resource==='water'||resource==='food')ship[resource]+=quantity*10;
  else ship[resource]+=quantity;
  adjustSpeedLoad(ship,quantity);
  slot.money-=cost;
  return {quantity,cost,unitPrice:price};
}

export function unloadSupply(slot, shipIndex, resource, requested) {
  const ship=slot?.fleet?.ships?.[shipIndex];
  if(!Number.isSafeInteger(shipIndex)||shipIndex<0||
     !Number.isSafeInteger(requested)||requested<=0||
     !validSupplySlot(slot)||!validSupplyShip(ship)||
     !RESOURCE_KEYS.includes(resource))
    return {quantity:0,reason:'invalid-supply-state'};
  const quantity=Math.min(resourceUnitsAboard(ship,resource),requested);
  if(quantity<=0)return {quantity:0,reason:'no-supply'};
  if(resource==='water'||resource==='food')ship[resource]-=quantity*10;
  else ship[resource]-=quantity;
  adjustSpeedLoad(ship,-quantity);
  return {quantity};
}

export function harborDepartureStatus(slot) {
  const ships=slot?.fleet?.ships??[];
  if(!ships.length)return {allowed:false,messageId:59,days:0,reason:'no-ships'};
  if(!validSupplyFleet(slot))return {allowed:false,messageId:59,days:0,reason:'invalid-supply-state'};

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
  // Preflight the whole fleet: a malformed later ship must not leave an
  // already-mutated earlier ship's source-derived supplies or velocity load.
  if(!validSupplyFleet(slot))
    return {consumed:false,reason:'invalid-supply-state'};
  const ships=slot.fleet.ships;
  for (const ship of ships) {
    const crew = ship.currentCrew;
    const beforeWaterUnits = Math.floor((ship.water ?? 0) / 10);
    const beforeFoodUnits = Math.floor((ship.food ?? 0) / 10);
    ship.water = Math.max(0, (ship.water ?? 0) - crew);
    ship.food = Math.max(0, (ship.food ?? 0) - crew);
    const afterWaterUnits = Math.floor(ship.water / 10);
    const afterFoodUnits = Math.floor(ship.food / 10);
    const released = (beforeWaterUnits-afterWaterUnits)+(beforeFoodUnits-afterFoodUnits);
    adjustSpeedLoad(ship, -released);
  }
  return {consumed:true};
}

const MONTH_DAYS = Object.freeze([31,28,31,30,31,30,31,31,30,31,30,31]);
const clockInt=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function validNativeGameClock(t) {
  return !!t&&clockInt(t.year,1501,9999)&&
    clockInt(t.month,1,12)&&
    clockInt(t.day,1,MONTH_DAYS[t.month-1])&&
    clockInt(t.timeTick,0,71)&&
    t.hour===Math.floor(t.timeTick/3)&&
    t.minute===(t.timeTick%3)*20;
}
function nextNativeGameDay(t) {
  t.day++;
  if(t.day>MONTH_DAYS[t.month-1]){
    t.day=1;t.month++;
    if(t.month>12){t.month=1;t.year++;}
  }
  return t.year<=9999;
}

// The shipping browser advances time in 20-minute source-shaped ticks.
// Validate before processing and stage the entire transition: an invalid
// state, unbounded request or 9999-year overflow must not partially modify
// a live game clock (or cause an unbounded browser main-thread loop).
export function advanceDateTicks(dateTime,ticks) {
  if(!validNativeGameClock(dateTime)||
     !clockInt(ticks,0,72*366))return null;
  const next={...dateTime};
  for(let i=0;i<ticks;i++){
    next.timeTick=(next.timeTick+1)%72;
    if(next.timeTick===0&&!nextNativeGameDay(next))return null;
  }
  next.hour=Math.floor(next.timeTick/3);
  next.minute=(next.timeTick%3)*20;
  Object.assign(dateTime,next);
  return dateTime;
}

export function lodgeCheckIn(dateTime) {
  if(!validNativeGameClock(dateTime))return null;
  const next={...dateTime};
  if(!nextNativeGameDay(next))return null;
  next.timeTick=24;
  next.hour=8;
  next.minute=0;
  Object.assign(dateTime,next);
  return dateTime;
}

export function buildingVisitTicks(rng=Math.random) {
  return 2 + Math.floor(rng()*3);
}
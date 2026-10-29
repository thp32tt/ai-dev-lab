export const PUB_SPECIALTIES = Object.freeze([
  {name:"럼",price:3},{name:"와인",price:4},{name:"위스키",price:5},{name:"브랜디",price:6},
  {name:"진",price:3},{name:"맥주",price:3},{name:"보드카",price:2},{name:"테킬라",price:2},
  {name:"망고주스",price:1},{name:"야자술",price:1},{name:"민트차",price:3},
  {name:"페니",price:2},{name:"매실주",price:3},{name:"사케",price:2},
]);

export function pubSpecialty(slot) {
  const id=slot?.portMeta?.pubDrinkId ?? 0;
  return {id,...(PUB_SPECIALTIES[id] ?? PUB_SPECIALTIES[0])};
}

export function initialPubEnthusiasm(slot) {
  return Math.min(100,Math.floor((slot?.charm ?? 0)/3));
}

export function pubTreatMaximum(slot) {
  const spec=pubSpecialty(slot);
  return Math.min(50,Math.floor((slot?.money ?? 0)/Math.max(1,spec.price)));
}

export function pubTreat(slot, enthusiasm, bottles) {
  const spec=pubSpecialty(slot);
  const max=pubTreatMaximum(slot);
  const amount=Math.max(0,Math.min(max,Math.floor(bottles||0)));
  if(!amount) return {bottles:0,cost:0,enthusiasm,gain:0,specialty:spec};
  const economy=Math.max(1,slot?.portMeta?.economy ?? 0);
  const strength=Math.floor(amount*200/economy);
  const gain=Math.floor(strength*(slot?.charm ?? 0)/10);
  const next=Math.min(100,Math.max(0,enthusiasm)+gain);
  const cost=amount*spec.price;
  slot.money=Math.max(0,(slot.money??0)-cost);
  return {bottles:amount,cost,enthusiasm:next,gain,specialty:spec,strength};
}

export function fleetFreeBunks(slot) {
  return (slot?.fleet?.ships??[]).reduce(
    (n,s)=>n+Math.max(0,(s.maxCrew??0)-(s.currentCrew??0)),0
  );
}

export function pubRecruitOffer(slot, enthusiasm) {
  const economy=Math.max(0,slot?.portMeta?.economy ?? 0);
  const rank=Math.max(0,slot?.rank ?? 0);
  const e=Math.max(0,Math.min(100,Math.floor(enthusiasm??0)));
  const available=Math.min(Math.floor(e*economy/500),(rank+1)*e);
  const unitPrice=Math.floor(economy/20)+5;
  const freeBunks=fleetFreeBunks(slot);
  const byMoney=unitPrice>0?Math.floor((slot?.money??0)/unitPrice):freeBunks;
  const maximum=Math.max(0,Math.min(available,freeBunks,byMoney));
  return {economy,rank,enthusiasm:e,available,unitPrice,freeBunks,maximum};
}

export function hireCrew(slot, shipIndex, requested, enthusiasm) {
  const ship=slot?.fleet?.ships?.[shipIndex];
  if(!ship) return {quantity:0,cost:0,reason:"no-ship"};
  if((slot.dayFlags??0)&1) return {quantity:0,cost:0,reason:"used-today"};
  const offer=pubRecruitOffer(slot,enthusiasm);
  const shipFree=Math.max(0,(ship.maxCrew??0)-(ship.currentCrew??0));
  const quantity=Math.max(0,Math.min(
    Math.floor(requested||0),offer.maximum,shipFree
  ));
  if(!quantity) return {quantity:0,cost:0,reason:offer.maximum?"ship-full":"none-available",offer};
  const cost=quantity*offer.unitPrice;
  ship.currentCrew+=quantity;
  slot.money=Math.max(0,(slot.money??0)-cost);
  slot.dayFlags=(slot.dayFlags??0)|1;
  if(slot.fleet) slot.fleet.totalCrew=(slot.fleet.totalCrew??0)+quantity;
  return {quantity,cost,unitPrice:offer.unitPrice,offer};
}

export function dismissCrew(slot, shipIndex, requested) {
  const ship=slot?.fleet?.ships?.[shipIndex];
  if(!ship) return {quantity:0,reason:"no-ship"};
  const quantity=Math.max(0,Math.min(ship.currentCrew??0,Math.floor(requested||0)));
  if(!quantity)return {quantity:0,reason:"zero"};
  ship.currentCrew-=quantity;
  if(slot.fleet)slot.fleet.totalCrew=Math.max(0,(slot.fleet.totalCrew??0)-quantity);
  return {quantity};
}
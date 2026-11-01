export const PUB_SPECIALTIES = Object.freeze([
  {name:"럼",price:3},{name:"와인",price:4},{name:"위스키",price:5},{name:"브랜디",price:6},
  {name:"진",price:3},{name:"맥주",price:3},{name:"보드카",price:2},{name:"테킬라",price:2},
  {name:"망고주스",price:1},{name:"야자술",price:1},{name:"민트차",price:3},
  {name:"페니",price:2},{name:"매실주",price:3},{name:"사케",price:2},
]);

// Browser-native pub transactions share the Korean save's 600M-G cash
// ceiling, u8 personnel/flag fields and u16 ship crew counts. These are
// admission invariants, NOT claims of byte-exact original DOS pub logic.
const GOLD_LIMIT=600_000_000;
const between=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const u8=v=>between(v,0,255);
const u16=v=>between(v,0,65535);
const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj??{},key);
const validWallet=s=>!!s&&between(s.money,0,GOLD_LIMIT);
const validPubSource=s=>validWallet(s)&&!!s.portMeta&&
  u16(s.portMeta.economy)&&
  u8(s.portMeta.pubDrinkId)&&s.portMeta.pubDrinkId<PUB_SPECIALTIES.length;
const validCrewState=s=>{
  const fleet=s?.fleet,ships=fleet?.ships;
  if(!validWallet(s)||!Array.isArray(ships)||!between(ships.length,1,10))
    return false;
  let sum=0;
  for(const sh of ships){
    if(!sh||!u16(sh.maxCrew)||!u16(sh.currentCrew)||
       sh.currentCrew>sh.maxCrew)return false;
    sum+=sh.currentCrew;
  }
  return (!has(fleet,'count')||fleet.count===ships.length)&&
    (!has(fleet,'totalCrew')||fleet.totalCrew===sum);
};
const validRecruitState=s=>validPubSource(s)&&validCrewState(s)&&
  u8(s.dayFlags)&&u8(s.rank);
const validEnthusiasm=e=>between(e,0,100);

export function pubSpecialty(slot) {
  const id=slot?.portMeta?.pubDrinkId ?? 0;
  return {id,...(PUB_SPECIALTIES[id] ?? PUB_SPECIALTIES[0])};
}

export function initialPubEnthusiasm(slot) {
  return u8(slot?.charm)?Math.min(100,Math.floor(slot.charm/3)):0;
}

export function pubTreatMaximum(slot) {
  if(!validPubSource(slot)||!u8(slot.charm))return 0;
  return Math.min(50,Math.floor(slot.money/pubSpecialty(slot).price));
}

export function pubTreat(slot, enthusiasm, bottles) {
  const spec=pubSpecialty(slot);
  const safeEnthusiasm=validEnthusiasm(enthusiasm)?enthusiasm:0;
  if(!validPubSource(slot)||!u8(slot.charm)||
     !validEnthusiasm(enthusiasm)||!Number.isSafeInteger(bottles)||bottles<0)
    return {bottles:0,cost:0,enthusiasm:safeEnthusiasm,gain:0,specialty:spec,
      reason:'invalid-pub-state'};
  const amount=Math.min(pubTreatMaximum(slot),bottles);
  if(amount===0)
    return {bottles:0,cost:0,enthusiasm,gain:0,specialty:spec};
  const economy=Math.max(1,slot.portMeta.economy);
  const strength=Math.floor(amount*200/economy);
  const gain=Math.floor(strength*slot.charm/10);
  const next=Math.min(100,enthusiasm+gain);
  const cost=amount*spec.price;
  if(!Number.isSafeInteger(cost)||cost>slot.money)
    return {bottles:0,cost:0,enthusiasm,gain:0,specialty:spec,reason:'invalid-pub-state'};
  slot.money-=cost;
  return {bottles:amount,cost,enthusiasm:next,gain,specialty:spec,strength};
}

export function fleetFreeBunks(slot) {
  if(!validCrewState(slot))return 0;
  return slot.fleet.ships.reduce((n,s)=>n+(s.maxCrew-s.currentCrew),0);
}

export function pubRecruitOffer(slot, enthusiasm) {
  if(!validRecruitState(slot)||!validEnthusiasm(enthusiasm))
    return {economy:0,rank:0,enthusiasm:0,available:0,unitPrice:0,freeBunks:0,maximum:0};
  const economy=slot.portMeta.economy,rank=slot.rank,e=enthusiasm;
  const available=Math.min(Math.floor(e*economy/500),(rank+1)*e);
  const unitPrice=Math.floor(economy/20)+5;
  const freeBunks=fleetFreeBunks(slot);
  const byMoney=Math.floor(slot.money/unitPrice);
  const maximum=Math.max(0,Math.min(available,freeBunks,byMoney));
  return {economy,rank,enthusiasm:e,available,unitPrice,freeBunks,maximum};
}

export function hireCrew(slot, shipIndex, requested, enthusiasm) {
  if(!Number.isSafeInteger(shipIndex)||shipIndex<0||
     !slot?.fleet?.ships?.[shipIndex])
    return {quantity:0,cost:0,reason:"no-ship"};
  if(!validRecruitState(slot)||!validEnthusiasm(enthusiasm)||
     !Number.isSafeInteger(requested)||requested<=0)
    return {quantity:0,cost:0,reason:'invalid-pub-state'};
  if(slot.dayFlags&1)return {quantity:0,cost:0,reason:"used-today"};
  const offer=pubRecruitOffer(slot,enthusiasm);
  const ship=slot.fleet.ships[shipIndex];
  const quantity=Math.min(requested,offer.maximum,ship.maxCrew-ship.currentCrew);
  if(quantity<=0)
    return {quantity:0,cost:0,reason:offer.maximum?"ship-full":"none-available",offer};
  const cost=quantity*offer.unitPrice;
  if(!Number.isSafeInteger(cost)||cost>slot.money||!u16(ship.currentCrew+quantity))
    return {quantity:0,cost:0,reason:'invalid-pub-state',offer};
  // All source and account preconditions are verified before any mutation.
  ship.currentCrew+=quantity;
  slot.money-=cost;
  slot.dayFlags|=1;
  slot.fleet.totalCrew=slot.fleet.ships.reduce((n,s)=>n+s.currentCrew,0);
  return {quantity,cost,unitPrice:offer.unitPrice,offer};
}

export function dismissCrew(slot, shipIndex, requested) {
  if(!Number.isSafeInteger(shipIndex)||shipIndex<0||
     !slot?.fleet?.ships?.[shipIndex])return {quantity:0,reason:"no-ship"};
  if(!validCrewState(slot)||!Number.isSafeInteger(requested)||requested<=0)
    return {quantity:0,reason:'invalid-pub-state'};
  const ship=slot.fleet.ships[shipIndex];
  const quantity=Math.min(ship.currentCrew,requested);
  if(quantity===0)return {quantity:0,reason:"zero"};
  ship.currentCrew-=quantity;
  slot.fleet.totalCrew=slot.fleet.ships.reduce((n,s)=>n+s.currentCrew,0);
  return {quantity};
}

// Browser-native daily pub recruitment reset. Korean KOUKAI2.DAT's
// saveBase+0x0c is an 8-bit dayFlags field; hireCrew owns only bit 0.
// Preserve all other source flags rather than guessing their meanings.
// This is a native calendar lifecycle fix, NOT an original DOS trace claim.
export function rolloverPubDailyRecruitment(slot,beforeDate,afterDate){
  const dateIndex=d=>(
    d&&Number.isSafeInteger(d.year)&&d.year>=1501&&d.year<=9999&&
    Number.isSafeInteger(d.month)&&d.month>=1&&d.month<=12&&
    Number.isSafeInteger(d.day)&&d.day>=1&&d.day<=31
  ) ? d.year*372+(d.month-1)*31+(d.day-1) : null;
  const before=dateIndex(beforeDate),after=dateIndex(afterDate);
  if(before===null||after===null||after<=before||
     !Number.isSafeInteger(slot?.dayFlags)||slot.dayFlags<0||slot.dayFlags>255||
     (slot.dayFlags&1)===0) return false;
  slot.dayFlags &= ~1;
  return true;
}

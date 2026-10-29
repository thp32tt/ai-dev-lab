import { decodeLS11 } from "./ls11.js";
import { shipCargoFree } from "./buildings.js";

export const GOODS_NAMES = Object.freeze([
  "정향","계피","후추","육두구","피망","생강",
  "담배","차","커피","카카오",
  "설탕","유제품","어육","곡류","올리브유","와인","돌소금",
  "생사","무명","양모","마",
  "면직물","견직물","모직물","벨벳","삼베",
  "산호","호박","상아","진주","구갑",
  "금","은",
  "동","주석","철광석",
  "미술품","융단","사향","향수",
  "유리구슬","염료","도자기","유리그릇","무기","목재",
]);

export const GOODS_CATEGORY_NAMES = Object.freeze([
  "향신료","기호품","식품","섬유","직물","보석","귀금속","광석","사치품","기타",
]);

const CATEGORY_LIMITS = Object.freeze([6,10,17,21,26,31,33,36,40,46]);
const MARKET_TABLE = 0x6bc0; // user Korean DATA1.LZW part 15, artifact-derived
const MARKET_COUNT = 13;

function u16le(bytes,off){ return bytes[off] | (bytes[off+1]<<8); }

export function goodsCategory(goodId) {
  return CATEGORY_LIMITS.findIndex(limit => goodId < limit);
}

export function ordinaryGoodsPrice(base,rate) {
  return Math.floor((base * (rate + 50)) / 100);
}

export function decodeMarketAssets(data1Buffer) {
  const archive=decodeLS11(data1Buffer);
  const raw=archive.decoded[15]?.data;
  if (!raw) throw new Error("DATA1.LZW part 15 missing");
  if (MARKET_TABLE + MARKET_COUNT*0x80 > raw.length) {
    throw new Error("DATA1 market table outside part 15");
  }
  const markets=[];
  for(let id=0;id<MARKET_COUNT;id++){
    const at=MARKET_TABLE+id*0x80;
    const salePrices=Array.from({length:46},(_,g)=>u16le(raw,at+g*2));
    const listed=[];
    for(let slot=0;slot<9;slot++){
      const good=raw[at+0x6e+slot];
      if(good===0xff) continue;
      if(good>=GOODS_NAMES.length) throw new Error(`market ${id} invalid good ${good}`);
      listed.push({
        slot,
        good,
        name:GOODS_NAMES[good],
        basePrice:u16le(raw,at+0x5c+slot*2),
        minimumEconomy:raw[at+0x77+slot]*10,
      });
    }
    markets.push({id,salePrices,listed});
  }
  return {markets,tableOffset:MARKET_TABLE,chunkSize:raw.length};
}

export function currentPortMarket(slot,marketAssets,{taxFree=false}={}) {
  const meta=slot?.portMeta;
  if(!meta || !marketAssets?.markets) return null;
  const market=marketAssets.markets[meta.marketId];
  if(!market) return null;

  const buy=[];
  for(const listed of market.listed){
    if(listed.minimumEconomy>meta.economy) continue;
    const category=goodsCategory(listed.good);
    const rate=meta.rates[category] ?? 50;
    const ordinary=ordinaryGoodsPrice(listed.basePrice,rate);
    buy.push({
      ...listed,category,rate,
      price:taxFree?ordinary:Math.floor(ordinary*12/10),
      taxFreePrice:ordinary,
      specialty:false,
    });
  }

  const sg=meta.specialtyGoodsId;
  if(
    sg>=0 && sg<GOODS_NAMES.length &&
    meta.specialtyEconomyThreshold*10<=meta.economy
  ){
    const category=goodsCategory(sg);
    const rate=meta.rates[category] ?? 50;
    if(rate<90 && !buy.some(x=>x.good===sg)){
      const ordinary=ordinaryGoodsPrice(meta.specialtyBasePrice,rate);
      buy.push({
        slot:-1,good:sg,name:GOODS_NAMES[sg],
        basePrice:meta.specialtyBasePrice,
        minimumEconomy:meta.specialtyEconomyThreshold*10,
        category,rate,
        price:taxFree?ordinary:Math.floor(ordinary*12/10),
        taxFreePrice:ordinary,
        specialty:true,
      });
    }
  }

  const sell=Array.from({length:46},(_,good)=>{
    const category=goodsCategory(good);
    const rate=meta.rates[category] ?? 50;
    const specialty=meta.specialtyGoodsId===good;
    const base=specialty?meta.specialtyBasePrice:market.salePrices[good];
    const price=specialty
      ? Math.floor(ordinaryGoodsPrice(base,rate)/2)
      : ordinaryGoodsPrice(base,rate);
    return {good,name:GOODS_NAMES[good],category,rate,basePrice:base,price,specialty};
  });
  return {marketId:market.id,economy:meta.economy,buy,sell,rates:[...meta.rates],taxFree};
}

function matchingGoodsSlot(ship,goodId){
  return (ship?.goods??[]).find(g=>g.id===goodId) ?? null;
}
function emptyGoodsSlot(ship){
  return (ship?.goods??[]).find(g=>g.id===0xff || (g.quantity??0)===0) ?? null;
}

function adjustRates(slot,category,total,sign){
  const meta=slot?.portMeta;
  if(!meta || total<=0) return;
  const categoryDelta=Math.min(10,Math.floor(total/Math.max(1,meta.economy+500)));
  const allDelta=Math.min(3,Math.floor(total/1000));
  for(let i=0;i<meta.rates.length;i++){
    let delta=allDelta+(i===category?categoryDelta:0);
    meta.rates[i]=Math.max(0,Math.min(100,meta.rates[i]+sign*delta));
  }
}

export function buyGoods(slot,marketAssets,shipIndex,goodId,requested,{taxFree=false}={}) {
  const ship=slot?.fleet?.ships?.[shipIndex];
  const pm=currentPortMarket(slot,marketAssets,{taxFree});
  const item=pm?.buy.find(x=>x.good===goodId);
  if(!ship || !item) return {quantity:0,cost:0,reason:"unavailable"};

  let cargoSlot=matchingGoodsSlot(ship,goodId);
  if(!cargoSlot) cargoSlot=emptyGoodsSlot(ship);
  if(!cargoSlot) return {quantity:0,cost:0,reason:"no-goods-slot"};

  const free=shipCargoFree(ship);
  const byMoney=item.price>0?Math.floor((slot.money??0)/item.price):free;
  const quantity=Math.max(0,Math.min(free,byMoney,Math.floor(requested||0)));
  if(!quantity) return {quantity:0,cost:0,reason:"no-capacity-or-money"};

  if(cargoSlot.id!==goodId){ cargoSlot.id=goodId; cargoSlot.quantity=0; }
  cargoSlot.quantity+=quantity;
  ship.load=(ship.load??0)+quantity;
  const cost=item.price*quantity;
  slot.money=Math.max(0,(slot.money??0)-cost);
  adjustRates(slot,item.category,cost,+1);
  return {quantity,cost,unitPrice:item.price,good:goodId,name:item.name,slot:cargoSlot.slot};
}

export function sellGoods(slot,marketAssets,shipIndex,goodsSlotIndex,requested) {
  const ship=slot?.fleet?.ships?.[shipIndex];
  const cargo=ship?.goods?.[goodsSlotIndex];
  if(!ship || !cargo || cargo.id===0xff || !cargo.quantity) {
    return {quantity:0,revenue:0,reason:"empty"};
  }
  const pm=currentPortMarket(slot,marketAssets);
  const item=pm?.sell[cargo.id];
  if(!item) return {quantity:0,revenue:0,reason:"unavailable"};
  const quantity=Math.max(0,Math.min(cargo.quantity,Math.floor(requested||0)));
  if(!quantity) return {quantity:0,revenue:0,reason:"zero"};

  cargo.quantity-=quantity;
  ship.load=Math.max(0,(ship.load??0)-quantity);
  const revenue=item.price*quantity;
  slot.money=(slot.money??0)+revenue;
  if(cargo.quantity===0) cargo.id=0xff;
  adjustRates(slot,item.category,revenue,-1);
  return {quantity,revenue,unitPrice:item.price,good:item.good,name:item.name,slot:goodsSlotIndex};
}

export function carriedGoodsRows(slot,marketAssets) {
  const pm=currentPortMarket(slot,marketAssets);
  const rows=[];
  for(const ship of slot?.fleet?.ships??[]){
    for(const g of ship.goods??[]){
      if(g.id===0xff || !g.quantity) continue;
      const sell=pm?.sell[g.id];
      rows.push({
        shipIndex:ship.index,
        shipName:ship.name,
        goodsSlot:g.slot,
        good:g.id,
        name:GOODS_NAMES[g.id]??`#${g.id}`,
        quantity:g.quantity,
        sellPrice:sell?.price??0,
      });
    }
  }
  return rows;
}
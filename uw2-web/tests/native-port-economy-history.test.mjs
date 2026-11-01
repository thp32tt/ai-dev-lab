import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNativePortArrival} from '../web/native-port-arrival.js';
import {buyGoods,currentPortMarket} from '../web/market.js';
import {prepareNativePortEconomyContinuity,validNativePortEconomyHistory}
 from '../web/native-port-economy-history.js';
const clock={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const meta=(marketId,rate=50)=>({
 offset:12345,economy:1000,marketInvestment:0,industry:500,
 shipyardInvestment:0,support:Array(6).fill(5),rates:Array(10).fill(rate),
 specialtyBasePrice:0,specialtyGoodsId:255,
 specialtyEconomyThreshold:0,regionId:0,
 regularItems:[0,1,2],secretItem:255,marketId,industryId:0,pubDrinkId:0
});
const port=(id,economy)=>({id,mapId:id<100?id:100,
 name:'source'+id,nation:0,x:id+100,y:200,meta:economy});
const A=port(39,meta(0));
const B=port(40,meta(0,70));
const SUPPLY=port(100,null);
const door=Array.from({length:101},()=>[
 null,null,null,{id:3,present:true,x:22,y:51}]);
const assets={maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(100),
 walkBounds:Array.from({length:4},()=>[0,100,200,250])};
const arrival=(previous,target)=>buildNativePortArrival({
 previous,port:target,portDoors:door,portAssets:assets,
 seaState:{dateTime:clock}
});
const ship={index:0,name:'source ship',cargo:100,load:0,
 water:0,food:0,lumber:0,shot:0,
 goods:[{slot:0,id:255,quantity:0}]};
const current={port:39,portName:'source39',
 portWorld:{x:139,y:200,nation:0},money:5000,
 portMeta:structuredClone(A.meta),townActors:[],
 fleet:{ships:[ship]}};
const market={markets:[{id:0,
 listed:[{slot:0,good:0,name:'정향',basePrice:100,minimumEconomy:0}],
 salePrices:Array(46).fill(100)}]};
const purchase=buyGoods(current,market,0,0,20);
assert.equal(purchase.quantity,20);
assert.equal(purchase.cost,2400);
assert.equal(current.money,2600);
assert.ok(current.portMeta.rates[0]>50,
 'source-shape market rates must change when the player trades');
const changed=current.portMeta.rates[0];
const b=arrival(current,B);
assert.ok(b);
assert.equal(b.portMeta.rates[0],70);
assert.equal(b.portEconomyHistory['39'].meta.rates[0],changed);
assert.equal(b.arrivalEvidence.economyStatus,'ORIGINAL_SOURCE_PORT_ECONOMY');
assert.deepEqual(current.portEconomyHistory,undefined);
const home=arrival(b,A);
assert.equal(home.portMeta.rates[0],changed);
assert.equal(home.arrivalEvidence.economyStatus,
 'NATIVE_PORT_TRADE_ECONOMY_RESTORED');
assert.equal(currentPortMarket(home,market).rates[0],changed);
assert.equal(currentPortMarket(b,market).rates[0],70);
home.portMeta.rates[0]=90;
assert.equal(b.portEconomyHistory['39'].meta.rates[0],changed);
const back=arrival(home,B);
assert.equal(back.portEconomyHistory['39'].meta.rates[0],90);
assert.equal(back.portEconomyHistory['40'].meta.rates[0],70);
assert.equal(back.portMeta.rates[0],70);
const s=arrival(back,SUPPLY);
assert.equal(s.portMeta,null);
assert.equal(s.arrivalEvidence.economyStatus,
 'SUPPLY_PORT_ECONOMY_UNAVAILABLE');
assert.equal(s.portEconomyHistory['39'].meta.rates[0],90);
assert.equal(s.portEconomyHistory['40'].meta.rates[0],70);
const backFromSupply=arrival(s,A);
assert.equal(backFromSupply.portMeta.rates[0],90);
assert.equal(backFromSupply.portEconomyHistory['100'],undefined);
const bad={...current,portEconomyHistory:{
 '39':{source:'SOURCE_KOUKAI2_PORT_ECONOMY_IN_NATIVE_BROWSER',
 meta:{...meta(0),rates:[Infinity]}}}};
const before=structuredClone(bad);
assert.equal(validNativePortEconomyHistory(bad.portEconomyHistory),false);
assert.throws(()=>arrival(bad,B),/economy history invalid/);
assert.deepEqual(bad,before);
assert.equal(validNativePortEconomyHistory(undefined),true);
assert.equal(validNativePortEconomyHistory({}),true);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../web/native-port-arrival.js',import.meta.url),'utf8');
assert.ok(app.includes('const prepared=prepareNativePortCall({'));
assert.ok(source.includes('prepareNativePortEconomyContinuity(previous,port)'));
assert.ok(source.includes('portMeta:economy.portMeta'));
console.log('UW2 native source port economy/trade rates A-B-A survive voyage and browser checkpoint: PASS');

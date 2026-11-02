import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalTownHudEntries,GOLD_COINS_PER_BAR} from '../web/native-town-hud.js';
const get=(s,name)=>originalTownHudEntries(s).find(row=>row.name===name)?.text;
assert.equal(GOLD_COINS_PER_BAR,10000);
const source={
 money:599805192,tradeFame:0,pirateFame:0,adventureFame:50,
 dateTime:{year:1522,month:7,day:6},
 portMeta:{economy:750,marketInvestment:0,industry:760,
  shipyardInvestment:0,rates:[53,53,53,53,54,54,46,50,48,49]}
};
assert.equal(get(source,'gold-coins'),'5192');
assert.equal(get(source,'gold-bars'),'59980');
assert.equal(get(source,'fame-maximum'),'50');
assert.equal(get(source,'trade-fame'),'교역명성 0');
assert.equal(get(source,'adventure-fame'),'모험명성 50');
assert.equal(get(source,'ad-date'),'1522.07.06');
assert.equal(get(source,'commerce-value'),'750');
assert.equal(get(source,'industry-value'),'760');
assert.equal(get(source,'average-market-rate'),'51');
// The HUD is LIVE: browser transactions mutate slot.money, so next render
// must use the new value; source KOUKAI2.DAT itself remains read-only.
const after={...source,money:599805192-10100,tradeFame:73};
assert.equal(get(after,'gold-coins'),'5092');
assert.equal(get(after,'gold-bars'),'59979');
assert.equal(get(after,'fame-maximum'),'73');
assert.equal(get(source,'gold-coins'),'5192');
assert.equal(get({...source,money:0},'gold-coins'),'0');
assert.equal(get({...source,money:9999},'gold-bars'),'0');
assert.equal(get({...source,money:10000},'gold-coins'),'0');
assert.equal(get({...source,money:10000},'gold-bars'),'1');
assert.equal(get({...source,money:4294967295},'gold-bars'),'429496');
for(const invalid of [null,undefined,-1,Infinity,NaN,'1000',1.5]){
 const rows=originalTownHudEntries({...source,money:invalid});
 assert.ok(rows.every(e=>!e.name.startsWith('gold-')),'invalid money '+invalid);
}
assert.equal(get({...source,tradeFame:null,pirateFame:null,adventureFame:null},
 'fame-maximum'),undefined);
assert.equal(get({...source,portMeta:null},'commerce-value'),undefined);
assert.equal(get({...source,portMeta:{...source.portMeta,rates:[10,20]}},
 'average-market-rate'),undefined);
assert.deepEqual(originalTownHudEntries(null),[]);
for(const e of originalTownHudEntries({...source,money:4294967295,
 tradeFame:65535,pirateFame:65535,adventureFame:65535,
 portMeta:{...source.portMeta,economy:65535,marketInvestment:65535,
 industry:65535,shipyardInvestment:65535}})){
 assert.ok(Object.isFrozen(e));
 assert.ok(e.x>=0&&e.y>=0&&e.y+16*e.scale<=399,e.name);
 const px=Array.from(e.text).reduce((n,ch)=>n+
 (ch.codePointAt(0)<128?8:16),0)*e.scale;
 const limit=e.x<100?92:612;
 assert.ok(e.x+px<=limit,e.name+' '+e.text+' '+(e.x+px));
}
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/import \{ originalTownHudEntries \} from "\.\/native-town-hud\.js"/);
const town=app.slice(app.indexOf('function renderTownScreen() {'),
 app.indexOf('\nfunction moveTown('));
assert.match(town,/drawOriginalSceneFrame\("town"\);[\s\S]*?originalTownHudEntries\(selected\)/);
assert.match(town,/drawOriginalPanelText\(line\.text,line\.x,line\.y\+14,\{scale:line\.scale\}\)/);
assert.match(app,/scale: opts\.scale \?\? 1/);
console.log('UW2 original Korean GRAPH #5 town HUD live date, fame, gold coins/bars, town economy values PASS');

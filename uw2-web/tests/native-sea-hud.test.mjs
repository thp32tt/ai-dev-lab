import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SeaRuntime} from '../web/world-map.js';
import {nativeSeaDayCount} from '../web/native-sea-hud.js';

// Original Korean GRAPH #4 calls this field 일수 ("days"), not travelled
// map-chip count. A complete browser sea day has 72 x 20-minute ticks,
// with the first day crossing at midnight after the departure clock.
const date=(day,tick)=>({
 year:1522,month:7,day,timeTick:tick,
 hour:Math.floor(tick/3),minute:(tick%3)*20
});
const world={cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)};
const sea=new SeaRuntime(world,{x:100,y:100},null,7,null,date(6,49));
const first=sea.snapshot();
assert.equal(first.steps,0);
assert.equal(nativeSeaDayCount(first),0);
assert.equal(nativeSeaDayCount({...first,ticks:0,dateTime:date(6,71)}),0);
assert.equal(nativeSeaDayCount({...first,ticks:1,dateTime:date(7,0)}),1);
assert.equal(nativeSeaDayCount({...first,ticks:22,dateTime:date(6,71)}),0);
assert.equal(nativeSeaDayCount({...first,ticks:23,dateTime:date(7,0)}),1);
assert.equal(nativeSeaDayCount({...first,ticks:72,dateTime:date(7,49)}),1);
assert.equal(nativeSeaDayCount({...first,ticks:95,dateTime:date(8,0)}),2);

// Real SeaRuntime ticks with NO map motion still count days when the
// time passes; this is impossible to derive from the old st.steps value.
for(let i=0;i<23;i++)assert.equal(sea.tick(),false);
assert.equal(sea.ticks,23);
assert.equal(sea.steps,0);
assert.equal(sea.dateTime.day,7);
assert.equal(sea.dateTime.timeTick,0);
const one=sea.snapshot();
assert.equal(nativeSeaDayCount(one),1);
assert.equal(nativeSeaDayCount({...one,steps:123456}),1);
for(let i=0;i<72;i++)sea.tick();
assert.equal(sea.steps,0);
assert.equal(sea.dateTime.day,8);
assert.equal(nativeSeaDayCount(sea.snapshot()),2);

// Source absence and malformed timing must not paint invented data.
for(const invalid of [null,{}, {ticks:-1,dateTime:date(7,1)},
 {ticks:1,dateTime:{...date(7,0),hour:2}},
 {ticks:Infinity,dateTime:date(7,0)},
 {ticks:1.5,dateTime:date(7,0)},
 {ticks:1_000_000_001,dateTime:date(7,0)},
 {ticks:1,dateTime:{...date(7,0),minute:20}}])
 assert.equal(nativeSeaDayCount(invalid),null);
assert.equal(nativeSeaDayCount(first),0); // read-only source

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/import \{ nativeSeaDayCount \} from "\.\/native-sea-hud\.js"/);
const seaRenderer=app.slice(app.indexOf('function renderSeaScreen() {'),
 app.indexOf('$(\"opening-button\").addEventListener'));
assert.ok(seaRenderer.includes('const seaDays=nativeSeaDayCount(st);'));
assert.match(seaRenderer,/if\(seaDays!==null\)drawOriginalPanelText/);
assert.match(seaRenderer,/paintNativeSeaDateHeader\(ctx,fontAssets,st\.dateTime\)/);
assert.doesNotMatch(seaRenderer,/drawOriginalDatePanel/);
assert.doesNotMatch(seaRenderer,/drawOriginalPanelText\(\x60\$\{st\.steps\}/);
assert.doesNotMatch(seaRenderer,/drawOriginalDatePanel\(st\.dateTime,\s*"항해"\)/);
assert.doesNotMatch(seaRenderer,/drawOriginalPanelText\(seaAutoActive\s*\?/);
assert.doesNotMatch(seaRenderer,/drawOriginalPanelText\(nearbyPort\.name/);
assert.match(seaRenderer,/AUTO \$\{seaAutoActive \? "ON" : "OFF"\}/);
console.log('UW2 GRAPH #4 original sea HUD shows midnight-crossed voyage days and preserves compass pixels: PASS');

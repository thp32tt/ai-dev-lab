import assert from 'node:assert/strict';
import fs from 'node:fs';

// Shipping event-handler execution; no virtual DOS, fabricated voyage or
// copyrighted original assets. PAUSE must never invoke AUTO when idle.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const controller=fs.readFileSync(new URL('../web/web-controller.js',import.meta.url),'utf8');
function blockAt(src,anchor){
 const start=src.indexOf(anchor);
 assert.ok(start>=0,'missing shipping anchor '+anchor);
 const brace=src.indexOf('{',start);
 let depth=0;
 for(let i=brace;i<src.length;i++){
   if(src[i]==='{')depth++;
   if(src[i]==='}'&&!--depth)return src.slice(start,i+1);
 }
 assert.fail('unclosed event handler '+anchor);
}
const pause=blockAt(app,'if (action === "pause") {');
assert.doesNotMatch(pause,/toggleSeaAuto\(/);
const events=[];
const run=new Function('action','viewMode','seaAutoActive','stopSeaAuto',
 'renderSeaScreen','$',pause);
const stopSeaAuto=reason=>events.push(['stop',reason]);
const renderSeaScreen=()=>events.push(['render']);
const $=id=>({click:()=>events.push(['dom',id])});
run('pause','sea',false,stopSeaAuto,renderSeaScreen,$);
assert.deepEqual(events,[],'idle sea PAUSE must not launch AUTO or tick game');
run('pause','sea',true,stopSeaAuto,renderSeaScreen,$);
assert.deepEqual(events,[['stop','auto-paused'],['render']]);
events.length=0;
run('pause','town',false,stopSeaAuto,renderSeaScreen,$);
assert.deepEqual(events,[['dom','pause-button']]);
assert.match(controller,/pauseButton\.disabled\s*=\s*state\.mode===['"]sea['"]&&!?state\.autoSail/);

const pointer=app.slice(app.indexOf('else if(viewMode==="sea"&&seaRuntime){'),
 app.indexOf('else if(viewMode==="town"&&townRuntime){'));
assert.ok(pointer.length>100);
const pStop=pointer.indexOf('if(seaAutoActive)stopSeaAuto("auto-manual")');
const pTurn=pointer.indexOf('seaRuntime.turn(command.delta)');
const pTick=pointer.indexOf('tickSeaWithBankInterest()');
assert.ok(pStop>=0&&pStop<pTurn&&pStop<pTick,
 'Canvas manual command must suspend AUTO before one turn/tick');
assert.match(pointer,/const st=seaRuntime\.snapshot\(\),nearbyPort=findReadyNativePortCall\(st\)/);
assert.match(pointer,/nativeSeaPointerCommand\(point,st\)/);
assert.match(pointer,/command\.kind==="turn"/);
assert.match(pointer,/command\.kind==="forward"/);

const seaKey=app.slice(app.indexOf('if (viewMode === "sea" && seaRuntime) {',app.indexOf('window.addEventListener("keydown"')),
 app.indexOf('if (viewMode !== "town" || !townRuntime)'));
const kStop=seaKey.indexOf('if(manualSeaKey&&seaAutoActive)stopSeaAuto("auto-manual")');
const kTurn=seaKey.indexOf('seaRuntime.turn(-1)');
const kTick=seaKey.indexOf('tickSeaWithBankInterest()');
assert.ok(kStop>=0&&kStop<kTurn&&kStop<kTick);
assert.match(seaKey,/\["arrowleft","a","4","arrowright","d","6",\s*"arrowup","w","8"," "\]\.includes\(key\)/);
assert.match(seaKey,/if \(key === "g"\) \{[\s\S]*?toggleSeaAuto\(\)/,
 'G or AUTO remains an explicit start/stop toggle');
assert.ok(app.includes('clearInterval(seaAutoTimer)'),'AUTO timer must clear synchronously');
console.log('UW2 native sea PAUSE stop-only + exclusive manual keyboard/Canvas helm PASS');

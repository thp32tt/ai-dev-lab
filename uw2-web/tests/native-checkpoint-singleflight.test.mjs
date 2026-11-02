import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const ctrl=fs.readFileSync(new URL('../web/web-controller.js',import.meta.url),'utf8');
const start=app.indexOf('if(action==="checkpoint-save"||action==="checkpoint-load")');
const end=app.indexOf('if (action === "auto-sail")',start);
assert.ok(start>=0&&end>start);
const handler=app.slice(start,end);
assert.ok(handler.includes('if(checkpointInFlight)return;'));
assert.ok(handler.indexOf('checkpointInFlight=true;')<handler.indexOf('await saveNativeTownCheckpoint('));
assert.ok(handler.indexOf('checkpointInFlight=true;')<handler.indexOf('await saveNativeSeaCheckpoint('));
assert.ok(handler.indexOf('checkpointInFlight=true;')<handler.indexOf('await loadNativeCheckpointWithRecovery('));
assert.ok(handler.indexOf('checkpointInFlight=true;')<handler.indexOf('await loadNativeCheckpointWithRecovery('));
assert.ok(handler.includes('}finally{\n      checkpointInFlight=false;'));
assert.ok(app.includes('    checkpointInFlight,\n    checkpointSlots:'));
assert.ok(app.includes('    autoSail: seaAutoActive,'));
assert.ok(ctrl.includes('checkpointSaveButton.disabled=!!state.checkpointInFlight'));
assert.ok(ctrl.includes('checkpointLoadButton.disabled=!!state.checkpointInFlight'));
// A WebCrypto Save is asynchronous. The session must STOP sailing before
// the first await and all 220ms AUTO / keyboard / Canvas paths must be
// excluded until the checksum and storage transaction is committed.
const freeze=handler.indexOf('checkpointInFlight=true;');
const stop=handler.indexOf('if(viewMode==="sea"&&seaAutoActive)stopSeaAuto();');
const firstAwait=Math.min(...[
 handler.indexOf('await saveNativeTownCheckpoint('),
 handler.indexOf('await saveNativeSeaCheckpoint('),
 handler.indexOf('await loadNativeCheckpointWithRecovery('),
 handler.indexOf('await loadNativeCheckpointWithRecovery(')
].filter(i=>i>=0));
assert.ok(freeze>=0 && stop>freeze && firstAwait>stop,
 'Stop AUTO synchronously before any WebCrypto Save/Load await');
const autoSection=app.slice(app.indexOf('function toggleSeaAuto() {'),
 app.indexOf('function graphImageCanvas(',app.indexOf('function toggleSeaAuto() {')));
assert.ok(autoSection.indexOf('if(checkpointInFlight)return false;')>
 autoSection.indexOf('function toggleSeaAuto()'));
assert.ok(autoSection.indexOf('if(checkpointInFlight){')<
 autoSection.indexOf('const advance=advanceNativeSeaAuto('));
assert.match(autoSection,/if\(checkpointInFlight\)\{\s*stopSeaAuto\(\);\s*return;/);
const keyHandler=app.slice(app.indexOf('window.addEventListener("keydown", (event) => {'),
 app.indexOf('window.addEventListener("uw2-controller-action", async event => {'));
assert.ok(keyHandler.indexOf('if(checkpointInFlight){')>=0);
assert.ok(keyHandler.indexOf('if(checkpointInFlight){')<
 keyHandler.indexOf('handleSystemKey(event)'));
assert.ok(keyHandler.indexOf('if(checkpointInFlight){')<
 keyHandler.indexOf('callNearbyPort();'));
const tickSource=app.slice(app.indexOf('function tickSeaWithBankInterest() {'),
 app.indexOf('async function loadBuffer('));
assert.match(tickSource,/if\(checkpointInFlight\)[\s\S]*?return \{advanced:false,reason:"browser-checkpoint-in-flight"\}/);
let unsafeCalls=0;
const tick=new Function('checkpointInFlight','selected','seaRuntime',
 'advanceNativeSeaVoyageStep',tickSource+'return tickSeaWithBankInterest();');
const blocked=tick(true,{fleet:{}},{ticks:19},()=>{
 unsafeCalls++;throw Error('voyage must never be processed during Save');
});
assert.deepEqual(blocked,
 {advanced:false,reason:'browser-checkpoint-in-flight'});
assert.equal(unsafeCalls,0);
assert.ok(app.includes('if(checkpointInFlight)return;'),
 'Canvas input and controller Save/Load remain disabled while pending');
console.log('UW2 async SHA browser checkpoint Save/Load double-action race guarded: PASS');
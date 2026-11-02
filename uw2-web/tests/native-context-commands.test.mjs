import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeContextCommandsFor,nativeContextLabelFor} from '../web/native-context-commands.js';
// The new browser touch panel only emits existing, audited native keys.
const expected=['supply','market-buy','market-sell','pub-recruit',
 'pub-dismiss','pub-treat','bank-deposit','bank-withdraw',
 'bank-borrow','bank-repay','item-buy','item-sell'];
for(const mode of expected){
 const commands=nativeContextCommandsFor(mode);
 assert.ok(Object.isFrozen(commands),mode);
 assert.ok(nativeContextLabelFor(mode).length>0);
 assert.ok(commands.some(c=>c.key==='Escape'));
 for(const c of commands){
  assert.ok(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
    'Escape','Enter','m','l','u'].includes(c.key),mode+':'+c.key);
  assert.equal(typeof c.shiftKey,'boolean');
  assert.ok(Object.isFrozen(c));
 }
}
for(const mode of [null,'sail-confirm','item-buy-confirm','sea','menu',
 'system-menu','__proto__','constructor',0,{}]){
 assert.equal(nativeContextCommandsFor(mode),null);
 assert.equal(nativeContextLabelFor(mode),'');
}
for(const mode of ['supply','market-buy','market-sell','pub-recruit','pub-dismiss']){
 const cmds=nativeContextCommandsFor(mode);
 assert.ok(cmds.some(c=>c.key==='Enter'&&!c.shiftKey&&c.label.includes('1개')));
 assert.ok(cmds.some(c=>c.key==='Enter'&&c.shiftKey&&c.label.includes('10개')));
 assert.ok(cmds.some(c=>c.key==='m'));
}
for(const mode of ['bank-deposit','bank-withdraw','bank-borrow','bank-repay']){
 const cmds=nativeContextCommandsFor(mode);
 assert.ok(cmds.some(c=>c.key==='ArrowLeft'&&c.shiftKey));
 assert.ok(cmds.some(c=>c.key==='ArrowRight'&&c.shiftKey));
 assert.ok(cmds.some(c=>c.key==='Enter'&&!c.shiftKey));
}
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const controller=fs.readFileSync(new URL('../web/web-controller.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../web/style.css',import.meta.url),'utf8');
assert.match(app,/nativeActionMode:viewMode==="town"&&townRuntime\?\.insideBuilding/);
assert.match(controller,/renderNativeContext\(state\.mode==="town"\?state\.nativeActionMode:null\)/);
assert.match(controller,/for\(const button of nativeContextButtons\.querySelectorAll\("button"\)\)\s*clearPress\(button\)/);
assert.match(controller,/const options=\{shiftKey:button\.dataset\.shiftKey==="true"\}/);
assert.match(controller,/emitKey\(key,options\)/);
assert.match(controller,/setInterval\(\(\) => emitKey\(key,options\), 105\)/);
assert.match(controller,/button\.disabled\|\|button\.closest\('\[hidden\]'\)/);
assert.match(html,/id="native-context-actions"[^>]*hidden/);
assert.match(css,/\.context-actions\[hidden\]\{display:none\}/);
assert.doesNotMatch(controller,/selected\.money\s*[+\-]=/);
console.log('UW2 browser native town trading contextual buttons: source transactions, x10/large-step modifier and fail-closed UI PASS');

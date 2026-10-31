import assert from 'node:assert/strict';
import {createBiosKeyboardQueue} from '../web/bios-keyboard-queue.js';
import {translateBrowserBiosKey,attachBrowserBiosKeyboard} from '../web/browser-bios-keyboard.js';
const event=(code,key,patch={})=>({type:'keydown',isTrusted:true,code,key,
  cancelable:true,preventDefault(){this.prevented=true;},...patch});
for(const [code,key,ascii,scanCode] of [
  ['KeyA','a',97,0x1e],['KeyA','A',65,0x1e],['Digit0','0',48,0x0b],
  ['Digit1','!',33,0x02],['Space',' ',32,0x39],
  ['ArrowUp','ArrowUp',0,0x48],['ArrowRight','ArrowRight',0,0x4d],
  ['Enter','Enter',13,0x1c],['Escape','Escape',27,0x01],
  ['Backspace','Backspace',8,0x0e],['Tab','Tab',9,0x0f],
  ['F1','F1',0,0x3b],['F10','F10',0,0x44],
  ['Slash','?',63,0x35],['BracketRight','}',125,0x1b]
]) assert.deepEqual(translateBrowserBiosKey(event(code,key)),{ascii,scanCode});
for(const e of [event('KeyA','a',{isTrusted:false}),event('KeyA','a',{ctrlKey:true}),
  event('KeyA','a',{metaKey:true}),event('KeyA','a',{altKey:true}),
  event('KeyA','한'),event('KeyA','Dead'),event('KeyA','a',{isComposing:true}),
  event('KeyA','a',{target:{tagName:'textarea'}}),
  event('ArrowUp','a'),event('F11','F11'),event('Numpad1','1'),
  event('KeyA','a',{type:'keyup'})
])assert.equal(translateBrowserBiosKey(e),null);
const listeners=new Map();
const target={
  addEventListener(type,callback){listeners.set(type,callback);},
  removeEventListener(type,callback){if(listeners.get(type)===callback)listeners.delete(type);}
};
const queue=createBiosKeyboardQueue({maxQueuedKeys:2});
const binding=attachBrowserBiosKeyboard({target,keyboardQueue:queue});
let press=event('KeyQ','q');listeners.get('keydown')(press);
assert.equal(press.prevented,true);
press=event('KeyQ','Q',{repeat:true});listeners.get('keydown')(press);
assert.equal(press.prevented,true);
press=event('KeyW','w');listeners.get('keydown')(press);
assert.equal(press.prevented,undefined); // bounded queue refuses overflow
listeners.get('keydown')(event('KeyW','w',{isTrusted:false}));
assert.deepEqual(queue.readKey(),{available:true,ascii:113,scanCode:0x10});
assert.deepEqual(queue.readKey(),{available:true,ascii:81,scanCode:0x10});
assert.deepEqual(binding.snapshot(),{
  accepted:2,ignored:1,overflow:1,attached:true,
  fidelity:'TRUSTED_HOST_KEYDOWN_ASCII_AND_PC_SCANS_ONLY__DOS_LAYOUT_UNTESTED'
});
binding.detach();binding.detach();assert.equal(listeners.has('keydown'),false);
assert.equal(binding.snapshot().attached,false);
assert.throws(()=>attachBrowserBiosKeyboard({target:{},keyboardQueue:queue}),/event target/);
console.log('UW2 trusted browser KeyboardEvent to source-backed BIOS FIFO: PASS');

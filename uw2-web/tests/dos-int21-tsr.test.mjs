import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';

// SYNTHETIC FMDRV-computed AX=3101h DX=0026h. No live DOS MCB.
function make(option){
 const cpu=new RealMode8086();
 cpu.load(Uint8Array.of(0xcd,0x21),0,0);
 cpu.set16('AX',0x3101);cpu.set16('DX',0x26);
 installDosInt21(cpu,option);
 return cpu;
}
const captured=[];
const original=make({pspSegment:0x300,stayResident:entry=>{
 assert.ok(Object.isFrozen(entry));
 captured.push({...entry});
 return {resident:true};
}});
original.step();
assert.deepEqual(captured,[{pspSegment:0x300,paragraphs:0x26,returnCode:1}]);
assert.deepEqual(original.terminated,{
 terminationType:3,returnCode:1,residentParagraphs:0x26,pspSegment:0x300
});
assert.throws(()=>original.step(),/terminated/);

assert.throws(()=>make({stayResident:()=>({resident:true})}),/explicit uint16/);
assert.throws(()=>make({pspSegment:0x300,stayResident:1}),/synchronous DOS TSR/);
const noOwner=make({});
assert.throws(()=>noOwner.step(),/requires explicit resident memory owner/);
assert.equal(noOwner.terminated,null);
const rejected=make({pspSegment:0x300,stayResident:()=>({resident:false})});
assert.throws(()=>rejected.step(),/must explicitly acknowledge/);
assert.equal(rejected.terminated,null);
const asynchronous=make({pspSegment:0x300,stayResident:()=>Promise.resolve({resident:true})});
assert.throws(()=>asynchronous.step(),/async DOS AH31/);
const noParagraph=make({pspSegment:0x300,stayResident:()=>{throw new Error('not called');}});
noParagraph.set16('DX',0);
assert.throws(()=>noParagraph.step(),/zero resident paragraph count/);
assert.equal(noParagraph.terminated,null);
console.log('UW2 FMDRV DOS AH31 explicit TSR memory-owner contract and termination status: PASS');

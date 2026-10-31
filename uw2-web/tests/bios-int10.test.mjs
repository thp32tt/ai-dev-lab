import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installBiosInt10} from '../web/bios-int10.js';

// SYNTHETIC guest instruction fixture: original KOEI.COM INT10h call is
// independently SHA-pinned by the user-owned original-byte local P3 probe.
const c=new RealMode8086(),seen=[];
c.load(Uint8Array.of(
  0xb8,0x07,0x0e,  // AH=0Eh, AL=BEL: raw control character, not text output
  0xbb,0x07,0x00,  // BH=page 0, BL=color 7
  0xcd,0x10),0,0);
const bridge=installBiosInt10(c,{teletype:arg=>{
  seen.push(arg);
  assert.equal(Object.isFrozen(arg),true);
}});
assert.match(bridge.fidelity,/UNTESTED/);
c.set16('FLAGS',0x203);
c.runSteps(3);
assert.deepEqual(seen,[{character:7,page:0,color:7}]);
assert.equal(c.get16('AX'),0x0e07);
assert.equal(c.get16('BX'),7);
assert.equal(c.get16('FLAGS'),0x203);
assert.equal(c.terminated,null);
assert.throws(()=>c.installInterruptVector(0x10,0,0),/already registered/);

const withoutSink=new RealMode8086();
withoutSink.load(Uint8Array.of(0xcd,0x10),0,0);
withoutSink.set16('AX',0x0e07);
installBiosInt10(withoutSink);
assert.throws(()=>withoutSink.step(),/sink absent/);
const unknown=new RealMode8086();
unknown.load(Uint8Array.of(0xcd,0x10),0,0);
unknown.set16('AX',0x0013);
installBiosInt10(unknown,{teletype:()=>{throw Error('should not run');}});
assert.throws(()=>unknown.step(),/BIOS video set-mode device absent/);
const asynchronous=new RealMode8086();
asynchronous.load(Uint8Array.of(0xcd,0x10),0,0);
asynchronous.set16('AX',0x0e07);
installBiosInt10(asynchronous,{teletype:()=>Promise.resolve()});
assert.throws(()=>asynchronous.step(),/async BIOS video/);
const returned=new RealMode8086();
returned.load(Uint8Array.of(0xcd,0x10),0,0);
returned.set16('AX',0x0e07);
installBiosInt10(returned,{teletype:()=>0});
assert.throws(()=>returned.step(),/must not synthesize/);
const bad=new RealMode8086();
assert.throws(()=>installBiosInt10(bad,{teletype:3}),/synchronous device sink/);
assert.throws(()=>installBiosInt10({},{}),/requires RealMode8086/);
console.log('UW2 original BIOS INT10h AH0Eh device-boundary synthetic regression: PASS');

import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// In original Korean KOEI.COM raw 0x27D the short jump EB 03 must
// land at raw 0x282, not inside the E9 near-jump displacement at raw 0x281.
// Uses SYNTHETIC instructions, not licensed original-game executable bytes.
const f=new RealMode8086();
f.set16('CS',0x220);
f.load(Uint8Array.of(0xeb,0x03,0x90,0x90,0xfe,0x90),0x220,0x100);
f.set16('IP',0x100);
f.set16('FLAGS',0x203);
f.step();
assert.equal(f.get16('IP'),0x105);
assert.equal(f.get16('FLAGS'),0x203);
const back=new RealMode8086();
back.load(Uint8Array.of(0xeb,0xfe),0,0);
back.step();assert.equal(back.get16('IP'),0);
const wrap=new RealMode8086();
wrap.load(Uint8Array.of(0xeb,0xfe),0x100,0xffff);
wrap.set16('CS',0x100);wrap.set16('IP',0xffff);
wrap.step();assert.equal(wrap.get16('IP'),0xffff);
const near=new RealMode8086();
near.load(Uint8Array.of(0xe9,0x03,0x00,0x90,0x90,0x90,0x90),0,0);
near.step();assert.equal(near.get16('IP'),6);
console.log('UW2 original KOEI EB rel8 next-IP jump origin regression: PASS');

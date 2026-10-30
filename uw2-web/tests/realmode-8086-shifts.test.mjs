import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Synthetic-only 8086 D0-D3 semantics. No original Korean DOS or browser run.
const CF=1, ZF=0x40, SF=0x80, IF=0x200, OF=0x800;
function execute(bytes,setup=()=>{}){
  const cpu=new RealMode8086();
  cpu.set16('CS',0x100);
  setup(cpu);
  cpu.load(Uint8Array.from(bytes),0x100,0);
  cpu.step();
  return cpu;
}
const cases=[
  // encodings D0 /0 ROL, /1 ROR, /2 RCL, /3 RCR, /4 SHL, /5 SHR, /7 SAR.
  {code:[0xd0,0xc0],al:0x81,expect:0x03,cf:true,of:true},
  {code:[0xd0,0xc8],al:0x01,expect:0x80,cf:true,of:true},
  {code:[0xd0,0xd0],al:0x80,expect:0x01,cf:true,of:true,initialCF:true},
  {code:[0xd0,0xd8],al:0x01,expect:0x80,cf:true,of:true,initialCF:true},
  {code:[0xd0,0xe0],al:0x80,expect:0x00,cf:true,of:true},
  {code:[0xd0,0xe8],al:0x80,expect:0x40,cf:false,of:true},
  {code:[0xd0,0xf8],al:0x81,expect:0xc0,cf:true,of:false}
];
for(const x of cases){
  const cpu=execute(x.code,c=>{
    c.set8('AL',x.al);
    c.set16('FLAGS',IF|ZF|SF|(x.initialCF?CF:0));
  });
  assert.equal(cpu.get8('AL'),x.expect,x.code.toString());
  assert.equal(cpu.flag('CF'),x.cf,x.code.toString());
  assert.equal(cpu.flag('OF'),x.of,x.code.toString());
  assert.equal(cpu.flag('IF'),true);
  if((x.code[1]&0x38)<0x20){
    // Rotations never modify the condition bits S/Z/P.
    assert.equal(cpu.flag('ZF'),true);
    assert.equal(cpu.flag('SF'),true);
  }else{
    assert.equal(cpu.flag('ZF'),x.expect===0);
    assert.equal(cpu.flag('SF'),!!(x.expect&0x80));
  }
}
// D1 (word), old sign and shifted-out CF; AF remains undefined and untouched.
const word=execute([0xd1,0xee],c=>{
  c.set16('SI',0x8001);c.set16('FLAGS',IF|0x10);
});
assert.equal(word.get16('SI'),0x4000);
assert.equal(word.flag('CF'),true);
assert.equal(word.flag('OF'),true);
assert.equal(word.flag('SF'),false);
assert.equal(word.flag('AF'),true);
// D3 uses the FULL CL count (8086), rather than the 286+ 5-bit mask.
const fullCount=execute([0xd2,0xe0],c=>{
  c.set8('AL',1);c.set8('CL',33);c.set16('FLAGS',IF|OF);
});
assert.equal(fullCount.get8('AL'),0);
assert.equal(fullCount.flag('OF'),true); // undefined count>1 preserved
assert.equal(fullCount.flag('ZF'),true);
assert.equal(fullCount.flag('CF'),false);
// CL=0 must preserve both the operand and ALL flags.
const zero=execute([0xd3,0xe8],c=>{
  c.set16('AX',0xbeef);c.set8('CL',0);c.set16('FLAGS',0xad7);
});
assert.equal(zero.get16('AX'),0xbeef);
assert.equal(zero.get16('FLAGS'),0xad7);
// Segment override only redirects the memory operand, not CS or DS.
const mem=execute([0x36,0xd1,0x26,0x40,0x00],c=>{
  c.set16('SS',0x200);c.set16('DS',0x300);
  c.write16(0x200,0x40,0x8001);c.write16(0x300,0x40,0xabcd);
});
assert.equal(mem.read16(0x200,0x40),2);
assert.equal(mem.read16(0x300,0x40),0xabcd);
assert.equal(mem.flag('CF'),true);
// Rotate through carry with CL=2, preserving no unrelated flags.
const throughCarry=execute([0xd2,0xd0],c=>{
  c.set8('AL',0x80);c.set8('CL',2);c.set16('FLAGS',IF|OF);
});
assert.equal(throughCarry.get8('AL'),1);
assert.equal(throughCarry.flag('CF'),false);
assert.equal(throughCarry.flag('OF'),true);
// Invalid Group-2 /6 and post-8086 immediate-count opcodes fail closed.
for(const bytes of [[0xd0,0xf0],[0xd3,0xf0],[0xc0,0xe0,0x01]]){
  const cpu=new RealMode8086();cpu.set16('CS',0x100);
  cpu.set8('AL',0x82);cpu.set16('FLAGS',0xa57);
  cpu.load(Uint8Array.from(bytes),0x100,0);
  assert.throws(()=>cpu.step(),/unsupported 8086/);
  assert.equal(cpu.get8('AL'),0x82);
  assert.equal(cpu.get16('FLAGS'),0xa57);
}
console.log('UW2 P3 8086 Group-2 D0-D3 shifts/rotates synthetic regression: PASS');

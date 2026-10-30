// Narrow, fail-closed 8086 real-mode execution core for original DOS porting.
// This is not a full CPU, DOS kernel, device model, or a claim of gameplay equivalence.
// Missing instructions must throw rather than fabricate original-game behavior.
const R16 = ['AX','CX','DX','BX','SP','BP','SI','DI'];
const R8 = ['AL','CL','DL','BL','AH','CH','DH','BH'];
const FLAGS = Object.freeze({CF:1,PF:4,AF:16,ZF:64,SF:128,TF:256,IF:512,OF:2048});
const s8 = v => (v & 0x80) ? v - 0x100 : v;
const s16 = v => (v & 0x8000) ? v - 0x10000 : v;
const u16 = (v, label) => {
  if (!Number.isInteger(v) || v < 0 || v > 0xffff)
    throw new RangeError(`${label} must be uint16`);
  return v;
};
export class RealMode8086 {
  constructor(memory = new Uint8Array(0x100000)) {
    if (!(memory instanceof Uint8Array) || memory.length !== 0x100000)
      throw new TypeError('real mode requires exactly 1 MiB of byte-addressable memory');
    this.memory = memory;
    this.regs = new Uint16Array(8);
    this.seg = {CS:0,DS:0,ES:0,SS:0};
    this.ip = 0;
    this.flags = 2;
  }
  physical(segment, offset) {
    return (((u16(segment,'segment') << 4) + u16(offset,'offset')) & 0xfffff);
  }
  read8(segment, offset) { return this.memory[this.physical(segment, offset)]; }
  write8(segment, offset, value) {
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError('byte must be uint8');
    this.memory[this.physical(segment, offset)] = value;
  }
  read16(segment, offset) {
    return this.read8(segment, offset) | (this.read8(segment, (offset + 1) & 0xffff) << 8);
  }
  write16(segment, offset, value) {
    u16(value,'word');
    this.write8(segment, offset, value & 255);
    this.write8(segment, (offset + 1) & 0xffff, value >>> 8);
  }
  get16(name) {
    const i=R16.indexOf(name);
    if(i>=0)return this.regs[i];
    if(Object.hasOwn(this.seg,name))return this.seg[name];
    if(name==='IP')return this.ip;
    if(name==='FLAGS')return this.flags;
    throw new RangeError('unsupported 16-bit register');
  }
  set16(name,value) {
    u16(value,name);
    const i=R16.indexOf(name);
    if(i>=0){this.regs[i]=value;return;}
    if(Object.hasOwn(this.seg,name)){this.seg[name]=value;return;}
    if(name==='IP'){this.ip=value;return;}
    if(name==='FLAGS'){this.flags=value | 2;return;}
    throw new RangeError('unsupported 16-bit register');
  }
  get8(name) {
    const i=R8.indexOf(name);
    if(i<0)throw new RangeError('unsupported 8-bit register');
    const word=this.regs[i & 3];
    return i<4 ? word&255 : word>>>8;
  }
  set8(name,value) {
    if(!Number.isInteger(value)||value<0||value>255)throw new RangeError('register byte must be uint8');
    const i=R8.indexOf(name);
    if(i<0)throw new RangeError('unsupported 8-bit register');
    const r=i&3, old=this.regs[r];
    this.regs[r]=i<4 ? ((old&0xff00)|value) : ((old&255)|(value<<8));
  }
  flag(name) {
    if(!Object.hasOwn(FLAGS,name))throw new RangeError('unknown FLAGS bit');
    return !!(this.flags & FLAGS[name]);
  }
  fetch8() {
    const v=this.read8(this.seg.CS,this.ip);
    this.ip=(this.ip+1)&0xffff;
    return v;
  }
  fetch16() {const lo=this.fetch8();return lo|(this.fetch8()<<8);}
  push16(value) {
    this.regs[4]=(this.regs[4]-2)&0xffff;
    this.write16(this.seg.SS,this.regs[4],u16(value,'push'));
  }
  pop16() {
    const value=this.read16(this.seg.SS,this.regs[4]);
    this.regs[4]=(this.regs[4]+2)&0xffff;
    return value;
  }
  load(bytes,segment,offset) {
    if(!(bytes instanceof Uint8Array))throw new TypeError('load requires bytes');
    u16(segment,'segment');u16(offset,'offset');
    if(bytes.length>0x10000)throw new RangeError('load exceeds one segment');
    for(let i=0;i<bytes.length;i++)this.write8(segment,(offset+i)&0xffff,bytes[i]);
  }
  logic8(result) {
    // 8086 OR: CF/OF cleared; ZF/SF/PF set. AF is undefined and not interpreted.
    this.flags &= ~(FLAGS.CF|FLAGS.OF|FLAGS.ZF|FLAGS.SF|FLAGS.PF);
    if(result===0)this.flags|=FLAGS.ZF;
    if(result&0x80)this.flags|=FLAGS.SF;
    let n=result,p=0;for(let i=0;i<8;i++){p^=n&1;n>>>=1;}
    if(p===0)this.flags|=FLAGS.PF;
    this.flags|=2;
  }
  step() {
    const cs=this.seg.CS, at=this.ip, op=this.fetch8();
    if(op===0x90)return; // NOP
    if(op>=0xb8&&op<=0xbf){this.set16(R16[op-0xb8],this.fetch16());return;}
    if(op>=0xb0&&op<=0xb7){this.set8(R8[op-0xb0],this.fetch8());return;}
    if(op===0x0a){ // OR r8,r/m8, ModR/M register mode ONLY
      const m=this.fetch8();
      if((m>>>6)!==3)throw new Error('8086 memory ModR/M unsupported: fail closed');
      const dst=R8[(m>>>3)&7], src=R8[m&7];
      const v=this.get8(dst)|this.get8(src);
      this.set8(dst,v);this.logic8(v);return;
    }
    if(op===0x74||op===0x75||op===0xeb){
      const delta=s8(this.fetch8());
      if(op===0xeb||(op===0x74?this.flag('ZF'):!this.flag('ZF')))
        this.ip=(this.ip+delta)&0xffff;
      return;
    }
    if(op===0xe9){const delta=s16(this.fetch16());this.ip=(this.ip+delta)&0xffff;return;}
    if(op===0xe8){const delta=s16(this.fetch16());this.push16(this.ip);this.ip=(this.ip+delta)&0xffff;return;}
    if(op===0xc3){this.ip=this.pop16();return;}
    if(op===0x9a){const dest=this.fetch16(),segment=this.fetch16();
      this.push16(this.seg.CS);this.push16(this.ip);
      this.seg.CS=segment;this.ip=dest;return;}
    if(op===0xcb){this.ip=this.pop16();this.seg.CS=this.pop16();return;}
    if(op===0xea){const dest=this.fetch16(),segment=this.fetch16();
      this.seg.CS=segment;this.ip=dest;return;}
    throw new Error(`unsupported 8086 opcode ${op.toString(16).padStart(2,'0')} at ${cs.toString(16)}:${at.toString(16)}`);
  }
  runSteps(count) {
    if(!Number.isInteger(count)||count<0||count>100000)
      throw new RangeError('bounded step count required');
    for(let i=0;i<count;i++)this.step();
  }
}

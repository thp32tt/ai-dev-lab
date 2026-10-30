// Narrow, fail-closed 8086 real-mode execution core for original DOS porting.
// This is not a full CPU, DOS kernel, device model, or a claim of gameplay equivalence.
// Missing instructions must throw rather than fabricate original-game behavior.
const R16 = ['AX','CX','DX','BX','SP','BP','SI','DI'];
const R8 = ['AL','CL','DL','BL','AH','CH','DH','BH'];
const FLAGS = Object.freeze({CF:1,PF:4,AF:16,ZF:64,SF:128,TF:256,IF:512,DF:1024,OF:2048});
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
    this.interruptVectors = new Set();
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

  // Explicitly installed vectors only: the caller must provide an audited
  // DOS/BIOS interrupt table. A zero-filled IVT is never a valid fallback.
  installInterruptVector(number,segment,offset) {
    if(!Number.isInteger(number)||number<0||number>255)
      throw new RangeError('8086 interrupt number must be uint8');
    u16(segment,'interrupt segment');u16(offset,'interrupt offset');
    this.write16(0,number*4,offset);
    this.write16(0,number*4+2,segment);
    this.interruptVectors.add(number);
  }
  dispatchInterrupt(number) {
    if(!this.interruptVectors.has(number))
      throw new Error(`8086 INT ${number.toString(16)} has no installed vector/DOS adapter: fail closed`);
    // Read IVT before pushing: an interrupt stack may alias physical 0000h.
    const dest=this.read16(0,number*4);
    const cs=this.read16(0,number*4+2);
    this.push16(this.flags);
    this.push16(this.seg.CS);
    this.push16(this.ip);
    this.flags=(this.flags&~(FLAGS.IF|FLAGS.TF))|2;
    this.seg.CS=cs;this.ip=dest;
  }
  load(bytes,segment,offset) {
    if(!(bytes instanceof Uint8Array))throw new TypeError('load requires bytes');
    u16(segment,'segment');u16(offset,'offset');
    if(bytes.length>0x10000)throw new RangeError('load exceeds one segment');
    for(let i=0;i<bytes.length;i++)this.write8(segment,(offset+i)&0xffff,bytes[i]);
  }
  // 8086 ModR/M 16-bit effective address: only the BP-containing forms
  // default to SS. A segment override applies to this instruction alone.
  memoryOperand(modrm, width, segmentOverride = null) {
    const mode=modrm>>>6, rm=modrm&7;
    if(width!==8&&width!==16)throw new RangeError('operand width');
    if(mode===3){
      const name=(width===8?R8:R16)[rm];
      return {isRegister:true,
              read:()=>width===8?this.get8(name):this.get16(name),
              write:v=>width===8?this.set8(name,v):this.set16(name,v)};
    }
    const bx=this.get16('BX'),bp=this.get16('BP');
    const si=this.get16('SI'),di=this.get16('DI');
    const bases=[bx+si,bx+di,bp+si,bp+di,si,di,bp,bx];
    const usesBP=rm===2||rm===3||(rm===6&&mode!==0);
    const direct=mode===0&&rm===6;
    const disp=direct?this.fetch16():mode===1?s8(this.fetch8()):mode===2?s16(this.fetch16()):0;
    const offset=(direct?disp:bases[rm]+disp)&0xffff;
    const segment=this.seg[segmentOverride??(usesBP?'SS':'DS')];
    return {isRegister:false,segment,offset,
            read:()=>width===8?this.read8(segment,offset):this.read16(segment,offset),
            write:v=>width===8?this.write8(segment,offset,v):this.write16(segment,offset,v)};
  }
  logicResult(value,width) {
    const result=width===8?value&255:value&0xffff;
    this.flags &= ~(FLAGS.CF|FLAGS.OF|FLAGS.ZF|FLAGS.SF|FLAGS.PF);
    if(result===0)this.flags|=FLAGS.ZF;
    if(result&(width===8?0x80:0x8000))this.flags|=FLAGS.SF;
    let n=result&255,p=0;for(let i=0;i<8;i++){p^=n&1;n>>>=1;}
    if(p===0)this.flags|=FLAGS.PF;
    this.flags|=2;
  }
  // Preserve the 8086 low-width arithmetic flags without changing IF/DF/TF.
  // All values are unsigned bit patterns; signed overflow uses the sign bit.
  arithmeticResult(left,right,width,subtract=false) {
    const mask=width===8?0xff:0xffff, sign=width===8?0x80:0x8000;
    const a=left&mask,b=right&mask;
    const full=subtract?a-b:a+b, result=full&mask;
    const flagMask=FLAGS.CF|FLAGS.PF|FLAGS.AF|FLAGS.ZF|FLAGS.SF|FLAGS.OF;
    let bits=0;
    if(subtract?a<b:full>mask)bits|=FLAGS.CF;
    if((a^b^result)&0x10)bits|=FLAGS.AF;
    if(subtract?((a^b)&(a^result)&sign):((~(a^b))&(a^result)&sign))bits|=FLAGS.OF;
    if(result===0)bits|=FLAGS.ZF;
    if(result&sign)bits|=FLAGS.SF;
    let parity=0,low=result&255;
    for(let i=0;i<8;i++){parity^=low&1;low>>>=1;}
    if(parity===0)bits|=FLAGS.PF;
    this.flags=(this.flags&~flagMask)|bits|2;
    return result;
  }
  // ADC/SBB require a separate incoming CF. Using b+CF as a truncated
  // signed operand loses OF at 0x7f+0+1 and 0x8000-0-1 boundaries.
  carryResult(left,right,width,subtract=false) {
    const mask=width===8?0xff:0xffff,sign=width===8?0x80:0x8000;
    const a=left&mask,b=right&mask,carry=this.flag('CF')?1:0;
    const full=subtract?a-b-carry:a+b+carry,result=full&mask;
    const signed=v=>(v&sign)?v-(mask+1):v;
    const signedFull=subtract?
      signed(a)-signed(b)-carry:signed(a)+signed(b)+carry;
    let bits=0;
    if(subtract?a<b+carry:full>mask)bits|=FLAGS.CF;
    if(subtract?(a&15)<(b&15)+carry:(a&15)+(b&15)+carry>15)
      bits|=FLAGS.AF;
    if(signedFull<-sign||signedFull>sign-1)bits|=FLAGS.OF;
    if(result===0)bits|=FLAGS.ZF;
    if(result&sign)bits|=FLAGS.SF;
    let parity=0,low=result&255;
    for(let i=0;i<8;i++){parity^=low&1;low>>>=1;}
    if(parity===0)bits|=FLAGS.PF;
    this.flags=(this.flags&~(FLAGS.CF|FLAGS.AF|FLAGS.OF|FLAGS.ZF|FLAGS.SF|FLAGS.PF))|bits|2;
    return result;
  }
  aluResult(kind,left,right,width) {
    if(kind==='adc')return this.carryResult(left,right,width);
    if(kind==='sbb')return this.carryResult(left,right,width,true);
    if(kind==='add')return this.arithmeticResult(left,right,width);
    if(kind==='sub'||kind==='cmp')return this.arithmeticResult(left,right,width,true);
    let value;
    if(kind==='or')value=left|right;
    else if(kind==='and'||kind==='test')value=left&right;
    else if(kind==='xor')value=left^right;
    else throw new Error('unsupported 8086 ALU kind: fail closed');
    this.logicResult(value,width);
    return width===8?value&255:value&0xffff;
  }

  // 8086 Group-2 rotates and shifts. CL is NOT masked to five bits on the
  // original 8086. Undefined OF (multi-bit counts) and AF are retained rather
  // than reporting a fabricated, reference-validated flag outcome.
  shiftRotateResult(extension, value, width, count) {
    if(extension===6)throw new Error('unsupported 8086 Group-2 /6: fail closed');
    if(!Number.isInteger(count)||count<0||count>255)
      throw new RangeError('8086 shift count must be uint8');
    const mask=width===8?0xff:0xffff, sign=width===8?0x80:0x8000;
    const original=value&mask, priorFlags=this.flags;
    if(count===0)return original; // No operand or flag changes.
    let result=original, carry=(priorFlags&FLAGS.CF)?1:0;
    for(let i=0;i<count;i++){
      const top=(result&sign)?1:0,low=result&1;
      switch(extension){
        case 0: result=((result<<1)&mask)|top;carry=top;break; // ROL
        case 1: result=(result>>>1)|(low?sign:0);carry=low;break; // ROR
        case 2: result=((result<<1)&mask)|carry;carry=top;break; // RCL
        case 3: result=(result>>>1)|(carry?sign:0);carry=low;break; // RCR
        case 4: result=(result<<1)&mask;carry=top;break; // SHL/SAL
        case 5: result=result>>>1;carry=low;break; // SHR
        case 7: result=(result>>>1)|(top?sign:0);carry=low;break; // SAR
        default: throw new Error('unsupported 8086 Group-2 extension: fail closed');
      }
    }
    // OF is architecturally defined only for count=1. For a defined
    // one-bit shift/rotate: left => MSB xor CF, right rotate => top 2 bits,
    // SHR => old MSB, SAR => 0.
    let overflow=false;
    if(extension===1||extension===3)
      overflow=!!((result^(result<<1))&sign);
    else if(extension===5)overflow=!!(original&sign);
    else if(extension!==7)overflow=!!(((result&sign)?1:0)^carry);
    if(extension>=4)this.logicResult(result,width); // Shift updates S/Z/P.
    this.flags=(this.flags&~(FLAGS.CF|FLAGS.OF))|
      (carry?FLAGS.CF:0)|
      (count===1?(overflow?FLAGS.OF:0):(priorFlags&FLAGS.OF))|2;
    return result;
  }
  step() {
    const cs=this.seg.CS, at=this.ip;
    let op=this.fetch8(),segmentOverride=null,repeatPrefix=null,prefixes=0;
    const segPrefix={0x26:'ES',0x2e:'CS',0x36:'SS',0x3e:'DS'};
    while(Object.hasOwn(segPrefix,op)||op===0xf2||op===0xf3){
      if(++prefixes>8)throw new Error('8086 prefix budget exceeded: fail closed');
      if(Object.hasOwn(segPrefix,op))segmentOverride=segPrefix[op];
      else repeatPrefix=op; // Last F2/F3 prefix wins on the 8086.
      op=this.fetch8();
    }
    // Native 8086 string instructions share the CPU's segmented 1 MiB memory.
    // Source is DS:SI (unless overridden), destination always ES:DI.
    // REP is one architectural instruction, with at most 65535 iterations.
    if((op>=0xa4&&op<=0xa7)||(op>=0xaa&&op<=0xaf)){
      const width=(op&1)?16:8,amount=width>>>3;
      const isMov=op===0xa4||op===0xa5;
      const isCmp=op===0xa6||op===0xa7;
      const isSto=op===0xaa||op===0xab;
      const isLod=op===0xac||op===0xad;
      const isSca=op===0xae||op===0xaf;
      const sourceSegment=this.seg[segmentOverride??'DS'];
      const destinationSegment=this.seg.ES;
      const read=(segment,offset)=>width===8?
        this.read8(segment,offset):this.read16(segment,offset);
      const write=(segment,offset,value)=>width===8?
        this.write8(segment,offset,value):this.write16(segment,offset,value);
      const accName=width===8?'AL':'AX';
      const accumulator=()=>width===8?this.get8(accName):this.get16(accName);
      const increment=this.flag('DF')?-amount:amount;
      let left=repeatPrefix===null?1:this.get16('CX');
      while(left>0){
        const si=this.get16('SI'),di=this.get16('DI');
        if(isMov)write(destinationSegment,di,read(sourceSegment,si));
        else if(isCmp)this.arithmeticResult(read(sourceSegment,si),
          read(destinationSegment,di),width,true);
        else if(isSto)write(destinationSegment,di,accumulator());
        else if(isLod){
          const value=read(sourceSegment,si);
          if(width===8)this.set8(accName,value);
          else this.set16(accName,value);
        }else if(isSca)this.arithmeticResult(accumulator(),
          read(destinationSegment,di),width,true);
        if(isMov||isCmp||isLod)this.set16('SI',(si+increment)&0xffff);
        if(isMov||isCmp||isSto||isSca)this.set16('DI',(di+increment)&0xffff);
        if(repeatPrefix===null)break;
        left--;
        this.set16('CX',left);
        // On REPE/REPNE CMPS/SCAS the continuation condition is evaluated
        // after the first comparison; MOVS/STOS/LODS ignore ZF.
        if((isCmp||isSca)&&this.flag('ZF')!==(repeatPrefix===0xf3))break;
      }
      return;
    }
    if(repeatPrefix!==null)
      throw new Error('unsupported 8086 REP prefix/opcode combination: fail closed');
    if(op===0xfc||op===0xfd){
      this.flags=(this.flags&~FLAGS.DF)|(op===0xfd?FLAGS.DF:0)|2;
      return;
    }
    if(op===0x90)return; // NOP
    // Explicit 8086 segment stack transfers. CS is push-only.
    const pushSegment={0x06:'ES',0x0e:'CS',0x16:'SS',0x1e:'DS'}[op];
    if(pushSegment){this.push16(this.get16(pushSegment));return;}
    const popSegment={0x07:'ES',0x17:'SS',0x1f:'DS'}[op];
    if(popSegment){this.set16(popSegment,this.pop16());return;}
    if(op>=0xb8&&op<=0xbf){this.set16(R16[op-0xb8],this.fetch16());return;}
    if(op>=0xb0&&op<=0xb7){this.set8(R8[op-0xb0],this.fetch8());return;}
    // Native 8086 register INC/DEC leave CF unchanged, unlike ADD/SUB.
    if(op>=0x40&&op<=0x4f){
      const name=R16[op&7],before=this.get16(name),cf=this.flags&FLAGS.CF;
      const result=this.arithmeticResult(before,1,16,op>=0x48);
      this.flags=(this.flags&~FLAGS.CF)|cf;
      this.set16(name,result);return;
    }
    if(op>=0x50&&op<=0x57){
      // On the original 8086, PUSH SP stores the decremented SP.
      this.push16(op===0x54?(this.get16('SP')-2)&0xffff:this.get16(R16[op-0x50]));
      return;
    }
    if(op>=0x58&&op<=0x5f){this.set16(R16[op-0x58],this.pop16());return;}
    if(op===0x9c){this.push16(this.flags);return;}
    if(op===0x9d){this.set16('FLAGS',this.pop16());return;}
    // Basic 8086 data transformations preserve FLAGS unless documented.
    if(op>=0x91&&op<=0x97){
      const reg=R16[op&7],ax=this.get16('AX');
      this.set16('AX',this.get16(reg));this.set16(reg,ax);return;
    }
    if(op===0x98){this.set16('AX',s8(this.get8('AL'))&0xffff);return;} // CBW
    if(op===0x99){this.set16('DX',this.get16('AX')&0x8000?0xffff:0);return;} // CWD
    if(op===0x9e){ // SAHF: AH replaces only low arithmetic condition bits.
      this.flags=(this.flags&~0xd5)|(this.get8('AH')&0xd5)|2;return;
    }
    if(op===0x9f){this.set8('AH',this.flags&255);return;} // LAHF
    if(op===0xa8||op===0xa9){
      const width=op===0xa8?8:16;
      this.aluResult('test',width===8?this.get8('AL'):this.get16('AX'),
        width===8?this.fetch8():this.fetch16(),width);
      return;
    }
    if(op===0xd7){ // XLAT: byte table in DS:BX + unsigned AL.
      const offset=(this.get16('BX')+this.get8('AL'))&0xffff;
      this.set8('AL',this.read8(this.seg[segmentOverride??'DS'],offset));
      return;
    }
    // Actual 8086 16-bit memory address formation; no inferred game rules.
    const arithmeticGroup=op&0xfc;
    const kindByGroup={0x00:'add',0x08:'or',0x10:'adc',0x18:'sbb',0x20:'and',0x28:'sub',0x30:'xor',0x38:'cmp'};
    if((op>=0x88&&op<=0x8b)||Object.hasOwn(kindByGroup,arithmeticGroup)||
       op===0x84||op===0x85){
      const m=this.fetch8(),width=(op&1)?16:8;
      const rm=this.memoryOperand(m,width,segmentOverride);
      const name=(width===8?R8:R16)[(m>>>3)&7];
      const reg=()=>width===8?this.get8(name):this.get16(name);
      const setReg=v=>width===8?this.set8(name,v):this.set16(name,v);
      if(op>=0x88&&op<=0x8b){
        if(op&2)setReg(rm.read());else rm.write(reg());
      }else{
        const isTest=op===0x84||op===0x85;
        const destIsReg=!isTest&&!!(op&2);
        const left=destIsReg?reg():rm.read(),right=destIsReg?rm.read():reg();
        const kind=isTest?'test':kindByGroup[arithmeticGroup];
        const value=this.aluResult(kind,left,right,width);
        if(kind!=='cmp'&&kind!=='test'){
          if(destIsReg)setReg(value);else rm.write(value);
        }
      }
      return;
    }
    // Immediate AL/AX forms preserve operand width and 16-bit wrapping.
    const immediateGroup=op&0xfe;
    const immediateKind={0x04:'add',0x0c:'or',0x14:'adc',0x1c:'sbb',0x24:'and',
                         0x2c:'sub',0x34:'xor',0x3c:'cmp'}[immediateGroup];
    if(immediateKind){
      const width=(op&1)?16:8,name=width===8?'AL':'AX';
      const value=this.aluResult(immediateKind,
        width===8?this.get8(name):this.get16(name),
        width===8?this.fetch8():this.fetch16(),width);
      if(immediateKind!=='cmp'){
        if(width===8)this.set8(name,value);else this.set16(name,value);
      }
      return;
    }
    // Original 8086 Group-1 immediate: 80, 81, 83 (83 sign-extends imm8).
    if(op===0x80||op===0x81||op===0x83){
      const m=this.fetch8(),extension=(m>>>3)&7;
      const kind=['add','or','adc','sbb','and','sub','xor','cmp'][extension];
      if(!kind)throw new Error('unsupported 8086 group-1 immediate extension: fail closed');
      const width=op===0x80?8:16,rm=this.memoryOperand(m,width,segmentOverride);
      const imm=op===0x83?s8(this.fetch8())&0xffff:
        width===8?this.fetch8():this.fetch16();
      const value=this.aluResult(kind,rm.read(),imm,width);
      if(kind!=='cmp')rm.write(value);
      return;
    }
    // 8086 Group-3 F6/F7: original unsigned/signed arithmetic uses
    // AX or DX:AX exactly, not JavaScript's implicit 32-bit bit operators.
    // A real divide error raises interrupt 0; until DOS/BIOS interrupt
    // delivery is implemented, fail closed without corrupting registers.
    if(op===0xf6||op===0xf7){
      const m=this.fetch8(),ext=(m>>>3)&7,width=op===0xf6?8:16;
      if(ext===1)throw new Error('unsupported 8086 Group-3 /1: fail closed');
      const rm=this.memoryOperand(m,width,segmentOverride);
      const value=rm.read(),mask=width===8?0xff:0xffff;
      const signed=v=>width===8?s8(v):s16(v);
      if(ext===0){
        const immediate=width===8?this.fetch8():this.fetch16();
        this.aluResult('test',value,immediate,width);return;
      }
      if(ext===2){rm.write((~value)&mask);return;}
      if(ext===3){rm.write(this.arithmeticResult(0,value,width,true));return;}
      if(ext===4||ext===5){
        const acc=width===8?this.get8('AL'):this.get16('AX');
        const product=ext===5?signed(acc)*signed(value):acc*value;
        if(width===8)this.set16('AX',product&0xffff);
        else {
          this.set16('AX',product&0xffff);
          this.set16('DX',(product>>>16)&0xffff);
        }
        const overflow=ext===5?
          product<-(width===8?128:32768)||product>(width===8?127:32767):
          product>mask;
        this.flags=(this.flags&~(FLAGS.CF|FLAGS.OF))|
          (overflow?(FLAGS.CF|FLAGS.OF):0)|2;
        return;
      }
      if(value===0)throw new Error('8086 divide error: zero divisor (INT 0 unimplemented): fail closed');
      const dividend=width===8?this.get16('AX'):
        this.get16('DX')*0x10000+this.get16('AX');
      const signedDividend=width===8?s16(dividend):
        (this.get16('DX')<<16)|this.get16('AX');
      const quotient=Math.trunc((ext===7?signedDividend:dividend)/
        (ext===7?signed(value):value));
      const remainder=(ext===7?signedDividend:dividend)-
        quotient*(ext===7?signed(value):value);
      const min=ext===7?-(width===8?128:32768):0;
      const max=ext===7?(width===8?127:32767):mask;
      if(!Number.isFinite(quotient)||quotient<min||quotient>max)
        throw new Error('8086 divide error: quotient overflow (INT 0 unimplemented): fail closed');
      // DIV/IDIV flags are architecturally undefined. Keep their old bits,
      // never invent a deterministic flag result absent original evidence.
      if(width===8){
        this.set8('AL',quotient&0xff);this.set8('AH',remainder&0xff);
      }else{
        this.set16('AX',quotient&0xffff);this.set16('DX',remainder&0xffff);
      }
      return;
    }

    // 8086 D0/D1=one bit, D2/D3=full unsigned CL repeat count.
    // Do not accept 80186-only C0/C1 immediate-count encodings here.
    if(op>=0xd0&&op<=0xd3){
      const m=this.fetch8(),extension=(m>>>3)&7;
      if(extension===6)throw new Error('unsupported 8086 Group-2 /6: fail closed');
      const width=(op&1)?16:8,rm=this.memoryOperand(m,width,segmentOverride);
      const count=op<0xd2?1:this.get8('CL');
      if(count===0)return;
      rm.write(this.shiftRotateResult(extension,rm.read(),width,count));
      return;
    }
    // XCHG always leaves flags intact. LEA computes the 16-bit effective
    // address, never reads memory, and rejects register-only operands.
    if(op===0x86||op===0x87||op===0x8d||op===0x8f){
      const m=this.fetch8(),extension=(m>>>3)&7;
      if(op===0x8f&&extension!==0)
        throw new Error('unsupported 8086 POP r/m /nonzero: fail closed');
      if(op===0x8d&&(m>>>6)===3)
        throw new Error('8086 LEA requires memory addressing: fail closed');
      const width=op===0x86?8:16,rm=this.memoryOperand(m,width,segmentOverride);
      if(op===0x8d){this.set16(R16[extension],rm.offset);return;}
      if(op===0x8f){rm.write(this.pop16());return;}
      const name=(width===8?R8:R16)[extension];
      const regValue=width===8?this.get8(name):this.get16(name);
      const other=rm.read();rm.write(regValue);
      if(width===8)this.set8(name,other);else this.set16(name,other);
      return;
    }
    // 8C/8E transfer segment registers, but 8E /1 cannot load CS.
    if(op===0x8c||op===0x8e){
      const m=this.fetch8(),selector=(m>>>3)&7;
      const segments=['ES','CS','SS','DS'];
      if(selector>3||(op===0x8e&&selector===1))
        throw new Error('unsupported 8086 segment-register selector: fail closed');
      const rm=this.memoryOperand(m,16,segmentOverride);
      if(op===0x8c)rm.write(this.get16(segments[selector]));
      else this.set16(segments[selector],rm.read());
      return;
    }
    // LES/LDS load an m16:16 pointer, never a register-only operand.
    if(op===0xc4||op===0xc5){
      const m=this.fetch8();
      if((m>>>6)===3)throw new Error('8086 LES/LDS requires memory: fail closed');
      const rm=this.memoryOperand(m,16,segmentOverride);
      const offset=rm.read(),selector=this.read16(rm.segment,(rm.offset+2)&0xffff);
      this.set16(R16[(m>>>3)&7],offset);
      this.set16(op===0xc4?'ES':'DS',selector);
      return;
    }
    // FF /0..6: word INC/DEC, indirect near/far transfers and PUSH.
    // Indirect far calls/jumps are a known unresolved P1 call-graph class.
    if(op===0xff){
      const m=this.fetch8(),extension=(m>>>3)&7;
      if(extension===7)throw new Error('unsupported 8086 FF /7 extension: fail closed');
      const rm=this.memoryOperand(m,16,segmentOverride);
      if(extension===0||extension===1){
        const cf=this.flags&FLAGS.CF;
        const value=this.arithmeticResult(rm.read(),1,16,extension===1);
        this.flags=(this.flags&~FLAGS.CF)|cf;
        rm.write(value);return;
      }
      if(extension===2){const dest=rm.read();this.push16(this.ip);this.ip=dest;return;}
      if(extension===3||extension===5){
        if(rm.isRegister)throw new Error('8086 indirect far pointer requires memory: fail closed');
        // Read both words before CALL pushes might overlap a pointer in SS.
        const dest=rm.read(),destSegment=this.read16(rm.segment,(rm.offset+2)&0xffff);
        if(extension===3){this.push16(this.seg.CS);this.push16(this.ip);}
        this.seg.CS=destSegment;this.ip=dest;return;
      }
      if(extension===4){this.ip=rm.read();return;}
      if(extension===6){
        const value=rm.isRegister&&(m&7)===4?(this.get16('SP')-2)&0xffff:rm.read();
        this.push16(value);return;
      }
    }
    if(op===0xc6||op===0xc7){
      const m=this.fetch8();
      if(((m>>>3)&7)!==0)throw new Error('unsupported 8086 MOV immediate ModR/M extension: fail closed');
      const width=op===0xc6?8:16,rm=this.memoryOperand(m,width,segmentOverride);
      rm.write(width===8?this.fetch8():this.fetch16());return;
    }
    if(op>=0xa0&&op<=0xa3){
      const off=this.fetch16(),seg=this.seg[segmentOverride??'DS'];
      const width=(op&1)?16:8,write=!!(op&2);
      if(write){if(width===8)this.write8(seg,off,this.get8('AL'));
        else this.write16(seg,off,this.get16('AX'));}
      else if(width===8)this.set8('AL',this.read8(seg,off));
      else this.set16('AX',this.read16(seg,off));
      return;
    }
    if(op>=0x70&&op<=0x7f){
      const delta=s8(this.fetch8());
      const cf=this.flag('CF'),zf=this.flag('ZF'),sf=this.flag('SF');
      const of=this.flag('OF'),pf=this.flag('PF');
      const conditions=[of,!of,cf,!cf,zf,!zf,cf||zf,!cf&&!zf,
        sf,!sf,pf,!pf,sf!==of,sf===of,zf||(sf!==of),!zf&&(sf===of)];
      if(conditions[op-0x70])this.ip=(this.ip+delta)&0xffff;
      return;
    }
    if(op>=0xe0&&op<=0xe3){
      const delta=s8(this.fetch8());
      // JCXZ inspects CX without decrement; LOOPxx decrements CX even if
      // the taken condition then fails. All preserve FLAGS.
      if(op===0xe3){
        if(this.get16('CX')===0)this.ip=(this.ip+delta)&0xffff;
        return;
      }
      const cx=(this.get16('CX')-1)&0xffff;
      this.set16('CX',cx);
      if(cx&&(op===0xe2||(op===0xe1?this.flag('ZF'):!this.flag('ZF'))))
        this.ip=(this.ip+delta)&0xffff;
      return;
    }
    if(op===0xf8||op===0xf9||op===0xf5){
      if(op===0xf8)this.flags&=~FLAGS.CF;
      if(op===0xf9)this.flags|=FLAGS.CF;
      if(op===0xf5)this.flags^=FLAGS.CF;
      this.flags|=2;return;
    }
    if(op===0xeb){this.ip=(this.ip+s8(this.fetch8()))&0xffff;return;}
    if(op===0xe9){const delta=s16(this.fetch16());this.ip=(this.ip+delta)&0xffff;return;}
    if(op===0xe8){const delta=s16(this.fetch16());this.push16(this.ip);this.ip=(this.ip+delta)&0xffff;return;}
    if(op===0xc3){this.ip=this.pop16();return;}
    if(op===0xc2){const bytes=this.fetch16();this.ip=this.pop16();
      this.set16('SP',(this.get16('SP')+bytes)&0xffff);return;}
    if(op===0x9a){const dest=this.fetch16(),segment=this.fetch16();
      this.push16(this.seg.CS);this.push16(this.ip);
      this.seg.CS=segment;this.ip=dest;return;}
    if(op===0xcb){this.ip=this.pop16();this.seg.CS=this.pop16();return;}
    if(op===0xca){const bytes=this.fetch16();
      this.ip=this.pop16();this.seg.CS=this.pop16();
      this.set16('SP',(this.get16('SP')+bytes)&0xffff);return;}

    // Native 8086 software interrupt entry: INT3, INT imm8, INTO.
    // No guessed INT 21h DOS service or BIOS behavior is supplied.
    if(op===0xcc){this.dispatchInterrupt(3);return;}
    if(op===0xcd){const number=this.fetch8();this.dispatchInterrupt(number);return;}
    if(op===0xce){if(this.flag('OF'))this.dispatchInterrupt(4);return;}
    if(op===0xcf){const dest=this.pop16(),seg=this.pop16(),flags=this.pop16();
      this.ip=dest;this.seg.CS=seg;this.set16('FLAGS',flags);return;}
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

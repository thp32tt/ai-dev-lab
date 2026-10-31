// Original IBM 8253 PIT channel-0 programming evidence.
// It observes raw OUT 43h command / OUT 40h payload only. It does NOT
// generate IRQ0, emulate phase, speaker, BIOS tick count or PIT wall time.
// Mode-3 command 36h and two bytes of reload are observed, not invented.
export function createOriginalPitChannel0WriteBus({
  onReload,maxCommands=4096
}={}){
  if(onReload!==undefined&&typeof onReload!=='function')
    throw new TypeError('PIT reload observer must be synchronous');
  if(!Number.isInteger(maxCommands)||maxCommands<1||maxCommands>100000)
    throw new RangeError('PIT command budget must be bounded');
  let control=null,loByte=null,commandCount=0,dataWrites=0;
  let lastReload=null,reloads=0;
  const u8=(value)=>{
    if(!Number.isInteger(value)||value<0||value>255)
      throw new Error('PIT write value must be uint8');
  };
  const source=cpu=>{
    if(!cpu||typeof cpu.get16!=='function')
      throw new TypeError('PIT original CPU context required');
    return Object.freeze({cs:cpu.get16('CS'),ip:cpu.get16('IP')});
  };
  const emit=(raw,cpu)=>{
    if(reloads>=maxCommands)
      throw new Error('PIT reload budget exhausted: fail closed');
    const event=Object.freeze({
      channel:0,mode:3,access:'low-then-high',
      rawDivisor:raw,effectiveDivisor:raw===0?65536:raw,
      cs:source(cpu).cs,ip:source(cpu).ip,ordinal:reloads
    });
    if(onReload!==undefined){
      const response=onReload(event,cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async PIT reload observer: fail closed');
      if(response!==undefined)
        throw new Error('PIT reload observer cannot fabricate timing');
    }
    lastReload=event;reloads++;
  };
  const out43=(port,value,cpu)=>{
    if(port!==0x43)throw new Error('PIT requires 43h control port');
    u8(value);
    if(commandCount>=maxCommands)
      throw new Error('PIT control command budget exceeded: fail closed');
    // No fabricated behavior for channel 1/2, latch count, or mode 0/2.
    if(value!==0x36)
      throw new Error('unsupported original PIT control word: fail closed');
    source(cpu);
    control=value;loByte=null;commandCount++;
  };
  const out40=(port,value,cpu)=>{
    if(port!==0x40)throw new Error('PIT requires 40h counter0 port');
    u8(value);
    if(control!==0x36)
      throw new Error('PIT counter0 needs captured 36h mode3 control');
    dataWrites++;
    if(loByte===null){loByte=value;return;}
    const divisor=loByte|(value<<8);
    emit(divisor,cpu);
    loByte=null;
  };
  return Object.freeze({
    port43:Object.freeze({out8:out43}),
    port40:Object.freeze({out8:out40}),
    getState:()=>Object.freeze({
      commands:commandCount,dataWrites,reloads,control,
      pendingLowByte:loByte,
      lastReload,
      fidelity:'ORIGINAL_PIT_COUNTER0_PROGRAMMING_ONLY__NO_SYNTHETIC_IRQ_CLOCK'
    })
  });
}

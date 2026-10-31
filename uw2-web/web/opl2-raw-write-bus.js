// Exact byte-port write witness for Yamaha YM3812 / AdLib OPL2.
// Source: original guest OUT 0388h register-select and 0389h data bytes.
// This does NOT synthesize audio, model chip status, accept undocumented
// OPL3 banks or claim that a browser FM emulation clock is accurate.
export function createOriginalOpl2WriteBus({
  onRegisterWrite,
  readStatus,
  maxRegisterWrites=100000
}={}){
  if(onRegisterWrite!==undefined&&typeof onRegisterWrite!=='function')
    throw new TypeError('OPL2 register-write observer must be synchronous');
  if(readStatus!==undefined&&typeof readStatus!=='function')
    throw new TypeError('OPL2 status provider must be synchronous');
  if(!Number.isInteger(maxRegisterWrites)||maxRegisterWrites<1||maxRegisterWrites>1000000)
    throw new RangeError('bounded OPL2 register-write count required');
  let selected=null,written=0,selects=0;
  const regs=new Uint8Array(256),valid=new Uint8Array(256);
  const source=(cpu)=>{
    if(!cpu||typeof cpu.get16!=='function')
      throw new TypeError('OPL2 guest CPU context required');
    return Object.freeze({cs:cpu.get16('CS'),ip:cpu.get16('IP')});
  };
  const status=(port,cpu)=>{
    if(port!==0x388||!readStatus)
      throw new Error('OPL2 status requires external original hardware provider: fail closed');
    const result=readStatus(Object.freeze({port,selectedRegister:selected}),cpu);
    if(result&&typeof result.then==='function')
      throw new Error('async OPL2 status provider: fail closed');
    if(!Number.isInteger(result)||result<0||result>255)
      throw new Error('OPL2 status must be explicit uint8');
    return result;
  };
  const out=(port,value,cpu)=>{
    if((port!==0x388&&port!==0x389)||!Number.isInteger(value)||value<0||value>255)
      throw new Error('OPL2 write requires exact 0388h/0389h uint8');
    if(port===0x388){selected=value;selects++;return;}
    if(selected===null)
      throw new Error('OPL2 data write before register selection: fail closed');
    if(written>=maxRegisterWrites)
      throw new Error('OPL2 original register write budget exhausted: fail closed');
    const provenance=source(cpu);
    const event=Object.freeze({register:selected,value,
      port:0x389,cs:provenance.cs,ip:provenance.ip,ordinal:written});
    if(onRegisterWrite!==undefined){
      const response=onRegisterWrite(event,cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async OPL2 register-write observer: fail closed');
      if(response!==undefined)
        throw new Error('OPL2 register-write observer cannot synthesize status');
    }
    regs[selected]=value;valid[selected]=1;written++;
  };
  return Object.freeze({
    port388:Object.freeze({out8:out,in8:status}),
    port389:Object.freeze({out8:out}),
    getState:()=>Object.freeze({
      selectedRegister:selected,registerSelectWrites:selects,
      registerDataWrites:written,
      fidelity:'ORIGINAL_OPL2_RAW_REGISTERS_ONLY__SOUND_TIMING_AND_STATUS_UNTESTED'
    }),
    getRegister:index=>{
      if(!Number.isInteger(index)||index<0||index>255)
        throw new RangeError('OPL2 register index must be uint8');
      return valid[index]?regs[index]:null;
    }
  });
}

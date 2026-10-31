// Strict BIOS INT 10h guest-device boundary. KOEI.COM uses AH=0Eh,
// then AH=0Fh and AH=00h. Device callbacks must supply actual external
// video state/side effects; this adapter never invents a screen or mode.
import {RealMode8086} from './realmode-8086.js';

const byte=(n,label)=>{
  if(!Number.isInteger(n)||n<0||n>255)
    throw new RangeError(label+' must be uint8');
  return n;
};
const sync=(result,label)=>{
  if(result&&typeof result.then==='function')
    throw new Error('async BIOS '+label+' device sink: fail closed');
};

export function installBiosInt10(cpu,{teletype,readMode,setMode,setPaletteRegister}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('BIOS video dispatcher requires RealMode8086');
  for(const [name,callback] of Object.entries({teletype,readMode,setMode,setPaletteRegister})){
    if(callback!==undefined&&typeof callback!=='function')
      throw new TypeError('BIOS '+name+' must be a synchronous device sink');
  }
  cpu.installInterruptAdapter(0x10,()=>{
    const ah=cpu.get8('AH');
    if(ah===0x0e){
      if(!teletype)
        throw new Error('BIOS teletype device sink absent: fail closed');
      // Original KOEI.COM sends BEL 07h: never turn this into guessed audio.
      const args=Object.freeze({
        character:byte(cpu.get8('AL'),'AL'),
        page:byte(cpu.get8('BH'),'BH'),
        color:byte(cpu.get8('BL'),'BL')
      });
      const response=teletype(args,cpu);
      sync(response,'video');
      if(response!==undefined)
        throw new Error('BIOS teletype device must not synthesize return registers');
      return;
    }
    if(ah===0x0f){
      // RBIL INT10 AH0F: AH = text columns, AL = current video mode,
      // BH = current active page. The device, NOT this adapter, supplies
      // these three values from an externally captured video state.
      if(!readMode)
        throw new Error('BIOS current-mode provider absent: fail closed');
      const response=readMode(Object.freeze({operation:'readCurrentMode'}),cpu);
      sync(response,'current-mode');
      if(!response||typeof response!=='object'||Array.isArray(response))
        throw new Error('BIOS current-mode provider must return explicit mode/columns/page');
      const mode=byte(response.mode,'BIOS mode'),
        columns=byte(response.columns,'BIOS columns'),
        page=byte(response.page,'BIOS active page');
      if(columns===0)
        throw new Error('BIOS current-mode text columns cannot be zero');
      cpu.set8('AL',mode);
      cpu.set8('AH',columns);
      cpu.set8('BH',page);
      return;
    }
    if(ah===0x00){
      // RBIL INT10 AH00 selects video mode AL. BIOS-specific return AL
      // cannot be synthesized. Device may mutate CPU only if proved.
      if(!setMode)
        throw new Error('BIOS video set-mode device absent: fail closed');
      const mode=byte(cpu.get8('AL'),'BIOS desired video mode');
      const response=setMode(Object.freeze({mode}),cpu);
      sync(response,'set-mode');
      if(response!==undefined)
        throw new Error('BIOS set-mode device cannot supply unproven return value');
      return;
    }
    if(ah===0x10){
      // Original OPEN.EXE uses AX=1000h VGA palette-register write.
      // BIOS convention: BL=register index, BH=palette value. This module
      // does not create a VGA palette, DAC, color conversion, or framebuffer.
      const service=cpu.get8('AL');
      if(service!==0)
        throw new Error('unsupported BIOS INT10 AH10 palette subfunction: fail closed');
      if(!setPaletteRegister)
        throw new Error('BIOS palette register sink absent: fail closed');
      const args=Object.freeze({
        index:byte(cpu.get8('BL'),'VGA palette index'),
        value:byte(cpu.get8('BH'),'VGA palette value')
      });
      const response=setPaletteRegister(args,cpu);
      sync(response,'palette');
      if(response!==undefined)
        throw new Error('BIOS palette device must not fabricate register values');
      return;
    }
    throw new Error('unsupported BIOS INT 10h AH='+ah.toString(16)+': fail closed');
  });
  return Object.freeze({
    supportedServices:Object.freeze(['INT10-AH00','INT10-AH0E','INT10-AH0F','INT10-AX1000']),
    fidelity:'CALLER_DEVICE_VIDEO_ONLY__ORIGINAL_BIOS_REGISTER_AND_SCREEN_UNTESTED'
  });
}

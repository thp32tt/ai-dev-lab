// Narrow original-CPU VGA 640x480x16 planar MODE 2 / MODE 0 write witness.
// IBM-compatible VGA write-mode-2 data expansion is documented by OSDev
// VGA Hardware and 82C451 Graphics Controller Registers. We intentionally
// support ONLY observed register conditions: GC05=02h (mode2) or
// GC05=00h with GC01=00h (mode0), GC03=00h, GC08=FFh,
// Sequencer02 map mask. This excludes latch/ROP/masked writes;
// a different mode is NOT silently treated as a real rendered pixel.
// This is a passive GPU-memory evidence layer, NOT an authentic VGA BIOS,
// vertical-retrace clock, palette renderer, or original visual parity.
const WIDTH=640,HEIGHT=480,STRIDE=WIDTH>>>3,VISIBLE=STRIDE*HEIGHT;
const VRAM_PHYSICAL=0xa0000,VRAM_END=0xb0000,PLANE_BYTES=0x10000;
const validByte=v=>Number.isInteger(v)&&v>=0&&v<=255;
export function createOriginalVgaMode12PlaneWitness({maxObservedWrites=250000}={}){
  if(!Number.isInteger(maxObservedWrites)||maxObservedWrites<1||maxObservedWrites>2000000)
    throw new RangeError('bounded mode 12h guest byte-write budget required');
  const gc=new Map(),seq=new Map();
  // VGA planes are 64 KiB each, even though a 640x480x16 frame displays
  // only the first 38,400 bytes. Guest code may use the rest as scratch VRAM.
  const planes=Array.from({length:4},()=>new Uint8Array(PLANE_BYTES));
  const validity=Array.from({length:4},()=>new Uint8Array(PLANE_BYTES));
  const latches=new Uint8Array(4),latchValid=new Uint8Array(4);
  let observedWrites=0,visibleWrites=0,fullyCoveredBytes=0;
  let mode0Writes=0,mode1Writes=0,mode2Writes=0;
  // GC06 controls which CPU address aperture actually reaches VGA. The
  // native A000 witness is only valid in graphics mode with planar addressing,
  // not in text mode, odd/even-chained addressing or B000/B800 mappings.
  // 01h maps A0000-BFFFF; 05h maps A0000-AFFFF (Mode 12h observed).
  const mapsPlanarA000=()=>gc.get(6)===0x01||gc.get(6)===0x05;
  const isReady=()=>{
    const mode=gc.get(5);
    if(!mapsPlanarA000()||![0,1,2].includes(mode)||
       !Number.isInteger(seq.get(2))||(seq.get(2)&15)===0)
      return false;
    if(mode===1)return true; // VGA write mode 1 ignores CPU data, GC03/08
    if(!gc.has(3)||!gc.has(8))return false;
    return mode===2||(gc.has(1)&&((gc.get(1)&15)===0||gc.has(0)));
  };
  const classifyPhysicalAperture=physical=>{
    if(!Number.isInteger(physical)||physical<0xa0000||physical>=0xc0000)
      return 'NOT_MAPPED';
    const map=gc.get(6);
    if(!Number.isInteger(map))return 'UNKNOWN_MAPPING';
    const chosen=map&0x0c;
    const decoded=chosen===0?
      physical>=0xa0000&&physical<0xc0000:
      chosen===4?physical>=0xa0000&&physical<0xb0000:
      chosen===8?physical>=0xb0000&&physical<0xb8000:
      physical>=0xb8000&&physical<0xc0000;
    if(!decoded)return 'NOT_MAPPED';
    if(physical<0xb0000&&mapsPlanarA000())return 'GROUNDED_A000';
    return 'UNSUPPORTED_MAPPED_APERTURE';
  };
  const loadLatches=offset=>{
    for(let p=0;p<4;p++){
      latches[p]=planes[p][offset];
      latchValid[p]=validity[p][offset];
    }
  };
  const snapshot=()=>Object.freeze({
    width:WIDTH,height:HEIGHT,strideBytes:STRIDE,
    observedWrites,visibleWrites,fullyCoveredBytes,mode0Writes,mode1Writes,mode2Writes,
    visibleBytes:VISIBLE,planeBytes:PLANE_BYTES,
    configKnown:isReady(),
    graphicsMode:gc.has(5)?gc.get(5):null,
    sequencerMapMask:seq.has(2)?seq.get(2):null,
    fidelity:'VGA_PLANAR_64K_WRITE012_READ01_LATCHES__SYNTHETIC_DOS_UNTESTED'
  });
  return Object.freeze({
    classifyPhysicalAperture,
    invalidateAfterBiosModeSet({mode}={}){
      // INT10 AH00 may reset VGA registers and framebuffer. The ROM's
      // actual memory contents are not inferred from a BIOS mode request.
      // Discard all previous per-plane evidence and stale register settings.
      // Only subsequent native writes with freshly witnessed GC/SEQ settings
      // can again make a pixel or CPU read provable.
      if(!validByte(mode))
        throw new RangeError('BIOS video mode byte required to invalidate VGA evidence');
      for(const plane of planes)plane.fill(0);
      for(const known of validity)known.fill(0);
      gc.clear();seq.clear();latches.fill(0);latchValid.fill(0);
      fullyCoveredBytes=0;
    },
    noteIndexedRegister(event){
      if(!event||typeof event!=='object'||!validByte(event.index)||
         !validByte(event.value))
        throw new Error('VGA GC/SEQ indexed register event required');
      const target=event.device==='graphics-controller'?gc:
        event.device==='sequencer'?seq:null;
      if(!target)return; // CRT registers are not modeled by this witness
      target.set(event.index,event.value);
    },
    observeNativeByte(event){
      if(!event||typeof event!=='object'||
         !Number.isInteger(event.physical)||event.physical<0||
         event.physical>=0x100000||!validByte(event.value))
        throw new Error('original 8086 physical VGA byte-write witness required');
      const address=event.physical;
      if(classifyPhysicalAperture(address)==='UNSUPPORTED_MAPPED_APERTURE')
        throw new Error('unsupported mapped VGA aperture must not be treated as guest RAM: fail closed');
      if(address<VRAM_PHYSICAL||address>=VRAM_END)return;
      if(observedWrites>=maxObservedWrites)
        throw new Error('VGA mode12 original-CPU write budget exceeded: fail closed');
      if(!isReady())
        throw new Error('VGA planar write requires exact observed GC06 graphics A000 planar aperture, mode0/mode1/mode2 GC/SEQ registers: fail closed');
      const offset=address-VRAM_PHYSICAL,mode=gc.get(5)&3;
      const mapMask=seq.get(2)&15,bitMask=gc.get(8);
      const rotate=gc.get(3)&7;
      const rotated=((event.value>>>rotate)|(event.value<<(8-rotate)))&255;
      // Build every affected plane before mutating evidence. A partially
      // witnessed latch can never silently become a fabricated pixel.
      const next=[];
      for(let p=0;p<4;p++){
        if(!(mapMask&(1<<p)))continue;
        if(mode===1){
          if(!latchValid[p])
            throw new Error('VGA write-mode1 requires previously read, verified latch plane: fail closed');
          next.push([p,latches[p]]);
          continue;
        }
        let input=mode===2?((event.value&(1<<p))?255:0):
          ((gc.get(1)&(1<<p))?((gc.get(0)&(1<<p))?255:0):rotated);
        const operation=(gc.get(3)>>>3)&3;
        if(operation!==0||bitMask!==255){
          if(!latchValid[p])
            throw new Error('VGA logical or masked write requires previously read, verified latch plane: fail closed');
          if(operation===1)input&=latches[p];
          else if(operation===2)input|=latches[p];
          else if(operation===3)input^=latches[p];
        }
        next.push([p,((input&bitMask)|(latches[p]&(~bitMask&255)))&255]);
      }
      const visible=offset<VISIBLE;
      let covered=visible;
      if(visible)for(let p=0;p<4;p++)if(!validity[p][offset])covered=false;
      for(const [p,value] of next){
        planes[p][offset]=value;
        validity[p][offset]=1;
      }
      observedWrites++;
      if(mode===0)mode0Writes++;
      else if(mode===1)mode1Writes++;
      else mode2Writes++;
      if(visible){
        visibleWrites++;
        if(!covered&&validity.every(plane=>plane[offset]===1))
          fullyCoveredBytes++;
      }
    },
    readSelectedPlaneByte(physical){
      // Each VGA CPU read populates all four latches. Read mode 0 returns
      // GC04's selected plane; read mode 1 compares only GC07 cared planes
      // against GC02. Unknown plane bytes remain unknown, including the
      // off-screen A000:9600-FFFF region, until written by native guest code.
      if(!Number.isInteger(physical)||physical<VRAM_PHYSICAL||
         physical>=VRAM_END)
        throw new RangeError('VGA planar read outside A0000-AFFFF aperture');
      const offset=physical-VRAM_PHYSICAL;
      const graphicsMode=gc.get(5);
      if(!Number.isInteger(graphicsMode)||(graphicsMode&0x10)!==0||
         !mapsPlanarA000())
        throw new Error('VGA read requires observed GC05 planar mode/GC06 A000 aperture: fail closed');
      if((graphicsMode&8)===0){
        const readMap=gc.get(4);
        if(!Number.isInteger(readMap)||readMap<0||readMap>3)
          throw new Error('VGA read requires observed GC04/GC05 read-mode0/GC06 A000 aperture: fail closed');
        if(!validity[readMap][offset])
          throw new Error('VGA read selected original plane byte is unverified: fail closed');
        loadLatches(offset);
        return planes[readMap][offset];
      }
      const compare=gc.get(2),care=gc.get(7);
      if(!validByte(compare)||!validByte(care))
        throw new Error('VGA read-mode1 requires observed GC02/GC07: fail closed');
      let result=255;
      for(let p=0;p<4;p++)if(care&(1<<p)){
        if(!validity[p][offset])
          throw new Error('VGA read-mode1 compared original plane byte is unverified: fail closed');
        result&=(compare&(1<<p))?planes[p][offset]:(~planes[p][offset]&255);
      }
      loadLatches(offset);
      return result;
    },
    readPixelIndex(x,y){
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=WIDTH||y<0||y>=HEIGHT)
        throw new RangeError('VGA mode12 pixel coordinate outside 640x480');
      const offset=y*STRIDE+(x>>>3),mask=1<<(7-(x&7));
      let color=0;
      for(let p=0;p<4;p++){
        if(!validity[p][offset])return null; // unknown BIOS VRAM baseline
        if(planes[p][offset]&mask)color|=1<<p;
      }
      return color;
    },
    captureGroundedIndexedRect(x,y,width,height){
      // Unlike a full-frame claim, a rectangular comparison can use the
      // partial original OPEN.EXE CPU writes that are already verified.
      // All four VGA planes must be proven at every touched byte: a crop
      // may start/end in the middle of a byte, but unknown bits are never
      // filled with an assumed background color.
      if(![x,y,width,height].every(Number.isInteger)||x<0||y<0||
         width<1||height<1||x>=WIDTH||y>=HEIGHT||
         width>WIDTH-x||height>HEIGHT-y)
        throw new RangeError('VGA mode12 grounded rectangle outside 640x480');
      const firstByte=x>>>3,lastByte=(x+width-1)>>>3;
      for(let row=y;row<y+height;row++)
        for(let b=firstByte;b<=lastByte;b++)
          for(let p=0;p<4;p++)
            if(!validity[p][row*STRIDE+b])
              throw new Error('VGA mode12 rectangle has an unverified original plane byte: fail closed');
      const indices=new Uint8Array(width*height);
      for(let row=0;row<height;row++)
        for(let col=0;col<width;col++){
          const offset=(y+row)*STRIDE+((x+col)>>>3),bit=1<<(7-((x+col)&7));
          let color=0;
          for(let p=0;p<4;p++)if(planes[p][offset]&bit)color|=1<<p;
          indices[row*width+col]=color;
        }
      return indices; // owned copy; never expose mutable evidence planes
    },
    captureCompleteIndexedFrame(){
      if(fullyCoveredBytes!==VISIBLE)
        throw new Error('VGA mode12 not every pixel is grounded by native CPU writes');
      const indices=new Uint8Array(WIDTH*HEIGHT);
      for(let y=0;y<HEIGHT;y++){
        for(let x=0;x<WIDTH;x++){
          const offset=y*STRIDE+(x>>>3),mask=1<<(7-(x&7));
          let color=0;
          for(let p=0;p<4;p++)if(planes[p][offset]&mask)color|=1<<p;
          indices[y*WIDTH+x]=color;
        }
      }
      return indices;
    },
    getState:snapshot
  });
}

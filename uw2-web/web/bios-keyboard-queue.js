// Explicit host-supplied BIOS INT16 keyboard event FIFO for original DOS code.
// This is NOT a PC keyboard controller, scancode translator or key generator.
// Only externally captured (ASCII, scan code) pairs enter the guest queue.
const uint8=(value,label)=>{
  if(!Number.isInteger(value)||value<0||value>255)
    throw new RangeError(label+' must be uint8');
  return value;
};
export function createBiosKeyboardQueue({maxQueuedKeys=64}={}){
  if(!Number.isInteger(maxQueuedKeys)||maxQueuedKeys<1||maxQueuedKeys>1024)
    throw new RangeError('BIOS keyboard queue requires bounded capacity 1..1024');
  const items=[];
  let accepted=0,consumed=0;
  const enqueue=key=>{
    if(!key||typeof key!=='object'||Array.isArray(key)||
       !Object.hasOwn(key,'ascii')||!Object.hasOwn(key,'scanCode'))
      throw new TypeError('BIOS key requires explicit ASCII and scan-code bytes');
    // Validate before mutating the FIFO: no fabricated default or partial key.
    const ascii=uint8(key.ascii,'BIOS key ASCII');
    const scanCode=uint8(key.scanCode,'BIOS key scan code');
    if(items.length>=maxQueuedKeys)
      throw new Error('BIOS original keyboard queue capacity exceeded: fail closed');
    items.push(Object.freeze({ascii,scanCode}));accepted++;
    return items.length;
  };
  const checkKey=()=>{
    const first=items[0];
    return first?Object.freeze({available:true,...first}):
      Object.freeze({available:false});
  };
  const readKey=()=>{
    if(!items.length)return Object.freeze({available:false});
    const key=items.shift();consumed++;
    return Object.freeze({available:true,...key});
  };
  const snapshot=()=>Object.freeze({
    pending:items.length,accepted,consumed,maxQueuedKeys,
    fidelity:'EXTERNAL_KEY_EVENTS_ONLY__BIOS_TIMING_AND_BROWSER_KEY_MAPPING_UNTESTED'
  });
  return Object.freeze({enqueue,checkKey,readKey,snapshot});
}

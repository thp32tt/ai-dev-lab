// Preflight for original DOS 20-bit physical memory placement.
// Verify source images, DOS PSP bytes, and synthetic IVT/BIOS fixtures before
// writing RAM. Does not infer a DOS MCB allocation map or valid executable
// control flow; it prevents overlapping independently owned byte regions.
export function assertDisjointGuestPhysicalRegions(regions){
  if(!Array.isArray(regions)||regions.length===0||regions.length>256)
    throw new RangeError('guest staging requires a bounded nonempty region list');
  const used=new Set(),resolved=[];
  for(const region of regions){
    if(!region||typeof region!=='object'||Array.isArray(region))
      throw new TypeError('guest staging region object required');
    const {label,segment,offset=0,length}=region;
    if(typeof label!=='string'||label.length<1||label.length>128||used.has(label))
      throw new Error('guest memory region label must be unique and nonempty');
    used.add(label);
    if(!Number.isInteger(segment)||segment<0||segment>65535||
       !Number.isInteger(offset)||offset<0||offset>65535||
       !Number.isInteger(length)||length<1||length>65536-offset)
      throw new RangeError('guest staging region must fit one 16-bit segment');
    const start=(segment<<4)+offset,end=start+length;
    if(start>=0x100000||end>0x100000)
      throw new RangeError('guest staging region wraps 20-bit physical address');
    resolved.push(Object.freeze({label,segment,offset,length,start,end}));
  }
  const ordered=resolved.slice().sort((a,b)=>a.start-b.start);
  for(let i=1;i<ordered.length;i++){
    if(ordered[i].start<ordered[i-1].end)
      throw new Error('guest staging memory overlap: '+
        ordered[i-1].label+' vs '+ordered[i].label+
        ' at physical '+ordered[i].start.toString(16));
  }
  return Object.freeze({regions:Object.freeze(ordered),
    fidelity:'STAGING_SOURCE_BYTES_DISJOINT_ONLY__DOS_MCB_AND_HARDWARE_UNTESTED'});
}

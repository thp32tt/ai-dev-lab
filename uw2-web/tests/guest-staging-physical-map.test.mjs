import assert from 'node:assert/strict';
import {assertDisjointGuestPhysicalRegions} from '../web/guest-staging-physical-map.js';
const regions=[
 {label:'KOEI PSP',segment:0x200,length:0x100},
 {label:'KOEI original COM',segment:0x200,offset:0x100,length:776},
 {label:'FMDRV PSP',segment:0x400,length:0x100},
 {label:'FMDRV original COM',segment:0x400,offset:0x100,length:5162},
 {label:'OPEN PSP',segment:0x600,length:0x100},
 {label:'OPEN original MZ image',segment:0x610,length:41655},
 {label:'synthetic IVT ROM handler 66',segment:0xe000,length:1},
 {label:'synthetic IVT ROM handler 65',segment:0xe010,length:1}
];
const good=assertDisjointGuestPhysicalRegions(regions);
assert.equal(good.regions.length,8);
assert.equal(good.regions[0].label,'KOEI PSP');
assert.match(good.fidelity,/DOS_MCB_AND_HARDWARE_UNTESTED/);
// In the previous test fixture 900h:0000 falls *inside* the OPEN MZ
// physical byte range; reject without ever modifying original guest RAM.
assert.throws(()=>assertDisjointGuestPhysicalRegions([
 ...regions,{label:'OLD SYNTHETIC IVT BUG',segment:0x900,length:1}
]),/overlap.*OPEN original MZ image vs OLD SYNTHETIC IVT BUG/);
assert.throws(()=>assertDisjointGuestPhysicalRegions([
 {label:'A',segment:0x600,length:0x100},
 {label:'B',segment:0x600,offset:0x80,length:16}
]),/overlap/);
assert.throws(()=>assertDisjointGuestPhysicalRegions([
 {label:'END',segment:0xffff,offset:0xfff0,length:32}
]),/fit one 16-bit segment/);
assert.throws(()=>assertDisjointGuestPhysicalRegions([
 {label:'END',segment:0xffff,length:17}
]),/wraps 20-bit/);
assert.throws(()=>assertDisjointGuestPhysicalRegions([
 {label:'A',segment:0,length:1},{label:'A',segment:1,length:1}
]),/unique/);
assert.throws(()=>assertDisjointGuestPhysicalRegions([
 {label:'A',segment:0,offset:0xffff,length:2}
]),/fit one 16-bit segment/);
console.log('UW2 original OPEN/KOEI/FMDRV byte-disjoint staging including 0900h IVT-over-MZ regression: PASS');

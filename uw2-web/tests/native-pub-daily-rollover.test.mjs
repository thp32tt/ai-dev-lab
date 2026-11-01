import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advanceDateTicks,lodgeCheckIn} from '../web/buildings.js';
import {SeaRuntime} from '../web/world-map.js';
import {hireCrew,rolloverPubDailyRecruitment} from '../web/pub.js';

// The original saveBase+0x0c dayFlags byte is already parsed into the
// active browser session. Only its established pub-recruit bit 0 is
// known here; all other bits must remain unchanged on a new game day.
const slot={
  money:10000,rank:0,dayFlags:0b10101010,
  portMeta:{economy:1000,pubDrinkId:0},
  fleet:{ships:[{currentCrew:10,maxCrew:20}],totalCrew:10}
};
const date={year:1522,month:7,day:6,timeTick:70,hour:23,minute:20};
const one=hireCrew(slot,0,1,80);
assert.equal(one.quantity,1);
assert.equal(slot.dayFlags,0b10101011);
assert.equal(hireCrew(slot,0,1,80).reason,'used-today');
const before={...date};
advanceDateTicks(date,1); // 23:40, still same date
assert.equal(rolloverPubDailyRecruitment(slot,before,date),false);
assert.equal(slot.dayFlags,0b10101011);
const beforeMidnight={...date};
advanceDateTicks(date,1);
assert.equal(date.timeTick,0);
assert.equal(date.day,7);
assert.equal(rolloverPubDailyRecruitment(slot,beforeMidnight,date),true);
assert.equal(slot.dayFlags,0b10101010);
assert.equal(hireCrew(slot,0,1,80).quantity,1);
assert.equal(slot.fleet.ships[0].currentCrew,12);
assert.equal(slot.fleet.totalCrew,12);
assert.equal(rolloverPubDailyRecruitment(slot,date,date),false);
assert.equal(slot.dayFlags,0b10101011);

// Native inn service crosses midnight in one operation. Preserve all
// unrelated source bits even across year/month rollovers.
const yearEnd={year:1522,month:12,day:31,timeTick:42,hour:14,minute:0};
const earlier={...yearEnd};
lodgeCheckIn(yearEnd);
assert.deepEqual(yearEnd,{year:1523,month:1,day:1,timeTick:24,hour:8,minute:0});
assert.equal(rolloverPubDailyRecruitment(slot,earlier,yearEnd),true);
assert.equal(slot.dayFlags,0b10101010);
assert.equal(rolloverPubDailyRecruitment(slot,yearEnd,earlier),false); // no backward reset

// Native sea turn/tick also crosses calendar boundaries, with no
// approximation of the actual original ship-speed or DOS engine.
const cells=new Uint8Array(1080*540),quad=new Uint8Array(1024);
const sea=new SeaRuntime({cells,quad},{x:100,y:100},null,12,null,
 {year:1522,month:12,day:31,timeTick:71,hour:23,minute:40});
slot.dayFlags|=1;
const seaBefore=sea.snapshot().dateTime;
sea.tick();
assert.equal(sea.dateTime.year,1523);
assert.equal(rolloverPubDailyRecruitment(slot,seaBefore,sea.dateTime),true);
assert.equal(slot.dayFlags,0b10101010);
assert.equal(rolloverPubDailyRecruitment(slot,null,sea.dateTime),false);
assert.equal(rolloverPubDailyRecruitment({dayFlags:999},seaBefore,sea.dateTime),false);

// The actual playable app must clear the known bit at all three real
// game-time mutation points, not just in an unused standalone helper.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/advanceDateTicks\(selected\.dateTime,ticks\);\s*rolloverPubDailyRecruitment\(selected,before,selected\.dateTime\)/);
assert.match(app,/lodgeCheckIn\(selected\.dateTime\);\s*rolloverPubDailyRecruitment\(selected,before,selected\.dateTime\)/);
assert.match(app,/if\(dayChanged\)\s*\{\s*rolloverPubDailyRecruitment\(selected,before\.dateTime,after\.dateTime\)/);
console.log('UW2 native pub recruitment daily flag clears after town visit, inn and sea midnight: PASS');

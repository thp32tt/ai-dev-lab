import assert from 'node:assert/strict';
import {layoutNativeSeaDateHeader,paintNativeSeaDateHeader,
 SEA_HEADER_INK_BOUNDS} from '../web/native-sea-date-header.js';
const date=(year,month,day,hour,min)=>({
 year,month,day,timeTick:hour*3+min/20,hour,minute:min
});
const valid=date(1522,7,6,17,20);
const block=SEA_HEADER_INK_BOUNDS;
const layout=layoutNativeSeaDateHeader(valid,null);
assert.equal(layout.text,'1522.7.6 17:20');
assert.ok(layout.x>=block.x&&layout.y>=block.y);
assert.ok(layout.width<=block.textW);
assert.ok(layout.y+16*layout.scale<=block.y+block.h);
const max=layoutNativeSeaDateHeader(date(9999,12,31,23,40),null);
assert.equal(max.text,'9999.12.31 23:40');
assert.ok(max.width<=block.textW);
assert.ok(max.scale<1);
const font={glyphs:new Map([...max.text].map(ch=>[ch,{width:8}]))};
assert.equal(layoutNativeSeaDateHeader(date(9999,12,31,23,40),font).width,max.width);
for(const bad of [null,{},date(1522,2,30,12,0),{...valid,minute:30},
 {...valid,hour:25},{...valid,timeTick:14}]){
 assert.equal(layoutNativeSeaDateHeader(bad,null),null);
}
const calls=[];
const ctx={
 save(){calls.push(['save']);},restore(){calls.push(['restore']);},
 fillRect(...v){calls.push(['fillRect',...v]);},
 beginPath(){calls.push(['beginPath']);},
 rect(...v){calls.push(['rect',...v]);},
 clip(){calls.push(['clip']);},
 fillText(...v){calls.push(['fillText',...v]);},
 set fillStyle(v){calls.push(['fillStyle',v]);},
 set font(v){calls.push(['font',v]);},
 set textBaseline(v){calls.push(['baseline',v]);}
};
assert.equal(paintNativeSeaDateHeader(ctx,null,null),null);
assert.equal(calls.length,0,'invalid source must never erase original graph');
const painted=paintNativeSeaDateHeader(ctx,null,valid);
assert.deepEqual(calls[1],['fillStyle','#f3e3d3']);
assert.deepEqual(calls[2],['fillRect',block.x,block.y,block.w,block.h]);
assert.deepEqual(calls[4],['rect',block.x,block.y,block.w,block.h]);
assert.ok(calls.some(c=>c[0]==='clip'));
assert.deepEqual(calls.find(c=>c[0]==='fillText').slice(1),
 ['1522.7.6 17:20',block.textX,block.textY,block.textW]);
assert.deepEqual(calls.at(-1),['restore']);
assert.equal(painted.text,layout.text);
// The stamped source scroll must not appear on the black/no-asset fallback.
const appSource=(await import('node:fs')).readFileSync(
 new URL('../web/app.js',import.meta.url),'utf8');
assert.match(appSource,/if\(uiGraph\?\.sea\) paintNativeSeaDateHeader\(ctx,fontAssets,st\.dateTime\)/);
console.log('UW2 original GRAPH #4 top scroll date+time text fits single source parchment row PASS');

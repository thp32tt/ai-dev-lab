// Korean GRAPH #4 sea HUD: elapsed voyage DAYS, not distance in
// world-map chips. The browser's verified sailing clock advances one
// 20-minute timeTick per native voyage step and 72 ticks per game day.
// This is an elapsed calendar-boundary counter for the browser-native
// session; do not claim the original DOS game's hidden day counter.
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
export function nativeSeaDayCount(state){
 const ticks=state?.ticks,clock=state?.dateTime;
 if(!int(ticks,0,1_000_000_000)||!clock||
    !int(clock.timeTick,0,71)||
    clock.hour!==Math.floor(clock.timeTick/3)||
    clock.minute!==(clock.timeTick%3)*20)
   return null;
 // Current tick = (departureTick + elapsedTicks) mod 72. Recover the
 // departure clock without storing an invented original-save field.
 const departureTick=(clock.timeTick-(ticks%72)+72)%72;
 return Math.floor((departureTick+ticks)/72);
}

// Optional browser controller commands for the existing native port
// transactions. These are virtual KEYBOARD commands into app.js, not
// new prices, ship state, invented DOS rules or direct money mutation.
const arrow=(key,label,shiftKey=false)=>Object.freeze({key,label,shiftKey});
const BACK=arrow('Escape','뒤로');
const ONE=arrow('Enter','1개 실행');
const TEN=arrow('Enter','10개 실행',true);
const MAX=arrow('m','최대 실행');
const SHIPS=Object.freeze([arrow('ArrowUp','함선 이전'),arrow('ArrowDown','함선 다음')]);
const ITEMS=Object.freeze([arrow('ArrowUp','품목 이전'),arrow('ArrowDown','품목 다음')]);
const trade=Object.freeze([
 arrow('ArrowLeft','함선 이전'),arrow('ArrowRight','함선 다음'),
 ...ITEMS,ONE,TEN,MAX,BACK
]);
const supply=Object.freeze([...SHIPS,
 arrow('ArrowLeft','보급품 이전'),arrow('ArrowRight','보급품 다음'),
 arrow('l','적재 모드'),arrow('u','적재/하역 변경'),
 ONE,TEN,MAX,BACK
]);
const crew=Object.freeze([...SHIPS,ONE,TEN,MAX,BACK]);
const bank=Object.freeze([
 arrow('ArrowLeft','100G 감소'),arrow('ArrowRight','100G 증가'),
 arrow('ArrowLeft','1만G 감소',true),arrow('ArrowRight','1만G 증가',true),
 arrow('m','최대 금액'),arrow('Enter','금액 실행'),BACK
]);
const treat=Object.freeze([
 arrow('ArrowLeft','1병 감소'),arrow('ArrowRight','1병 증가'),
 arrow('ArrowLeft','10병 감소',true),arrow('ArrowRight','10병 증가',true),
 arrow('m','최대 병수'),arrow('Enter','한턱내기 실행'),BACK
]);
const items=Object.freeze([...ITEMS,arrow('Enter','품목 확인'),BACK]);
const modeMap=Object.freeze({
 supply, 'market-buy':trade,'market-sell':trade,
 'pub-recruit':crew,'pub-dismiss':crew,'pub-treat':treat,
 'bank-deposit':bank,'bank-withdraw':bank,
 'bank-borrow':bank,'bank-repay':bank,
 'item-buy':items,'item-sell':items
});
export function nativeContextCommandsFor(mode){
 return typeof mode==='string'&&Object.hasOwn(modeMap,mode)?modeMap[mode]:null;
}
export function nativeContextLabelFor(mode){
 if(!nativeContextCommandsFor(mode))return '';
 const labels={
 supply:'항구 보급·하역','market-buy':'교역품 구입',
 'market-sell':'교역품 매각','pub-recruit':'선원 고용',
 'pub-dismiss':'선원 해고','pub-treat':'주점 한턱내기',
 'bank-deposit':'은행 예금','bank-withdraw':'은행 인출',
 'bank-borrow':'은행 대출','bank-repay':'은행 상환',
 'item-buy':'아이템 구입','item-sell':'아이템 매각'
 };
 return labels[mode];
}

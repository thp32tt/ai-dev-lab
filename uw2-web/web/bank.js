export const BANK_MAX_SAVINGS = 1_000_000;
export const BANK_MAX_DEBT = 1_000_000;
export const BANK_CASH_LIMIT = 600_000_000;

function clampInt(n,min,max){
  return Math.max(min,Math.min(max,Math.floor(Number(n)||0)));
}

export function bankCreditLine(slot) {
  const rank=Math.max(0,slot?.rank??0);
  const balance=Math.trunc(slot?.bankBalance??0);
  return Math.max(0,10_000*rank*rank+balance+1_000);
}

export function bankDepositMaximum(slot) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if(balance<0) return 0;
  if((slot?.money??0)<=1_000) return 0;
  return Math.max(0,Math.min(
    Math.trunc(slot?.money??0),
    BANK_MAX_SAVINGS-balance,
  ));
}

export function bankDeposit(slot,requested) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if((slot?.money??0)<=1_000) return {quantity:0,reason:"cash-too-low",messageId:100};
  if(balance>=BANK_MAX_SAVINGS) return {quantity:0,reason:"savings-max",messageId:101};
  if(balance<0) return {quantity:0,reason:"debt-first",messageId:102};
  const max=bankDepositMaximum(slot);
  const quantity=clampInt(requested,0,max);
  if(!quantity) return {quantity:0,reason:"zero",messageId:105,max};
  slot.money-=quantity;
  slot.bankBalance=balance+quantity;
  return {quantity,balance:slot.bankBalance,messageId:106,max};
}

export function bankWithdrawMaximum(slot) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if(balance<=0) return 0;
  return Math.max(0,Math.min(balance,BANK_CASH_LIMIT-Math.trunc(slot?.money??0)));
}

export function bankWithdraw(slot,requested) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if(balance<=0) return {quantity:0,reason:"no-savings",messageId:104};
  const room=BANK_CASH_LIMIT-Math.trunc(slot?.money??0);
  if(room<100) return {quantity:0,reason:"cash-limit",messageId:107};
  const max=bankWithdrawMaximum(slot);
  const quantity=clampInt(requested,0,max);
  if(!quantity) return {quantity:0,reason:"zero",messageId:108,max};
  slot.bankBalance=balance-quantity;
  slot.money+=quantity;
  return {quantity,balance:slot.bankBalance,messageId:110,max};
}

export function bankBorrowMaximum(slot) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if(balance>0) return 0;
  return bankCreditLine(slot);
}

export function bankBorrow(slot,requested) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if(balance>0) return {quantity:0,reason:"savings-exist",messageId:111};
  const max=bankBorrowMaximum(slot);
  if(max<=0) return {quantity:0,reason:"credit-fail",messageId:113};
  const quantity=clampInt(requested,0,max);
  if(!quantity) return {quantity:0,reason:"zero",messageId:115,max};
  slot.bankBalance=balance-quantity;
  slot.money=Math.trunc(slot?.money??0)+quantity;
  return {quantity,balance:slot.bankBalance,messageId:116,max};
}

export function bankRepayMaximum(slot) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if(balance>=0) return 0;
  return Math.max(0,Math.min(-balance,Math.trunc(slot?.money??0)));
}

export function bankRepay(slot,requested) {
  const balance=Math.trunc(slot?.bankBalance??0);
  if(balance>=0) return {quantity:0,reason:"no-debt",messageId:118};
  const max=bankRepayMaximum(slot);
  const quantity=clampInt(requested,0,max);
  if(!quantity) return {quantity:0,reason:"zero",messageId:119,max};
  slot.money-=quantity;
  slot.bankBalance=balance+quantity;
  return {
    quantity,
    balance:slot.bankBalance,
    messageId:slot.bankBalance===0?382:149,
    max,
  };
}

export function applyMonthlyBankInterest(slot) {
  let balance=Math.trunc(slot?.bankBalance??0);
  if(balance===0) return {before:0,after:0,interest:0,rate:0};
  const rate=balance>=0?3:10;
  const interest=Math.trunc(balance*rate/100);
  const before=balance;
  balance=Math.max(-BANK_MAX_DEBT,Math.min(BANK_MAX_SAVINGS,balance+interest));
  slot.bankBalance=balance;
  return {before,after:balance,interest:balance-before,rate};
}

function bankMonthSerial(dt) {
  if (!dt) return 0;
  return Math.trunc(dt.year ?? 0) * 12 + Math.max(0, Math.trunc(dt.month ?? 1) - 1);
}

export function applyBankInterestCrossings(slot, beforeDate, afterDate) {
  if (!slot || !beforeDate || !afterDate) return [];
  const before = bankMonthSerial(beforeDate);
  const after = bankMonthSerial(afterDate);
  const events = [];
  for (let m = before; m < after; m++) {
    events.push(applyMonthlyBankInterest(slot));
  }
  return events;
}
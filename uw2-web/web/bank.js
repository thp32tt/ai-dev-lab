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

// All four native bank forms share the same saved-state admission rule.
// Malformed or out-of-range fields must not be coerced into spendable gold.
// These are browser transaction invariants, not inferred DOS bank behavior.
function validBankState(slot) {
  return Number.isSafeInteger(slot?.bankBalance) &&
    slot.bankBalance>=-BANK_MAX_DEBT &&
    slot.bankBalance<=BANK_MAX_SAVINGS &&
    Number.isSafeInteger(slot?.money) &&
    slot.money>=0 && slot.money<=BANK_CASH_LIMIT;
}

export function bankDepositMaximum(slot) {
  if(!validBankState(slot) || slot.bankBalance<0 || slot.money<=1_000) return 0;
  return Math.max(0,Math.min(slot.money,BANK_MAX_SAVINGS-slot.bankBalance));
}

export function bankDeposit(slot,requested) {
  if(!validBankState(slot))
    return {quantity:0,reason:"invalid-bank-state",messageId:105};
  const balance=slot.bankBalance;
  if(slot.money<=1_000) return {quantity:0,reason:"cash-too-low",messageId:100};
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
  if(!validBankState(slot) || slot.bankBalance<=0) return 0;
  const room=BANK_CASH_LIMIT-slot.money;
  // The existing UI refuses withdrawal when less than 100G remains.
  // Do not advertise 1..99G as withdrawable in that same interface.
  if(room<100) return 0;
  return Math.min(slot.bankBalance,room);
}

export function bankWithdraw(slot,requested) {
  if(!validBankState(slot))
    return {quantity:0,reason:"invalid-bank-state",messageId:108};
  const balance=slot.bankBalance;
  if(balance<=0) return {quantity:0,reason:"no-savings",messageId:104};
  const room=BANK_CASH_LIMIT-slot.money;
  if(room<100) return {quantity:0,reason:"cash-limit",messageId:107};
  const max=bankWithdrawMaximum(slot);
  const quantity=clampInt(requested,0,max);
  if(!quantity) return {quantity:0,reason:"zero",messageId:108,max};
  slot.bankBalance=balance-quantity;
  slot.money+=quantity;
  return {quantity,balance:slot.bankBalance,messageId:110,max};
}

// The native bank's displayed maximum must be the same limit enforced
// when the actual transaction commits. Do not create gold or a deeper
// debt if a credit line is larger than the source save's storage limits.
// This is a browser transaction invariant; DOS lending parity is untested.
export function bankBorrowMaximum(slot) {
  if(!validBankState(slot) || slot.bankBalance>0) return 0;
  return Math.max(0,Math.min(
    bankCreditLine(slot),
    BANK_MAX_DEBT+slot.bankBalance,
    BANK_CASH_LIMIT-slot.money,
  ));
}

export function bankBorrow(slot,requested) {
  if(!validBankState(slot))
    return {quantity:0,reason:"invalid-bank-state",messageId:113};
  const balance=slot.bankBalance;
  if(balance>0) return {quantity:0,reason:"savings-exist",messageId:111};
  if(slot.money>=BANK_CASH_LIMIT)
    return {quantity:0,reason:"cash-limit",messageId:107};
  if(balance<=-BANK_MAX_DEBT)
    return {quantity:0,reason:"debt-limit",messageId:113};
  const max=bankBorrowMaximum(slot);
  if(max<=0) return {quantity:0,reason:"credit-fail",messageId:113};
  const quantity=clampInt(requested,0,max);
  if(!quantity) return {quantity:0,reason:"zero",messageId:115,max};
  slot.bankBalance=balance-quantity;
  slot.money+=quantity;
  return {quantity,balance:slot.bankBalance,messageId:116,max};
}

export function bankRepayMaximum(slot) {
  if(!validBankState(slot) || slot.bankBalance>=0) return 0;
  return Math.min(-slot.bankBalance,slot.money);
}

export function bankRepay(slot,requested) {
  if(!validBankState(slot))
    return {quantity:0,reason:"invalid-bank-state",messageId:119};
  const balance=slot.bankBalance;
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
  if(!validBankState(slot))
    return {before:slot?.bankBalance??null,after:slot?.bankBalance??null,
      interest:0,rate:0,reason:"invalid-bank-state"};
  let balance=slot.bankBalance;
  if(balance===0) return {before:0,after:0,interest:0,rate:0};
  const rate=balance>=0?3:10;
  const interest=Math.trunc(balance*rate/100);
  const before=balance;
  balance=Math.max(-BANK_MAX_DEBT,Math.min(BANK_MAX_SAVINGS,balance+interest));
  slot.bankBalance=balance;
  return {before,after:balance,interest:balance-before,rate};
}

function bankMonthSerial(dt) {
  // Reject a corrupt calendar rather than charging a fictitious number of months.
  if (!Number.isSafeInteger(dt?.year) || dt.year<1501 || dt.year>9999 ||
      !Number.isSafeInteger(dt?.month) || dt.month<1 || dt.month>12) return null;
  return dt.year*12+dt.month-1;
}

export function applyBankInterestCrossings(slot, beforeDate, afterDate) {
  if(!validBankState(slot)) return [];
  const before=bankMonthSerial(beforeDate);
  const after=bankMonthSerial(afterDate);
  if(before===null || after===null || after<=before) return [];
  const events = [];
  for (let m = before; m < after; m++) {
    events.push(applyMonthlyBankInterest(slot));
  }
  return events;
}
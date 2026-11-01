import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BANK_CASH_LIMIT,BANK_MAX_SAVINGS,BANK_MAX_DEBT,
  bankDepositMaximum,bankDeposit,
  bankWithdrawMaximum,bankWithdraw,
  bankBorrowMaximum,bankBorrow,
  bankRepayMaximum,bankRepay,
  applyMonthlyBankInterest,applyBankInterestCrossings,
} from '../web/bank.js';

// Original-free synthetic regressions for the shipping browser bank.
// These are invariant checks, NOT DOS-verified bank-rule claims.
const deposit={money:20_000,bankBalance:BANK_MAX_SAVINGS-50};
assert.equal(bankDepositMaximum(deposit),50);
assert.equal(bankDeposit(deposit,400).quantity,50);
assert.deepEqual(deposit,{money:19_950,bankBalance:BANK_MAX_SAVINGS});
const afterDeposit={...deposit};
assert.equal(bankDepositMaximum(deposit),0);
assert.equal(bankDeposit(deposit,100).reason,'savings-max');
assert.deepEqual(deposit,afterDeposit);

const blockedDebt={money:2500,bankBalance:-400};
assert.equal(bankDepositMaximum(blockedDebt),0);
assert.equal(bankDeposit(blockedDebt,100).reason,'debt-first');
assert.deepEqual(blockedDebt,{money:2500,bankBalance:-400});
const poor={money:1000,bankBalance:100};
assert.equal(bankDepositMaximum(poor),0);
assert.equal(bankDeposit(poor,100).reason,'cash-too-low');
assert.deepEqual(poor,{money:1000,bankBalance:100});

const withdraw={money:BANK_CASH_LIMIT-100,bankBalance:120};
assert.equal(bankWithdrawMaximum(withdraw),100);
const took=bankWithdraw(withdraw,999);
assert.equal(took.quantity,100);
assert.equal(took.max,100);
assert.deepEqual(withdraw,{money:BANK_CASH_LIMIT,bankBalance:20});
const afterWithdraw={...withdraw};
assert.equal(bankWithdrawMaximum(withdraw),0);
assert.equal(bankWithdraw(withdraw,20).reason,'cash-limit');
assert.deepEqual(withdraw,afterWithdraw);

// Existing withdrawal <100G free-room refusal must agree with the UI maximum.
const nearCash={money:BANK_CASH_LIMIT-99,bankBalance:200};
assert.equal(bankWithdrawMaximum(nearCash),0);
assert.equal(bankWithdraw(nearCash,10).reason,'cash-limit');
assert.deepEqual(nearCash,{money:BANK_CASH_LIMIT-99,bankBalance:200});
const noSavings={money:100,bankBalance:0};
assert.equal(bankWithdrawMaximum(noSavings),0);
assert.equal(bankWithdraw(noSavings,10).reason,'no-savings');
assert.deepEqual(noSavings,{money:100,bankBalance:0});

const repay={money:350,bankBalance:-500};
assert.equal(bankRepayMaximum(repay),350);
assert.equal(bankRepay(repay,800).quantity,350);
assert.deepEqual(repay,{money:0,bankBalance:-150});
assert.equal(bankRepayMaximum(repay),0);
assert.equal(bankRepay(repay,10).reason,'zero');
assert.deepEqual(repay,{money:0,bankBalance:-150});
const full={money:300,bankBalance:-150};
assert.equal(bankRepay(full,150).messageId,382);
assert.deepEqual(full,{money:150,bankBalance:0});

// Every live bank action, maximum, and interest calculation must fail closed
// on invalid saved money/balance; no invented gold, debt, or mutation.
for(const invalid of [
  {money:-1,bankBalance:0},
  {money:BANK_CASH_LIMIT+1,bankBalance:0},
  {money:NaN,bankBalance:100},
  {money:Infinity,bankBalance:-100},
  {money:50.5,bankBalance:0},
  {money:'5000',bankBalance:10},
  {money:500,bankBalance:BANK_MAX_SAVINGS+1},
  {money:500,bankBalance:-BANK_MAX_DEBT-1},
  {money:500,bankBalance:0.5},
  {money:500,bankBalance:undefined},
  {money:undefined,bankBalance:-1},
  null,
]){
  const before=structuredClone(invalid);
  for(const maximum of [
    bankDepositMaximum,bankWithdrawMaximum,bankBorrowMaximum,bankRepayMaximum
  ]) assert.equal(maximum(invalid),0);
  for(const action of [bankDeposit,bankWithdraw,bankBorrow,bankRepay]){
    const tx=action(invalid,1_000);
    assert.equal(tx.quantity,0);
    assert.equal(tx.reason,'invalid-bank-state');
    assert.deepEqual(invalid,before);
  }
  const monthly=applyMonthlyBankInterest(invalid);
  assert.equal(monthly.reason,'invalid-bank-state');
  assert.deepEqual(invalid,before);
  assert.deepEqual(
    applyBankInterestCrossings(invalid,{year:1522,month:1},{year:1522,month:2}),[]
  );
  assert.deepEqual(invalid,before);
}

// Calendar crossings charge each verified monthly boundary, not invalid
// dates or elapsed intervals in reverse.
const saving={money:500,bankBalance:100_000};
const events=applyBankInterestCrossings(saving,
  {year:1522,month:11},{year:1523,month:1});
assert.equal(events.length,2);
assert.equal(events[0].interest,3000);
assert.equal(events[1].interest,3090);
assert.deepEqual(saving,{money:500,bankBalance:106_090});
const savingBefore={...saving};
for(const [before,after] of [
  [{year:1523,month:1},{year:1522,month:12}],
  [{year:1523,month:1},{year:1523,month:1}],
  [{year:1523,month:0},{year:1523,month:2}],
  [{year:1523,month:1},{year:1523,month:13}],
  [{year:NaN,month:12},{year:1523,month:1}],
  [{year:1523.5,month:12},{year:1524,month:1}],
  [null,{year:1524,month:1}],
]) {
  assert.deepEqual(applyBankInterestCrossings(saving,before,after),[]);
  assert.deepEqual(saving,savingBefore);
}
const debt={money:0,bankBalance:-10_000};
const debtEvent=applyMonthlyBankInterest(debt);
assert.equal(debtEvent.interest,-1000);
assert.deepEqual(debt,{money:0,bankBalance:-11_000});

// The actual browser game exposes and commits these four operations.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
for(const [name,maximum,commit] of [
  ['deposit','bankDepositMaximum','bankDeposit'],
  ['withdraw','bankWithdrawMaximum','bankWithdraw'],
  ['borrow','bankBorrowMaximum','bankBorrow'],
  ['repay','bankRepayMaximum','bankRepay'],
]){
  assert.ok(app.includes('"bank-'+name+'":'+maximum+'(selected)'));
  assert.ok(app.includes('tx='+commit+'(selected,ui.bankAmount)'));
}
assert.match(app,/prepareNativeTownTimeTransition/);
const townTx=fs.readFileSync(new URL('../web/native-town-time-transaction.js',import.meta.url),'utf8');
assert.match(townTx,/applyBankInterestCrossings/);
console.log('UW2 native bank four-way transactional integrity and calendar interest: PASS');

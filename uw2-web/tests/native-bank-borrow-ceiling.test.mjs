import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BANK_CASH_LIMIT,BANK_MAX_DEBT,BANK_MAX_SAVINGS,
  bankBorrowMaximum,bankBorrow,bankCreditLine
} from '../web/bank.js';

// Original-free native transaction fixtures; no DOS borrowing rule inferred.
// The browser's published debt and cash ceilings must both be respected.
const loan={rank:11,bankBalance:-999_900,money:BANK_CASH_LIMIT-75};
assert.ok(bankCreditLine(loan)>100);
assert.equal(bankBorrowMaximum(loan),75);
const first=bankBorrow(loan,10_000);
assert.equal(first.quantity,75);
assert.equal(first.max,75);
assert.equal(loan.money,BANK_CASH_LIMIT);
assert.equal(loan.bankBalance,-999_975);
const before={...loan};
assert.deepEqual(bankBorrow(loan,999),{
  quantity:0,reason:'cash-limit',messageId:107
});
assert.deepEqual(loan,before);

// A high credit score cannot create debt below -1,000,000G.
const debt={rank:11,bankBalance:-BANK_MAX_DEBT+1,money:500};
assert.equal(bankBorrowMaximum(debt),1);
assert.equal(bankBorrow(debt,999999).quantity,1);
assert.equal(debt.bankBalance,-BANK_MAX_DEBT);
assert.equal(debt.money,501);
const debtBefore={...debt};
assert.equal(bankBorrow(debt,1).reason,'debt-limit');
assert.deepEqual(debt,debtBefore);

// Cash-boundary loans and existing-savings refusal remain atomic.
const exact={rank:3,bankBalance:0,money:BANK_CASH_LIMIT-10};
assert.equal(bankBorrowMaximum(exact),10);
assert.equal(bankBorrow(exact,10).quantity,10);
assert.equal(exact.money,BANK_CASH_LIMIT);
assert.equal(exact.bankBalance,-10);
assert.equal(bankBorrowMaximum({rank:5,bankBalance:100,money:10}),0);
const savings={rank:5,bankBalance:100,money:10};
assert.equal(bankBorrow(savings,100).reason,'savings-exist');
assert.deepEqual(savings,{rank:5,bankBalance:100,money:10});

// Malformed bank/cash fields must never be silently coerced into credit.
for(const invalid of [
  {rank:4,bankBalance:-BANK_MAX_DEBT-1,money:500},
  {rank:4,bankBalance:BANK_MAX_SAVINGS+1,money:500},
  {rank:4,bankBalance:0,money:BANK_CASH_LIMIT+1},
  {rank:4,bankBalance:0,money:-1},
  {rank:4,bankBalance:0,money:NaN},
  {rank:4,bankBalance:0.5,money:500},
  {rank:4,bankBalance:0,money:Infinity},
  {rank:4,bankBalance:undefined,money:500},
]){
  const unchanged={...invalid};
  assert.equal(bankBorrowMaximum(invalid),0);
  const tx=bankBorrow(invalid,1000);
  assert.equal(tx.quantity,0);
  assert.equal(tx.reason,'invalid-bank-state');
  assert.deepEqual(invalid,unchanged);
}
assert.equal(bankBorrowMaximum(null),0);

// Regression must cover the native playable app's actual bank form wiring.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/"bank-borrow":bankBorrowMaximum\(selected\)/);
assert.match(app,/tx=bankBorrow\(selected,ui\.bankAmount\)/);
console.log('UW2 native bank borrowing respects both gold/debt ceilings and rejects corrupt state atomically: PASS');

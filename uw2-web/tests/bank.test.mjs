import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots } from "../web/binary.js";
import {
  BANK_MAX_SAVINGS, bankCreditLine, bankDepositMaximum,
  bankDeposit, bankWithdraw, bankBorrow, bankRepay,
  applyMonthlyBankInterest, applyBankInterestCrossings
} from "../web/bank.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const b=fs.readFileSync(gd+"/KOUKAI2.DAT");
const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const slots=parseSaveSlots(ab);

assert.equal(slots[0].bankBalance,0);
assert.equal(slots[1].bankBalance,1_000_000);

const cat=structuredClone(slots[0]);
const cash0=cat.money;
assert.ok(bankDepositMaximum(cat)>0);
let tx=bankDeposit(cat,1234);
assert.equal(tx.quantity,1234);
assert.equal(cat.bankBalance,1234);
assert.equal(cat.money,cash0-1234);

tx=bankWithdraw(cat,234);
assert.equal(tx.quantity,234);
assert.equal(cat.bankBalance,1000);
assert.equal(cat.money,cash0-1000);

cat.bankBalance=0;
const credit=bankCreditLine(cat);
assert.equal(credit,10_000*cat.rank*cat.rank+1000);
tx=bankBorrow(cat,Math.min(500,credit));
assert.equal(tx.quantity,Math.min(500,credit));
assert.equal(cat.bankBalance,-tx.quantity);
const moneyAfterBorrow=cat.money;
tx=bankRepay(cat,200);
assert.equal(tx.quantity,Math.min(200,Math.abs(-Math.min(500,credit))));
assert.equal(cat.money,moneyAfterBorrow-tx.quantity);

const saver={bankBalance:100_000};
let ix=applyMonthlyBankInterest(saver);
assert.deepEqual(ix,{before:100000,after:103000,interest:3000,rate:3});
const debtor={bankBalance:-100_000};
ix=applyMonthlyBankInterest(debtor);
assert.deepEqual(ix,{before:-100000,after:-110000,interest:-10000,rate:10});
const capped={bankBalance:999_999};
applyMonthlyBankInterest(capped);
assert.equal(capped.bankBalance,BANK_MAX_SAVINGS);

const crossSlot={bankBalance:100_000};
const cross=applyBankInterestCrossings(
  crossSlot,
  {year:1501,month:1,day:31},
  {year:1501,month:2,day:1},
);
assert.equal(cross.length,1);
assert.equal(crossSlot.bankBalance,103_000);

const twoMonths={bankBalance:-100_000};
const cross2=applyBankInterestCrossings(
  twoMonths,
  {year:1501,month:11,day:30},
  {year:1502,month:1,day:1},
);
assert.equal(cross2.length,2);
assert.equal(twoMonths.bankBalance,-121_000);

console.log(JSON.stringify({
  actual:[slots[0].bankBalance,slots[1].bankBalance],
  catRank:slots[0].rank,
  catCredit:bankCreditLine(slots[0]),
},null,2));
console.log("bank tests: PASS");
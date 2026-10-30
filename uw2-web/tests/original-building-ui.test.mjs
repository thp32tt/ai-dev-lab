import assert from "node:assert/strict";
import fs from "node:fs";

const app=fs.readFileSync(new URL("../web/app.js",import.meta.url),"utf8");

for (const name of [
  "drawHarborSupply",
  "drawItemShopTrade",
  "drawMarketTrade",
  "drawMarketRates",
  "drawPubCrew",
  "drawBankAmount",
  "drawPubTreat",
  "drawPortSupport",
]) {
  const start=app.indexOf("function "+name+"(");
  assert.ok(start>=0,name+" missing");
  const next=app.indexOf("\nfunction ",start+10);
  const body=app.slice(start,next<0?app.length:next);
  assert.ok(body.includes("drawOriginalModalRows"),name+" must use original modal surface");
  assert.ok(!body.includes("drawBox("),name+" must not use browser panel");
  assert.ok(!body.includes("Malgun Gothic"),name+" must not use browser/system font");
}
const decisionStart=app.indexOf("function drawItemShopDecision(");
const decisionEnd=app.indexOf("\nfunction ",decisionStart+10);
const decision=app.slice(decisionStart,decisionEnd);
assert.ok(decision.includes("UI_LAYOUT.yesNo"));
assert.ok(decision.includes("uiGraph?.yesNo"));
assert.ok(decision.includes("drawOriginalModalRows"));

console.log("UW2 original building sub-UI tests: PASS");